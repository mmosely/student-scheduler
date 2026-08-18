import { useState } from 'react';
import { DAYS, END_HOUR, SLOT_HOURS, START_HOUR, type Day, type Intern, type ScheduleSlot, type Workstation } from '../types';
import { buildColumnPlans, computePrintHours, formatHour, hasTransitionAt, type CellPlan } from '../schedule';
import { exportSchedulePdf } from '../pdfExport';

interface Props {
  interns: Intern[];
  workstations: Workstation[];
  slots: ScheduleSlot[];
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

  const columnPlans = buildColumnPlans(slots, displayDays, numWorkstations, hours);

  // Printed/PDF output should skip hours where nobody is scheduled at any
  // currently-displayed workstation, rather than showing empty rows.
  const printHours = computePrintHours(slots, displayDays, numWorkstations, hours);
  const printColumnPlans = buildColumnPlans(slots, displayDays, numWorkstations, printHours);

  const renderTable = (hoursList: number[], plans: CellPlan[][], compactTimeLabels = false) => (
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
          {hoursList.map((hour, rowIdx) => {
            const isWholeHour = Math.round((hour % 1) * 100) === 0;
            const showTimeLabel =
              !compactTimeLabels || isWholeHour || hasTransitionAt(plans, totalDataCols, rowIdx);
            return (
              <tr key={hour} className="print:break-inside-avoid">
                <td className="whitespace-nowrap border border-slate-200 p-2 font-medium text-slate-600">
                  {showTimeLabel ? formatHour(hour) : ''}
                </td>
                {displayDays.map((day, dayIdx) =>
                  workstations.map((w, wIdx) => {
                    const colIdx = dayIdx * numWorkstations + wIdx;
                    const cell = plans[colIdx][rowIdx];
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
            );
          })}
        </tbody>
      </table>
    </div>
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap gap-1">
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
        <button
          type="button"
          onClick={() => exportSchedulePdf({ interns, workstations, slots, selectedDay })}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Save as PDF
        </button>
      </div>

      {/* Screen view: full schedulable range, useful as an editing reference */}
      <div className="print:hidden">{renderTable(hours, columnPlans)}</div>

      {/* Print view: only hours with at least one scheduled workstation */}
      <div className="hidden print:block">
        {printHours.length > 0 ? (
          renderTable(printHours, printColumnPlans, true)
        ) : (
          <p className="text-sm text-slate-500">No hours scheduled.</p>
        )}
      </div>
    </div>
  );
}
