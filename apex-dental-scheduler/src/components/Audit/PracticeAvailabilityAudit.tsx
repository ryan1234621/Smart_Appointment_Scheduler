import React, { useState, useMemo } from 'react';
import {
  Appointment,
  DentalBranch,
  DentalService,
  Operatory,
  StaffMember,
  TimeSlot,
} from '../../types/scheduler';
import { findFeasibleSlots, isOperatorySuitable } from '../../engine/slotFinder';
import { rankSlots } from '../../engine/tetrisScorer';
import {
  formatDateReadable,
  minutesToDurationString,
  minutesToFormatted12h,
  minutesToTimeString,
} from '../../engine/intervalMath';
import {
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  Building2,
  Coffee,
  Check,
  ArrowRight,
  Plus,
  HelpCircle,
  FileCheck2,
  Search,
} from 'lucide-react';

interface PracticeAvailabilityAuditProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  servicesList: DentalService[];
  appointments: Appointment[];
  onBookSlot: (slot: TimeSlot, service: DentalService) => void;
}

const BRANCHES: DentalBranch[] = [
  'Preventative',
  'Restorative',
  'Cosmetic',
  'Orthodontic',
  'Facial Surgery',
];

const BRANCH_CONFIG: Record<
  DentalBranch,
  { label: string; bg: string; text: string; border: string; desc: string; icon: string }
> = {
  'Preventative': {
    label: 'Preventative',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-300',
    desc: 'Scale & Polish, Periodontal Therapy (Dedicated Cavitron Bay A)',
    icon: '🦷',
  },
  'Restorative': {
    label: 'Restorative',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    desc: 'Nano-Hybrid Fillings, Crown Preps, Endodontics (Suite 2 & Suite 1)',
    icon: '🛡️',
  },
  'Cosmetic': {
    label: 'Cosmetic',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
    desc: 'Laser Whitening, Veneers, Edge Bonding (Operatory Suite 2)',
    icon: '✨',
  },
  'Orthodontic': {
    label: 'Orthodontic',
    bg: 'bg-pink-50',
    text: 'text-pink-800',
    border: 'border-pink-300',
    desc: 'Aligner 3D Scans, Attachments, Refinements (Suite 2)',
    icon: '📐',
  },
  'Facial Surgery': {
    label: 'Facial Surgery',
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-400',
    desc: 'Wisdom Extractions, Implants, Sinus Lifts (Mandatory HEPA Suite 1)',
    icon: '🏥',
  },
};

