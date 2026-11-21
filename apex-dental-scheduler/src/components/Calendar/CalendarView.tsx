import React, { useState, useMemo } from 'react';
import {
  Appointment,
  DentalBranch,
  DentalService,
  Operatory,
  StaffMember,
  ViewMode,
} from '../../types/scheduler';
import {
  formatDateReadable,
  getDayOfWeekKey,
  minutesToDurationString,
  minutesToFormatted12h,
  minutesToTimeString,
} from '../../engine/intervalMath';
import { BreakCard } from './BreakCard';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Users,
  Building2,
  PlusCircle,
  Activity,
  Layers,
  X,
  Shuffle,
  ShieldCheck,
  CalendarDays,
  Smartphone,
  Plus,
} from 'lucide-react';

interface CalendarViewProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  servicesList: DentalService[];
  appointments: Appointment[];
  onCancelAppointment: (id: string) => void;
  onToggleFlexible: (id: string) => void;
  onSelectAppointment: (apt: Appointment) => void;
  onQuickBookSlot: (columnId: string, minute: number, isOperatory: boolean) => void;
}

const GRID_START_MINUTE = 480; // 08:00 AM
const GRID_END_MINUTE = 1080;  // 18:00 PM (6:00 PM)
const TOTAL_MINUTES = GRID_END_MINUTE - GRID_START_MINUTE;
const PIXELS_PER_MINUTE = 1.35; // ~810px total grid height

// Specialty Color Schemes requested in Phase 4:
// - Preventative: Mint / Emerald
// - Restorative: Ocean Sky Blue
// - Cosmetic: Amethyst Violet
// - Orthodontic: Warm Amber
// - Facial Surgery: Surgical Crimson / Rose
const SPECIALTY_STYLES: Record<
  DentalBranch,
  { bg: string; text: string; border: string; badge: string; accent: string }
