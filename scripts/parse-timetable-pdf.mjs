import fs from 'node:fs';

// pdfjs-dist v5 removed the legacy/ folder; try common paths
let pdfjsLib;
try { pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs'); }
catch { try { pdfjsLib = await import('pdfjs-dist/build/pdf.mjs'); }
catch { pdfjsLib = await import('pdfjs-dist'); } }
const { getDocument } = pdfjsLib;

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('PDF-Pfad fehlt. Nutzung: node parse-timetable-pdf.mjs <pfad.pdf>');
  process.exit(1);
}

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR'];
const DAY_SET = new Set(WEEKDAYS);
const CLASS_PATTERN = /^[A-Z]{1,3}\s?\d{2}$/;

const data = new Uint8Array(fs.readFileSync(pdfPath));
const verbosity = pdfjsLib?.VerbosityLevel?.ERRORS ?? 0;
const doc = await getDocument({ data, verbosity }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();

const items = content.items
  .map((item) => ({ str: (item.str || '').trim(), x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0 }))
  .filter((item) => item.str)
  .sort((a, b) => b.y - a.y || a.x - b.x);

const rows = [];
for (const item of items) {
  const row = rows.find((r) => Math.abs(r.y - item.y) <= 2.5);
  if (row) row.items.push(item);
  else rows.push({ y: item.y, items: [item] });
}
rows.sort((a, b) => b.y - a.y);
for (const row of rows) row.items.sort((a, b) => a.x - b.x);

// Dynamische Klassen-Erkennung
function detectClassCenters() {
  if (rows.length === 0) return null;
  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);
  const classes = new Map();

  for (const row of headerRows) {
    for (const item of row.items) {
      const token = item.str.toUpperCase().replace(/\s+/g, '');
      if (!CLASS_PATTERN.test(item.str.toUpperCase())) continue;
      if (item.x < 80) continue;
      if (!classes.has(token)) classes.set(token, item.x);
    }
  }

  if (classes.size === 0) return null;
  return Object.fromEntries([...classes.entries()].sort((a, b) => a[1] - b[1]));
}

const classX = detectClassCenters();
if (!classX) {
  console.error('Keine Klassen im PDF-Header erkannt.');
  process.exit(1);
}

const classes = Object.keys(classX);

// Zeitspalten-Grenze: alles links davon gehört zur Zeit-/Tag-Spalte.
// Nutze 65 % der ersten Klassen-X-Position als robust skalierendes Maß.
const firstClassX = Object.values(classX)[0];
const timeColBoundary = Math.max(Math.round(firstClassX * 0.65), 85);

// Raum-Spalten ("R") im Header erkennen
function detectRoomColumns() {
  if (rows.length === 0) return null;
  const top = rows[0].y;
  const pageHeight = top - (rows[rows.length - 1]?.y ?? 0);
  const headerThreshold = Math.max(120, pageHeight * 0.15);
  const headerRows = rows.filter((row) => row.y > top - headerThreshold);

  const rPositions = [];
  for (const row of headerRows) {
    for (const item of row.items) {
      if (item.str === 'R' && item.x >= timeColBoundary) {
        rPositions.push(item.x);
      }
    }
  }
  if (rPositions.length === 0) return null;
  rPositions.sort((a, b) => a - b);

  const classEntries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const roomCols = {};
  for (const rx of rPositions) {
    let best = null;
    for (const [cls, cx] of classEntries) {
      if (cx <= rx) best = cls;
    }
    if (best && !roomCols[best]) roomCols[best] = rx;
  }
  return Object.keys(roomCols).length > 0 ? roomCols : null;
}

