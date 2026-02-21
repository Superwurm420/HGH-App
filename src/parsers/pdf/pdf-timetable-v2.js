import { DEFAULT_CLASSES, DAY_TOKEN_MAP, SCHOOL_DAY_IDS } from '../../domain/school-model.js';

const DAY_MAP = new Map(DAY_TOKEN_MAP);
const DAY_IDS = [...SCHOOL_DAY_IDS];
const SPECIAL_KEYWORDS = [
  'projekt', 'projekttag', 'blockunterricht', 'block', 'prüfung', 'klausur', 'ausfall',
  'entfall', 'exkursion', 'interne', 'schulung', 'serviceteam', 'praktikum'
];

function clean(value) {
  return (value ?? '').toString().replace(/\s+/g, ' ').trim();
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isTeacherToken(token) {
  return /^[A-ZÄÖÜ]{2,6}$/.test(token || '');
}

function normalizeSlotToken(token) {
  const value = clean(token);
  if (!value) return [];

  const normalized = value
    .toLowerCase()
    .replace(/bis/g, '-')
    .replace(/und/g, ',')
    .replace(/\s+/g, '');

  const chunks = normalized.split(/[,+]/).filter(Boolean);
  if (!chunks.length) return [];

  const slots = [];
  for (const chunk of chunks) {
    if (/^\d{1,2}$/.test(chunk)) {
      slots.push(chunk);
      continue;
    }

    const match = chunk.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (!match) continue;

    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 20) continue;

    for (let current = start; current <= end; current += 1) slots.push(String(current));
  }

  return [...new Set(slots)];
}

function normalizeDayToken(dayRaw) {
  const dayValue = clean(dayRaw).toLowerCase();
  if (!dayValue) return [];

  const normalized = dayValue
    .replace(/\s+und\s+/g, ',')
    .replace(/\s*\+\s*/g, ',')
    .replace(/\s+/g, '');

  const allWeekTokens = new Set(['woche', 'ganzewoche', 'alle', 'all', 'mo-fr', 'montag-freitag', 'montagbisfreitag']);
  if (allWeekTokens.has(normalized)) return [...DAY_IDS];

  const parts = normalized.split(/[,;]/).filter(Boolean);
  const out = [];

  for (const part of parts.length ? parts : [normalized]) {
    if (DAY_MAP.has(part)) {
      out.push(DAY_MAP.get(part));
      continue;
    }

    const rangeMatch = part.match(/^([a-zäöü]{2,12})-([a-zäöü]{2,12})$/);
    if (!rangeMatch) continue;

    const from = DAY_MAP.get(rangeMatch[1]);
    const to = DAY_MAP.get(rangeMatch[2]);
    if (!from || !to) continue;

    const startIdx = DAY_IDS.indexOf(from);
    const endIdx = DAY_IDS.indexOf(to);
    if (startIdx < 0 || endIdx < 0 || endIdx < startIdx) continue;

    for (let i = startIdx; i <= endIdx; i += 1) out.push(DAY_IDS[i]);
  }

  return [...new Set(out)];
}


function parseTokenLine(text) {
  const parts = text.split(';').map((part) => part.trim()).filter(Boolean);
  const payload = {};
  for (const part of parts) {
    const [key, ...rest] = part.split(':');
    if (!key || !rest.length) continue;
    payload[key.trim().toLowerCase()] = rest.join(':').trim();
  }
  return payload;
}

function detectSpecialTerm(subject, note) {
  const value = `${subject} ${note}`.toLowerCase();
  return SPECIAL_KEYWORDS.some((keyword) => value.includes(keyword));
}

