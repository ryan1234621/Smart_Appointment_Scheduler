import {
  Appointment,
  DentalService,
  Operatory,
  StaffMember,
  TimeSlot,
} from '../types/scheduler';
import {
  getDayOfWeekKey,
  intervalsOverlap,
  isWithinInterval,
} from './intervalMath';

export interface SlotFinderOptions {
  stepMinutes?: number; // default 15 mins
  preferredStaffId?: string;
  preferredOperatoryId?: string;
  excludeAppointmentId?: string; // used when rescheduling
}

/**
 * Checks operatory suitability based on private dental surgery clinical specifications:
 * - Surgical Suite 1: Equipped with HEPA air filtration & surgical carts (mandatory for Facial Surgery, usable for Restorative).
 * - Operatory Suite 2: Equipped for Restorative, Cosmetic, and Orthodontic treatments (and clinical exams).
 * - Hygiene Bay A: Dedicated Cavitron ultrasonic suite for Preventative cleanings.
 */
export function isOperatorySuitable(
  operatory: Operatory,
  service: DentalService
): boolean {
  // Facial Surgery: strictly requires surgical suite (HEPA air filtration & surgical cart)
  if (service.branch === 'Facial Surgery') {
    return operatory.id === 'suite-1' || operatory.type === 'surgical';
  }

  // Preventative:
  // - Routine Scale & Polish / Periodontal Therapy: dedicated Cavitron ultrasonic Hygiene Bay A
  // - Clinical Oral Exam & Digital 3D OPG (prev-3): can use Operatory Suite 2 or Surgical Suite 1
  if (service.branch === 'Preventative') {
    if (service.id === 'prev-3') {
      return (
        operatory.id === 'suite-2' ||
        operatory.id === 'suite-1' ||
        operatory.type === 'general' ||
        operatory.type === 'surgical'
      );
    }
    return operatory.id === 'bay-a' || operatory.type === 'hygiene';
  }

  // Restorative: Operatory Suite 2 is equipped; Surgical Suite 1 is also usable
  if (service.branch === 'Restorative') {
    return (
      operatory.id === 'suite-2' ||
      operatory.id === 'suite-1' ||
      operatory.type === 'general' ||
      operatory.type === 'surgical'
    );
  }

  // Cosmetic: Operatory Suite 2 (Aesthetic & Laser Ready)
  if (service.branch === 'Cosmetic') {
    return operatory.id === 'suite-2' || operatory.type === 'general';
  }

  // Orthodontic: Operatory Suite 2 (3D scanner & aligner attachment ready)
  if (service.branch === 'Orthodontic') {
    return operatory.id === 'suite-2' || operatory.type === 'general';
  }

  return operatory.type === service.requiredOperatoryType;
}

/**
 * Backward compatibility alias for isOperatorySuitable
 */
export const isOperatoryCompatible = isOperatorySuitable;

/**
 * Phase 2 Clinical Feasibility Engine:
 * In a private dental surgery, an empty chair does not mean an appointment is bookable.
 * A booking requires two synchronized resources: a certified clinician AND an appropriately
 * equipped operatory suite, plus mandatory post-op sterilization turnover.
 *
 * Enforces:
 * 1. Clinical Skills Matching: Only certified providers perform designated treatments.
 * 2. Operatory Suitability: Surgical Suite 1 (HEPA), Operatory Suite 2, Hygiene Bay A (Cavitron).
 * 3. Sterilization Turnover: Mandatory sanitization (10-30m) locks both chair and clinician.
 * 4. Shift & Protected Lunch Bounds: Clinicians cannot be booked outside shifts or during lunch/breaks.
 * 5. Dual-Resource Collision: Practical 15-minute intervals, valid ONLY if clinician AND operatory
 *    are simultaneously free for [start, start + duration + buffer].
 */
