import {
  DAYS,
  END_HOUR,
  MAX_DAILY_HOURS,
  MIN_SHIFT_HOURS,
  SLOT_HOURS,
  START_HOUR,
  type Day,
  type Intern,
  type ScheduleSlot,
} from './types';

// How much of a fairness lead a waiting intern needs before displacing
// whoever currently holds a workstation. Without this, equally-available
// interns would trade off every single slot once granularity drops to
// 15 minutes, producing a schedule nobody could actually work.
const CONTINUITY_BONUS_HOURS = 1;

const MIN_SHIFT_SLOTS = Math.round(MIN_SHIFT_HOURS / SLOT_HOURS);

export function generateSchedule(interns: Intern[], numWorkstations: number): ScheduleSlot[] {
  const hours: number[] = [];
  for (let h = START_HOUR; h < END_HOUR; h += SLOT_HOURS) hours.push(h);

  const assignedCount: Record<string, number> = {};
  interns.forEach((i) => (assignedCount[i.id] = 0));

  const slots: ScheduleSlot[] = [];

  for (const day of DAYS) {
    let prevAssignment: (string | null)[] = new Array(numWorkstations).fill(null);

    const dailyHours: Record<string, number> = {};
    interns.forEach((i) => (dailyHours[i.id] = 0));

    for (const hour of hours) {
      const currentlySeated = new Set(prevAssignment.filter((id): id is string => id !== null));

      const available = interns.filter((i) => {
        const a = i.availability[day];
        return (
          a.available &&
          hour >= a.start &&
          hour < a.end &&
          assignedCount[i.id] < i.maxWeeklyHours &&
          dailyHours[i.id] < MAX_DAILY_HOURS
        );
      });

      const effectiveCount = (id: string) =>
        assignedCount[id] - (currentlySeated.has(id) ? CONTINUITY_BONUS_HOURS : 0);

      available.sort(
        (a, b) => effectiveCount(a.id) - effectiveCount(b.id) || a.name.localeCompare(b.name),
      );

      const chosen = available.slice(0, numWorkstations);
      const chosenIds = new Set(chosen.map((i) => i.id));
      const remaining = [...chosen];
      const assignment: (string | null)[] = new Array(numWorkstations).fill(null);

      // keep interns at the same workstation across consecutive hours when possible
      for (let w = 0; w < numWorkstations; w++) {
        const prevId = prevAssignment[w];
        if (prevId && chosenIds.has(prevId)) {
          assignment[w] = prevId;
          const idx = remaining.findIndex((i) => i.id === prevId);
          if (idx >= 0) remaining.splice(idx, 1);
        }
      }

      for (let w = 0; w < numWorkstations; w++) {
        if (assignment[w] == null && remaining.length > 0) {
          const next = remaining.shift()!;
          assignment[w] = next.id;
        }
      }

      assignment.forEach((id) => {
        if (!id) return;
        assignedCount[id] += SLOT_HOURS;
        dailyHours[id] += SLOT_HOURS;
      });

      slots.push({ day, hour, assignments: assignment });
      prevAssignment = assignment;
    }
  }

  dropShiftsShorterThan(slots, numWorkstations, MIN_SHIFT_SLOTS);

  return slots;
}

// Clears any continuous same-intern stretch at a workstation that's shorter
// than the minimum shift length, leaving the workstation empty for that
// stretch instead. Runs per (day, workstation) column over slots in the
// order they were pushed, i.e. chronological within each day.
function dropShiftsShorterThan(
  slots: ScheduleSlot[],
  numWorkstations: number,
  minSlots: number,
): void {
  for (const day of DAYS) {
    const daySlots = slots.filter((s) => s.day === day);
    for (let w = 0; w < numWorkstations; w++) {
      let i = 0;
      while (i < daySlots.length) {
        const id = daySlots[i].assignments[w];
        if (id == null) {
          i++;
          continue;
        }
        let j = i;
        while (j < daySlots.length && daySlots[j].assignments[w] === id) j++;
        if (j - i < minSlots) {
          for (let k = i; k < j; k++) daySlots[k].assignments[w] = null;
        }
        i = j;
      }
    }
  }
}

