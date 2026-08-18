import { createWorkstation, type Workstation } from '../types';

interface Props {
  workstations: Workstation[];
  onChange: (workstations: Workstation[]) => void;
}

export default function WorkstationControl({ workstations, onChange }: Props) {
  const addWorkstation = () => onChange([...workstations, createWorkstation(workstations.length)]);
  const removeWorkstation = (id: string) =>
    onChange(workstations.filter((w) => w.id !== id));
  const renameWorkstation = (id: string, name: string) =>
    onChange(workstations.map((w) => (w.id === id ? { ...w, name } : w)));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Workstations</h2>
          <p className="mt-1 text-xs text-slate-500">Name and manage the available stations.</p>
        </div>
        <button
          type="button"
          onClick={addWorkstation}
          disabled={workstations.length >= 50}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          + Add station
        </button>
      </div>

      {workstations.length === 0 && (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
          No workstations yet. Add one to start scheduling.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        {workstations.map((w, idx) => (
          <div key={w.id} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs text-slate-400">{idx + 1}.</span>
            <input
              type="text"
              value={w.name}
              onChange={(e) => renameWorkstation(w.id, e.target.value)}
              placeholder={`Station ${idx + 1}`}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeWorkstation(w.id)}
              aria-label={`Remove ${w.name || 'workstation'}`}
              className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
