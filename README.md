# Intern Workstation Scheduler

A React + TypeScript + Tailwind CSS app for building a printable Monday–Friday
workstation schedule from intern availability.

## Features

- Add/remove interns and set per-day availability windows (7:00 AM–7:00 PM range, 15-minute increments)
- Per-intern weekly hour cap (default 30 hrs/week) and an 8-hour daily cap, enforced automatically
- Every scheduled shift is at least 1 hour long — shorter slivers are dropped rather than scheduled
- Add/remove/rename workstations
- Auto-generated weekly schedule that fairly rotates interns across available workstations
- View the full week or filter to a single day
- Print-friendly layout (`Print schedule` button) that fits the page and paginates cleanly

No backend — all state lives in memory in the browser for the current session.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL (defaults to `http://localhost:5173`).

## Build

```bash
npm run build
```

## Tech stack

- [Vite](https://vite.dev)
- [React](https://react.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