export function formatHour(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const wholeHour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = wholeHour >= 12 ? 'PM' : 'AM';
  const displayHour = wholeHour % 12 === 0 ? 12 : wholeHour % 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatHours(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

export interface CellPlan {
  isStart: boolean;
  rowSpan: number;
  internId: string | null;
}

function buildAssignmentLookup(slots: ScheduleSlot[]) {
  const map = new Map<string, ScheduleSlot>();
  slots.forEach((s) => map.set(`${s.day}-${s.hour}`, s));
  return (day: Day, hour: number, workstationIdx: number) =>
    map.get(`${day}-${hour}`)?.assignments[workstationIdx] ?? null;
}

// For each (day, workstation) column, collapse consecutive quarter-hour
// slots assigned to the same intern into a single spanning cell, so the
// schedule reads as continuous blocks instead of one row per 15 minutes.
// Shared by the on-screen grid, the print view, and PDF export so they
// never disagree on how a schedule is laid out.
export function buildColumnPlans(
  slots: ScheduleSlot[],
  displayDays: Day[],
  numWorkstations: number,
  hoursList: number[],
): CellPlan[][] {
  const assignmentAt = buildAssignmentLookup(slots);
  return displayDays.flatMap((day) =>
    Array.from({ length: numWorkstations }, (_unused, idx) => {
      const plan: CellPlan[] = [];
      let row = 0;
      while (row < hoursList.length) {
        const internId = assignmentAt(day, hoursList[row], idx);
        let span = 1;
        while (
          row + span < hoursList.length &&
          assignmentAt(day, hoursList[row + span], idx) === internId
        ) {
          span++;
        }
        plan.push({ isStart: true, rowSpan: span, internId });
        for (let k = 1; k < span; k++) plan.push({ isStart: false, rowSpan: 0, internId });
        row += span;
      }
      return plan;
    }),
  );
}

// Hours where nobody is scheduled at any currently-displayed workstation are
// dropped, so print/PDF output only shows actual working time.
export function computePrintHours(
  slots: ScheduleSlot[],
  displayDays: Day[],
  numWorkstations: number,
  hours: number[],
): number[] {
  const assignmentAt = buildAssignmentLookup(slots);
  return hours.filter((hour) =>
    displayDays.some((day) => {
      for (let idx = 0; idx < numWorkstations; idx++) {
        if (assignmentAt(day, hour, idx) !== null) return true;
      }
      return false;
    }),
  );
}

// Whether any currently-displayed column starts a new shift (or goes idle)
// at this row — used to decide whether a quarter-hour time label is worth
// printing.
export function hasTransitionAt(plans: CellPlan[][], numColumns: number, rowIdx: number): boolean {
  for (let col = 0; col < numColumns; col++) {
    if (plans[col]?.[rowIdx]?.isStart) return true;
  }
  return false;
}

export interface InternHourSummary {
  scheduled: number;
  available: number;
  cap: number;
  target: number;
}

export function computeInternHours(
  interns: Intern[],
  slots: ScheduleSlot[],
): Record<string, InternHourSummary> {
  const result: Record<string, InternHourSummary> = {};
  interns.forEach((i) => {
    const available = DAYS.reduce((sum, day) => {
      const a = i.availability[day];
      return a.available ? sum + Math.max(0, a.end - a.start) : sum;
    }, 0);
    result[i.id] = { scheduled: 0, available, cap: i.maxWeeklyHours, target: Math.min(available, i.maxWeeklyHours) };
  });
  slots.forEach((slot) => {
    slot.assignments.forEach((id) => {
      if (id && result[id]) result[id].scheduled += SLOT_HOURS;
    });
  });
  return result;
}