// Dynamische Spaltenbreiten (erste Klasse beginnt am timeColBoundary)
function computeColumnBounds(classX, roomColumns) {
  const entries = Object.entries(classX).sort((a, b) => a[1] - b[1]);
  const bounds = {};
  const ROOM_COL_MARGIN = 5;
  for (let i = 0; i < entries.length; i++) {
    const [cls, x] = entries[i];
    const nextX = i < entries.length - 1 ? entries[i + 1][1] : null;
    const prevEntry = i > 0 ? entries[i - 1] : null;

    let left;
    if (i === 0) {
      left = timeColBoundary;
    } else {
      const prevRoomX = roomColumns?.[prevEntry[0]];
      if (prevRoomX != null) {
        left = Math.round(prevRoomX) + ROOM_COL_MARGIN;
      } else {
        left = Math.round((prevEntry[1] + x) / 2);
      }
    }

    let right;
    const roomX = roomColumns?.[cls];
    if (roomX != null && nextX != null) {
      right = Math.round(roomX) + ROOM_COL_MARGIN;
    } else if (roomX != null) {
      right = Math.round(roomX) + 30;
    } else if (nextX != null) {
      right = Math.round((x + nextX) / 2);
    } else {
      right = Math.round(x + 120);
    }

    bounds[cls] = { left, right };
  }
  return bounds;
}

const roomColumns = detectRoomColumns();
const columnBounds = computeColumnBounds(classX, roomColumns);
const out = Object.fromEntries(classes.map((c) => [c, { MO: [], DI: [], MI: [], DO: [], FR: [] }]));

// ── Pre-scan: detect day boundaries ──────────────────────────────
// Day labels (MO, DI, …) appear at period 6, NOT at period 1.
// We find each "period 1" row (start of a day section) and the day
// marker within that section to correctly assign all periods.

const period1Ys = [];
for (const row of rows) {
  const left = row.items.filter((i) => i.x < timeColBoundary);
  const hasPeriod1 = left.some((i) => i.str === '1.');
  const hasEightOClock = left.some((i) => /8[.:]00/.test(i.str));
  if (hasPeriod1 && hasEightOClock) period1Ys.push(row.y);
}
period1Ys.sort((a, b) => b.y - a.y);

// Build day sections: each section spans from its period-1 Y down
// to just above the next section's period-1 Y. The boundary is placed
// just above the next period-1 (not at the midpoint) so that periods
// 7–10 which sit below period 6 are still included in the correct day.
const daySections = period1Ys.map((startY, i) => {
  const endY = i < period1Ys.length - 1
    ? period1Ys[i + 1] + 3
    : -Infinity;
  return { startY, endY, day: null };
});

// Find day marker within each section
for (const row of rows) {
  const dayToken = row.items.find((i) => i.x < timeColBoundary && DAY_SET.has(i.str))?.str;
  if (!dayToken) continue;
  for (const sec of daySections) {
    if (row.y <= sec.startY + 5 && row.y > sec.endY) {
      if (!sec.day) sec.day = dayToken;
      break;
    }
  }
}

// Fallback: assign weekdays in order if markers weren't found
for (let i = 0; i < daySections.length; i++) {
  if (!daySections[i].day) daySections[i].day = WEEKDAYS[i];
}

function getDayForY(y) {
  for (const sec of daySections) {
    if (y <= sec.startY + 5 && y > sec.endY) return sec.day;
  }
  return null;
}

// ── Helper: check if a string is an Excel error / empty marker ───
function isNoValue(s) {
  return !s || s === '#NV' || s === '#N/A' || s === '#WERT!' || s === '#REF!';
}

