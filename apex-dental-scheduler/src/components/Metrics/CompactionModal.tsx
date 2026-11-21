import React from 'react';
import { CompactionProposal, ScheduleOptimizationReport } from '../../engine/optimizer';
import { minutesToDurationString, minutesToFormatted12h } from '../../engine/intervalMath';
import {
  ArrowRight,
  Check,
  Sparkles,
  X,
  Zap,
  TrendingUp,
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface CompactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ScheduleOptimizationReport;
  onApplyCompaction: (proposals: CompactionProposal[]) => void;
}

export const CompactionModal: React.FC<CompactionModalProps> = ({
  isOpen,
  onClose,
  report,
  onApplyCompaction,
}) => {
  if (!isOpen) return null;

  const { proposals, deadGapsEliminatedCount, totalDeadMinutesEliminated, businessImpactSummary, primaryOperatoryFreedName, continuousFreedMinutes } = report;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-subtle">
              <Zap className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Schedule Optimization Preview
                </h3>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tetris Compaction
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Autonomous schedule compaction for high-yield surgical & cosmetic openings
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

        {/* Business Impact Summary Banner */}
        <div className="p-5 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white border-b border-teal-700">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-teal-300">
                Clinic Business Impact Statement
              </span>
              <p className="text-sm font-bold text-white leading-snug">
                "{businessImpactSummary}"
              </p>
              <div className="flex items-center gap-4 pt-1 text-xs text-teal-200/80">
                <span>• {deadGapsEliminatedCount} Fragmented Gaps Closed</span>
                <span>• {totalDeadMinutesEliminated}m Idle Dead-Time Recovered</span>
                <span>• Preserves Clinician Breaks & Qualifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Before vs. After Visual Comparison */}
        <div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">
          {proposals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Schedule is Already Optimally Compacted
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All appointments are packed flush against room turnover buffers. Zero unfillable dead gaps detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>Before vs. After Visual Comparison</span>
                <span>{proposals.length} Flexible Shifts</span>
              </div>

              {proposals.map((p, idx) => (
                <div
                  key={p.appointmentId}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900">{p.patientName}</h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded">
                          {p.operatoryName.split(' (')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Practitioner: {p.staffName}
                      </p>
                    </div>

                    <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Eliminates {p.deadMinutesEliminated}m Dead Gap
                    </span>
                  </div>

                  {/* Visual Timeline Comparison Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Before Card */}
                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                        Existing Time (Scattered)
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="line-through decoration-amber-500 decoration-2">
                          {minutesToFormatted12h(p.currentStartMinute)} – {minutesToFormatted12h(p.currentEndMinute)}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-700 italic">
                        Leaves {p.deadMinutesEliminated}m unfillable dead gap prior
                      </p>
                    </div>

                    {/* After Card */}
                    <div className="p-3 rounded-lg bg-teal-50 border border-teal-300 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                        Optimized Time (Compacted)
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-950">
                        <Clock className="w-3.5 h-3.5 text-teal-700" />
                        <span className="text-dental-teal font-extrabold text-sm">
                          {minutesToFormatted12h(p.proposedStartMinute)} – {minutesToFormatted12h(p.proposedEndMinute)}
                        </span>
                      </div>
                      <p className="text-[10px] text-teal-800 font-medium">
                        ✓ Snaps flush against previous turnover buffer
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    💡 <span className="font-semibold text-slate-700">Rationale:</span> {p.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-xs"
          >
            Keep Existing Schedule
          </button>

          {proposals.length > 0 && (
            <button
              onClick={() => {
                onApplyCompaction(proposals);
                onClose();
              }}
              className="px-5 py-2.5 bg-dental-teal hover:bg-dental-teal-dark text-white text-xs font-extrabold rounded-xl shadow-card transition-all flex items-center gap-2 active:scale-95"
            >
              <Zap className="w-4 h-4 text-teal-200" />
              <span>Apply Schedule Optimization</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
