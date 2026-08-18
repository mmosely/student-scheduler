import { jsPDF } from 'jspdf';
import { buildColumnPlans, computePrintHours, formatHour, hasTransitionAt } from './schedule';
import { DAYS, END_HOUR, SLOT_HOURS, START_HOUR, type Day, type Intern, type ScheduleSlot, type Workstation } from './types';

const DAY_FULL_NAMES: Record<Day, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

const MARGIN = 24;
const HEADER_ROW_HEIGHT = 20;
const MAX_ROW_HEIGHT = 14;
const MIN_ROW_HEIGHT = 5;
const TIME_COL_WEIGHT = 1.5;

// slate palette used elsewhere in the UI, reused here for visual consistency
const COLORS = {
  border: [226, 232, 240] as const,
  headerBg: [248, 250, 252] as const,
  headerText: [51, 65, 85] as const,
  subHeaderText: [148, 163, 184] as const,
  timeText: [71, 85, 105] as const,
  emptyText: [203, 213, 225] as const,
  subtitle: [100, 116, 139] as const,
  title: [15, 23, 42] as const,
};

interface ExportParams {
  interns: Intern[];
  workstations: Workstation[];
  slots: ScheduleSlot[];
  selectedDay: 'all' | Day;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function fileNameFor(selectedDay: 'all' | Day): string {
  const suffix = selectedDay === 'all' ? 'weekly' : selectedDay.toLowerCase();
  return `workstation-schedule-${suffix}.pdf`;
}

// Builds the schedule directly with jsPDF's drawing primitives and triggers
// a file download — no browser print dialog/preview involved.
export function exportSchedulePdf({ interns, workstations, slots, selectedDay }: ExportParams): void {
  const displayDays: Day[] = selectedDay === 'all' ? [...DAYS] : [selectedDay];
  const numWorkstations = workstations.length;
  const totalDataCols = displayDays.length * numWorkstations;
  const internById = new Map(interns.map((i) => [i.id, i]));

  const hours: number[] = [];
  for (let h = START_HOUR; h < END_HOUR; h += SLOT_HOURS) hours.push(h);

  const printHours = computePrintHours(slots, displayDays, numWorkstations, hours);
  const plans = buildColumnPlans(slots, displayDays, numWorkstations, printHours);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const title = selectedDay === 'all' ? 'Weekly Workstation Schedule' : `${DAY_FULL_NAMES[selectedDay]} Workstation Schedule`;
  const subtitle = `${numWorkstations} workstation${numWorkstations === 1 ? '' : 's'} · ${formatHour(START_HOUR)}–${formatHour(END_HOUR)}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.title);
  doc.text(title, MARGIN, MARGIN + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.subtitle);
  doc.text(subtitle, MARGIN, MARGIN + 22);

  if (printHours.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.subtitle);
    doc.text('No hours scheduled.', MARGIN, MARGIN + 60);
    doc.save(fileNameFor(selectedDay));
    return;
  }

  const tableTop = MARGIN + 38;
  const availableHeight = pageHeight - MARGIN - tableTop - HEADER_ROW_HEIGHT * 2;
  const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, availableHeight / printHours.length));
  const fontSize = Math.max(5, Math.min(8, rowHeight * 0.6));

  const totalWeight = TIME_COL_WEIGHT + totalDataCols;
  const tableWidth = pageWidth - MARGIN * 2;
  const timeColWidth = (TIME_COL_WEIGHT / totalWeight) * tableWidth;
  const dataColWidth = (1 / totalWeight) * tableWidth;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);

  // header row 1: Time + day names
  let y = tableTop;
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(MARGIN, y, timeColWidth, HEADER_ROW_HEIGHT * 2, 'FD');

  let x = MARGIN + timeColWidth;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  displayDays.forEach((day) => {
    const w = dataColWidth * numWorkstations;
    // Fill and text color both ride on the PDF's single "fill color" state,
    // so setTextColor for the label bleeds into the next cell's background
    // fill unless it's reset here, right before each rect is drawn.
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(x, y, w, HEADER_ROW_HEIGHT, 'FD');
    doc.setTextColor(...COLORS.headerText);
    doc.text(selectedDay === 'all' ? day : DAY_FULL_NAMES[day], x + w / 2, y + HEADER_ROW_HEIGHT / 2 + 3, {
      align: 'center',
    });
    x += w;
  });

  // header row 2: workstation names
  y += HEADER_ROW_HEIGHT;
  x = MARGIN + timeColWidth;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  displayDays.forEach(() =>
    workstations.forEach((w, idx) => {
      doc.setFillColor(...COLORS.headerBg);
      doc.rect(x, y, dataColWidth, HEADER_ROW_HEIGHT, 'FD');
      doc.setTextColor(...COLORS.subHeaderText);
      const label = w.name || `Station ${idx + 1}`;
      doc.text(truncateToWidth(doc, label, dataColWidth - 4), x + dataColWidth / 2, y + HEADER_ROW_HEIGHT / 2 + 2, {
        align: 'center',
      });
      x += dataColWidth;
    }),
  );

  // body: time labels
  y += HEADER_ROW_HEIGHT;
  const bodyTop = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...COLORS.timeText);
  printHours.forEach((hour, rowIdx) => {
    const isWholeHour = Math.round((hour % 1) * 100) === 0;
    const showLabel = isWholeHour || hasTransitionAt(plans, totalDataCols, rowIdx);
    const rowY = bodyTop + rowIdx * rowHeight;
    doc.rect(MARGIN, rowY, timeColWidth, rowHeight, 'D');
    if (showLabel) {
      doc.text(formatHour(hour), MARGIN + 4, rowY + rowHeight / 2 + fontSize * 0.3);
    }
  });

  // body: data cells
  displayDays.forEach((_day, dayIdx) => {
    workstations.forEach((_w, wIdx) => {
      const colIdx = dayIdx * numWorkstations + wIdx;
      const colX = MARGIN + timeColWidth + colIdx * dataColWidth;
      let rowIdx = 0;
      while (rowIdx < printHours.length) {
        const cell = plans[colIdx][rowIdx];
        const cellY = bodyTop + rowIdx * rowHeight;
        const cellHeight = cell.rowSpan * rowHeight;
        const intern = cell.internId ? internById.get(cell.internId) : undefined;

        if (intern) {
          const [r, g, b] = hexToRgb(intern.color);
          doc.setFillColor(r, g, b);
          doc.rect(colX, cellY, dataColWidth, cellHeight, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(
            truncateToWidth(doc, intern.name || 'Unnamed', dataColWidth - 4),
            colX + dataColWidth / 2,
            cellY + cellHeight / 2 + fontSize * 0.3,
            { align: 'center' },
          );
          doc.setFont('helvetica', 'normal');
        } else {
          doc.rect(colX, cellY, dataColWidth, cellHeight, 'D');
        }

        rowIdx += cell.rowSpan;
      }
    });
  });

  doc.save(fileNameFor(selectedDay));
}
