import { getDb } from './env';
import { weekdayForToday } from '@/lib/berlin-time';
import { loadTimetable, type TimetableView } from './services/timetable';
import { loadActiveAnnouncements } from './services/announcements';
import { loadPublicSettings, parseJsonSetting } from './services/settings';
import { loadSlideshowImages } from './services/media';
import { Announcement, MediaFile } from './types';
import { cookies } from 'next/headers';
import { CLASS_COOKIE, resolveSelectedClass } from '@/lib/timetable/select-class';
import type { SchoolHolidayRange } from '@/lib/calendar/lowerSaxonySchoolFreeDays';

/**
 * Gemeinsame Datenbeschaffung der öffentlichen Seiten.
 *
 * Die Seiten sind Server Components und lesen hierüber direkt aus D1. Ein
 * HTTP-Aufruf auf die eigene API wäre nicht nur ein überflüssiger Umweg —
 * mit einer relativen URL schlägt er serverseitig grundsätzlich fehl.
 */

export interface AppSettingsView {
  calendarUrls: string[];
  messages: Record<string, unknown>;
  schoolHolidays: SchoolHolidayRange[];
  schoolName: string;
}

/** Liest die öffentlichen Einstellungen und bringt sie in Anzeigeform. */
export async function loadAppSettings(): Promise<AppSettingsView> {
  const settings = await loadPublicSettings(await getDb());

  const holidays = parseJsonSetting<SchoolHolidayRange[] | { ranges?: SchoolHolidayRange[] }>(
    settings.school_holidays,
    [],
  );

  return {
    calendarUrls: parseJsonSetting<string[]>(settings.calendar_urls, []),
    messages: parseJsonSetting<Record<string, unknown>>(settings.messages, {}),
    schoolHolidays: Array.isArray(holidays) ? holidays : holidays.ranges ?? [],
    schoolName: settings.school_name ?? 'Holztechnik und Gestaltung Hildesheim',
  };
}

export interface SchedulePageData {
  timetable: TimetableView;
  selectedClass: string | null;
  hasTimetable: boolean;
}

/** Liest die gemerkte Klasse aus dem Cookie. */
function readClassCookie(store: Awaited<ReturnType<typeof cookies>>): string | null {
  const raw = store.get(CLASS_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Stundenplan plus aufgelöster Klassenauswahl.
 *
 * Ohne `?klasse=` gilt die Klasse aus dem Cookie. Sonst rendert der Server die
 * erste Klasse des Plans und `ClassFromStorage` schaltet erst im Browser um —
 * bei jedem Wechsel zwischen den Ansichten blitzte dadurch kurz ein fremder
 * Plan auf.
 */
export async function loadSchedulePage(requestedClass?: string): Promise<SchedulePageData> {
  const timetable = await loadTimetable(await getDb(), weekdayForToday());
  const storedClass = readClassCookie(await cookies());
  const selectedClass = resolveSelectedClass(timetable.classes, requestedClass, storedClass);

  return {
    timetable,
    selectedClass,
    hasTimetable: Boolean(timetable.upload) && timetable.classes.length > 0,
  };
}

/** Aktive Ankündigungen für eine Klasse (oder alle, wenn keine gewählt ist). */
export async function loadAnnouncements(klasse?: string | null): Promise<Announcement[]> {
  return loadActiveAnnouncements(await getDb(), klasse);
}

/** Bilder für die TV-Slideshow. */
export async function loadTvImages(): Promise<MediaFile[]> {
  return loadSlideshowImages(await getDb());
}

/**
 * Hervorgehobene Ankündigungen als Termin-Einblendungen im Stundenplan.
 * Dieselbe Umformung brauchen Startseite und Stundenplanseite.
 */
/** Formt einen Datensatz aus D1 für die Anzeige-Komponenten um. */
export function toDisplayAnnouncement(item: Announcement) {
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    expires: item.expires ?? undefined,
    body: item.body,
    highlight: item.highlight === 1,
  };
}

export function announcementsToEvents(announcements: Announcement[]) {
  return announcements
    .filter((item) => item.highlight === 1)
    .map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.date,
      endsAt: item.expires ?? undefined,
      details: item.body,
      classes: item.classes
        ? item.classes.split(',').map((code) => code.trim())
        : ('alle' as const),
    }));
}
