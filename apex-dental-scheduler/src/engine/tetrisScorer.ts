import {
  Appointment,
  DentalService,
  Operatory,
  ScoredTimeSlot,
  SlotScoringDetails,
  StaffMember,
  TimeSlot,
} from '../types/scheduler';
import { getDayOfWeekKey, minutesToDurationString, minutesToFormatted12h } from './intervalMath';

/**
 * In private dental practice, the shortest billable treatment is a 30-minute exam.
 * Any isolated chair opening between 10 and 25 minutes is an unfillable "dead gap"
 * causing permanent practice revenue loss.
 */
export const MIN_PRACTICE_APPOINTMENT_MINUTES = 30;

/**
 * Phase 3: "Dead Chair Elimination" Scoring Engine & Financial Rationale Generator
 *
 * Evaluates candidate slots across a 100-Point Practice Efficiency framework:
 * 1. Consecutive Booking Bonus (+35 pts): Starts at shift open / lunch end / flush with prior patient;
 *    or ends flush at shift close / lunch start / next patient start.
 * 2. "Dead Chair" Elimination Penalty (-50 pts): Heavy deduction if an isolated gap (10–25m) is created.
 * 3. Practice Workload Equalizer (+15 pts): Prioritizes certified clinicians with fewer booked hours today.
 * 4. Suite Continuity (+10 pts): Keeps operatory suites running in continuous blocks vs. room hopping.
 *
 * Generates plain-English clinical rationales categorized into 3 tiers:
 * - High Efficiency (Score >= 75): "⭐ Recommended: ..."
 * - Standard Opening (Score 50–74): "Available: ..."
 * - Revenue Leak Warning (Score < 50): "⚠️ Revenue Leak: ..."
 */
