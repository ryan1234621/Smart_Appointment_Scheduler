import React, { useState, useMemo, useEffect } from 'react';
import {
  Appointment,
  DentalBranch,
  DentalService,
  Operatory,
  StaffMember,
  TimeSlot,
  WaitlistEntry,
} from '../../types/scheduler';
import { findFeasibleSlots } from '../../engine/slotFinder';
import { scoreAndRankSlots } from '../../engine/tetrisScorer';
import {
  formatDateReadable,
  minutesToDurationString,
  minutesToFormatted12h,
} from '../../engine/intervalMath';
import {
  X,
  Sparkles,
  Clock,
  ShieldCheck,
  User,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Phone,
  Check,
  Shuffle,
  Zap,
} from 'lucide-react';

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  servicesList: DentalService[];
  appointments: Appointment[];
  initialDate?: string;
  initialMinute?: number;
  initialStaffId?: string;
  initialOperatoryId?: string;
  initialServiceId?: string;
  rescheduleAppointment?: Appointment | null;
  onBookAppointment: (
    appointment: Omit<Appointment, 'id' | 'status'>,
    existingIdToUpdate?: string
  ) => void;
  onJoinWaitlist?: (entry: Omit<WaitlistEntry, 'id'>) => void;
}

const BRANCHES: DentalBranch[] = [
  'Preventative',
  'Restorative',
  'Cosmetic',
  'Orthodontic',
  'Facial Surgery',
];