// ── Helper: check if a cell value looks like a room number ───────
const ROOM_RE = /^(\d{1,2}|#NV|#N\/A|BS)(\s*\/?\s*(\d{1,2}|#NV|BS))*$/i;
function isRoomValue(s) {
  return ROOM_RE.test(s);
}

const cellText = (row, cls) => {
  const { left, right } = columnBounds[cls];
  return row.items
    .filter((i) => i.x >= left && i.x < right)
    .map((i) => i.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ── Main extraction loop ─────────────────────────────────────────
const lastByClass = {};

for (const row of rows) {
  const day = getDayForY(row.y);
  if (!day) continue;

  // Skip Mittagspause
  if (row.items.some((i) => i.x < timeColBoundary && i.str.includes('Mittagspause'))) continue;

  // Strip any day label (MO, DI, …) from the left-column text so the
  // period regex also matches the period-6 row where the label sits.
  let left = row.items.filter((i) => i.x < timeColBoundary).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  for (const wd of WEEKDAYS) {
    if (left.startsWith(wd + ' ')) { left = left.slice(wd.length).trim(); break; }
  }
  const lessonMatch = left.match(/^(\d{1,2})\.\s*(\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2})/);

  if (lessonMatch) {
    const period = Number(lessonMatch[1]);
    const time = lessonMatch[2];
    for (const cls of classes) {
      const subject = cellText(row, cls);
      const entry = { period, time, subject: subject || undefined };
      out[cls][day].push(entry);
      lastByClass[`${cls}:${day}`] = entry;
    }
    continue;
  }

  // Non-period row: classify each class cell individually.
  // Room-number-like values (1-2 digits, #NV, BS) → room field.
  // Anything else → detail (continuation text).
  for (const cls of classes) {
    const val = cellText(row, cls);
    const key = `${cls}:${day}`;
    if (!val || isNoValue(val) || !lastByClass[key]) continue;

    if (isRoomValue(val)) {
      lastByClass[key].room = val;
    } else {
      lastByClass[key].detail = lastByClass[key].detail
        ? `${lastByClass[key].detail} · ${val}`
        : val;
    }
  }
}

// ── Post-process ─────────────────────────────────────────────────
for (const cls of classes) {
  for (const d of WEEKDAYS) {
    // Remove entries with no real subject, 'R' headers, or #NV-only subjects
    out[cls][d] = out[cls][d].filter((l) => l.subject && l.subject !== 'R' && !isNoValue(l.subject));

    // Clean #NV from detail and room fields
    for (const l of out[cls][d]) {
      if (l.detail && isNoValue(l.detail)) delete l.detail;
      if (l.room) {
        // Strip #NV tokens from room strings like "#NV 9" → "9"
        const cleaned = l.room.replace(/#(NV|N\/A|WERT!|REF!)/gi, '').replace(/\s+/g, ' ').trim();
        if (cleaned) l.room = cleaned;
        else delete l.room;
      }
    }

    // Sort by period
    out[cls][d].sort((a, b) => a.period - b.period);

    // Detect double periods (consecutive periods, same subject+teacher)
    for (let i = 0; i < out[cls][d].length - 1; i++) {
      const curr = out[cls][d][i];
      const next = out[cls][d][i + 1];
      if (next.period === curr.period + 1 && next.subject === curr.subject) {
        curr.periodEnd = next.period;
        // Merge the time range
        const startTime = curr.time.split('-')[0].trim();
        const endTime = next.time.split('-')[1]?.trim() || next.time.split('-')[0].trim();
        curr.time = `${startTime} - ${endTime}`;
        // Keep room/detail from either
        if (next.room && !curr.room) curr.room = next.room;
        if (next.detail && !curr.detail) curr.detail = next.detail;
        out[cls][d].splice(i + 1, 1);
        i--; // Re-check for triple periods
      }
    }
  }
}

// ── Diagnose auf stderr ──────────────────────────────────────────
let totalLessons = 0;
for (const cls of classes) {
  let count = 0;
  for (const d of WEEKDAYS) count += out[cls][d].length;
  totalLessons += count;
  if (count === 0) console.error(`WARNUNG: ${cls} hat 0 Stunden.`);
}
console.error(`Erkannte Klassen: ${classes.join(', ')}`);
console.error(`Erkannte Tage: ${daySections.map((s) => s.day).join(', ')}`);
console.error(`Stunden gesamt: ${totalLessons}`);

console.log(JSON.stringify(out));