export const PracticeAvailabilityAudit: React.FC<PracticeAvailabilityAuditProps> = ({
  currentDate,
  onDateChange,
  staffList,
  operatoriesList,
  servicesList,
  appointments,
  onBookSlot,
}) => {
  // Practice Owner Selection State
  const [selectedBranch, setSelectedBranch] = useState<DentalBranch>('Facial Surgery');
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('all');

  // Filter services by active branch
  const branchServices = useMemo(() => {
    return servicesList.filter((s) => s.branch === selectedBranch);
  }, [servicesList, selectedBranch]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    branchServices[0]?.id || servicesList[0]?.id || ''
  );

  // Sync selected service when branch changes
  React.useEffect(() => {
    if (branchServices.length > 0) {
      const exists = branchServices.some((s) => s.id === selectedServiceId);
      if (!exists) {
        setSelectedServiceId(branchServices[0].id);
      }
    }
  }, [selectedBranch, branchServices, selectedServiceId]);

  const activeService = useMemo(() => {
    return servicesList.find((s) => s.id === selectedServiceId) || branchServices[0] || servicesList[0];
  }, [servicesList, selectedServiceId, branchServices]);

  // Execute Phase 2 Feasibility Engine
  const feasibleSlots = useMemo(() => {
    if (!activeService) return [];

    return findFeasibleSlots({
      date: currentDate,
      serviceId: activeService.id,
      preferredStaffId: selectedClinicianId !== 'all' ? selectedClinicianId : undefined,
      bookings: appointments,
      staffList,
      operatories: operatoriesList,
      services: servicesList,
    });
  }, [activeService, currentDate, selectedClinicianId, appointments, staffList, operatoriesList, servicesList]);

  // Rank feasible slots for display with Tetris scoring metadata
  const scoredSlots = useMemo(() => {
    if (!activeService || feasibleSlots.length === 0) return [];
    return rankSlots(feasibleSlots, activeService, staffList, operatoriesList, appointments);
  }, [feasibleSlots, activeService, staffList, operatoriesList, appointments]);

  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const opMap = new Map(operatoriesList.map((o) => [o.id, o]));

  // Certified staff for active service
  const certifiedStaff = staffList.filter((s) =>
    activeService?.allowedStaffIds.includes(s.id)
  );

  // Suitable operatories for active service
  const suitableRooms = operatoriesList.filter((op) =>
    activeService ? isOperatorySuitable(op, activeService) : false
  );

  // Check if selected clinician is certified
  const isSelectedClinicianCertified =
    selectedClinicianId === 'all' ||
    (activeService && activeService.allowedStaffIds.includes(selectedClinicianId));

  const totalOccupancyMinutes =
    (activeService?.durationMinutes || 0) + (activeService?.cleanupBufferMinutes || 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Clinical Feasibility Context */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-elevated relative overflow-hidden border border-teal-700/50">
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-teal-400/20 border border-teal-300/30 text-teal-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <FileCheck2 className="w-3 h-3 text-teal-300" />
              Practice Owner Clinical Feasibility Engine · Phase 2
            </span>
            <span className="text-teal-300/80 text-xs font-mono">
              Dual-Resource Synchronization
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            Practice Availability Audit
          </h2>
          <p className="text-xs text-teal-100/90 mt-1.5 leading-relaxed max-w-3xl">
            In private dental surgery, an empty chair does not guarantee bookability. Every mathematically safe appointment
            opening requires synchronized alignment between a <strong className="text-white underline decoration-teal-400">certified clinician</strong>, an <strong className="text-white underline decoration-teal-400">appropriately equipped operatory</strong>, and <strong className="text-white underline decoration-teal-400">mandatory post-op sterilization turnover</strong> with protected lunch hour bounds.
          </p>
        </div>

        {/* Subtle decorative background watermark */}
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none text-white">
          <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8 2 6 5 6 9c0 4 2 13 4 13s2-6 2-6 0 6 2 6 4-9 4-13c0-4-2-7-6-7z" />
          </svg>
        </div>
      </div>

      {/* Main Audit Control Center */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 space-y-6">
        {/* Step 1: Select Dental Treatment Branch */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              Select Clinical Treatment Branch
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              5 private surgery branches
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {BRANCHES.map((branch) => {
              const cfg = BRANCH_CONFIG[branch];
              const isSelected = selectedBranch === branch;

              return (
                <button
                  key={branch}
                  type="button"
                  onClick={() => setSelectedBranch(branch)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-dental-teal bg-teal-50/70 ring-2 ring-dental-teal shadow-subtle'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{cfg.icon}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-dental-teal stroke-[2.5]" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">
                    {branch}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                    {cfg.desc.split('(')[0]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Procedure & Clinician Filter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          {/* Procedure Picker */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[11px] font-bold">
                2
              </span>
              Designated Procedure ({branchServices.length} available)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {branchServices.map((srv) => {
                const isSelected = srv.id === selectedServiceId;

                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-dental-teal bg-teal-50/80 ring-1.5 ring-dental-teal shadow-subtle'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 leading-snug">
                        {srv.name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {srv.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-600">
                      <span className="flex items-center gap-1 text-slate-800 font-bold">
                        <Clock className="w-3 h-3 text-dental-teal" />
                        {srv.durationMinutes}m proc
                      </span>
                      <span className="flex items-center gap-1 text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        +{srv.cleanupBufferMinutes}m turnover
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Parameters: Clinician & Date */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Audit Constraints & Scope
              </span>

              {/* Date Input */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Audit Date
                </label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-dental-teal"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {formatDateReadable(currentDate)}
                </span>
              </div>

              {/* Clinician Preference Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Clinician Scope
                </label>
                <select
                  value={selectedClinicianId}
                  onChange={(e) => setSelectedClinicianId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-dental-teal"
                >
                  <option value="all">✨ Any Available Certified Clinician</option>
                  {staffList.map((s) => {
                    const isCert = activeService?.allowedStaffIds.includes(s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role}) {isCert ? '✓ Certified' : '⚠️ Not Certified'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Total Block Summary */}
            <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Procedure Time:</span>
                <span className="font-bold text-slate-800">
                  {activeService?.durationMinutes} minutes
                </span>
              </div>
              <div className="flex items-center justify-between text-teal-800 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-teal-600" />
                  Mandatory Turnover:
                </span>
                <span className="font-bold">
                  +{activeService?.cleanupBufferMinutes} minutes
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-900 font-extrabold pt-1 border-t border-slate-200">
                <span>Total Simultaneous Block:</span>
                <span className="text-dental-teal">
                  {totalOccupancyMinutes} minutes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Dual-Resource Verification Rules Card */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Dual-Resource Feasibility Engine Checklist
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Synchronized Clinician + Operatory Rules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Clinical Skills Rule */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-dental-teal" />
                Certified Clinicians
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                {certifiedStaff.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 text-slate-700 font-medium truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.colorCode }}
                    />
                    <span className="truncate">{s.name} ({s.role})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Operatory Suitability Rule */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <Building2 className="w-3.5 h-3.5 text-dental-teal" />
                Equipped Surgery Suites
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                {suitableRooms.map((op) => (
                  <div key={op.id} className="flex items-center justify-between text-slate-700 font-medium">
                    <span className="truncate">{op.name.split(' (')[0]}</span>
                    <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 px-1 rounded border border-teal-200">
                      {op.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Sterilization Turnover & Protected Breaks */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                Protected Bounds Enforced
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Turnover buffer (+{activeService?.cleanupBufferMinutes}m) locks both chair and clinician. Guaranteed lunch/break protection and working shift bounds applied.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Audit Results: Mathematically Safe Openings */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 space-y-4">
        {/* Results Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-dental-teal animate-pulse" />
            <h3 className="text-base font-extrabold text-slate-900">
              Mathematically Feasible Appointment Openings
            </h3>
            <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
              {scoredSlots.length} Safe Openings
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
            <span>Interval Step: <strong>15 minutes</strong></span>
            <span>Date: <strong>{currentDate}</strong></span>
          </div>
        </div>

        {/* Warning if owner selected an uncertified clinician */}
        {!isSelectedClinicianCertified && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Clinician Certification Mismatch
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                The selected clinician is not certified to perform <strong>{activeService?.name}</strong>. Under clinical surgical governance, this procedure may only be performed by: {certifiedStaff.map((s) => s.name).join(', ')}.
              </p>
            </div>
          </div>
        )}

        {/* Zero Openings State */}
        {scoredSlots.length === 0 && isSelectedClinicianCertified && (
          <div className="p-10 text-center rounded-xl bg-slate-50 border border-slate-200">
            <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              Zero Mathematically Feasible Openings on {currentDate}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              All potential candidate slots conflict with existing bookings, required sterilization turnover buffers (+{activeService?.cleanupBufferMinutes}m), or clinician shift and protected lunch bounds.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 1);
                  onDateChange(d.toISOString().split('T')[0]);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-dental-teal text-white rounded-lg shadow-xs hover:bg-dental-teal-dark transition flex items-center gap-1.5"
              >
                <span>Audit Next Day</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Grouped Openings: Top Recommended (Maximum Practice Efficiency) vs Other Available Openings */}
        {scoredSlots.length > 0 && (
          <div className="space-y-6">
            {/* 1. TOP RECOMMENDED (MAXIMUM PRACTICE EFFICIENCY) */}
            {scoredSlots.filter((s) => (s.score || 0) >= 75).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Top Recommended (Maximum Practice Efficiency)
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Snaps flush against boundaries, eliminates unfillable dead gaps, and locks peak revenue density
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-xs">
                    {scoredSlots.filter((s) => (s.score || 0) >= 75).length} High-Yield Openings
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {scoredSlots
                    .filter((s) => (s.score || 0) >= 75)
                    .map((slot) => {
                      const staff = staffMap.get(slot.staffId);
                      const op = opMap.get(slot.operatoryId);
                      const score = slot.score || 85;
                      const bufferEndMinute = slot.endMinute + (activeService?.cleanupBufferMinutes || 15);

                      return (
                        <div
                          key={`top-slot-${slot.staffId}-${slot.operatoryId}-${slot.startMinute}`}
                          className="p-4 rounded-xl border-2 border-emerald-300 bg-white hover:border-emerald-400 hover:shadow-card transition-all flex flex-col justify-between space-y-3 relative group"
                        >
                          {/* Top Row: Time & Efficiency Score Tag */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="text-sm font-bold text-slate-900">
                                  {minutesToFormatted12h(slot.startMinute)} – {minutesToFormatted12h(slot.endMinute)}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {minutesToTimeString(slot.startMinute)} to {minutesToTimeString(slot.endMinute)} ({activeService?.durationMinutes}m)
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                <span>⭐</span>
                                <span>{score}% Efficiency</span>
                              </span>
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                Maximum Yield
                              </span>
                            </div>
                          </div>

                          {/* Dual Resource Allocation: Clinician & Room */}
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: staff?.colorCode }}
                                />
                                <span className="font-bold text-slate-800 truncate">
                                  {staff?.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 shrink-0">
                                {staff?.role.replace('Principal ', '')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <div className="flex items-center gap-1 text-slate-700 font-medium truncate">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{op?.name.split(' (')[0]}</span>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-100/70 px-1 rounded shrink-0">
                                {op?.type}
                              </span>
                            </div>
                          </div>

                          {/* Sanitization Turnover Buffer Details */}
                          <div className="p-2 rounded-lg bg-teal-50/60 border border-teal-200/50 text-[10px] text-teal-900 font-medium flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              Sterilization Turnover:
                            </span>
                            <span className="font-bold">
                              +{activeService?.cleanupBufferMinutes}m (Occupied to {minutesToFormatted12h(bufferEndMinute)})
                            </span>
                          </div>

                          {/* Plain-English Clinical Rationale */}
                          <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-[11px] text-emerald-950 font-medium">
                            {slot.recommendationReason}
                          </div>

                          {/* Book Opening Button */}
                          <button
                            type="button"
                            onClick={() => onBookSlot(slot, activeService)}
                            className="w-full py-2 bg-dental-teal hover:bg-dental-teal-dark text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Book Top Opening</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. OTHER AVAILABLE OPENINGS (Standard or Revenue Leak Warning) */}
            {scoredSlots.filter((s) => (s.score || 0) < 75).length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Other Available Openings
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Feasible appointments that leave non-contiguous intervals or unfillable dead gaps (&lt;30m)
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
                    {scoredSlots.filter((s) => (s.score || 0) < 75).length} Secondary Openings
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {scoredSlots
                    .filter((s) => (s.score || 0) < 75)
                    .map((slot) => {
                      const staff = staffMap.get(slot.staffId);
                      const op = opMap.get(slot.operatoryId);
                      const score = slot.score || 50;
                      const bufferEndMinute = slot.endMinute + (activeService?.cleanupBufferMinutes || 15);
                      const isLeak = score < 50;

                      return (
                        <div
                          key={`other-slot-${slot.staffId}-${slot.operatoryId}-${slot.startMinute}`}
                          className={`p-4 rounded-xl border transition-all bg-white flex flex-col justify-between space-y-3 relative group ${
                            isLeak
                              ? 'border-amber-300/80 bg-amber-50/20 hover:border-amber-400'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Top Row: Time & Efficiency Tag */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-sm font-bold text-slate-900">
                                  {minutesToFormatted12h(slot.startMinute)} – {minutesToFormatted12h(slot.endMinute)}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {minutesToTimeString(slot.startMinute)} to {minutesToTimeString(slot.endMinute)} ({activeService?.durationMinutes}m)
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isLeak
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-sky-100 text-sky-900 border-sky-300'
                                }`}
                              >
                                {score}% Efficiency
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                  isLeak
                                    ? 'text-amber-800 bg-amber-50'
                                    : 'text-slate-600 bg-slate-100'
                                }`}
                              >
                                {isLeak ? '⚠️ Revenue Leak' : 'Standard Opening'}
                              </span>
                            </div>
                          </div>

                          {/* Dual Resource Allocation: Clinician & Room */}
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: staff?.colorCode }}
                                />
                                <span className="font-bold text-slate-800 truncate">
                                  {staff?.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 shrink-0">
                                {staff?.role.replace('Principal ', '')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <div className="flex items-center gap-1 text-slate-700 font-medium truncate">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{op?.name.split(' (')[0]}</span>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-slate-700 bg-slate-200/70 px-1 rounded shrink-0">
                                {op?.type}
                              </span>
                            </div>
                          </div>

                          {/* Sanitization Turnover Buffer Details */}
                          <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200 text-[10px] text-slate-700 font-medium flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-slate-500" />
                              Turnover Buffer:
                            </span>
                            <span className="font-semibold">
                              +{activeService?.cleanupBufferMinutes}m (Occupied to {minutesToFormatted12h(bufferEndMinute)})
                            </span>
                          </div>

                          {/* Plain-English Clinical Rationale */}
                          <div
                            className={`p-2 rounded-lg text-[11px] font-medium border ${
                              isLeak
                                ? 'bg-amber-50 text-amber-950 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {slot.recommendationReason}
                          </div>

                          {/* Book Opening Button */}
                          <button
                            type="button"
                            onClick={() => onBookSlot(slot, activeService)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Book Opening</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
