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
  return /^[A-ZÄÖÜ]{3,6}(?:\/[A-ZÄÖÜ]{3,6})*$/.test(clean(token));
}

function isRoomToken(token) {
  const value = clean(token);
  if (!value) return false;
  if (/^#[A-Z]{1,3}$/i.test(value)) return true;
  if (/^[A-Z]{1,3}$/.test(value) && !isTeacherToken(value)) return true;
  if (/^\d{1,3}[A-Z]?$/i.test(value)) return true;
  if (/^[A-Z]\d{1,2}$/i.test(value)) return true;
  if (/^[A-Z]{1,3}-\d{1,3}$/i.test(value)) return true;
  return false;
}

function applySupplementToken(entry, token) {
  if (!entry) return;
  const value = clean(token);
  if (!value || value === '#NV') return;

  if (!entry.room && isRoomToken(value) && !isTeacherToken(value)) {
    entry.room = value;
    return;
  }

  if (!entry.teacher && isTeacherToken(value)) {
    entry.teacher = value;
    return;
  }

  if (!entry.room && isRoomToken(value)) {
    entry.room = value;
  }
}

function splitSubjectTeacherRoom(tokens) {
  const normalized = (Array.isArray(tokens) ? tokens : []).map(clean).filter(Boolean);
  if (!normalized.length) return { subject: '', teacher: '', room: '' };

  let teacher = '';
  let room = '';
  const remaining = [...normalized];

  const maybeRoom = remaining[remaining.length - 1];
  if (isRoomToken(maybeRoom)) {
    room = maybeRoom;
    remaining.pop();
  }

  const maybeTeacher = remaining[remaining.length - 1];
  if (isTeacherToken(maybeTeacher)) {
    teacher = maybeTeacher;
    remaining.pop();
  }

  if (!teacher) {
    const teacherIndex = remaining.findIndex(isTeacherToken);
    if (teacherIndex >= 0) {
      teacher = remaining[teacherIndex];
      const tail = remaining.slice(teacherIndex + 1);
      if (!room && tail.length) room = clean(tail.join(' '));
      remaining.splice(teacherIndex);
    }
  }

  const subject = clean(remaining.join(' '));
  return { subject, teacher, room };
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

  const { subject, teacher, room } = splitSubjectTeacherRoom(afterSlot);
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

function normalizeClassToken(token) {
  return clean(token).toUpperCase().replace(/\s+/g, '');
}

function looksLikeClassToken(token) {
  return /^[A-Z]{1,3}\d{2}$/.test(normalizeClassToken(token));
}

function looksLikeSlotToken(token) {
  const match = clean(token).match(/^(\d{1,2})\.$/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 12 ? String(value) : null;
}

function looksLikeTimeToken(token) {
  return /^\d{1,2}[.:]\d{2}$/.test(clean(token));
}

function parseGridRows(rows) {
  const classHeader = rows.find((row) => row.items.filter((item) => looksLikeClassToken(item.text)).length >= 3);
  if (!classHeader) return [];

  const classColumns = classHeader.items
    .filter((item) => looksLikeClassToken(item.text))
    .map((item) => ({ classId: normalizeClassToken(item.text), x: item.x }))
    .sort((a, b) => a.x - b.x);

  if (!classColumns.length) return [];

  const boundaries = classColumns.map((column, index) => {
    const prev = classColumns[index - 1];
    const next = classColumns[index + 1];
    const left = prev ? (prev.x + column.x) / 2 : column.x - 35;
    const right = next ? (column.x + next.x) / 2 : column.x + 35;
    return { ...column, left, right };
  });

  const entries = [];
  let currentDayId = null;
  let pendingByClass = new Map();

  for (const row of rows) {
    const dayToken = row.items.find((item) => DAY_MAP.has(clean(item.text).toLowerCase()));
    if (dayToken) currentDayId = DAY_MAP.get(clean(dayToken.text).toLowerCase());
    if (!currentDayId) continue;

    const slotToken = row.items.map((item) => looksLikeSlotToken(item.text)).find(Boolean);

    const candidates = row.items.filter((item) => {
      const text = clean(item.text);
      if (!text) return false;
      if (DAY_MAP.has(text.toLowerCase())) return false;
      if (looksLikeSlotToken(text)) return false;
      if (looksLikeTimeToken(text)) return false;
      if (/^-$/.test(text)) return false;
      return true;
    });

    if (!slotToken) {
      if (!pendingByClass.size) continue;

      for (const item of candidates) {
        const nearest = boundaries.reduce((best, column) => {
          const center = (column.left + column.right) / 2;
          const distance = Math.abs(item.x - center);
          if (!best || distance < best.distance) {
            return { column, distance };
          }
          return best;
        }, null);

        if (!nearest?.column) continue;
        applySupplementToken(pendingByClass.get(nearest.column.classId), item.text);
      }
      continue;
    }

    const partsByColumn = boundaries.map((column) => ({
      classId: column.classId,
      parts: candidates
        .filter((item) => item.x >= column.left && item.x < column.right)
        .map((item) => clean(item.text))
        .filter(Boolean)
    }));

    const hasAnySubjectText = partsByColumn.some(({ parts }) => splitSubjectTeacherRoom(parts).subject);
    if (!hasAnySubjectText && pendingByClass.size) {
      for (const { classId, parts } of partsByColumn) {
        const pending = pendingByClass.get(classId);
        if (!pending) continue;
        for (const token of parts) {
          applySupplementToken(pending, token);
        }
      }
      continue;
    }

    pendingByClass = new Map();

    for (const { classId, parts } of partsByColumn) {
      if (!parts.length) continue;

      const { subject, teacher, room } = splitSubjectTeacherRoom(parts);
      if (!subject || subject.toUpperCase() === '#NV') continue;

      entries.push({
        classId,
        dayId: currentDayId,
        slotId: slotToken,
        subject,
        teacher,
        room,
        note: '',
        isSpecial: detectSpecialTerm(subject, ''),
        sourceText: row.text
      });

      pendingByClass.set(classId, entries[entries.length - 1]);
    }
  }

  return entries;
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

  if (!parsedEntries.length) {
    const gridEntries = parseGridRows(rows);
    for (const entry of gridEntries) {
      classes.add(entry.classId);
      parsedEntries.push(entry);
    }
    if (gridEntries.length) {
      issues.push('Fallback-Parser für tabellarische PDF-Struktur wurde genutzt.');
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
