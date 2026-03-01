export type AnnouncementFormData = {
  title: string;
  date: string;
  expires: string;
  audience: string;
  classes: string;
  anzeige: string;
  body: string;
};

export type ValidationIssue = {
  field: keyof AnnouncementFormData | 'general';
  severity: 'error' | 'warning';
  message: string;
};

const DE_DATE_TIME_PATTERN = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const COMMENT_PREFIXES = ['#', '//', ';'];
const DEFAULT_FORM_DATA: AnnouncementFormData = {
  title: '',
  date: '',
  expires: '',
  audience: 'alle',
  classes: '',
  anzeige: 'nein',
  body: '',
};

function isCommentLine(line: string): boolean {
  return COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix));
}

function cleanValue(value: string): string {
  return value.trim();
}

export function getDefaultAnnouncementFormData(): AnnouncementFormData {
  return { ...DEFAULT_FORM_DATA };
}

export function parseAnnouncementTxt(raw: string): AnnouncementFormData {
  const [headerRaw, ...bodyParts] = raw.split('\n---\n');
  const body = bodyParts.join('\n---\n').trim();
  const headers: Record<string, string> = {};

  for (const line of headerRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || isCommentLine(trimmed) || !trimmed.includes(':')) continue;
    const idx = trimmed.indexOf(':');
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const value = trimmed.slice(idx + 1).trim();
    headers[key] = value;
  }

  return {
    title: headers.title ?? '',
    date: headers.date ?? '',
    expires: headers.expires ?? '',
    audience: headers.audience ?? 'alle',
    classes: headers.classes ?? '',
    anzeige: headers.anzeige ?? 'nein',
    body,
  };
}

export function serializeAnnouncementTxt(data: AnnouncementFormData): string {
  const lines = [
    `title: ${cleanValue(data.title)}`,
    `date: ${cleanValue(data.date)}`,
    `expires: ${cleanValue(data.expires)}`,
    `audience: ${cleanValue(data.audience) || 'alle'}`,
    `classes: ${cleanValue(data.classes)}`,
    `anzeige: ${cleanValue(data.anzeige) || 'nein'}`,
    '---',
    data.body.trim(),
  ];

  return `${lines.join('\n')}\n`;
}

export function toLocalDateTimeInput(value: string): string {
  const normalized = cleanValue(value);
  if (!DE_DATE_TIME_PATTERN.test(normalized)) return '';

  const [datePart, timePart] = normalized.split(' ');
  const [day, month, year] = datePart.split('.');
  return `${year}-${month}-${day}T${timePart}`;
}

export function fromLocalDateTimeInput(value: string): string {
  const normalized = cleanValue(value);
  if (!LOCAL_DATE_TIME_PATTERN.test(normalized)) return '';

  const [datePart, timePart] = normalized.split('T');
  const [year, month, day] = datePart.split('-');
  return `${day}.${month}.${year} ${timePart}`;
}

function parseDate(value: string): Date | null {
  if (!DE_DATE_TIME_PATTERN.test(value)) return null;
  const [datePart, timePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

export function validateAnnouncementForm(data: AnnouncementFormData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!cleanValue(data.title)) {
    issues.push({ field: 'title', severity: 'error', message: "Pflichtfeld 'title' fehlt." });
  }

  if (!cleanValue(data.date)) {
    issues.push({ field: 'date', severity: 'error', message: "Pflichtfeld 'date' fehlt." });
  } else if (!DE_DATE_TIME_PATTERN.test(cleanValue(data.date))) {
    issues.push({ field: 'date', severity: 'error', message: "'date' muss das Format TT.MM.JJJJ HH:mm haben." });
  }

  if (cleanValue(data.expires) && !DE_DATE_TIME_PATTERN.test(cleanValue(data.expires))) {
    issues.push({ field: 'expires', severity: 'error', message: "'expires' muss das Format TT.MM.JJJJ HH:mm haben." });
  }

  const start = parseDate(cleanValue(data.date));
  const end = parseDate(cleanValue(data.expires));
  if (start && end && end.getTime() < start.getTime()) {
    issues.push({ field: 'expires', severity: 'error', message: "'expires' darf nicht vor 'date' liegen." });
  }

  if (!data.body.trim()) {
    issues.push({ field: 'body', severity: 'warning', message: "Kein Text nach '---' gefunden." });
  }

  return issues;
}