const BRANCH_SPECIALTY_BADGES: Record<DentalBranch, { label: string; badge: string }> = {
  'Preventative': { label: 'Preventative (Mint)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  'Restorative': { label: 'Restorative (Ocean Blue)', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  'Cosmetic': { label: 'Cosmetic (Violet)', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  'Orthodontic': { label: 'Orthodontic (Amber)', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  'Facial Surgery': { label: 'Facial Surgery (Crimson)', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export const BookingDialog: React.FC<BookingDialogProps> = ({
  isOpen,
  onClose,
  staffList,
  operatoriesList,
  servicesList,
  appointments,
  initialDate,
  initialMinute,
  initialStaffId,
  initialOperatoryId,
  initialServiceId,
  rescheduleAppointment,
  onBookAppointment,
  onJoinWaitlist,
}) => {
  if (!isOpen) return null;

  // Active Wizard Step (1: Branch/Procedure, 2: Clinician, 3: Date, 4: Times, 5: Patient Details)
  const [activeStep, setActiveStep] = useState<number>(rescheduleAppointment ? 4 : 1);

  // Form selections
  const [selectedBranch, setSelectedBranch] = useState<DentalBranch>('Preventative');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    rescheduleAppointment?.serviceId || initialServiceId || servicesList[0]?.id || ''
  );
  const [selectedClinicianPreference, setSelectedClinicianPreference] = useState<string>(
    rescheduleAppointment?.staffId || initialStaffId || 'first-available'
  );
  const [bookingDate, setBookingDate] = useState<string>(
    rescheduleAppointment?.date || initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Patient inputs
  const [patientName, setPatientName] = useState<string>(rescheduleAppointment?.patientName || '');
  const [patientPhone, setPatientPhone] = useState<string>(rescheduleAppointment?.patientPhone || '');
  const [isFlexible, setIsFlexible] = useState<boolean>(
    rescheduleAppointment ? rescheduleAppointment.isFlexible : true
  );

  // Collapsible toggle for "Other Available Times"
  const [isOtherTimesOpen, setIsOtherTimesOpen] = useState<boolean>(false);

  // Initialize from props and handle rescheduling pre-population
  useEffect(() => {
    if (rescheduleAppointment) {
      setSelectedServiceId(rescheduleAppointment.serviceId);
      const s = servicesList.find((srv) => srv.id === rescheduleAppointment.serviceId);
      if (s) setSelectedBranch(s.branch);
      setBookingDate(rescheduleAppointment.date);
      setSelectedClinicianPreference(rescheduleAppointment.staffId);
      setPatientName(rescheduleAppointment.patientName);
      setPatientPhone(rescheduleAppointment.patientPhone);
      setIsFlexible(rescheduleAppointment.isFlexible);
      setActiveStep(4);
      return;
    }

    if (initialServiceId) {
      setSelectedServiceId(initialServiceId);
      const s = servicesList.find((srv) => srv.id === initialServiceId);
      if (s) setSelectedBranch(s.branch);
    }
    if (initialDate) setBookingDate(initialDate);
    if (initialStaffId) setSelectedClinicianPreference(initialStaffId);
  }, [initialServiceId, initialDate, initialStaffId, rescheduleAppointment, servicesList]);

  const selectedService = useMemo(() => {
    return servicesList.find((s) => s.id === selectedServiceId) || servicesList[0];
  }, [servicesList, selectedServiceId]);

  const branchServices = useMemo(() => {
    return servicesList.filter((s) => s.branch === selectedBranch);
  }, [servicesList, selectedBranch]);

  // Compute mathematically feasible & ranked slots via Phase 2 & 3 engines
  const scoredSlots = useMemo(() => {
    if (!selectedService) return [];

    const candidateSlots = findFeasibleSlots({
      date: bookingDate,
      serviceId: selectedService.id,
      preferredStaffId:
        selectedClinicianPreference !== 'first-available'
          ? selectedClinicianPreference
          : undefined,
      bookings: appointments,
      staffList,
      operatories: operatoriesList,
      services: servicesList,
      excludeAppointmentId: rescheduleAppointment?.id,
    });

    return scoreAndRankSlots({
      candidateSlots,
      service: selectedService,
      targetDate: bookingDate,
      allBookings: appointments,
      allStaff: staffList,
      allServices: servicesList,
      excludeAppointmentId: rescheduleAppointment?.id,
    });
  }, [
    selectedService,
    bookingDate,
    selectedClinicianPreference,
    appointments,
    staffList,
    operatoriesList,
    servicesList,
    rescheduleAppointment,
  ]);

  const topRecommendedSlots = useMemo(() => {
    return scoredSlots.filter((s) => (s.score || 0) >= 75);
  }, [scoredSlots]);

  const otherAvailableSlots = useMemo(() => {
    return scoredSlots.filter((s) => (s.score || 0) < 75);
  }, [scoredSlots]);

  // Auto-select initial slot or first top-recommended slot
  useEffect(() => {
    if (scoredSlots.length > 0) {
      if (initialMinute) {
        const matching = scoredSlots.find((s) => s.startMinute === initialMinute);
        if (matching) {
          setSelectedSlot(matching);
          return;
        }
      }
      setSelectedSlot(scoredSlots[0]);
    } else {
      setSelectedSlot(null);
    }
  }, [scoredSlots, initialMinute]);

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  const opMap = useMemo(() => new Map(operatoriesList.map((o) => [o.id, o])), [operatoriesList]);

  // Handle final submission: save to state and localStorage
  const handleCommitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !selectedSlot || !selectedService) return;

    const newAppointmentData: Omit<Appointment, 'id' | 'status'> = {
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || '+44 7700 900123',
      serviceId: selectedService.id,
      staffId: selectedSlot.staffId,
      operatoryId: selectedSlot.operatoryId,
      date: selectedSlot.date,
      startMinute: selectedSlot.startMinute,
      endMinute: selectedSlot.endMinute,
      bufferEndMinute: selectedSlot.endMinute + selectedService.cleanupBufferMinutes,
      isFlexible,
    };

    onBookAppointment(newAppointmentData, rescheduleAppointment?.id);
    onClose();
  };

  const stepsList = [
    { num: 1, title: 'Treatment' },
    { num: 2, title: 'Clinician' },
    { num: 3, title: 'Date' },
    { num: 4, title: 'Times' },
    { num: 5, title: 'Patient' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-subtle">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {rescheduleAppointment
                    ? `Reschedule: ${rescheduleAppointment.patientName}`
                    : 'Apex Dental Appointment Booking'}
                </h2>
                {rescheduleAppointment && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                    Reschedule Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {rescheduleAppointment
                  ? 'Recalculating live optimal openings without double-booking the practice chair'
                  : 'Clinical practice scheduler with zero-wasted-chair-time recommendation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Navigation */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 justify-between max-w-lg mx-auto">
            {stepsList.map((step) => {
              const isActive = activeStep === step.num;
              const isPast = activeStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(step.num)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'text-dental-teal'
                      : isPast
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-dental-teal text-white'
                        : isPast
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : step.num}
                  </span>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: BROWSE TREATMENT BRANCHES & PROCEDURES */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Step 1: Browse Treatment Branches
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a dental specialty and designate a procedure
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {selectedService?.name}
                </span>
              </div>

              {/* Branch Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setSelectedBranch(b);
                      const s = servicesList.find((srv) => srv.branch === b);
                      if (s) setSelectedServiceId(s.id);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition whitespace-nowrap ${
                      selectedBranch === b
                        ? 'bg-dental-teal text-white border-dental-teal shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* Procedure Cards */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {branchServices.map((srv) => {
                  const isSelected = srv.id === selectedServiceId;
                  const specialty = BRANCH_SPECIALTY_BADGES[srv.branch];

                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-dental-teal bg-teal-50/70 ring-2 ring-dental-teal shadow-subtle'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${specialty.badge}`}>
                              {srv.branch}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">
                              {srv.name}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {srv.description}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-dental-teal text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Clock className="w-3 h-3 text-dental-teal" />
                          {srv.durationMinutes} min treatment
                        </span>
                        <span className="flex items-center gap-1 text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                          +{srv.cleanupBufferMinutes} min turnover
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CLINICIAN PREFERENCE */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 2: Clinician Preference
                </h3>
                <p className="text-xs text-slate-500">
                  Select your provider or choose "First Available Specialist" for maximum schedule flexibility
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Option 1: First Available Specialist (Recommended) */}
                <div
                  onClick={() => setSelectedClinicianPreference('first-available')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedClinicianPreference === 'first-available'
                      ? 'border-dental-teal bg-teal-50/70 ring-2 ring-dental-teal shadow-subtle'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-dental-teal" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          First Available Specialist (Recommended)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Balances clinician workload and gives you the earliest verified opening
                        </p>
                      </div>
                    </div>
                    {selectedClinicianPreference === 'first-available' && (
                      <Check className="w-4 h-4 text-dental-teal stroke-[2.5]" />
                    )}
                  </div>
                </div>

                {/* Specific Clinicians */}
                {staffList.map((staff) => {
                  const isCert = selectedService?.allowedStaffIds.includes(staff.id);
                  const isSelected = selectedClinicianPreference === staff.id;

                  return (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedClinicianPreference(staff.id)}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-dental-teal bg-teal-50/70 ring-2 ring-dental-teal shadow-subtle cursor-pointer'
                          : isCert
                          ? 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                          : 'border-slate-200 bg-slate-50 opacity-60 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full mt-0.5 shrink-0"
                            style={{ backgroundColor: staff.colorCode }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">
                                {staff.name}
                              </h4>
                              {isCert ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Certified
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Not Certified for this case
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                              {staff.role}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {staff.qualifications}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-dental-teal stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DATE SELECTION */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 3: Select Appointment Date
                </h3>
                <p className="text-xs text-slate-500">
                  Choose a date to evaluate real-time chair feasibility and openings
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Target Appointment Date
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-dental-teal"
                  />
                  <span className="text-xs font-semibold text-dental-teal mt-1.5 block">
                    {formatDateReadable(bookingDate)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBookingDate(new Date().toISOString().split('T')[0])}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setBookingDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RECOMMENDED TIMES */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Step 4: Select Appointment Opening
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated using the "Dead Chair Elimination" Scoring Engine
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {scoredSlots.length} Feasible Slots
                </span>
              </div>

              {scoredSlots.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3.5">
                  <AlertTriangle className="w-9 h-9 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-950">
                      All Surgery Suites & Clinicians Fully Booked on {formatDateReadable(bookingDate)}
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
                      No open chair fits the required treatment duration ({selectedService?.durationMinutes}m) and sterilization buffer for {selectedService?.name}.
                    </p>
                  </div>

                  {onJoinWaitlist && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onJoinWaitlist({
                            patientName: patientName.trim() || 'Priority Patient',
                            phone: patientPhone.trim() || '+44 7700 900555',
                            serviceId: selectedService.id,
                            preferredDate: bookingDate,
                            notes: `Requested ${selectedService.name} on ${bookingDate}. Priority auto-fill if surgery cancels.`,
                          });
                          onClose();
                        }}
                        className="px-5 py-2.5 bg-dental-teal hover:bg-dental-teal-dark text-white text-xs font-bold rounded-xl shadow-subtle inline-flex items-center gap-2 transition active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-teal-200" />
                        <span>Join Priority Waitlist</span>
                      </button>
                      <p className="text-[11px] text-amber-700 mt-1.5 font-medium">
                        Our chair tetris engine will instantly alert the clinic if a matching cancellation frees this day!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Recommended Times Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <span>⭐</span>
                        <span>Recommended Times (Zero Wasted Chair Time)</span>
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        {topRecommendedSlots.length} High-Yield
                      </span>
                    </div>

                    {topRecommendedSlots.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                        No slots reached the $\ge 75\%$ efficiency threshold today. Check other available times below.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {topRecommendedSlots.map((slot) => {
                          const isSelected =
                            selectedSlot?.startMinute === slot.startMinute &&
                            selectedSlot?.staffId === slot.staffId &&
                            selectedSlot?.operatoryId === slot.operatoryId;

                          const staff = staffMap.get(slot.staffId);
                          const op = opMap.get(slot.operatoryId);
                          const score = slot.score || 85;

                          return (
                            <div
                              key={`dialog-top-${slot.staffId}-${slot.operatoryId}-${slot.startMinute}`}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500 shadow-card'
                                  : 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 hover:bg-emerald-50/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  {minutesToFormatted12h(slot.startMinute)} – {minutesToFormatted12h(slot.endMinute)}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  ⭐ {score}% Fit
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                                <span className="truncate">{staff?.name}</span>
                                <span className="text-slate-500 truncate max-w-[120px]">
                                  {op?.name.split(' (')[0]}
                                </span>
                              </div>

                              <div className="mt-1 text-[10px] text-emerald-950 bg-emerald-100/70 p-1.5 rounded font-medium truncate">
                                {slot.recommendationReason}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Other Available Times Section */}
                  {otherAvailableSlots.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsOtherTimesOpen(!isOtherTimesOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>Other Available Times</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            ({otherAvailableSlots.length} openings with non-contiguous gaps)
                          </span>
                        </span>
                        {isOtherTimesOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {isOtherTimesOpen && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
                          {otherAvailableSlots.map((slot) => {
                            const isSelected =
                              selectedSlot?.startMinute === slot.startMinute &&
                              selectedSlot?.staffId === slot.staffId &&
                              selectedSlot?.operatoryId === slot.operatoryId;

                            const staff = staffMap.get(slot.staffId);
                            const op = opMap.get(slot.operatoryId);
                            const score = slot.score || 50;
                            const isLeak = score < 50;

                            return (
                              <div
                                key={`dialog-other-${slot.staffId}-${slot.operatoryId}-${slot.startMinute}`}
                                onClick={() => setSelectedSlot(slot)}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-dental-teal bg-teal-50 ring-2 ring-dental-teal shadow-card'
                                    : isLeak
                                    ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-800">
                                    {minutesToFormatted12h(slot.startMinute)} – {minutesToFormatted12h(slot.endMinute)}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                                      isLeak
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-sky-100 text-sky-800 border-sky-300'
                                    }`}
                                  >
                                    {score}% {isLeak ? '⚠️ Leak' : 'Open'}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                                  <span className="truncate">{staff?.name}</span>
                                  <span className="text-slate-400 truncate max-w-[100px]">
                                    {op?.name.split(' (')[0]}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {onJoinWaitlist && (
                    <div className="mt-3 p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-dental-teal shrink-0" />
                        <span className="text-teal-900 font-medium">
                          Looking for a different time? Join the priority waitlist to be alerted on cancellations.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onJoinWaitlist({
                            patientName: patientName.trim() || 'Priority Patient',
                            phone: patientPhone.trim() || '+44 7700 900555',
                            serviceId: selectedService.id,
                            preferredDate: bookingDate,
                            notes: `Flexible waitlist request for ${selectedService.name} on ${bookingDate}.`,
                          });
                          onClose();
                        }}
                        className="px-3 py-1 bg-white hover:bg-teal-50 text-dental-teal border border-teal-300 font-bold rounded-lg shrink-0 transition"
                      >
                        Join Priority Waitlist
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: PATIENT DETAILS */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 5: Patient Details & Confirmation
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm the appointment information and patient contact details
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-teal-950">
                  <span>Procedure:</span>
                  <span>{selectedService?.name}</span>
                </div>
                <div className="flex items-center justify-between text-teal-900">
                  <span>Scheduled Time:</span>
                  <span>
                    {selectedSlot
                      ? `${formatDateReadable(selectedSlot.date)} @ ${minutesToFormatted12h(selectedSlot.startMinute)}`
                      : 'None selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-teal-900">
                  <span>Assigned Clinician:</span>
                  <span>{staffMap.get(selectedSlot?.staffId || '')?.name}</span>
                </div>
                <div className="flex items-center justify-between text-teal-900">
                  <span>Surgery Suite:</span>
                  <span>{opMap.get(selectedSlot?.operatoryId || '')?.name.split(' (')[0]}</span>
                </div>
              </div>

              {/* Patient Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. William Shakespeare"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-dental-teal font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+44 7700 900555"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-dental-teal font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="flexible-booking-dialog"
                    checked={isFlexible}
                    onChange={(e) => setIsFlexible(e.target.checked)}
                    className="w-4 h-4 text-dental-teal rounded border-slate-300 focus:ring-dental-teal"
                  />
                  <label htmlFor="flexible-booking-dialog" className="text-xs text-slate-600 font-medium cursor-pointer">
                    <span className="font-semibold text-slate-800">Flexible Timing:</span> Patient is open to ±15-30m shift if needed for practice compaction.
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {activeStep < 5 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
                className="px-5 py-2.5 bg-dental-teal hover:bg-dental-teal-dark text-white font-bold text-xs rounded-xl shadow-subtle flex items-center gap-1.5 transition"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!patientName.trim() || !selectedSlot}
                onClick={handleCommitBooking}
                className="px-6 py-2.5 bg-dental-teal hover:bg-dental-teal-dark disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-card flex items-center gap-2 transition active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Save Booking</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
