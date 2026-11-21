import React from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Sparkles,
  Shield,
  Activity,
  Layers,
  CheckCircle,
  FileSearch,
  LayoutGrid,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'schedule' | 'audit';
  onTabChange: (tab: 'schedule' | 'audit') => void;
  totalTodayConfirmed: number;
  waitlistCount: number;
  availableMatchesCount: number;
  onOpenBookingModal: () => void;
  onOpenWaitlistDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  totalTodayConfirmed,
  waitlistCount,
  availableMatchesCount,
  onOpenBookingModal,
  onOpenWaitlistDrawer,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Clinic Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-subtle">
            {/* Minimalist Dental Cross / Molar icon */}
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2C8.5 2 6 4.5 6 8.5c0 3.5 1.5 11 3.5 11.5s2.5-4 2.5-4 0.5 4 2.5 4 3.5-8 3.5-11.5C18 4.5 15.5 2 12 2z" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 font-sans">
                APEX <span className="text-dental-teal font-normal">DENTAL</span>
              </h1>
              <span className="text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                Chair Tetris v2.0
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Clinical Feasibility & Staff Schedule Optimization
            </p>
          </div>
        </div>

        {/* Center: Main View Navigation */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onTabChange('schedule')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'schedule'
                ? 'bg-white text-dental-teal shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Operatory Schedule</span>
          </button>

          <button
            onClick={() => onTabChange('audit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-dental-teal shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5 text-dental-teal" />
            <span>Practice Availability Audit</span>
            <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 rounded uppercase">
              Phase 2
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Priority Patient Waitlist Drawer Trigger */}
          <button
            onClick={onOpenWaitlistDrawer}
            className="relative px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl transition flex items-center gap-2 shadow-xs hover:border-slate-300"
          >
            <Users className="w-4 h-4 text-dental-teal" />
            <span className="hidden lg:inline">Priority Patient Waitlist</span>
            <span className="hidden sm:inline lg:hidden">Priority Waitlist</span>
            <span className="sm:hidden">Waitlist</span>
            <span className="bg-teal-50 text-dental-teal border border-teal-200 text-[11px] font-extrabold px-1.5 py-0.2 rounded-full">
              {waitlistCount}
            </span>

            {availableMatchesCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-dental-teal"></span>
              </span>
            )}
          </button>

          {/* Primary Schedule Button */}
          <button
            onClick={onOpenBookingModal}
            className="px-4 py-2 text-xs font-bold bg-dental-teal hover:bg-dental-teal-dark text-white rounded-xl transition shadow-card flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Schedule Appointment</span>
            <span className="sm:hidden">Book</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Nav for View Switcher */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 p-2 bg-slate-50">
        <button
          onClick={() => onTabChange('schedule')}
          className={`flex-1 py-1.5 text-xs font-bold text-center rounded-lg ${
            activeTab === 'schedule'
              ? 'bg-white text-dental-teal shadow-xs'
              : 'text-slate-600'
          }`}
        >
          Operatory Schedule
        </button>
        <button
          onClick={() => onTabChange('audit')}
          className={`flex-1 py-1.5 text-xs font-bold text-center rounded-lg ${
            activeTab === 'audit'
              ? 'bg-white text-dental-teal shadow-xs'
              : 'text-slate-600'
          }`}
        >
          Availability Audit
        </button>
      </div>
    </header>
  );
};
