export type DentalBranch =
  | 'Preventative'
  | 'Restorative'
  | 'Cosmetic'
  | 'Orthodontic'
  | 'Facial Surgery';

export interface DentalService {
  id: string;
  name: string;
  branch: DentalBranch;
  durationMinutes: number;
  cleanupBufferMinutes: number;
  allowedStaffIds: string[];
  requiredOperatoryType: 'surgical' | 'general' | 'hygiene';
  description: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Principal Surgeon' | 'Cosmetic Dentist' | 'Dental Hygienist';
  qualifications: string;
  colorCode: string;
  shifts: Record<string, { startMinute: number; endMinute: number }>;
  breaks: Record<string, Array<{ startMinute: number; endMinute: number; label: string }>>;
}

export interface Operatory {
  id: string;
  name: string;
  type: 'surgical' | 'general' | 'hygiene';
  chairModel: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceId: string;
  staffId: string;
  operatoryId: string;
  date: string; // YYYY-MM-DD
  startMinute: number; // minutes from midnight (e.g. 540 = 09:00)
  endMinute: number; // minutes from midnight (startMinute + duration)
  bufferEndMinute: number; // endMinute + cleanupBufferMinutes
  status: 'confirmed' | 'rescheduled' | 'cancelled';
  isFlexible: boolean;
}

export interface WaitlistEntry {
  id: string;
  patientName: string;
  phone: string;
  serviceId: string;
  preferredDate: string;
  notes: string;
}

export interface TimeSlot {
  startMinute: number;
  endMinute: number;
  staffId: string;
  operatoryId: string;
  date: string;
  score?: number;
  isRecommended?: boolean;
  recommendationReason?: string;
  efficiencyTier?: 'recommended' | 'standard' | 'leak';
  deadGapMinutes?: number;
}

export interface SlotScoringDetails {
  contiguityBonus: number;
  deadGapPenalty: number;
  roomSpecializationBonus: number;
  shiftCompactionBonus: number;
  totalScore: number;
  explanation: string;
  deadGapMinutes: number;
}

export interface ScoredTimeSlot extends TimeSlot {
  score: number;
  isRecommended: boolean;
  recommendationReason: string;
  details?: SlotScoringDetails;
}

export interface DayUtilizationMetric {
  date: string;
  totalOperatoryMinutes: number;
  bookedProcedureMinutes: number;
  turnaroundBufferMinutes: number;
  idleDeadGapMinutes: number;
  operatoryUtilizationPct: number;
  staffUtilizationPct: number;
  potentialDeadGapsCount: number;
}

export type ViewMode = 'operatory' | 'staff';
