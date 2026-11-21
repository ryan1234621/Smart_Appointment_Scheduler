import React, { useState, useMemo, useEffect } from 'react';
import {
  Appointment,
  DentalBranch,
  DentalService,
  Operatory,
  ScoredTimeSlot,
  StaffMember,
} from '../../types/scheduler';
import { minutesToDurationString, minutesToFormatted12h } from '../../engine/intervalMath';
import { findAvailableSlots } from '../../engine/slotFinder';
import { rankSlots } from '../../engine/tetrisScorer';
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
  Zap,
} from 'lucide-react';

interface BookingModalProps {
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
  onBookAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => void;
}

const BRANCHES: DentalBranch[] = [
  'Preventative',
  'Restorative',
  'Cosmetic',
  'Orthodontic',
  'Facial Surgery',
];

export const BookingModal: React.FC<BookingModalProps> = ({
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
  onBookAppointment,
}) => {
  if (!isOpen) return null;

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isFlexible, setIsFlexible] = useState(true);

  const [selectedBranch, setSelectedBranch] = useState<DentalBranch | 'All'>('All');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || servicesList[0]?.id || ''
  );
  const [bookingDate, setBookingDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);

  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || 'auto');
  const [selectedOperatoryId, setSelectedOperatoryId] = useState<string>(initialOperatoryId || 'auto');

  const [selectedSlot, setSelectedSlot] = useState<ScoredTimeSlot | null>(null);

  // When initial props change
  useEffect(() => {
    if (initialDate) setBookingDate(initialDate);
    if (initialStaffId) setSelectedStaffId(initialStaffId);
    if (initialOperatoryId) setSelectedOperatoryId(initialOperatoryId);
    if (initialServiceId) {
      setSelectedServiceId(initialServiceId);
      const s = servicesList.find((srv) => srv.id === initialServiceId);
      if (s) setSelectedBranch(s.branch);
    }
  }, [initialDate, initialStaffId, initialOperatoryId, initialServiceId, servicesList]);

  const selectedService = useMemo(() => {
    return servicesList.find((s) => s.id === selectedServiceId) || servicesList[0];
  }, [selectedServiceId, servicesList]);

  // Filtered services
  const filteredServices = useMemo(() => {
    if (selectedBranch === 'All') return servicesList;
    return servicesList.filter((s) => s.branch === selectedBranch);
  }, [selectedBranch, servicesList]);

  // Compute available and ranked slots using the Tetris engine
  const rankedSlots = useMemo(() => {
    if (!selectedService) return [];

    const slots = findAvailableSlots(
      selectedService,
      bookingDate,
      staffList,
      operatoriesList,
      appointments,
      {
        preferredStaffId: selectedStaffId !== 'auto' ? selectedStaffId : undefined,
        preferredOperatoryId: selectedOperatoryId !== 'auto' ? selectedOperatoryId : undefined,
      }
    );

    return rankSlots(slots, selectedService, staffList, operatoriesList, appointments);
  }, [selectedService, bookingDate, selectedStaffId, selectedOperatoryId, staffList, operatoriesList, appointments]);

  // Auto-select initial slot or top ranked slot
  useEffect(() => {
    if (rankedSlots.length > 0) {
      if (initialMinute) {
        const matchingSlot = rankedSlots.find((s) => s.startMinute === initialMinute);
        if (matchingSlot) {
          setSelectedSlot(matchingSlot);
          return;
        }
      }
      setSelectedSlot(rankedSlots[0]);
    } else {
      setSelectedSlot(null);
    }
  }, [rankedSlots, initialMinute]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !selectedSlot || !selectedService) return;

    onBookAppointment({
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || '+44 7700 900000',
      serviceId: selectedService.id,
      staffId: selectedSlot.staffId,
      operatoryId: selectedSlot.operatoryId,
      date: selectedSlot.date,
      startMinute: selectedSlot.startMinute,
      endMinute: selectedSlot.endMinute,
      bufferEndMinute: selectedSlot.endMinute + selectedService.cleanupBufferMinutes,
      isFlexible,
    });

    onClose();
  };

  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const opMap = new Map(operatoriesList.map((o) => [o.id, o]));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-subtle">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Smart Appointment Scheduler
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tetris-compacted slot optimization & chair turnaround management
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Patient Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Charlotte Bennett"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-dental-teal focus:border-transparent font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+44 7700 900123"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-dental-teal focus:border-transparent font-medium"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="isFlexible"
                checked={isFlexible}
                onChange={(e) => setIsFlexible(e.target.checked)}
                className="w-4 h-4 text-dental-teal rounded border-slate-300 focus:ring-dental-teal"
              />
              <label htmlFor="isFlexible" className="text-xs text-slate-600 font-medium cursor-pointer">
                <span className="font-semibold text-slate-800">Flexible Timing:</span> Patient is open to ±15-30m shift if needed for day compaction.
              </label>
            </div>
          </div>

          {/* Procedure Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Select Clinical Procedure
              </h3>
              <span className="text-xs text-slate-500">
                Total duration includes procedure + sterilization buffer
              </span>
            </div>

            {/* Branch Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedBranch('All')}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition whitespace-nowrap ${
                  selectedBranch === 'All'
                    ? 'bg-dental-teal text-white border-dental-teal shadow-xs'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                All Branches
              </button>
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBranch(b)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition whitespace-nowrap ${
                    selectedBranch === b
                      ? 'bg-dental-teal text-white border-dental-teal shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Procedure List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
              {filteredServices.map((srv) => {
                const isSelected = srv.id === selectedServiceId;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-dental-teal bg-teal-50/50 ring-1 ring-dental-teal shadow-subtle'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 leading-snug">
                        {srv.name}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 shrink-0">
                        {srv.branch}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {srv.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-600 pt-1.5 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {srv.durationMinutes}m proc
                      </span>
                      <span className="flex items-center gap-1 text-teal-700">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        +{srv.cleanupBufferMinutes}m buffer
                      </span>
                      <span className="capitalize text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {srv.requiredOperatoryType}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preferences Row: Date, Clinician, Operatory */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Preferred Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-dental-teal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Clinician Preference
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-dental-teal"
              >
                <option value="auto">✨ Auto (Optimal Fit)</option>
                {staffList
                  .filter((s) => selectedService?.allowedStaffIds.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Operatory Room
              </label>
              <select
                value={selectedOperatoryId}
                onChange={(e) => setSelectedOperatoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-dental-teal"
              >
                <option value="auto">✨ Auto (Optimal Room)</option>
                {operatoriesList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Smart Recommended Slots (Tetris Scorer) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-dental-teal" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Select Recommended Time Slot
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {rankedSlots.length} feasible slots found
              </span>
            </div>

            {rankedSlots.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-amber-50/70 border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-amber-900">
                  No Feasible Slots on Selected Date
                </h4>
                <p className="text-[11px] text-amber-700 mt-1">
                  Clinicians or operatories are fully booked. Try changing date, clinician, or add patient to the Waitlist for auto-assignment.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {/* 1. Top Recommended (Score >= 75) */}
                {rankedSlots.filter((s) => (s.score || 0) >= 75).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        ⭐ Top Recommended (Maximum Practice Efficiency)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-200">
                        {rankedSlots.filter((s) => (s.score || 0) >= 75).length} Optimal Slots
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rankedSlots
                        .filter((s) => (s.score || 0) >= 75)
                        .map((slot) => {
                          const isSelected =
                            selectedSlot?.startMinute === slot.startMinute &&
                            selectedSlot?.staffId === slot.staffId &&
                            selectedSlot?.operatoryId === slot.operatoryId;

                          const staff = staffMap.get(slot.staffId);
                          const op = opMap.get(slot.operatoryId);
                          const score = slot.score || 85;

                          return (
                            <div
                              key={`top-slot-${slot.staffId}-${slot.operatoryId}-${slot.startMinute}`}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all relative ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-card'
                                  : 'border-emerald-200/90 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  {minutesToFormatted12h(slot.startMinute)} – {minutesToFormatted12h(slot.endMinute)}
                                </span>

                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                                  <span>⭐</span>
                                  <span>{score}% Efficiency</span>
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                                <span className="truncate">{staff?.name}</span>
                                <span className="text-slate-500 truncate max-w-[120px]">
                                  {op?.name.split(' (')[0]}
                                </span>
                              </div>

                              {slot.recommendationReason && (
                                <div className="mt-1 text-[10px] text-emerald-900/90 bg-emerald-100/60 border border-emerald-200/60 px-1.5 py-0.5 rounded font-medium truncate">
                                  {slot.recommendationReason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 2. Other Available Openings (Score < 75) */}
                {rankedSlots.filter((s) => (s.score || 0) < 75).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Other Available Openings
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {rankedSlots.filter((s) => (s.score || 0) < 75).length} Secondary Slots
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rankedSlots
                        .filter((s) => (s.score || 0) < 75)
                        .map((slot) => {
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
                              key={`other-slot-${slot.staffId}-${slot.operatoryId}-${slot.startMinute}`}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all relative ${
                                isSelected
                                  ? 'border-dental-teal bg-teal-50/60 ring-2 ring-dental-teal shadow-card'
                                  : isLeak
                                  ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {minutesToFormatted12h(slot.startMinute)} – {minutesToFormatted12h(slot.endMinute)}
                                </span>

                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    isLeak
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-sky-100 text-sky-800 border-sky-300'
                                  }`}
                                >
                                  {score}% {isLeak ? '⚠️ Leak' : 'Opening'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                                <span className="truncate">{staff?.name}</span>
                                <span className="text-slate-500 truncate max-w-[120px]">
                                  {op?.name.split(' (')[0]}
                                </span>
                              </div>

                              {slot.recommendationReason && (
                                <div
                                  className={`mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${
                                    isLeak
                                      ? 'bg-amber-100/70 text-amber-900 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {slot.recommendationReason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!selectedSlot || !patientName.trim()}
              className="px-5 py-2.5 bg-dental-teal hover:bg-dental-teal-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-card transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm & Lock Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
