import React, { useState } from 'react';
import {
  Appointment,
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
import { AppointmentCard } from './AppointmentCard';
import { BreakCard } from './BreakCard';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Users,
  LayoutGrid,
  Shield,
  Layers,
  PlusCircle,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface CalendarGridProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
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
const TOTAL_MINUTES = GRID_END_MINUTE - GRID_START_MINUTE; // 600 minutes
const PIXELS_PER_MINUTE = 1.35; // ~810px vertical height for comfortable viewing

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  staffList,
  operatoriesList,
  servicesList,
  appointments,
  onCancelAppointment,
  onToggleFlexible,
  onSelectAppointment,
  onQuickBookSlot,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<{ colId: string; minute: number } | null>(null);

  // Filter appointments for active date
  const dayAppointments = appointments.filter(
    (a) => a.date === currentDate && a.status !== 'cancelled'
  );

  const dayKey = getDayOfWeekKey(currentDate);

  // Map services for easy lookup
  const serviceMap = new Map(servicesList.map((s) => [s.id, s]));
  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const operatoryMap = new Map(operatoriesList.map((o) => [o.id, o]));

  // Date shifting
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
    const today = new Date().toISOString().split('T')[0];
    onDateChange(today);
  };

  // Generate hourly markers
  const hoursList: number[] = [];
  for (let m = GRID_START_MINUTE; m < GRID_END_MINUTE; m += 60) {
    hoursList.push(m);
  }

  const columns = viewMode === 'operatory' ? operatoriesList : staffList;

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden flex flex-col flex-1">
      {/* Calendar Header & View Switcher */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-subtle">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-dental-teal" />
            <span className="text-base font-bold text-slate-900">
              {formatDateReadable(currentDate)}
            </span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="opacity-0 w-0 h-0 pointer-events-none absolute"
              id="date-picker-hidden"
            />
            <label
              htmlFor="date-picker-hidden"
              className="text-xs text-dental-teal hover:text-dental-teal-dark font-medium cursor-pointer underline ml-1"
            >
              Jump to date
            </label>
          </div>
        </div>

        {/* View Mode Switcher: Operatory vs Staff */}
        <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-lg">
          <button
            onClick={() => onViewModeChange('operatory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'operatory'
                ? 'bg-white text-dental-teal shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Operatory Suites (Chairs)
          </button>
          <button
            onClick={() => onViewModeChange('staff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'staff'
                ? 'bg-white text-dental-teal shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff Practitioners
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto flex-1 flex flex-col">
        <div className="min-w-[840px] flex-1 flex flex-col">
          {/* Column Headers */}
          <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-slate-200 bg-slate-100/60 sticky top-0 z-20">
            {/* Time column header */}
            <div className="p-3 border-r border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Time
            </div>

            {/* Operatories or Staff Column Headers */}
            {viewMode === 'operatory'
              ? operatoriesList.map((op) => {
                  const roomApts = dayAppointments.filter((a) => a.operatoryId === op.id);
                  const bookedMins = roomApts.reduce((acc, a) => acc + (a.bufferEndMinute - a.startMinute), 0);
                  const utilPct = Math.min(100, Math.round((bookedMins / TOTAL_MINUTES) * 100));

                  return (
                    <div
                      key={op.id}
                      className="p-3 border-r last:border-r-0 border-slate-200 flex flex-col justify-between bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900">{op.name}</h3>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {op.chairModel}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            op.type === 'surgical'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : op.type === 'hygiene'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
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
                          {utilPct}% booked
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
                            <h3 className="text-sm font-bold text-slate-900">{staff.name}</h3>
                          </div>
                          <span className="text-[11px] font-semibold text-dental-teal block mt-0.5">
                            {staff.role}
                          </span>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5" title={staff.qualifications}>
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

          {/* Time Grid Rows & Canvas */}
          <div
            className="grid grid-cols-[80px_repeat(3,1fr)] relative"
            style={{ height: `${TOTAL_MINUTES * PIXELS_PER_MINUTE}px` }}
          >
            {/* Time Axis Column */}
            <div className="border-r border-slate-200 bg-slate-50/50 select-none relative">
              {hoursList.map((min) => {
                const top = (min - GRID_START_MINUTE) * PIXELS_PER_MINUTE;
                return (
                  <div
                    key={min}
                    className="absolute right-2 -translate-y-1/2 text-right"
                    style={{ top: `${top}px` }}
                  >
                    <span className="text-xs font-semibold text-slate-600">
                      {minutesToFormatted12h(min)}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-mono">
                      {minutesToTimeString(min)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Hour Lines Across the Entire Grid */}
            <div className="absolute inset-0 pointer-events-none left-[80px]">
              {hoursList.map((min) => {
                const top = (min - GRID_START_MINUTE) * PIXELS_PER_MINUTE;
                return (
                  <div key={min}>
                    {/* Full hour solid line */}
                    <div
                      className="absolute left-0 right-0 border-t border-slate-200"
                      style={{ top: `${top}px` }}
                    />
                    {/* Half hour dashed line */}
                    <div
                      className="absolute left-0 right-0 border-t border-slate-200/60 border-dashed"
                      style={{ top: `${top + 30 * PIXELS_PER_MINUTE}px` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Columns for Appointments, Breaks, and Quick-Booking Click Targets */}
            {columns.map((col) => {
              const colId = col.id;
              const isOperatory = viewMode === 'operatory';

              // Get appointments for this column
              const colAppointments = dayAppointments.filter((a) =>
                isOperatory ? a.operatoryId === colId : a.staffId === colId
              );

              // Breaks to render (if viewing staff, render that staff's breaks. If viewing operatory, render breaks of assigned staff)
              let colBreaks: Array<{ startMinute: number; endMinute: number; label: string }> = [];
              if (!isOperatory) {
                const s = staffList.find((st) => st.id === colId);
                colBreaks = s?.breaks[dayKey] || [];
              } else {
                // If in operatory view, show lunch block if the main doctor is on break
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
                  className="border-r last:border-r-0 border-slate-200 relative group/col"
                  onClick={(e) => {
                    // Quick book by clicking blank space
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetY = e.clientY - rect.top;
                    const clickedMinute = GRID_START_MINUTE + Math.floor(offsetY / PIXELS_PER_MINUTE);
                    // Snap to nearest 15-minute interval
                    const snappedMinute = Math.floor(clickedMinute / 15) * 15;
                    onQuickBookSlot(colId, snappedMinute, isOperatory);
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
                  {/* Breaks */}
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

                  {/* Appointments */}
                  {colAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      service={serviceMap.get(apt.serviceId)}
                      staff={staffMap.get(apt.staffId)}
                      operatory={operatoryMap.get(apt.operatoryId)}
                      pixelsPerMinute={PIXELS_PER_MINUTE}
                      gridStartMinute={GRID_START_MINUTE}
                      onCancel={onCancelAppointment}
                      onToggleFlexible={onToggleFlexible}
                      onSelect={onSelectAppointment}
                    />
                  ))}

                  {/* Hover indicator for Quick-Booking */}
                  {hoveredSlot && hoveredSlot.colId === colId && (
                    <div
                      className="absolute left-2 right-2 border-2 border-dashed border-teal-500/70 bg-teal-500/10 rounded-md pointer-events-none z-0 flex items-center justify-between px-3 text-xs font-semibold text-teal-800"
                      style={{
                        top: `${(hoveredSlot.minute - GRID_START_MINUTE) * PIXELS_PER_MINUTE}px`,
                        height: `${45 * PIXELS_PER_MINUTE}px`,
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5 text-dental-teal" />
                        Click to Book Slot
                      </span>
                      <span>{minutesToFormatted12h(hoveredSlot.minute)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
