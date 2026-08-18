import { formatHours, type InternHourSummary } from '../schedule';
import type { Intern } from '../types';

interface Props {
  interns: Intern[];
  hours: Record<string, InternHourSummary>;
}

export default function InternSummary({ interns, hours }: Props) {
  if (interns.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 print:hidden">
      <h2 className="text-sm font-semibold text-slate-800">Hours summary</h2>
      <ul className="mt-3 flex flex-col gap-1.5 text-xs">
        {interns.map((intern) => {
          const h = hours[intern.id] ?? { scheduled: 0, available: 0, cap: 0, target: 0 };
          const short = h.scheduled < h.target;
          const cappedByLimit = h.cap < h.available;
          return (
            <li key={intern.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 truncate text-slate-700">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: intern.color }}
                  aria-hidden
                />
                <span className="truncate">{intern.name || 'Unnamed'}</span>
              </span>
              <span className={short ? 'text-amber-600' : 'text-slate-500'}>
                {formatHours(h.scheduled)} / {formatHours(h.target)} hrs{cappedByLimit ? ' (cap)' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
