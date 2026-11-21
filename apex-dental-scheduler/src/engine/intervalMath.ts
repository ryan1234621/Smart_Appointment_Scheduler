import { Appointment, StaffMember } from '../types/scheduler';

/**
 * Converts "HH:MM" (24-hour) string to minutes from midnight (0..1439).
 * E.g., "08:30" -> 510
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Converts minutes from midnight to "HH:MM" (24-hour).
 * E.g., 510 -> "08:30"
 */
export function minutesToTimeString(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Formats minutes from midnight into human-friendly 12-hour AM/PM string.
 * E.g., 510 -> "8:30 AM", 750 -> "12:30 PM", 810 -> "1:30 PM"
 */
export function minutesToFormatted12h(minutes: number): string {
  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hrs24 >= 12 ? 'PM' : 'AM';
  const hrs12 = hrs24 % 12 === 0 ? 12 : hrs24 % 12;
  const minsPadded = mins === 0 ? '00' : String(mins).padStart(2, '0');
  return `${hrs12}:${minsPadded} ${period}`;
}

/**
 * Formats duration in minutes into a clean readable string.
 * E.g., 45 -> "45 min", 90 -> "1 hr 30 min"
 */
export function minutesToDurationString(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs} hr`;
}

/**
 * Checks if two half-open intervals [startA, endA) and [startB, endB) overlap.
 */
export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Checks if an interval [start, end) is completely contained within [outerStart, outerEnd).
 */
export function isWithinInterval(
  start: number,
  end: number,
  outerStart: number,
  outerEnd: number
): boolean {
  return start >= outerStart && end <= outerEnd;
}

/**
 * Returns 3-letter weekday key ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')
 * for a given YYYY-MM-DD date string.
 */
export function getDayOfWeekKey(
  dateStr: string
): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const mapping: Array<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'> = [
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
  ];
  return mapping[dayIndex];
}

/**
 * Verifies if an interval is completely within a staff member's working shift for that day.
 */
export function isWithinStaffShift(
  staff: StaffMember,
  dateStr: string,
  startMinute: number,
  endMinute: number
): boolean {
  const dayKey = getDayOfWeekKey(dateStr);
  const shift = staff.shifts[dayKey];
  if (!shift) return false;
  return isWithinInterval(startMinute, endMinute, shift.startMinute, shift.endMinute);
}

/**
 * Checks whether an interval overlaps with any breaks (e.g. lunch, decontamination) of a staff member.
 */
export function overlapsWithStaffBreaks(
  staff: StaffMember,
  dateStr: string,
  startMinute: number,
  endMinute: number
): boolean {
  const dayKey = getDayOfWeekKey(dateStr);
  const breaks = staff.breaks[dayKey] || [];
  return breaks.some((b) => intervalsOverlap(startMinute, endMinute, b.startMinute, b.endMinute));
}

/**
 * Gets formatted date label e.g., "Monday, Oct 19, 2026"
 */
export function formatDateReadable(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns an array of YYYY-MM-DD strings for the 5-7 days around the base date.
 */
export function getSurroundingDays(baseDateStr: string, daysCount: number = 7): string[] {
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const base = new Date(year, month - 1, day);
  const result: string[] = [];

  // Align to Monday if desirable, or start from base date
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}