function parseTokenPayload(payload, rowText = '') {
  const classId = clean(payload.class || payload.klasse).toUpperCase();
  const dayIds = normalizeDayToken(payload.day || payload.tag);
  const slotValues = normalizeSlotToken(clean(payload.slot || payload.std || payload.stunde));
  const subject = clean(payload.subject || payload.fach);

  if (!classId || !dayIds.length || !slotValues.length || !subject) return [];

  const teacher = clean(payload.teacher || payload.lehrer);
  const room = clean(payload.room || payload.raum);
  const note = clean(payload.note || payload.notiz);
  const isSpecial = detectSpecialTerm(subject, note) || (!teacher && !room && subject.length > 20);

  const rows = [];
  for (const dayId of dayIds) {
    for (const slotId of slotValues) {
      rows.push({
        classId,
        dayId,
        slotId,
        subject,
        teacher,
        room,
        note,
        isSpecial,
        sourceText: rowText
      });
    }
  }

  return rows;
}

function parseLooseLine(text) {
  const normalized = clean(text);
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/);
  const classIndex = tokens.findIndex((token) => /^[A-Z]{1,3}\d{2}$/.test(token));
  if (classIndex < 0) return [];

  const classId = tokens[classIndex];
  const dayIndex = tokens.findIndex((token, idx) => idx > classIndex && DAY_MAP.has(token.toLowerCase()));
  if (dayIndex < 0) return [];

  const dayId = DAY_MAP.get(tokens[dayIndex].toLowerCase());
  const slotIndex = tokens.findIndex((token, idx) => idx > dayIndex && normalizeSlotToken(token).length > 0);
  if (slotIndex < 0) return [];

  const slotValues = normalizeSlotToken(tokens[slotIndex]);
  const afterSlot = tokens.slice(slotIndex + 1);
  if (!afterSlot.length) return [];

  const teacherIndex = afterSlot.findIndex(isTeacherToken);
  const teacher = teacherIndex >= 0 ? afterSlot[teacherIndex] : '';
  const room = teacherIndex >= 0 ? clean(afterSlot.slice(teacherIndex + 1).join(' ')) : '';
  const subjectTokens = teacherIndex >= 0 ? afterSlot.slice(0, teacherIndex) : afterSlot;
  const subject = clean(subjectTokens.join(' '));
  if (!subject) return [];

  const note = '';
  const isSpecial = detectSpecialTerm(subject, note) || (!teacher && !room && subject.length > 20);
  return slotValues.map((slotId) => ({
    classId,
    dayId,
    slotId,
    subject,
    teacher,
    room,
    note,
    isSpecial,
    sourceText: normalized
  }));
}

function toIsoDate(value) {
  const match = clean(value).match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearRaw = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + yearRaw : yearRaw;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractValidFrom(items) {
  const rows = extractRowsFromPdfItems(items, { yTolerance: 2 });
  const patterns = [
    /gültig\s*(?:ab)?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i,
    /\bab\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})\b/i,
    /\b(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})\b/
  ];

  for (const row of rows) {
    for (const pattern of patterns) {
      const match = row.text.match(pattern);
      if (!match) continue;
      const iso = toIsoDate(match[1]);
      if (iso) return iso;
    }
  }

  return null;
}

export function extractRowsFromPdfItems(items, { yTolerance = 2 } = {}) {
  const usable = (Array.isArray(items) ? items : [])
    .map((item) => ({ text: clean(item?.str), x: toNum(item?.x), y: toNum(item?.y) }))
    .filter((item) => item.text && item.x !== null && item.y !== null)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const rows = [];
  for (const item of usable) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= yTolerance);
    if (!row) {
      rows.push({ y: item.y, items: [item] });
      continue;
    }
    row.items.push(item);
    row.y = (row.y + item.y) / 2;
  }

  return rows
    .sort((a, b) => a.y - b.y)
    .map((row) => ({
      y: row.y,
      items: row.items.sort((a, b) => a.x - b.x),
      text: row.items.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim()
    }));
}

