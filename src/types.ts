export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export type Day = (typeof DAYS)[number];

// Bounds of the schedulable window, wide enough to cover interns available
// earlier or later than the typical workday.
export const START_HOUR = 7;
export const END_HOUR = 19;

// Default start/end shown for a newly added intern's availability — most
// interns work a standard 9-5, but they can adjust within START_HOUR..END_HOUR.
export const DEFAULT_START_HOUR = 9;
export const DEFAULT_END_HOUR = 17;

export const SLOT_HOURS = 0.25;

// Policy cap on how many hours an intern can be scheduled per week,
// independent of how wide the schedulable window is.
export const MAX_WEEKLY_HOURS = 30;

// No intern works more than this in a single day.
export const MAX_DAILY_HOURS = 8;

// No single continuous stretch at a workstation is shorter than this —
// a shift that would come out shorter is dropped rather than scheduled.
export const MIN_SHIFT_HOURS = 1;

export const TIME_OPTIONS: number[] = [];
for (let h = START_HOUR; h <= END_HOUR; h += SLOT_HOURS) {
  TIME_OPTIONS.push(Math.round(h * 100) / 100);
}

export interface DayAvailability {
  available: boolean;
  start: number;
  end: number;
}

export interface Intern {
  id: string;
  name: string;
  color: string;
  maxWeeklyHours: number;
  availability: Record<Day, DayAvailability>;
}

export interface ScheduleSlot {
  day: Day;
  hour: number;
  assignments: (string | null)[];
}

export interface Workstation {
  id: string;
  name: string;
}

export function createWorkstation(index: number): Workstation {
  return { id: crypto.randomUUID(), name: `Station ${index + 1}` };
}

export function createDefaultAvailability(): Record<Day, DayAvailability> {
  return DAYS.reduce(
    (acc, day) => {
      acc[day] = { available: true, start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR };
      return acc;
    },
    {} as Record<Day, DayAvailability>,
  );
}

// Soft summer palette — muted, sun-faded tones rather than saturated primaries.
// Each still clears a ~3:1 contrast ratio against the white labels in the
// schedule grid.
export const INTERN_COLORS = [
  '#D2553F', // coral
  '#4A85B0', // ocean blue
  '#A97826', // honey gold
  '#4E9B7D', // seafoam
  '#8F5FA8', // lavender
  '#D9587A', // watermelon
  '#CC7550', // peach
  '#3D8F8A', // turquoise
  '#6E8C60', // sage
  '#6E7CB5', // periwinkle
  '#9C4F72', // berry
  '#B08650', // sandy tan
];
