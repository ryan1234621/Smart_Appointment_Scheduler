import React from 'react';
import { Appointment, DentalBranch, DentalService, Operatory, StaffMember } from '../../types/scheduler';
import { minutesToDurationString, minutesToFormatted12h } from '../../engine/intervalMath';
import { Clock, ShieldCheck, User, Phone, Sparkles, AlertCircle, X, Shuffle } from 'lucide-react';

interface AppointmentCardProps {
  appointment: Appointment;
  service?: DentalService;
  staff?: StaffMember;
  operatory?: Operatory;
  pixelsPerMinute: number;
  gridStartMinute: number;
  onCancel: (id: string) => void;
  onToggleFlexible: (id: string) => void;
  onSelect: (apt: Appointment) => void;
}

const BRANCH_STYLES: Record<DentalBranch, { bg: string; text: string; border: string; badge: string }> = {
  'Preventative': {
    bg: 'bg-sky-50/95',
    text: 'text-sky-900',
    border: 'border-sky-300',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  'Restorative': {
    bg: 'bg-amber-50/95',
    text: 'text-amber-900',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  'Cosmetic': {
    bg: 'bg-purple-50/95',
    text: 'text-purple-900',
    border: 'border-purple-300',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  'Orthodontic': {
    bg: 'bg-pink-50/95',
    text: 'text-pink-900',
    border: 'border-pink-300',
    badge: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  'Facial Surgery': {
    bg: 'bg-teal-50/95',
    text: 'text-teal-950',
    border: 'border-teal-400',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
  },
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  service,
  staff,
  operatory,
  pixelsPerMinute,
  gridStartMinute,
  onCancel,
  onToggleFlexible,
  onSelect,
}) => {
  const top = (appointment.startMinute - gridStartMinute) * pixelsPerMinute;
  const procedureHeight = (appointment.endMinute - appointment.startMinute) * pixelsPerMinute;
  const bufferDuration = appointment.bufferEndMinute - appointment.endMinute;
  const bufferHeight = bufferDuration * pixelsPerMinute;
  const totalHeight = procedureHeight + bufferHeight;

  const branch = service?.branch || 'Restorative';
  const styles = BRANCH_STYLES[branch] || BRANCH_STYLES['Restorative'];

  return (
    <div
      className="absolute left-1 right-1 transition-all duration-150 group z-10"
      style={{
        top: `${top}px`,
        height: `${totalHeight}px`,
      }}
    >
      {/* Procedure block */}
      <div
        onClick={() => onSelect(appointment)}
        className={`w-full rounded-t-md rounded-b-none border-l-4 border-t border-r shadow-subtle ${styles.bg} ${styles.border} p-2 cursor-pointer flex flex-col justify-between overflow-hidden relative hover:shadow-card transition-shadow`}
        style={{ height: `${procedureHeight}px` }}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${styles.badge}`}>
                {branch}
              </span>
              {appointment.isFlexible && (
                <span
                  title="Patient is flexible with start time. Optimizer can adjust by ±30m to pack chair schedule."
                  className="text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 rounded flex items-center gap-0.5"
                >
                  <Shuffle className="w-2.5 h-2.5" /> Flex
                </span>
              )}
            </div>

            <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
              {appointment.patientName}
            </h4>
            <p className="text-[11px] font-medium text-slate-700 truncate">
              {service?.name || 'Dental Procedure'}
            </p>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFlexible(appointment.id);
              }}
              title={appointment.isFlexible ? 'Mark as fixed time' : 'Mark as flexible'}
              className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm text-[10px]"
            >
              <Shuffle className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(appointment.id);
              }}
              title="Cancel appointment (Opens waitlist auto-fill opportunity)"
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
              {minutesToFormatted12h(appointment.startMinute)} – {minutesToFormatted12h(appointment.endMinute)}
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
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[70px]">
              {staff?.name.replace('Dr. ', '')}
            </span>
          </div>
        </div>
      </div>

      {/* Sterilization & Turnover Buffer block */}
      {bufferHeight > 0 && (
        <div
          title={`Sterilization, Operatory Turnover & HEPA cycle: ${bufferDuration} mins`}
          className="w-full bg-buffer-stripes border-l-4 border-b border-r border-teal-500/30 rounded-b-md flex items-center justify-center px-1 text-[9px] font-semibold text-teal-800/80 tracking-wide select-none"
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
};