export function scoreAndRankSlots(params: {
  candidateSlots: TimeSlot[];
  service: DentalService;
  targetDate: string;
  allBookings: Appointment[];
  allStaff: StaffMember[];
  allServices: DentalService[];
  excludeAppointmentId?: string;
}): TimeSlot[] {
  const { candidateSlots, service, targetDate, allBookings, allStaff, allServices, excludeAppointmentId } = params;
  if (!candidateSlots || candidateSlots.length === 0) return [];

  const dayKey = getDayOfWeekKey(targetDate);
  const activeBookings = allBookings.filter(
    (b) =>
      b.date === targetDate &&
      b.status !== 'cancelled' &&
      (!excludeAppointmentId || b.id !== excludeAppointmentId)
  );

  const staffMap = new Map(allStaff.map((s) => [s.id, s]));
  const serviceMap = new Map(allServices.map((s) => [s.id, s]));

  // Calculate booked minutes for each clinician on targetDate to calculate Workload Equalizer
  const clinicianBookedMinutes: Record<string, number> = {};
  for (const staff of allStaff) {
    clinicianBookedMinutes[staff.id] = 0;
  }
  for (const apt of activeBookings) {
    const dur = apt.endMinute - apt.startMinute;
    clinicianBookedMinutes[apt.staffId] = (clinicianBookedMinutes[apt.staffId] || 0) + dur;
  }

  // Find minimum booked minutes among certified clinicians for this service
  const eligibleClinicians = allStaff.filter((s) => service.allowedStaffIds.includes(s.id));
  const minBookedMinutes = eligibleClinicians.length > 0
    ? Math.min(...eligibleClinicians.map((s) => clinicianBookedMinutes[s.id] || 0))
    : 0;

  const totalOccupancyMinutes = service.durationMinutes + service.cleanupBufferMinutes;

  const scoredSlots: TimeSlot[] = candidateSlots.map((slot) => {
    const staff = staffMap.get(slot.staffId);
    if (!staff) {
      return {
        ...slot,
        score: 50,
        isRecommended: false,
        efficiencyTier: 'standard',
        recommendationReason: 'Available: Standard opening',
      };
    }

    const shift = staff.shifts[dayKey] || { startMinute: 480, endMinute: 1080 };
    const breaks = staff.breaks[dayKey] || [];
    const slotBufferEnd = slot.endMinute + service.cleanupBufferMinutes;

    // Room bookings sorted chronologically
    const roomBookings = activeBookings
      .filter((b) => b.operatoryId === slot.operatoryId)
      .sort((a, b) => a.startMinute - b.startMinute);

    // Clinician bookings sorted chronologically
    const staffBookings = activeBookings
      .filter((b) => b.staffId === slot.staffId)
      .sort((a, b) => a.startMinute - b.startMinute);

    // ==========================================
    // 1. Determine Prior & Succeeding Room Boundaries
    // ==========================================
    let roomPrevEnd = shift.startMinute;
    let roomPrevApt: Appointment | null = null;
    let roomNextStart = shift.endMinute;
    let roomNextApt: Appointment | null = null;

    for (const apt of roomBookings) {
      if (apt.bufferEndMinute <= slot.startMinute) {
        if (apt.bufferEndMinute >= roomPrevEnd) {
          roomPrevEnd = apt.bufferEndMinute;
          roomPrevApt = apt;
        }
      }
      if (apt.startMinute >= slotBufferEnd) {
        if (apt.startMinute <= roomNextStart) {
          roomNextStart = apt.startMinute;
          roomNextApt = apt;
        }
      }
    }

    // Clinician lunch/breaks as boundaries
    let clinicianLunchBefore: { startMinute: number; endMinute: number; label: string } | null = null;
    let clinicianLunchAfter: { startMinute: number; endMinute: number; label: string } | null = null;

    for (const brk of breaks) {
      if (brk.endMinute <= slot.startMinute && brk.endMinute >= roomPrevEnd) {
        clinicianLunchBefore = brk;
      }
      if (brk.startMinute >= slotBufferEnd && brk.startMinute <= roomNextStart) {
        clinicianLunchAfter = brk;
      }
    }

    const effectivePriorBoundary = clinicianLunchBefore ? clinicianLunchBefore.endMinute : roomPrevEnd;
    const effectiveNextBoundary = clinicianLunchAfter ? clinicianLunchAfter.startMinute : roomNextStart;

    const gapBefore = slot.startMinute - effectivePriorBoundary;
    const gapAfter = effectiveNextBoundary - slotBufferEnd;

    // ==========================================
    // 2. Scoring Computations (100-Point Framework)
    // ==========================================
    let score = 50; // Neutral baseline
    let consecutiveBonus = 0;
    let deadGapPenalty = 0;
    let workloadBonus = 0;
    let suiteContinuityBonus = 0;

    let deadGapMinutes = 0;
    let deadGapLocation = '';
    const bonusExplanations: string[] = [];

    // --- A. Consecutive Booking Bonus (+35 pts) ---
    // Start flush: shift open, lunch end, or preceding patient's turnover buffer
    const isFlushStartShift = slot.startMinute === shift.startMinute;
    const isFlushStartLunch = breaks.some((b) => b.endMinute === slot.startMinute);
    const isFlushStartPatient = roomPrevApt !== null && roomPrevApt.bufferEndMinute === slot.startMinute;

    if (isFlushStartShift || isFlushStartLunch || isFlushStartPatient) {
      consecutiveBonus += 20;
      if (isFlushStartPatient && roomPrevApt) {
        const prevSrv = serviceMap.get(roomPrevApt.serviceId);
        bonusExplanations.push(`Snaps flush with ${staff.name}'s ${prevSrv ? prevSrv.name.toLowerCase() : 'morning procedure'}`);
      } else if (isFlushStartLunch) {
        bonusExplanations.push(`Starts immediately after ${staff.name}'s lunch`);
      } else if (isFlushStartShift) {
        bonusExplanations.push(`Anchors opening of ${staff.name}'s shift`);
      }
    }

    // End flush: shift close, lunch start, or next patient start
    const isFlushEndShift = slotBufferEnd === shift.endMinute;
    const isFlushEndLunch = breaks.some((b) => b.startMinute === slot.endMinute || b.startMinute === slotBufferEnd);
    const isFlushEndPatient = roomNextApt !== null && roomNextApt.startMinute === slotBufferEnd;

    if (isFlushEndShift || isFlushEndLunch || isFlushEndPatient) {
      consecutiveBonus += 15;
      if (isFlushEndPatient && roomNextApt) {
        bonusExplanations.push(`connects seamlessly into next appointment`);
      } else if (isFlushEndLunch) {
        bonusExplanations.push(`finishes flush with lunch break`);
      } else if (isFlushEndShift) {
        bonusExplanations.push(`concludes flush with practice closing`);
      }
    } else if (gapAfter >= 90) {
      // If it leaves a clean large continuous block (e.g. 90m+ or 2hr block for major surgery)
      consecutiveBonus += 10;
      const cleanHours = Math.round((gapAfter / 60) * 10) / 10;
      bonusExplanations.push(`preserves a clean ${cleanHours}-hour block this afternoon`);
    }

    // --- B. "Dead Chair" Elimination Penalty (-50 pts) ---
    // Isolated gap between 10 and 25 minutes (less than the 30-min minimum treatment)
    const isDeadGapBefore = gapBefore >= 10 && gapBefore <= 25;
    const isDeadGapAfter = gapAfter >= 10 && gapAfter <= 25;

    if (isDeadGapBefore) {
      deadGapPenalty += 50;
      deadGapMinutes += gapBefore;
      deadGapLocation = `before slot (after ${clinicianLunchBefore ? 'lunch' : (roomPrevApt?.patientName || 'shift start')})`;
    } else if (isDeadGapAfter) {
      deadGapPenalty += 50;
      deadGapMinutes += gapAfter;
      deadGapLocation = `after slot (before ${clinicianLunchAfter ? `${staff.name}'s lunch` : (roomNextApt?.patientName || 'shift close')})`;
    }

    // --- C. Practice Workload Equalizer (+15 pts) ---
    const thisClinicianBooked = clinicianBookedMinutes[staff.id] || 0;
    if (thisClinicianBooked <= minBookedMinutes + 15) {
      workloadBonus += 15;
    } else if (thisClinicianBooked <= minBookedMinutes + 45) {
      workloadBonus += 8;
    }

    // --- D. Suite Continuity (+10 pts) ---
    // Favor keeping an operatory suite active in continuous blocks rather than room hopping
    if (roomBookings.length > 0) {
      // Room already has active momentum
      if (gapBefore <= 30 || gapAfter <= 30) {
        suiteContinuityBonus += 10;
      } else {
        suiteContinuityBonus += 5;
      }
    } else {
      // Empty room: favor if procedure branch is primary match for suite
      if (service.branch === 'Facial Surgery' && slot.operatoryId === 'suite-1') {
        suiteContinuityBonus += 10;
      } else if (service.branch === 'Preventative' && slot.operatoryId === 'bay-a') {
        suiteContinuityBonus += 10;
      } else if (service.branch === 'Cosmetic' && slot.operatoryId === 'suite-2') {
        suiteContinuityBonus += 10;
      }
    }

    // Calculate final score clamped between 5 and 100
    let finalScore = score + consecutiveBonus - deadGapPenalty + workloadBonus + suiteContinuityBonus;
    finalScore = Math.max(5, Math.min(100, Math.round(finalScore)));

    // ==========================================
    // 3. Plain-English Clinical Rationale Generator
    // ==========================================
    let efficiencyTier: 'recommended' | 'standard' | 'leak';
    let rationaleText = '';

    if (finalScore >= 75) {
      efficiencyTier = 'recommended';
      const detail = bonusExplanations.length > 0 ? bonusExplanations.join(', ') : 'Optimal schedule compaction';
      rationaleText = `⭐ Recommended: ${detail.charAt(0).toUpperCase() + detail.slice(1)}.`;
    } else if (finalScore < 50 || deadGapPenalty > 0) {
      efficiencyTier = 'leak';
      const gapDesc = deadGapMinutes > 0 ? `${deadGapMinutes}-minute` : 'unsellable';
      rationaleText = `⚠️ Revenue Leak: Leaves an unfillable ${gapDesc} dead gap ${deadGapLocation || 'wasting chair capacity'}.`;
    } else {
      efficiencyTier = 'standard';
      if (gapAfter >= MIN_PRACTICE_APPOINTMENT_MINUTES) {
        rationaleText = `Available: Leaves a standard ${gapAfter}-minute chair opening suitable for a routine checkup or hygiene session.`;
      } else if (gapBefore >= MIN_PRACTICE_APPOINTMENT_MINUTES) {
        rationaleText = `Available: Accommodates preceding ${gapBefore}-minute opening for clinical consultations.`;
      } else {
        rationaleText = `Available: Feasible opening with standard room turnaround.`;
      }
    }

    const details: SlotScoringDetails = {
      contiguityBonus: consecutiveBonus,
      deadGapPenalty,
      roomSpecializationBonus: suiteContinuityBonus,
      shiftCompactionBonus: workloadBonus,
      totalScore: finalScore,
      explanation: rationaleText,
      deadGapMinutes,
    };

    return {
      ...slot,
      score: finalScore,
      isRecommended: efficiencyTier === 'recommended',
      recommendationReason: rationaleText,
      efficiencyTier,
      deadGapMinutes,
      details,
    };
  });

  // Sort descending by efficiency score, then chronologically by start minute
  scoredSlots.sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.startMinute - b.startMinute;
  });

  return scoredSlots;
}

/**
 * Backward-compatible wrapper for existing components
 */
export function rankSlots(
  slots: TimeSlot[],
  service: DentalService,
  staffList: StaffMember[],
  operatoriesList: Operatory[],
  existingAppointments: Appointment[]
): ScoredTimeSlot[] {
  const targetDate = slots[0]?.date || existingAppointments[0]?.date || new Date().toISOString().split('T')[0];

  return scoreAndRankSlots({
    candidateSlots: slots,
    service,
    targetDate,
    allBookings: existingAppointments,
    allStaff: staffList,
    allServices: [service],
  }) as ScoredTimeSlot[];
}

/**
 * Backward-compatible single slot scorer
 */
export function scoreTimeSlot(
  slot: TimeSlot,
  service: DentalService,
  staff: StaffMember,
  operatory: Operatory,
  existingAppointments: Appointment[]
): ScoredTimeSlot {
  const ranked = scoreAndRankSlots({
    candidateSlots: [slot],
    service,
    targetDate: slot.date,
    allBookings: existingAppointments,
    allStaff: [staff],
    allServices: [service],
  });

  return ranked[0] as ScoredTimeSlot;
}
