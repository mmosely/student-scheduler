import { DAYS, END_HOUR, MAX_WEEKLY_HOURS, SLOT_HOURS, START_HOUR, TIME_OPTIONS, type Intern } from '../types';
import { formatHour } from '../schedule';

interface Props {
  interns: Intern[];
  onUpdate: (id: string, updater: (intern: Intern) => Intern) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export default function InternManager({ interns, onUpdate, onRemove, onAdd }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Interns</h2>
          <p className="mt-1 text-xs text-slate-500">Set each intern's weekly availability.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700"
        >
          + Add intern
        </button>
      </div>

      {interns.length === 0 && (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
          No interns yet. Add one to start building the schedule.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {interns.map((intern) => (
          <div key={intern.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: intern.color }}
                aria-hidden
              />
              <input
                type="text"
                value={intern.name}
                onChange={(e) =>
                  onUpdate(intern.id, (i) => ({ ...i, name: e.target.value }))
                }
                placeholder="Intern name"
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onRemove(intern.id)}
                aria-label={`Remove ${intern.name || 'intern'}`}
                className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <label htmlFor={`max-hours-${intern.id}`} className="w-24 shrink-0 text-slate-600">
                Max hrs/week
              </label>
              <input
                id={`max-hours-${intern.id}`}
                type="number"
                min={0}
                max={MAX_WEEKLY_HOURS}
                step={SLOT_HOURS}
                value={intern.maxWeeklyHours}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdate(intern.id, (i) => ({
                    ...i,
                    maxWeeklyHours: Number.isNaN(val)
                      ? 0
                      : Math.min(MAX_WEEKLY_HOURS, Math.max(0, val)),
                  }));
                }}
                className="w-16 rounded-md border border-slate-300 px-1.5 py-1 text-slate-700 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-slate-400">of {MAX_WEEKLY_HOURS} possible</span>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {DAYS.map((day) => {
                const a = intern.availability[day];
                return (
                  <div key={day} className="flex items-center gap-2 text-xs">
                    <label className="flex w-24 items-center gap-1.5 text-slate-600">
                      <input
                        type="checkbox"
                        checked={a.available}
                        onChange={(e) =>
                          onUpdate(intern.id, (i) => ({
                            ...i,
                            availability: {
                              ...i.availability,
                              [day]: { ...a, available: e.target.checked },
                            },
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {day}
                    </label>
                    <select
                      value={a.start}
                      disabled={!a.available}
                      onChange={(e) =>
                        onUpdate(intern.id, (i) => {
                          const start = Number(e.target.value);
                          const current = i.availability[day];
                          return {
                            ...i,
                            availability: {
                              ...i.availability,
                              [day]: {
                                ...current,
                                start,
                                end: Math.max(current.end, start + SLOT_HOURS),
                              },
                            },
                          };
                        })
                      }
                      className="rounded-md border border-slate-300 px-1.5 py-1 text-slate-700 disabled:bg-slate-50 disabled:text-slate-300"
                    >
                      {TIME_OPTIONS.filter((h) => h < END_HOUR).map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-400">to</span>
                    <select
                      value={a.end}
                      disabled={!a.available}
                      onChange={(e) =>
                        onUpdate(intern.id, (i) => {
                          const end = Number(e.target.value);
                          const current = i.availability[day];
                          return {
                            ...i,
                            availability: {
                              ...i.availability,
                              [day]: {
                                ...current,
                                end,
                                start: Math.min(current.start, end - SLOT_HOURS),
                              },
                            },
                          };
                        })
                      }
                      className="rounded-md border border-slate-300 px-1.5 py-1 text-slate-700 disabled:bg-slate-50 disabled:text-slate-300"
                    >
                      {TIME_OPTIONS.filter((h) => h > START_HOUR).map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
