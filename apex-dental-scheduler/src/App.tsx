import React, { useState, useMemo, useEffect } from 'react';
import {
  Appointment,
  DentalService,
  Operatory,
  StaffMember,
  TimeSlot,
  ViewMode,
  WaitlistEntry,
} from './types/scheduler';
import {
  DENTAL_SERVICES,
  INITIAL_OPERATORIES,
  INITIAL_STAFF,
  INITIAL_WAITLIST,
  generateInitialAppointments,
  getDemoDate,
} from './data/mockDentalData';
import { Header } from './components/Header';
import { UtilizationHeader } from './components/Metrics/UtilizationHeader';
import { MetricsBar } from './components/Metrics/MetricsBar';
import { CalendarView } from './components/Calendar/CalendarView';
import { BookingDialog } from './components/BookingModal/BookingDialog';
import { WaitlistDrawer } from './components/Waitlist/WaitlistDrawer';
import { AppointmentDrawer } from './components/Calendar/AppointmentDrawer';
import { PracticeAvailabilityAudit } from './components/Audit/PracticeAvailabilityAudit';
import {
  CompactionProposal,
  FreedChairMatch,
  WaitlistMatchProposal,
  findFreedWindowWaitlistMatches,
  findWaitlistMatches,
} from './engine/optimizer';
import { minutesToDurationString, minutesToFormatted12h } from './engine/intervalMath';
import {
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
  Clock,
  ShieldCheck,
  User,
  Building2,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Award,
  Plus,
  Zap,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const LOCAL_STORAGE_KEY_APPOINTMENTS = 'apex_dental_appointments_v4';
const LOCAL_STORAGE_KEY_WAITLIST = 'apex_dental_waitlist_v4';

export function App() {
  const [currentDate, setCurrentDate] = useState<string>(getDemoDate(0));
  const [mainView, setMainView] = useState<'schedule' | 'audit'>('schedule');

  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [operatoriesList, setOperatoriesList] = useState<Operatory[]>(INITIAL_OPERATORIES);
  const [servicesList, setServicesList] = useState<DentalService[]>(DENTAL_SERVICES);

  // Persistent Appointments: Initialize from localStorage if present
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_APPOINTMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load appointments from localStorage:', e);
    }
    return generateInitialAppointments();
  });

  // Persistent Waitlist: Initialize from localStorage if present
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_WAITLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load waitlist from localStorage:', e);
    }
    return INITIAL_WAITLIST;
  });

  // Sync appointments to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_APPOINTMENTS, JSON.stringify(appointments));
    } catch (e) {
      console.error('Failed to persist appointments to localStorage:', e);
    }
  }, [appointments]);

  // Sync waitlist to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_WAITLIST, JSON.stringify(waitlist));
    } catch (e) {
      console.error('Failed to persist waitlist to localStorage:', e);
    }
  }, [waitlist]);

  // Modals & Drawers state
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState<boolean>(false);
  const [bookingPreselect, setBookingPreselect] = useState<{
    minute?: number;
    staffId?: string;
    operatoryId?: string;
    serviceId?: string;
  }>({});
  const [rescheduleTargetAppointment, setRescheduleTargetAppointment] =
    useState<Appointment | null>(null);

  const [isWaitlistDrawerOpen, setIsWaitlistDrawerOpen] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDrawerOpen, setIsAppointmentDrawerOpen] = useState<boolean>(false);

  // Automated Chair Backfill Immediate Banner Alert
  const [activeChairBackfillAlert, setActiveChairBackfillAlert] =
    useState<FreedChairMatch | null>(null);

  // Flash notification message
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Appointment management handlers
  const handleSelectAppointment = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsAppointmentDrawerOpen(true);
  };

  const handleInitiateReschedule = (apt: Appointment) => {
    setIsAppointmentDrawerOpen(false);
    setRescheduleTargetAppointment(apt);
    setBookingPreselect({
      minute: apt.startMinute,
      staffId: apt.staffId,
      operatoryId: apt.operatoryId,
      serviceId: apt.serviceId,
    });
    setIsBookingDialogOpen(true);
  };

  const handleCancelAppointment = (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;

    // 1. Mark appointment as cancelled (frees clinician & operatory)
    const updatedAppointments = appointments.map((a) =>
      a.id === id ? { ...a, status: 'cancelled' as const } : a
    );
    setAppointments(updatedAppointments);

    const cancelledApt = { ...apt, status: 'cancelled' as const };

    // 2. Scan priority waitlist for automated chair backfill matches
    const matches = findFreedWindowWaitlistMatches(
      cancelledApt,
      waitlist,
      servicesList,
      staffList,
      operatoriesList,
      updatedAppointments
    );

    if (matches.length > 0) {
      const bestMatch = matches[0];
      setActiveChairBackfillAlert(bestMatch);
      showNotification(
        `⚡ Chair Available! Found matching waitlisted patient ${bestMatch.waitlistEntry.patientName} for ${bestMatch.service.name}.`,
        'info'
      );
    } else {
      showNotification(
        `Appointment for ${apt.patientName} was cancelled. Operatory and clinician freed. (No current waitlist candidate matched this window).`,
        'info'
      );
    }
  };

  // One-click Automated Chair Backfill Conversion
  const handleAcceptChairBackfill = (match: FreedChairMatch) => {
    const newApt: Appointment = {
      id: `apt-backfill-${Date.now()}`,
      patientName: match.waitlistEntry.patientName,
      patientPhone: match.waitlistEntry.phone,
      serviceId: match.service.id,
      staffId: match.staff.id,
      operatoryId: match.operatory.id,
      date: match.cancelledAppointment.date,
      startMinute: match.recommendedSlot.startMinute,
      endMinute: match.recommendedSlot.endMinute,
      bufferEndMinute: match.recommendedSlot.bufferEndMinute,
      status: 'confirmed',
      isFlexible: false,
    };

    // 1. Commit confirmed booking to schedule
    setAppointments((prev) => [...prev, newApt]);

    // 2. Remove patient from waitlist
    setWaitlist((prev) => prev.filter((w) => w.id !== match.waitlistEntry.id));

    // 3. Clear alert banner
    setActiveChairBackfillAlert(null);

    // 4. Notify practice owner
    showNotification(
      `⚡ Chair filled! ${match.waitlistEntry.patientName} booked for ${match.service.name} at ${minutesToFormatted12h(match.recommendedSlot.startMinute)} in ${match.operatory.name.split(' (')[0]}.`,
      'success'
    );
  };

  const handleToggleFlexible = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isFlexible: !a.isFlexible } : a))
    );
    if (selectedAppointment?.id === id) {
      setSelectedAppointment((curr) => curr ? { ...curr, isFlexible: !curr.isFlexible } : null);
    }
  };

  const handleBookAppointment = (
    newAptData: Omit<Appointment, 'id' | 'status'>,
    existingIdToUpdate?: string
  ) => {
    if (existingIdToUpdate) {
      // Rescheduling existing booking without leaving double bookings
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === existingIdToUpdate
            ? {
                ...a,
                ...newAptData,
                status: 'rescheduled',
              }
            : a
        )
      );
      setRescheduleTargetAppointment(null);
      showNotification(
        `Appointment for ${newAptData.patientName} successfully rescheduled to ${minutesToFormatted12h(newAptData.startMinute)}! Zero double-bookings.`,
        'success'
      );
    } else {
      // New booking
      const newApt: Appointment = {
        ...newAptData,
        id: `apt-${Date.now()}`,
        status: 'confirmed',
      };

      setAppointments((prev) => [...prev, newApt]);
      showNotification(
        `Appointment locked for ${newApt.patientName} at ${minutesToFormatted12h(newApt.startMinute)}! Saved to practice schedule.`
      );
    }
  };

  const handleQuickBookSlot = (
    colId: string,
    minute: number,
    isSuite: boolean
  ) => {
    setRescheduleTargetAppointment(null);
    setBookingPreselect({
      minute,
      operatoryId: isSuite ? colId : undefined,
      staffId: !isSuite ? colId : undefined,
    });
    setIsBookingDialogOpen(true);
  };

  const handleAuditBookSlot = (slot: TimeSlot, service: DentalService) => {
    setRescheduleTargetAppointment(null);
    setBookingPreselect({
      minute: slot.startMinute,
      staffId: slot.staffId,
      operatoryId: slot.operatoryId,
      serviceId: service.id,
    });
    setIsBookingDialogOpen(true);
  };

  // Compaction handler
  const handleApplyCompaction = (proposals: CompactionProposal[]) => {
    setAppointments((prev) =>
      prev.map((apt) => {
        const prop = proposals.find((p) => p.appointmentId === apt.id);
        if (prop) {
          const duration = apt.endMinute - apt.startMinute;
          const buffer = apt.bufferEndMinute - apt.endMinute;
          return {
            ...apt,
            startMinute: prop.proposedStartMinute,
            endMinute: prop.proposedStartMinute + duration,
            bufferEndMinute: prop.proposedStartMinute + duration + buffer,
            status: 'rescheduled',
          };
        }
        return apt;
      })
    );

    showNotification(
      `Day schedule compacted! Shifted ${proposals.length} flexible appointments earlier to eliminate dead gaps.`,
      'success'
    );
  };

  // Waitlist handlers
  const handleAddWaitlistEntry = (entry: Omit<WaitlistEntry, 'id'>) => {
    const newEntry: WaitlistEntry = {
      ...entry,
      id: `wait-${Date.now()}`,
    };
    setWaitlist((prev) => [newEntry, ...prev]);
    showNotification(`Added ${newEntry.patientName} to the priority waitlist.`);
  };

  const handleRemoveWaitlistEntry = (id: string) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAutoFillAppointment = (
    proposal: WaitlistMatchProposal,
    entryToRemoveId: string
  ) => {
    const newApt: Appointment = {
      id: `apt-autofill-${Date.now()}`,
      patientName: proposal.waitlistEntry.patientName,
      patientPhone: proposal.waitlistEntry.phone,
      serviceId: proposal.service.id,
      staffId: proposal.bestSlot.staffId,
      operatoryId: proposal.bestSlot.operatoryId,
      date: proposal.bestSlot.date,
      startMinute: proposal.bestSlot.startMinute,
      endMinute: proposal.bestSlot.endMinute,
      bufferEndMinute:
        proposal.bestSlot.endMinute + proposal.service.cleanupBufferMinutes,
      status: 'confirmed',
      isFlexible: false,
    };

    setAppointments((prev) => [...prev, newApt]);
    setWaitlist((prev) => prev.filter((w) => w.id !== entryToRemoveId));
    setIsWaitlistDrawerOpen(false);

    showNotification(
      `Chair filled! ${proposal.waitlistEntry.patientName} booked at ${minutesToFormatted12h(proposal.bestSlot.startMinute)} (${proposal.bestSlot.score}% Tetris fit).`,
      'success'
    );
  };

  // Simulate cancellation demo: cancels an active confirmed procedure to trigger automated waitlist check
  const handleSimulateCancellation = () => {
    const activeConfirmed = appointments.filter(
      (a) => a.date === currentDate && a.status === 'confirmed'
    );
    if (activeConfirmed.length === 0) {
      showNotification('No active confirmed appointments to cancel today.', 'info');
      return;
    }

    // Target the first confirmed appointment (such as Dr. Aris surgery)
    const target = activeConfirmed[0];
    handleCancelAppointment(target.id);
  };

  // Demonstration control: Reset all state and localStorage to default clinic roster
  const handleResetToDemoData = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_APPOINTMENTS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_WAITLIST);
    } catch (e) {
      console.error('Failed to clear demo data from localStorage:', e);
    }

    setAppointments(generateInitialAppointments());
    setWaitlist(INITIAL_WAITLIST);
    setActiveChairBackfillAlert(null);
    setSelectedAppointment(null);
    setRescheduleTargetAppointment(null);
    setIsAppointmentDrawerOpen(false);
    setIsBookingDialogOpen(false);
    setIsWaitlistDrawerOpen(false);

    showNotification(
      'Clinic schedule, operatories, and priority waitlist reset to default demonstration data.',
      'info'
    );
  };

  // Live waitlist matches for header badge
  const waitlistMatches = findWaitlistMatches(
    currentDate,
    waitlist,
    servicesList,
    staffList,
    operatoriesList,
    appointments
  );

  const totalTodayConfirmed = appointments.filter(
    (a) => a.date === currentDate && a.status !== 'cancelled'
  ).length;

  return (
    <div className="min-h-screen bg-dental-slate-sterile flex flex-col font-sans text-slate-800">
      {/* Clinic Header */}
      <Header
        activeTab={mainView}
        onTabChange={setMainView}
        totalTodayConfirmed={totalTodayConfirmed}
        waitlistCount={waitlist.length}
        availableMatchesCount={waitlistMatches.length}
        onOpenBookingModal={() => {
          setRescheduleTargetAppointment(null);
          setBookingPreselect({});
          setIsBookingDialogOpen(true);
        }}
        onOpenWaitlistDrawer={() => setIsWaitlistDrawerOpen(true)}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevated border text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-teal-900 text-white border-teal-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Phase 5 Immediate Chair Available Banner */}
        {activeChairBackfillAlert && (
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl shadow-elevated border-2 border-teal-400/60 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-300 text-teal-200 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-teal-300 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/40">
                    ⚡ Instant Chair Backfill Match
                  </span>
                  <span className="text-xs text-teal-200 font-semibold">
                    Freed Surgical Opening
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  ⚡ Chair Available: A {activeChairBackfillAlert.freedDurationMinutes}-min opening at {minutesToFormatted12h(activeChairBackfillAlert.freedStartMinute)} with {activeChairBackfillAlert.staff.name} in {activeChairBackfillAlert.operatory.name.split(' (')[0]}! Matches waitlisted patient <span className="text-teal-300 underline font-extrabold">{activeChairBackfillAlert.waitlistEntry.patientName}</span> for {activeChairBackfillAlert.service.name}.
                </p>
                <p className="text-xs text-teal-200/90 font-medium">
                  💡 {activeChairBackfillAlert.rationale}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                onClick={() => setActiveChairBackfillAlert(null)}
                className="px-3 py-2 text-xs font-semibold text-teal-200 hover:text-white rounded-lg transition"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAcceptChairBackfill(activeChairBackfillAlert)}
                className="px-4 py-2.5 bg-teal-400 hover:bg-teal-300 text-teal-950 font-black text-xs rounded-xl shadow-card transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-teal-950" />
                <span>Fill Open Chair</span>
              </button>
            </div>
          </div>
        )}

        {mainView === 'schedule' ? (
          <>
            {/* Phase 4: Chair Capacity Gauges & Performance Header */}
            <UtilizationHeader
              currentDate={currentDate}
              staffList={staffList}
              operatoriesList={operatoriesList}
              servicesList={servicesList}
              appointments={appointments}
            />

            {/* Compaction & Case Mix Bar with prominent "Compact Day Schedule" button */}
            <MetricsBar
              currentDate={currentDate}
              staffList={staffList}
              operatoriesList={operatoriesList}
              servicesList={servicesList}
              appointments={appointments}
              onApplyCompaction={handleApplyCompaction}
            />

            {/* Phase 4: Clinical Practice Management Grid & Mobile Chronological Feed */}
            <CalendarView
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              staffList={staffList}
              operatoriesList={operatoriesList}
              servicesList={servicesList}
              appointments={appointments}
              onCancelAppointment={handleCancelAppointment}
              onToggleFlexible={handleToggleFlexible}
              onSelectAppointment={handleSelectAppointment}
              onQuickBookSlot={handleQuickBookSlot}
            />
          </>
        ) : (
          /* Practice Availability Audit: Phase 2 & 3 Clinical Feasibility & Dead Chair Elimination Engine */
          <PracticeAvailabilityAudit
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            staffList={staffList}
            operatoriesList={operatoriesList}
            servicesList={servicesList}
            appointments={appointments}
            onBookSlot={handleAuditBookSlot}
          />
        )}
      </main>

      {/* Phase 4 & 5: 5-Step Guided Client Booking Dialog with Rescheduling & Waitlist support */}
      <BookingDialog
        isOpen={isBookingDialogOpen}
        onClose={() => {
          setIsBookingDialogOpen(false);
          setRescheduleTargetAppointment(null);
        }}
        staffList={staffList}
        operatoriesList={operatoriesList}
        servicesList={servicesList}
        appointments={appointments}
        initialDate={currentDate}
        initialMinute={bookingPreselect.minute}
        initialStaffId={bookingPreselect.staffId}
        initialOperatoryId={bookingPreselect.operatoryId}
        initialServiceId={bookingPreselect.serviceId}
        rescheduleAppointment={rescheduleTargetAppointment}
        onBookAppointment={handleBookAppointment}
        onJoinWaitlist={handleAddWaitlistEntry}
      />

      {/* Phase 5: Priority Patient Waitlist Drawer */}
      <WaitlistDrawer
        isOpen={isWaitlistDrawerOpen}
        onClose={() => setIsWaitlistDrawerOpen(false)}
        currentDate={currentDate}
        waitlist={waitlist}
        servicesList={servicesList}
        staffList={staffList}
        operatoriesList={operatoriesList}
        appointments={appointments}
        onAddWaitlistEntry={handleAddWaitlistEntry}
        onRemoveWaitlistEntry={handleRemoveWaitlistEntry}
        onAutoFillAppointment={handleAutoFillAppointment}
        onSimulateCancellation={handleSimulateCancellation}
      />

      {/* Phase 5: Clinical Management Drawer (Rescheduling & Cancellation) */}
      <AppointmentDrawer
        isOpen={isAppointmentDrawerOpen}
        onClose={() => setIsAppointmentDrawerOpen(false)}
        appointment={selectedAppointment}
        servicesList={servicesList}
        staffList={staffList}
        operatoriesList={operatoriesList}
        onRescheduleAppointment={handleInitiateReschedule}
        onCancelAppointment={handleCancelAppointment}
        onToggleFlexible={handleToggleFlexible}
      />

      {/* Clinic Executive Footer & Demo Persistence Reset Link */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              A
            </div>
            <div>
              <p className="font-extrabold text-slate-800">
                Apex Dental Surgical & Aesthetic Center
              </p>
              <p className="text-[11px] text-slate-400">
                Registered Private Practice #8841-A • CQC Accredited • Autonomous Chair Tetris & Priority Waitlist Backfill Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetToDemoData}
              title="Reset appointments and priority waitlist back to initial demonstration state"
              className="text-dental-teal hover:text-dental-teal-dark font-extrabold flex items-center gap-1.5 transition underline hover:no-underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Clinic Demo Data</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">LocalStorage Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