export function findFeasibleSlots(params: {
  date: string;
  serviceId: string;
  preferredStaffId?: string; // If undefined, evaluates "Any Available Clinician"
  bookings: Appointment[];
  staffList: StaffMember[];
  operatories: Operatory[];
  services: DentalService[];
  stepMinutes?: number;
  excludeAppointmentId?: string;
}): TimeSlot[] {
  const stepMinutes = params.stepMinutes || 15;
  const dayKey = getDayOfWeekKey(params.date);

  // 1. Resolve procedure/service
  const service = params.services.find((s) => s.id === params.serviceId);
  if (!service) return [];

  const duration = service.durationMinutes;
  const buffer = service.cleanupBufferMinutes;
  const totalBlockedMinutes = duration + buffer;

  // 2. Filter active bookings for the date (exclude cancelled and excluded appointment during reschedule)
  const activeBookings = params.bookings.filter(
    (b) =>
      b.date === params.date &&
      b.status !== 'cancelled' &&
      (!params.excludeAppointmentId || b.id !== params.excludeAppointmentId)
  );

  // 3. Clinical Skills Matching: certified clinicians only
  const eligibleStaff = params.staffList.filter((staff) => {
    // Must be certified for this service
    if (!service.allowedStaffIds.includes(staff.id)) return false;

    // Clinician preference: if provided and not 'auto' / 'all'
    if (
      params.preferredStaffId &&
      params.preferredStaffId !== 'auto' &&
      params.preferredStaffId !== 'all' &&
      staff.id !== params.preferredStaffId
    ) {
      return false;
    }

    // Must be on duty / have shift on this weekday
    return Boolean(staff.shifts[dayKey]);
  });

  // 4. Operatory Suitability: certified & appropriately equipped rooms
  const suitableOperatories = params.operatories.filter((op) =>
    isOperatorySuitable(op, service)
  );

  const feasibleSlots: TimeSlot[] = [];

  // 5. Evaluate dual-resource synchronization across 15-minute grid intervals
  for (const staff of eligibleStaff) {
    const shift = staff.shifts[dayKey];
    if (!shift) continue;

    const breaks = staff.breaks[dayKey] || [];
    const staffBookings = activeBookings.filter((b) => b.staffId === staff.id);

    for (const operatory of suitableOperatories) {
      const roomBookings = activeBookings.filter((b) => b.operatoryId === operatory.id);

      for (
        let startMin = shift.startMinute;
        startMin + totalBlockedMinutes <= shift.endMinute;
        startMin += stepMinutes
      ) {
        const procedureEndMin = startMin + duration;
        const bufferEndMin = startMin + totalBlockedMinutes;

        // Constraint A: Entire [start, bufferEnd] must fit within clinician shift
        if (!isWithinInterval(startMin, bufferEndMin, shift.startMinute, shift.endMinute)) {
          continue;
        }

        // Constraint B: Protected Lunch & Decontamination breaks
        // Clinician cannot be booked during protected lunch or decontamination breaks
        const breakCollision = breaks.some((brk) =>
          intervalsOverlap(startMin, bufferEndMin, brk.startMinute, brk.endMinute)
        );
        if (breakCollision) continue;

        // Constraint C: Clinician Collision Check
        // The clinician remains occupied until the sterilization turnover completes
        const clinicianCollision = staffBookings.some((apt) =>
          intervalsOverlap(startMin, bufferEndMin, apt.startMinute, apt.bufferEndMinute)
        );
        if (clinicianCollision) continue;

        // Constraint D: Operatory Room Collision Check
        // Operatory chair is locked until post-op sterilization completes
        const roomCollision = roomBookings.some((apt) =>
          intervalsOverlap(startMin, bufferEndMin, apt.startMinute, apt.bufferEndMinute)
        );
        if (roomCollision) continue;

        feasibleSlots.push({
          startMinute: startMin,
          endMinute: procedureEndMin,
          staffId: staff.id,
          operatoryId: operatory.id,
          date: params.date,
        });
      }
    }
  }

  // Sort chronologically by start minute, then clinician
  feasibleSlots.sort((a, b) => {
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    return a.staffId.localeCompare(b.staffId);
  });

  return feasibleSlots;
}

/**
 * Backward-compatible wrapper for existing components
 */
export function findAvailableSlots(
  service: DentalService,
  dateStr: string,
  staffList: StaffMember[],
  operatoriesList: Operatory[],
  existingAppointments: Appointment[],
  options: SlotFinderOptions = {}
): TimeSlot[] {
  const filteredBookings = options.excludeAppointmentId
    ? existingAppointments.filter((a) => a.id !== options.excludeAppointmentId)
    : existingAppointments;

  let slots = findFeasibleSlots({
    date: dateStr,
    serviceId: service.id,
    preferredStaffId: options.preferredStaffId,
    bookings: filteredBookings,
    staffList,
    operatories: operatoriesList,
    services: [service],
    stepMinutes: options.stepMinutes,
  });

  if (options.preferredOperatoryId && options.preferredOperatoryId !== 'auto') {
    slots = slots.filter((s) => s.operatoryId === options.preferredOperatoryId);
  }

  return slots;
}
