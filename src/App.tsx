import { useMemo, useState } from 'react';
import InternManager from './components/InternManager';
import InternSummary from './components/InternSummary';
import ScheduleGrid from './components/ScheduleGrid';
import WorkstationControl from './components/WorkstationControl';
import { computeInternHours, formatHour, generateSchedule } from './schedule';
import {
  createDefaultAvailability,
  createWorkstation,
  END_HOUR,
  INTERN_COLORS,
  MAX_WEEKLY_HOURS,
  START_HOUR,
  type Intern,
  type Workstation,
} from './types';

function makeIntern(existingCount: number): Intern {
  return {
    id: crypto.randomUUID(),
    name: '',
    color: INTERN_COLORS[existingCount % INTERN_COLORS.length],
    maxWeeklyHours: MAX_WEEKLY_HOURS,
    availability: createDefaultAvailability(),
  };
}

function App() {
  const [interns, setInterns] = useState<Intern[]>(() => [makeIntern(0), makeIntern(1)]);
  const [workstations, setWorkstations] = useState<Workstation[]>(() => [
    createWorkstation(0),
    createWorkstation(1),
  ]);

  const slots = useMemo(
    () => generateSchedule(interns, workstations.length),
    [interns, workstations.length],
  );
  const hours = useMemo(() => computeInternHours(interns, slots), [interns, slots]);

  const addIntern = () => setInterns((prev) => [...prev, makeIntern(prev.length)]);
  const removeIntern = (id: string) =>
    setInterns((prev) => prev.filter((i) => i.id !== id));
  const updateIntern = (id: string, updater: (intern: Intern) => Intern) =>
    setInterns((prev) => prev.map((i) => (i.id === id ? updater(i) : i)));

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Intern Workstation Scheduler</h1>
            <p className="text-xs text-slate-500">
              Build a Monday&ndash;Friday, {formatHour(START_HOUR)}&ndash;{formatHour(END_HOUR)} schedule from intern availability.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 active:bg-slate-800"
          >
            Print schedule
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[340px_1fr] print:block print:max-w-none print:p-0">
        <div className="flex flex-col gap-4 print:hidden">
          <WorkstationControl workstations={workstations} onChange={setWorkstations} />
          <InternManager
            interns={interns}
            onUpdate={updateIntern}
            onRemove={removeIntern}
            onAdd={addIntern}
          />
          <InternSummary interns={interns} hours={hours} />
        </div>

        <div className="print:p-4">
          <ScheduleGrid interns={interns} workstations={workstations} slots={slots} />
        </div>
      </main>
    </div>
  );
}

export default App;
