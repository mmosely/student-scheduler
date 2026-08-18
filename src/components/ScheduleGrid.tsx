import { useState } from 'react';
import { DAYS, END_HOUR, SLOT_HOURS, START_HOUR, type Day, type Intern, type ScheduleSlot, type Workstation } from '../types';
import { formatHour } from '../schedule';

interface Props {
  interns: Intern[];
  workstations: Workstation[];
  slots: ScheduleSlot[];
}

interface CellPlan {
  isStart: boolean;
  rowSpan: number;
  internId: string | null;
}

const DAY_FULL_NAMES: Record<Day, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

type DayFilter = 'all' | Day;

export default function ScheduleGrid({ interns, workstations, slots }: Props) {
  const [selectedDay, setSelectedDay] = useState<DayFilter>('all');

  const hours: number[] = [];
  for (let h = START_HOUR; h < END_HOUR; h += SLOT_HOURS) hours.push(h);
  const numWorkstations = workstations.length;
  const displayDays: Day[] = selectedDay === 'all' ? [...DAYS] : [selectedDay];
  const totalDataCols = displayDays.length * numWorkstations;

  // Weighted column widths that always sum to 100%, so the table always
  // fits the printed page width instead of being clipped or scaled off it.
  const timeColWeight = 1.5;
  const totalWeight = timeColWeight + totalDataCols;
  const timeColPercent = (timeColWeight / totalWeight) * 100;
  const dataColPercent = (1 / totalWeight) * 100;

  const internById = new Map(interns.map((i) => [i.id, i]));
  const slotMap = new Map<string, ScheduleSlot>();
  slots.forEach((s) => slotMap.set(`${s.day}-${s.hour}`, s));
  const assignmentAt = (day: string, hour: number, workstationIdx: number) =>
    slotMap.get(`${day}-${hour}`)?.assignments[workstationIdx] ?? null;

  // For each (day, workstation) column, collapse consecutive quarter-hour
  // slots assigned to the same intern into a single spanning cell, so the
  // printed grid reads as continuous blocks instead of 32 repeated rows.
  const columnPlans: CellPlan[][] = displayDays.flatMap((day) =>
    workstations.map((_w, idx) => {
      const plan: CellPlan[] = [];
      let row = 0;
      while (row < hours.length) {
        const internId = assignmentAt(day, hours[row], idx);
        let span = 1;
        while (
          row + span < hours.length &&
          assignmentAt(day, hours[row + span], idx) === internId
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 print:border-0 print:p-0 print:shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          {selectedDay === 'all' ? 'Weekly Workstation Schedule' : `${DAY_FULL_NAMES[selectedDay]} Workstation Schedule`}
        </h2>
        <span className="text-xs text-slate-500">
          {numWorkstations} workstation{numWorkstations === 1 ? '' : 's'} &middot; {formatHour(START_HOUR)}
          &ndash;{formatHour(END_HOUR)}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1 print:hidden">
        <button
          type="button"
          onClick={() => setSelectedDay('all')}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            selectedDay === 'all'
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All week
        </button>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              selectedDay === day
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs print:min-w-0 print:text-[9px]">
          <colgroup>
            <col style={{ width: `${timeColPercent}%` }} />
            {displayDays.flatMap((day) =>
              workstations.map((w) => (
                <col key={`col-${day}-${w.id}`} style={{ width: `${dataColPercent}%` }} />
              )),
            )}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 p-2 text-left font-medium text-slate-500">
                Time
              </th>
              {displayDays.map((day) => (
                <th
                  key={day}
                  colSpan={numWorkstations}
                  className="border border-slate-200 bg-slate-50 p-2 text-center font-semibold text-slate-700"
                >
                  {selectedDay === 'all' ? day : DAY_FULL_NAMES[day]}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border border-slate-200 bg-slate-50 p-1"></th>
              {displayDays.map((day) =>
                workstations.map((w, idx) => (
                  <th
                    key={`${day}-ws-${w.id}`}
                    className="border border-slate-200 bg-slate-50 p-1 text-center font-normal text-slate-400"
                    title={w.name || `Station ${idx + 1}`}
                  >
                    <span className="block truncate">{w.name || `Station ${idx + 1}`}</span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour, rowIdx) => (
              <tr key={hour} className="print:break-inside-avoid">
                <td className="whitespace-nowrap border border-slate-200 p-2 font-medium text-slate-600">
                  {formatHour(hour)}
                </td>
                {displayDays.map((day, dayIdx) =>
                  workstations.map((w, wIdx) => {
                    const colIdx = dayIdx * numWorkstations + wIdx;
                    const cell = columnPlans[colIdx][rowIdx];
                    if (!cell.isStart) return null;
                    const intern = cell.internId ? internById.get(cell.internId) : undefined;
                    return (
                      <td
                        key={`${day}-${hour}-${w.id}`}
                        rowSpan={cell.rowSpan}
                        className="overflow-hidden border border-slate-200 p-1.5 text-center align-middle"
                        style={intern ? { backgroundColor: intern.color } : undefined}
                      >
                        {intern ? (
                          <span className="block truncate font-medium text-white" title={intern.name}>
                            {intern.name || 'Unnamed'}
                          </span>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