> = {
  'Preventative': {
    bg: 'bg-emerald-50/95',
    text: 'text-emerald-950',
    border: 'border-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    accent: '#10B981',
  },
  'Restorative': {
    bg: 'bg-sky-50/95',
    text: 'text-sky-950',
    border: 'border-sky-400',
    badge: 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
    accent: '#0284C7',
  },
  'Cosmetic': {
    bg: 'bg-purple-50/95',
    text: 'text-purple-950',
    border: 'border-purple-400',
    badge: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    accent: '#8B5CF6',
  },
  'Orthodontic': {
    bg: 'bg-amber-50/95',
    text: 'text-amber-950',
    border: 'border-amber-400',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    accent: '#F59E0B',
  },
  'Facial Surgery': {
    bg: 'bg-rose-50/95',
    text: 'text-rose-950',
    border: 'border-rose-500',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    accent: '#F43F5E',
  },
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  onDateChange,
  staffList,
  operatoriesList,
  servicesList,
  appointments,
  onCancelAppointment,
  onToggleFlexible,
  onSelectAppointment,
  onQuickBookSlot,
}) => {
  // Practice Management Grid Mode: View by Clinician vs. View by Surgery Suite
  const [managementView, setManagementView] = useState<'clinician' | 'suite'>('suite');
  const [timeScale, setTimeScale] = useState<'day' | 'week'>('day');
  const [hoveredSlot, setHoveredSlot] = useState<{ colId: string; minute: number } | null>(null);

  const dayKey = getDayOfWeekKey(currentDate);

  // Filter active day bookings
  const dayAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.date === currentDate && a.status !== 'cancelled'
    );
  }, [appointments, currentDate]);

  const serviceMap = useMemo(() => new Map(servicesList.map((s) => [s.id, s])), [servicesList]);
  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  const operatoryMap = useMemo(() => new Map(operatoriesList.map((o) => [o.id, o])), [operatoriesList]);

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  // 30-minute intervals for grid lines
  const intervalMarkers: number[] = [];
  for (let m = GRID_START_MINUTE; m < GRID_END_MINUTE; m += 30) {
    intervalMarkers.push(m);
  }

  // Week days for Mobile Day Selector Pills (Mon - Sat)
  const weekDays = useMemo(() => {
    const [year, month, day] = currentDate.split('-').map(Number);
    const curr = new Date(year, month - 1, day);
    // Find Monday of this week
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMon);

    const days: Array<{ dateStr: string; label: string; dayNum: number; isToday: boolean }> = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = d.toISOString().split('T')[0];
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        dateStr: str,
        label: weekdayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: str === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  // Mobile Chronological Feed items
  const chronologicalMobileItems = useMemo(() => {
    const sorted = [...dayAppointments].sort((a, b) => a.startMinute - b.startMinute);
    return sorted;
  }, [dayAppointments]);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden flex flex-col flex-1">
      {/* Practice Grid Header & Switchers */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
        {/* Date Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-subtle">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-dental-teal" />
            <span className="text-sm font-extrabold text-slate-900">
              {formatDateReadable(currentDate)}
            </span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="opacity-0 w-0 h-0 pointer-events-none absolute"
              id="calendar-date-jump"
            />
            <label
              htmlFor="calendar-date-jump"
              className="text-xs text-dental-teal hover:underline font-semibold cursor-pointer ml-1"
            >
              Jump
            </label>
          </div>
        </div>

        {/* View Toggle Controls: Day/Week & Clinician/Surgery Suite */}
        <div className="flex items-center gap-2.5">
          {/* Day / Week Selector */}
          <div className="hidden sm:flex items-center bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setTimeScale('day')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                timeScale === 'day'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day Grid
            </button>
            <button
              onClick={() => setTimeScale('week')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                timeScale === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week View
            </button>
          </div>

          {/* Practice Management Grid Mode: View by Clinician vs. View by Surgery Suite */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setManagementView('suite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                managementView === 'suite'
                  ? 'bg-white text-dental-teal shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Surgery Suites</span>
            </button>

            <button
              onClick={() => setManagementView('clinician')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                managementView === 'clinician'
                  ? 'bg-white text-dental-teal shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clinicians</span>
            </button>
          </div>
        </div>
      </div>

      {/* Specialty Legend Bar */}
      <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Dental Specialties:
        </span>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Preventative (Mint)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-900">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            Restorative (Ocean Blue)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-900">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            Cosmetic (Violet)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Orthodontic (Amber)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-900">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Facial Surgery (Crimson)
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. DESKTOP PRACTICE GRID (Visible on md and up) */}
      {/* ============================================================== */}
      <div className="hidden md:flex flex-col flex-1 overflow-x-auto">
        <div className="min-w-[840px] flex-1 flex flex-col">
          {/* Column Headers */}
          <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-slate-200 bg-slate-100/70 sticky top-0 z-20">
            <div className="p-3 border-r border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Time
            </div>

            {managementView === 'suite'
              ? operatoriesList.map((op) => {
                  const roomApts = dayAppointments.filter((a) => a.operatoryId === op.id);
                  const bookedMins = roomApts.reduce(
                    (acc, a) => acc + (a.endMinute - a.startMinute),
                    0
                  );

                  return (
                    <div
                      key={op.id}
                      className="p-3 border-r last:border-r-0 border-slate-200 flex flex-col justify-between bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">
                            {op.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {op.chairModel}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            op.type === 'surgical'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : op.type === 'hygiene'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {op.type}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-slate-400" />
                          {roomApts.length} procedures
                        </span>
                        <span className="font-semibold text-slate-700">
                          {minutesToDurationString(bookedMins)} booked
                        </span>
                      </div>
                    </div>
                  );
                })
              : staffList.map((staff) => {
                  const shift = staff.shifts[dayKey];
                  const staffApts = dayAppointments.filter((a) => a.staffId === staff.id);

                  return (
                    <div
                      key={staff.id}
                      className="p-3 border-r last:border-r-0 border-slate-200 flex flex-col justify-between bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full ring-2 ring-white shadow-xs"
                              style={{ backgroundColor: staff.colorCode }}
                            />
                            <h3 className="text-sm font-bold text-slate-900">
                              {staff.name}
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-dental-teal block mt-0.5">
                            {staff.role}
                          </span>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {staff.qualifications}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {shift ? `${minutesToTimeString(shift.startMinute)} - ${minutesToTimeString(shift.endMinute)}` : 'Off'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
                        <span>{staffApts.length} procedures</span>
                        <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          On Duty
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Time Grid Canvas with 30-minute intervals */}
          <div
            className="grid grid-cols-[80px_repeat(3,1fr)] relative"
            style={{ height: `${TOTAL_MINUTES * PIXELS_PER_MINUTE}px` }}
          >
            {/* Left-hand Time Ruler (30-min labels) */}
            <div className="border-r border-slate-200 bg-slate-50/50 select-none relative">
              {intervalMarkers.map((min) => {
                const top = (min - GRID_START_MINUTE) * PIXELS_PER_MINUTE;
                const isHour = min % 60 === 0;

                return (
                  <div
                    key={min}
                    className="absolute right-2 -translate-y-1/2 text-right"
                    style={{ top: `${top}px` }}
                  >
                    <span
                      className={`block font-semibold ${
                        isHour ? 'text-xs text-slate-700 font-bold' : 'text-[11px] text-slate-400'
                      }`}
                    >
                      {minutesToFormatted12h(min)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Grid Guidelines (every 30 mins) */}
            <div className="absolute inset-0 pointer-events-none left-[80px]">
              {intervalMarkers.map((min) => {
                const top = (min - GRID_START_MINUTE) * PIXELS_PER_MINUTE;
                const isHour = min % 60 === 0;

                return (
                  <div
                    key={`line-${min}`}
                    className={`absolute left-0 right-0 border-t ${
                      isHour ? 'border-slate-200' : 'border-slate-200/60 border-dashed'
                    }`}
                    style={{ top: `${top}px` }}
                  />
                );
              })}
            </div>

            {/* Columns (Suites or Clinicians) */}
            {(managementView === 'suite' ? operatoriesList : staffList).map((col) => {
              const colId = col.id;
              const isSuite = managementView === 'suite';

              const colAppointments = dayAppointments.filter((a) =>
                isSuite ? a.operatoryId === colId : a.staffId === colId
              );

              // Breaks to render in this column
              let colBreaks: Array<{ startMinute: number; endMinute: number; label: string }> = [];
              if (!isSuite) {
                const s = staffList.find((st) => st.id === colId);
                colBreaks = s?.breaks[dayKey] || [];
              } else {
                if (colId === 'suite-1') {
                  const aris = staffList.find((s) => s.id === 'dr-julian-aris');
                  colBreaks = aris?.breaks[dayKey] || [];
                } else if (colId === 'suite-2') {
                  const chen = staffList.find((s) => s.id === 'dr-elena-chen');
                  colBreaks = chen?.breaks[dayKey] || [];
                } else if (colId === 'bay-a') {
                  const lin = staffList.find((s) => s.id === 'maya-lin');
                  colBreaks = lin?.breaks[dayKey] || [];
                }
              }

              return (
                <div
                  key={colId}
                  className="border-r last:border-r-0 border-slate-200 relative group/col cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetY = e.clientY - rect.top;
                    const clickedMinute = GRID_START_MINUTE + Math.floor(offsetY / PIXELS_PER_MINUTE);
                    const snappedMinute = Math.floor(clickedMinute / 15) * 15;
                    onQuickBookSlot(colId, snappedMinute, isSuite);
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetY = e.clientY - rect.top;
                    const minute = GRID_START_MINUTE + Math.floor(offsetY / PIXELS_PER_MINUTE);
                    const snapped = Math.floor(minute / 15) * 15;
                    setHoveredSlot({ colId, minute: snapped });
                  }}
                  onMouseLeave={() => setHoveredSlot(null)}
                >
                  {/* Lunch / Decontamination Breaks */}
                  {colBreaks.map((b, idx) => (
                    <BreakCard
                      key={`break-${colId}-${idx}`}
                      label={b.label}
                      startMinute={b.startMinute}
                      endMinute={b.endMinute}
                      pixelsPerMinute={PIXELS_PER_MINUTE}
                      gridStartMinute={GRID_START_MINUTE}
                    />
                  ))}

                  {/* Specialty Treatment Cards */}
                  {colAppointments.map((apt) => {
                    const srv = serviceMap.get(apt.serviceId);
                    const staff = staffMap.get(apt.staffId);
                    const operatory = operatoryMap.get(apt.operatoryId);

                    const branch = srv?.branch || 'Restorative';
                    const styles = SPECIALTY_STYLES[branch] || SPECIALTY_STYLES['Restorative'];

                    const top = (apt.startMinute - GRID_START_MINUTE) * PIXELS_PER_MINUTE;
                    const procedureHeight = (apt.endMinute - apt.startMinute) * PIXELS_PER_MINUTE;
                    const bufferDuration = apt.bufferEndMinute - apt.endMinute;
                    const bufferHeight = bufferDuration * PIXELS_PER_MINUTE;
                    const totalHeight = procedureHeight + bufferHeight;

                    return (
                      <div
                        key={apt.id}
                        className="absolute left-1 right-1 transition-all duration-150 group z-10"
                        style={{
                          top: `${top}px`,
                          height: `${totalHeight}px`,
                        }}
                      >
                        {/* Procedure block */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAppointment(apt);
                          }}
                          className={`w-full rounded-t-md rounded-b-none border-l-4 border-t border-r shadow-subtle ${styles.bg} ${styles.border} p-2 cursor-pointer flex flex-col justify-between overflow-hidden relative hover:shadow-card transition-shadow`}
                          style={{ height: `${procedureHeight}px` }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles.badge}`}>
                                  {branch}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-white/80 border border-slate-200 px-1 rounded">
                                  {operatory?.name.split(' (')[0] || 'Suite'}
                                </span>
                                {apt.isFlexible && (
                                  <span
                                    title="Flexible timing"
                                    className="text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 rounded flex items-center gap-0.5"
                                  >
                                    <Shuffle className="w-2.5 h-2.5" /> Flex
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                                {apt.patientName}
                              </h4>
                              <p className="text-[11px] font-medium text-slate-700 truncate">
                                {srv?.name || 'Treatment'}
                              </p>
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFlexible(apt.id);
                                }}
                                title="Toggle flexible"
                                className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 shadow-sm"
                              >
                                <Shuffle className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelAppointment(apt.id);
                                }}
                                title="Cancel"
                                className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600 shadow-sm"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Bottom info row */}
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium pt-1 mt-auto border-t border-slate-200/50">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>
                                {minutesToFormatted12h(apt.startMinute)} – {minutesToFormatted12h(apt.endMinute)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {staff && (
                                <span
                                  className="inline-block w-2 h-2 rounded-full ring-1 ring-white"
                                  style={{ backgroundColor: staff.colorCode }}
                                  title={staff.name}
                                />
                              )}
                              <span className="text-[10px] text-slate-600 font-bold truncate max-w-[80px]">
                                {staff?.name.replace('Dr. ', '')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Subtle Striped Sanitization Buffer block */}
                        {bufferHeight > 0 && (
                          <div
                            title={`Mandatory Sterilization & Sanitization Buffer: ${bufferDuration} mins`}
                            className="w-full bg-buffer-stripes border-l-4 border-b border-r border-teal-500/40 rounded-b-md flex items-center justify-center px-1 text-[9px] font-bold text-teal-900/90 tracking-wide select-none"
                            style={{ height: `${bufferHeight}px` }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <ShieldCheck className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                              <span>Turnover Buffer (+{bufferDuration}m)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Interactive Quick-Book Slot Hover Indicator */}
                  {hoveredSlot && hoveredSlot.colId === colId && (
                    <div
                      className="absolute left-2 right-2 border-2 border-dashed border-teal-500/70 bg-teal-500/10 rounded-md pointer-events-none z-0 flex items-center justify-between px-3 text-xs font-semibold text-teal-800"
                      style={{
                        top: `${(hoveredSlot.minute - GRID_START_MINUTE) * PIXELS_PER_MINUTE}px`,
                        height: `${30 * PIXELS_PER_MINUTE}px`,
                      }}
                    >
                      <span className="flex items-center gap-1 font-bold">
                        <PlusCircle className="w-3.5 h-3.5 text-dental-teal" />
                        Quick Book
                      </span>
                      <span className="font-mono">{minutesToFormatted12h(hoveredSlot.minute)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MOBILE VIEW: DAY PILLS & CHRONOLOGICAL FEED (block md:hidden) */}
      {/* ============================================================== */}
      <div className="block md:hidden p-4 space-y-4 bg-slate-50">
        {/* Mobile Day Selector Pills (Mon - Sat) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Day (Mon–Sat)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {formatDateReadable(currentDate)}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {weekDays.map((d) => {
              const isSelected = d.dateStr === currentDate;

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => onDateChange(d.dateStr)}
                  className={`py-2 px-1 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'bg-dental-teal text-white shadow-subtle'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-[10px] font-semibold uppercase">
                    {d.label}
                  </span>
                  <span className="block text-sm font-extrabold mt-0.5">
                    {d.dayNum}
                  </span>
                  {d.isToday && (
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mt-1 ${
                        isSelected ? 'bg-white' : 'bg-dental-teal'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chronological Timeline Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Today's Treatment Schedule ({chronologicalMobileItems.length})
            </span>
            <span className="text-xs text-dental-teal font-semibold">
              Chronological Feed
            </span>
          </div>

          {chronologicalMobileItems.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white border border-slate-200 text-slate-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">No appointments scheduled for this day.</p>
              <button
                onClick={() => onQuickBookSlot('suite-1', 540, true)}
                className="mt-3 px-3 py-1.5 bg-dental-teal text-white text-xs font-bold rounded-lg shadow-xs"
              >
                + Book First Appointment
              </button>
            </div>
          ) : (
            chronologicalMobileItems.map((apt) => {
              const srv = serviceMap.get(apt.serviceId);
              const staff = staffMap.get(apt.staffId);
              const op = operatoryMap.get(apt.operatoryId);
              const branch = srv?.branch || 'Restorative';
              const styles = SPECIALTY_STYLES[branch] || SPECIALTY_STYLES['Restorative'];
              const bufferMinutes = apt.bufferEndMinute - apt.endMinute;

              return (
                <div
                  key={`mobile-${apt.id}`}
                  onClick={() => onSelectAppointment(apt)}
                  className={`p-3.5 rounded-xl border-l-4 shadow-subtle ${styles.bg} ${styles.border} bg-white space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles.badge}`}>
                          {branch}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1 rounded">
                          {op?.name.split(' (')[0]}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        {apt.patientName}
                      </h4>
                      <p className="text-xs font-medium text-slate-600">
                        {srv?.name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 block">
                        {minutesToFormatted12h(apt.startMinute)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        to {minutesToFormatted12h(apt.endMinute)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: staff?.colorCode }}
                      />
                      <span className="font-semibold text-slate-800">
                        {staff?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded text-[10px]">
                      <ShieldCheck className="w-3 h-3 text-teal-600" />
                      +{bufferMinutes}m buffer
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
