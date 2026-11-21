import React, { useState } from 'react';
import {
  Appointment,
  DentalService,
  Operatory,
  StaffMember,
  WaitlistEntry,
} from '../../types/scheduler';
import {
  findWaitlistMatches,
  WaitlistMatchProposal,
} from '../../engine/optimizer';
import {
  minutesToDurationString,
  minutesToFormatted12h,
} from '../../engine/intervalMath';
import {
  UserPlus,
  X,
  Phone,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Shuffle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface WaitlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  waitlist: WaitlistEntry[];
  servicesList: DentalService[];
  staffList: StaffMember[];
  operatoriesList: Operatory[];
  appointments: Appointment[];
  onAddWaitlistEntry: (entry: Omit<WaitlistEntry, 'id'>) => void;
  onRemoveWaitlistEntry: (id: string) => void;
  onAutoFillAppointment: (
    proposal: WaitlistMatchProposal,
    entryToRemoveId: string
  ) => void;
  onSimulateCancellation: () => void;
}

export const WaitlistDrawer: React.FC<WaitlistDrawerProps> = ({
  isOpen,
  onClose,
  currentDate,
  waitlist,
  servicesList,
  staffList,
  operatoriesList,
  appointments,
  onAddWaitlistEntry,
  onRemoveWaitlistEntry,
  onAutoFillAppointment,
  onSimulateCancellation,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState(servicesList[0]?.id || '');
  const [newPreferredDate, setNewPreferredDate] = useState(currentDate);
  const [newNotes, setNewNotes] = useState('');

  const serviceMap = new Map(servicesList.map((s) => [s.id, s]));
  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const opMap = new Map(operatoriesList.map((o) => [o.id, o]));

  // Evaluate waitlist matches against available day openings
  const matches = findWaitlistMatches(
    currentDate,
    waitlist,
    servicesList,
    staffList,
    operatoriesList,
    appointments
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddWaitlistEntry({
      patientName: newName.trim(),
      phone: newPhone.trim() || '+44 7700 900555',
      serviceId: newServiceId,
      preferredDate: newPreferredDate,
      notes: newNotes.trim() || 'Flexible on timing if slot becomes available.',
    });

    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-dental-teal text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Priority Waitlist & Auto-Fill
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Autonomous chair vacancy matching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-teal-300 text-teal-800 rounded-lg hover:bg-teal-50 transition shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-dental-teal" />
            {showAddForm ? 'Close Form' : '+ Add Patient'}
          </button>

          <button
            onClick={onSimulateCancellation}
            title="Simulates a confirmed patient cancellation to showcase the real-time waitlist autofill engine"
            className="px-2.5 py-1.5 text-xs font-semibold bg-dental-teal hover:bg-dental-teal-dark text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Simulate Cancellation
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddSubmit}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                New Waitlist Candidate
              </h4>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harrison Ford"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-dental-teal font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+44 7700 900888"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-dental-teal font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Desired Clinical Procedure
                </label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-dental-teal font-medium"
                >
                  {servicesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.branch}] {s.name} ({s.durationMinutes}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Urgency / Clinical Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Symptoms, availability restrictions, urgency level..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-dental-teal font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-dental-teal text-white rounded shadow-xs"
                >
                  Save to Waitlist
                </button>
              </div>
            </form>
          )}

          {/* Real-time Match Alert Cards */}
          {matches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800">
                <Zap className="w-3.5 h-3.5 text-teal-600" />
                Available Matches Found ({matches.length})
              </div>

              {matches.map((m) => {
                const staff = staffMap.get(m.bestSlot.staffId);
                const operatory = opMap.get(m.bestSlot.operatoryId);

                return (
                  <div
                    key={`match-${m.waitlistEntry.id}`}
                    className="p-3.5 rounded-xl border border-teal-300 bg-teal-50/70 shadow-subtle space-y-2 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-teal-200/80 text-teal-900 px-1.5 py-0.5 rounded">
                          {m.bestSlot.score}% Fit Match
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">
                          {m.waitlistEntry.patientName}
                        </h4>
                        <p className="text-[11px] font-medium text-teal-900">
                          {m.service.name}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          onAutoFillAppointment(m, m.waitlistEntry.id)
                        }
                        className="px-3 py-1.5 text-xs font-bold bg-dental-teal hover:bg-dental-teal-dark text-white rounded-lg shadow-xs transition flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Auto-Fill
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-lg border border-teal-200/50 flex flex-col gap-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-teal-600" />
                          {minutesToFormatted12h(m.bestSlot.startMinute)} – {minutesToFormatted12h(m.bestSlot.endMinute)}
                        </span>
                        <span className="text-slate-500 font-normal">
                          {operatory?.name.split(' (')[0]}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Clinician: {staff?.name}
                      </div>
                    </div>

                    <p className="text-[10px] text-teal-900 font-medium">
                      💡 {m.efficiencyGainDescription}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Waitlist Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Waitlist ({waitlist.length})
              </span>
            </div>

            {waitlist.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs">No patients currently on the waitlist.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waitlist.map((entry) => {
                  const s = serviceMap.get(entry.serviceId);

                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {entry.patientName}
                          </h4>
                          <span className="text-[11px] font-semibold text-dental-teal block">
                            {s?.name || 'General Dental Treatment'}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                              {s ? `${s.durationMinutes}m (+${s.cleanupBufferMinutes}m buffer)` : 'Standard'}
                            </span>
                            <span className="text-[10px] font-medium bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded capitalize">
                              {s?.requiredOperatoryType} suite
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onRemoveWaitlistEntry(entry.id)}
                          title="Remove from waitlist"
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                        "{entry.notes}"
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          {entry.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-slate-400" />
                          Pref: {entry.preferredDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
