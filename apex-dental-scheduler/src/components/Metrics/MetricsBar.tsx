import React, { useState } from 'react';
import {
  Appointment,
  DentalBranch,
  DentalService,
  Operatory,
  StaffMember,
} from '../../types/scheduler';
import {
  calculateDayUtilization,
  findCompactionProposals,
  generateScheduleOptimizationReport,
  CompactionProposal,
} from '../../engine/optimizer';
import { CompactionModal } from './CompactionModal';
import {
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface MetricsBarProps {
  currentDate: string;
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  servicesList: DentalService[];
  appointments: Appointment[];
  onApplyCompaction: (proposals: CompactionProposal[]) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  currentDate,
  staffList,
  operatoriesList,
  servicesList,
  appointments,
  onApplyCompaction,
}) => {
  const [isCompactionModalOpen, setIsCompactionModalOpen] = useState(false);

  // Compute live metrics for the active day
  const metrics = calculateDayUtilization(
    currentDate,
    staffList,
    operatoriesList,
    servicesList,
    appointments
  );

  // Generate schedule optimization report
  const optimizationReport = generateScheduleOptimizationReport(
    currentDate,
    staffList,
    operatoriesList,
    servicesList,
    appointments
  );

  const proposals = optimizationReport.proposals;

  // Count active procedures by branch
  const activeDayAppointments = appointments.filter(
    (a) => a.date === currentDate && a.status !== 'cancelled'
  );

  const serviceMap = new Map(servicesList.map((s) => [s.id, s]));
  const branchCounts: Record<DentalBranch, number> = {
    'Preventative': 0,
    'Restorative': 0,
    'Cosmetic': 0,
    'Orthodontic': 0,
    'Facial Surgery': 0,
  };

  for (const apt of activeDayAppointments) {
    const srv = serviceMap.get(apt.serviceId);
    if (srv) {
      branchCounts[srv.branch] = (branchCounts[srv.branch] || 0) + 1;
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-subtle border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Operatory Chair Utilization Gauge */}
          <div className="flex items-center gap-3.5 pr-2">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-dental-teal"
                  strokeDasharray={`${metrics.operatoryUtilizationPct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-slate-800">
                {metrics.operatoryUtilizationPct}%
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">Chair Utilization</span>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  Target &gt;75%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {metrics.bookedProcedureMinutes}m clinical + {metrics.turnaroundBufferMinutes}m turnover
              </p>
            </div>
          </div>

          {/* Clinical Staff Efficiency */}
          <div className="flex items-center gap-3.5 md:px-3 pt-3 md:pt-0">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">Staff Clinical Efficiency</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-extrabold text-slate-900">
                  {metrics.staffUtilizationPct}%
                </span>
                <span className="text-[11px] text-slate-500">
                  of scheduled shift hours
                </span>
              </div>
            </div>
          </div>

          {/* Dead-Gap Monitor */}
          <div className="flex items-center gap-3.5 md:px-3 pt-3 md:pt-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                metrics.idleDeadGapMinutes > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {metrics.idleDeadGapMinutes > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">Dead-Gap Loss</span>
                {metrics.idleDeadGapMinutes > 0 ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                    {metrics.potentialDeadGapsCount} Gaps
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                    Zero Loss
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {metrics.idleDeadGapMinutes}m lost in unfillable &lt;35m gaps
              </p>
            </div>
          </div>

          {/* Compaction Optimizer Trigger */}
          <div className="flex items-center justify-between md:pl-3 pt-3 md:pt-0">
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-dental-teal" />
                Schedule Compaction
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {proposals.length > 0
                  ? `${proposals.length} flexible adjustments available`
                  : 'Zero unfillable gaps'}
              </p>
            </div>

            <button
              onClick={() => setIsCompactionModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
                proposals.length > 0
                  ? 'bg-dental-teal hover:bg-dental-teal-dark text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-teal-200" />
              <span>Compact Day Schedule</span>
              {proposals.length > 0 && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {proposals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Branch breakdown tags */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Case Mix Today:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
              Preventative ({branchCounts.Preventative})
            </span>
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Restorative ({branchCounts.Restorative})
            </span>
            <span className="text-[11px] font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              Cosmetic ({branchCounts.Cosmetic})
            </span>
            <span className="text-[11px] font-medium text-pink-800 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
              Orthodontic ({branchCounts.Orthodontic})
            </span>
            <span className="text-[11px] font-medium text-teal-900 bg-teal-50 border border-teal-300 px-2 py-0.5 rounded-full">
              Facial Surgery ({branchCounts['Facial Surgery']})
            </span>
          </div>
        </div>
      </div>

      <CompactionModal
        isOpen={isCompactionModalOpen}
        onClose={() => setIsCompactionModalOpen(false)}
        report={optimizationReport}
        onApplyCompaction={onApplyCompaction}
      />
    </>
  );
};