function dedupeAndClassify(entries, issues) {
  const byKey = new Map();
  const specialEvents = [];

  for (const entry of entries) {
    const key = `${entry.classId}|${entry.dayId}|${entry.slotId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
    } else if (existing.subject !== entry.subject || existing.teacher !== entry.teacher || existing.room !== entry.room) {
      issues.push(`Konflikt für ${key}; nutze ersten Eintrag und ergänze Hinweis.`);
      const conflictNote = clean([existing.note, `Konflikt: ${entry.subject}`].filter(Boolean).join(' | '));
      byKey.set(key, { ...existing, note: conflictNote || existing.note });
    }

    if (entry.isSpecial) {
      specialEvents.push({
        classId: entry.classId,
        dayId: entry.dayId,
        slotId: entry.slotId,
        label: entry.subject,
        note: entry.note
      });
    }
  }

  return {
    entries: [...byKey.values()],
    specialEvents
  };
}

export function interpretRows(rows, issues = []) {
  const parsedEntries = [];
  const classes = new Set();

  for (const row of rows) {
    let extracted = parseTokenPayload(parseTokenLine(row.text), row.text);
    if (!extracted.length) extracted = parseLooseLine(row.text);
    if (!extracted.length) continue;

    for (const entry of extracted) {
      if (!DAY_IDS.includes(entry.dayId)) {
        issues.push(`Unbekannter Tag in Zeile: "${row.text}"`);
        continue;
      }
      classes.add(entry.classId);
      parsedEntries.push(entry);
    }
  }

  const { entries, specialEvents } = dedupeAndClassify(parsedEntries, issues);
  if (!entries.length) issues.push('PDF-Interpretation ergab keine Einträge.');
  return { entries, classes: [...classes], specialEvents };
}

export function validateEntries(entries, { minEntries = 10 } = {}) {
  const issues = [];
  const unique = new Set();

  for (const entry of entries) {
    const key = `${entry.classId}|${entry.dayId}|${entry.slotId}`;
    if (unique.has(key)) {
      issues.push(`Doppelter Eintrag ${key}.`);
      continue;
    }
    unique.add(key);
  }

  if (entries.length < minEntries) {
    issues.push(`Zu wenige Einträge (${entries.length}) für einen vollständigen Stundenplan.`);
  }

  return { ok: issues.length === 0, issues };
}

export function toTimetableModel({ entries, classes, specialEvents }, baseMeta = {}) {
  const classIds = classes.length ? classes : DEFAULT_CLASSES;
  const out = Object.fromEntries(classIds.map((classId) => [classId, { mo: [], di: [], mi: [], do: [], fr: [] }]));

  for (const row of entries) {
    if (!out[row.classId]) out[row.classId] = { mo: [], di: [], mi: [], do: [], fr: [] };
    out[row.classId][row.dayId].push({
      slotId: row.slotId,
      subject: row.subject,
      teacher: row.teacher || '',
      room: row.room || '',
      note: row.note || ''
    });
  }

  for (const classId of Object.keys(out)) {
    for (const dayId of DAY_IDS) {
      out[classId][dayId].sort((a, b) => Number(a.slotId) - Number(b.slotId));
    }
  }

  return {
    meta: {
      ...baseMeta,
      parser: 'pdf-v2',
      specialEvents
    },
    classes: out
  };
}

export function parsePdfTimetableV2(raw) {
  const issues = [];

  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      issues: ['PDF-Rohdaten fehlen oder sind ungültig.'],
      debug: { rowCount: 0, interpretedCount: 0, specialEventCount: 0 },
      model: toTimetableModel({ entries: [], classes: [], specialEvents: [] }, {})
    };
  }

  const rows = extractRowsFromPdfItems(raw.items || []);
  const extractedValidFrom = extractValidFrom(raw.items || []);
  const interpreted = interpretRows(rows, issues);
  const validation = validateEntries(interpreted.entries);
  issues.push(...validation.issues);

  return {
    ok: validation.ok,
    issues,
    debug: {
      rowCount: rows.length,
      interpretedCount: interpreted.entries.length,
      specialEventCount: interpreted.specialEvents.length
    },
    model: toTimetableModel(interpreted, {
      ...(raw.meta || {}),
      validFrom: extractedValidFrom || raw?.meta?.validFrom || ''
    })
  };
}
