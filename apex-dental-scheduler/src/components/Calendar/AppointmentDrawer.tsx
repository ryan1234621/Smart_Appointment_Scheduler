import React from 'react';
import {
  Appointment,
  DentalBranch,
  DentalService,
  Operatory,
  StaffMember,
} from '../../types/scheduler';
import {
  formatDateReadable,
  minutesToDurationString,
  minutesToFormatted12h,
} from '../../engine/intervalMath';
import {
  X,
  Clock,
  Calendar,
  Phone,
  User,
  Building2,
  ShieldCheck,
  Shuffle,
  CalendarClock,
  Trash2,
  AlertTriangle,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface AppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  servicesList: DentalService[];
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  onRescheduleAppointment: (apt: Appointment) => void;
  onCancelAppointment: (id: string) => void;
  onToggleFlexible: (id: string) => void;
}

const BRANCH_SPECIALTY_COLORS: Record<DentalBranch, { bg: string; text: string; border: string }> = {
  'Preventative': { bg: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-900', border: 'border-emerald-200' },
  'Restorative': { bg: 'bg-sky-50 text-sky-800', text: 'text-sky-900', border: 'border-sky-200' },
  'Cosmetic': { bg: 'bg-purple-50 text-purple-800', text: 'text-purple-900', border: 'border-purple-200' },
  'Orthodontic': { bg: 'bg-amber-50 text-amber-800', text: 'text-amber-900', border: 'border-amber-200' },
  'Facial Surgery': { bg: 'bg-rose-50 text-rose-800', text: 'text-rose-900', border: 'border-rose-200' },
};

export const AppointmentDrawer: React.FC<AppointmentDrawerProps> = ({
  isOpen,
  onClose,
  appointment,
  servicesList,
  staffList,
  operatoriesList,
  onRescheduleAppointment,
  onCancelAppointment,
  onToggleFlexible,
}) => {
  if (!isOpen || !appointment) return null;

  const service = servicesList.find((s) => s.id === appointment.serviceId);
  const staff = staffList.find((s) => s.id === appointment.staffId);
  const operatory = operatoriesList.find((o) => o.id === appointment.operatoryId);

  const branch = service?.branch || 'Restorative';
  const branchStyle = BRANCH_SPECIALTY_COLORS[branch] || BRANCH_SPECIALTY_COLORS['Restorative'];
  const bufferDuration = appointment.bufferEndMinute - appointment.endMinute;
  const treatmentDuration = appointment.endMinute - appointment.startMinute;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${branchStyle.bg} ${branchStyle.border}`}
              >
                {branch}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  appointment.status === 'confirmed'
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : appointment.status === 'rescheduled'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {appointment.status}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight pt-1">
              {appointment.patientName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{appointment.patientPhone}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Procedure Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Clinical Procedure</span>
              <span className="font-bold text-slate-700">{treatmentDuration} min treatment</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{service?.name || 'Treatment'}</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">{service?.description}</p>
          </div>

          {/* Time & Turnover Buffer Details */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-dental-teal flex items-center justify-center border border-teal-100">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Scheduled Time
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    {minutesToFormatted12h(appointment.startMinute)} – {minutesToFormatted12h(appointment.endMinute)}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {formatDateReadable(appointment.date)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                    Turnover & Sterilisation
                  </span>
                  <p className="text-xs font-extrabold text-teal-900">
                    +{bufferDuration} min locked buffer
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-teal-700 font-medium">Autoclave Room Turnover</span>
            </div>
          </div>

          {/* Clinical Staff & Operatory Allocation */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Synchronized Clinical Resources
            </h5>

            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: staff?.colorCode }}
                  />
                  <span className="text-xs font-bold text-slate-900">{staff?.name}</span>
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {staff?.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pl-4">{staff?.qualifications}</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-dental-teal" />
                  <span className="text-xs font-bold text-slate-900">{operatory?.name}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                  {operatory?.type}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pl-5">{operatory?.chairModel}</p>
            </div>
          </div>

          {/* Flexible Timing Controls */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-dental-teal" />
                <span className="text-xs font-bold text-slate-900">Flexible Timing</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Allows the Tetris Optimizer to snap this booking earlier to close dead gaps.
              </p>
            </div>

            <button
              onClick={() => onToggleFlexible(appointment.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                appointment.isFlexible
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {appointment.isFlexible ? 'Flexible' : 'Fixed'}
            </button>
          </div>
        </div>

        {/* Footer Actions: Reschedule & Cancellation */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center gap-2">
            {/* Reschedule Button */}
            <button
              onClick={() => {
                onRescheduleAppointment(appointment);
                onClose();
              }}
              className="flex-1 py-2.5 px-3 bg-dental-teal hover:bg-dental-teal-dark text-white text-xs font-bold rounded-xl shadow-subtle flex items-center justify-center gap-2 transition active:scale-95"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Reschedule Appointment</span>
            </button>

            {/* Cancel Button */}
            <button
              onClick={() => {
                onCancelAppointment(appointment.id);
                onClose();
              }}
              className="py-2.5 px-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-400">
            Cancelling immediately frees the operatory & certified staff, triggering instant waitlist matching.
          </p>
        </div>
      </div>
    </div>
  );
};
