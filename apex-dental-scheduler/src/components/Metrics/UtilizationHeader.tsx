import React from 'react';
import {
  Appointment,
  DentalService,
  Operatory,
  StaffMember,
} from '../../types/scheduler';
import { getDayOfWeekKey, minutesToDurationString } from '../../engine/intervalMath';
import {
  Activity,
  Award,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Users,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface UtilizationHeaderProps {
  currentDate: string;
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  servicesList: DentalService[];
  appointments: Appointment[];
}

export interface ClinicalStatusInfo {
  tier: 'low' | 'steady' | 'optimal' | 'capacity';
  label: string;
  badgeClass: string;
  textClass: string;
  ringColor: string;
  bgLightClass: string;
}

export function getClinicalStatus(utilizationPct: number): ClinicalStatusInfo {
  if (utilizationPct < 40) {
    return {
      tier: 'low',
      label: 'Low Chair Occupancy - High Open Capacity',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      textClass: 'text-amber-700',
      ringColor: '#D97706', // amber-600
      bgLightClass: 'bg-amber-500',
    };
  }
  if (utilizationPct <= 74) {
    return {
      tier: 'steady',
      label: 'Steady Clinical Cadence',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      textClass: 'text-sky-700',
      ringColor: '#0284C7', // clinic blue
      bgLightClass: 'bg-sky-500',
    };
  }
  if (utilizationPct <= 90) {
    return {
      tier: 'optimal',
      label: 'Optimal Practice Efficiency',
      badgeClass: 'bg-teal-50 text-teal-900 border-teal-300 font-bold',
      textClass: 'text-teal-800',
      ringColor: '#0D9488', // surgical teal
      bgLightClass: 'bg-teal-600',
    };
  }
  return {
    tier: 'capacity',
    label: 'Near Capacity - Priority Waitlist Active',
    badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 font-bold',
    textClass: 'text-purple-800',
    ringColor: '#7C3AED', // purple-600
    bgLightClass: 'bg-purple-600',
  };
}

export const UtilizationHeader: React.FC<UtilizationHeaderProps> = ({
  currentDate,
  staffList,
  appointments,
}) => {
  const dayKey = getDayOfWeekKey(currentDate);
  const activeBookings = appointments.filter(
    (a) => a.date === currentDate && a.status !== 'cancelled'
  );

  // Exact Phase 4 Formula:
  // Daily Chair Utilization = (Total Booked Treatment Minutes / (Total Available Shift Minutes - Lunch Breaks)) * 100%
  let totalBookedTreatmentMinutes = 0;
  let totalNetAvailableMinutes = 0;

  const staffStats = staffList.map((staff) => {
    const shift = staff.shifts[dayKey];
    const totalShiftMinutes = shift ? Math.max(0, shift.endMinute - shift.startMinute) : 0;
    const breaks = staff.breaks[dayKey] || [];
    const lunchBreakMinutes = breaks.reduce(
      (acc, b) => acc + Math.max(0, b.endMinute - b.startMinute),
      0
    );
    const netAvailableMinutes = Math.max(0, totalShiftMinutes - lunchBreakMinutes);

    // Booked treatment minutes (duration only, excluding buffer)
    const staffBookings = activeBookings.filter((b) => b.staffId === staff.id);
    const bookedMinutes = staffBookings.reduce(
      (acc, b) => acc + Math.max(0, b.endMinute - b.startMinute),
      0
    );

    const utilizationPct =
      netAvailableMinutes > 0
        ? Math.min(100, Math.round((bookedMinutes / netAvailableMinutes) * 100))
        : 0;

    totalBookedTreatmentMinutes += bookedMinutes;
    totalNetAvailableMinutes += netAvailableMinutes;

    const status = getClinicalStatus(utilizationPct);

    return {
      staff,
      shift,
      netAvailableMinutes,
      bookedMinutes,
      utilizationPct,
      status,
      appointmentCount: staffBookings.length,
    };
  });

  const clinicWideUtilizationPct =
    totalNetAvailableMinutes > 0
      ? Math.min(100, Math.round((totalBookedTreatmentMinutes / totalNetAvailableMinutes) * 100))
      : 0;

  const clinicStatus = getClinicalStatus(clinicWideUtilizationPct);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden">
      {/* Top Banner: Clinic Productivity Status Bar */}
      <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-subtle">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                Practice Chair Performance & Capacity
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-900 border border-teal-200">
                Live Audit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Net clinical occupancy formula: Booked Minutes ÷ (Shift Hours − Lunch Breaks)
            </p>
          </div>
        </div>

        {/* Global Clinic Cadence Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border shadow-xs flex items-center gap-1.5 ${clinicStatus.badgeClass}`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: clinicStatus.ringColor }}
            />
            {clinicStatus.label}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Card 1: Clinic-wide Chair Occupancy */}
        <div className="bg-gradient-to-b from-teal-50/50 to-white rounded-xl border border-teal-200/70 p-4 flex flex-col justify-between shadow-subtle relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900/80">
                Clinic Chair Occupancy
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {clinicWideUtilizationPct}%
              </h3>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray={`${clinicWideUtilizationPct}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke={clinicStatus.ringColor}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-slate-800">
                {clinicWideUtilizationPct}%
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-teal-100/70 text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              <strong>{minutesToDurationString(totalBookedTreatmentMinutes)}</strong> treatment
            </span>
            <span className="text-slate-400">/</span>
            <span>
              <strong>{minutesToDurationString(totalNetAvailableMinutes)}</strong> net open
            </span>
          </div>
        </div>

        {/* Cards 2, 3, 4: Individual Clinician Gauges */}
        {staffStats.map(({ staff, bookedMinutes, netAvailableMinutes, utilizationPct, status, appointmentCount }) => (
          <div
            key={staff.id}
            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between shadow-subtle hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white"
                      style={{ backgroundColor: staff.colorCode }}
                    />
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {staff.name}
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 block truncate mt-0.5">
                    {staff.role}
                  </span>
                </div>

                <span className="text-base font-black text-slate-900">
                  {utilizationPct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${utilizationPct}%`,
                    backgroundColor: status.ringColor,
                  }}
                />
              </div>
            </div>

            {/* Bottom Status Row */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border truncate ${status.badgeClass}`}
                title={status.label}
              >
                {status.label.split(' - ')[0]}
              </span>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span>{appointmentCount} procedures</span>
                <span>
                  {minutesToDurationString(bookedMinutes)} / {minutesToDurationString(netAvailableMinutes)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
