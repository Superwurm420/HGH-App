export const STORAGE_KEYS = {
  announcements: 'announcements/store.json',
  timetablesPrefix: 'timetables/',
  calendar: 'calendar/urls.json',
  /** @deprecated Alte kalender.txt – nur noch als Fallback beim Lesen */
  calendarLegacy: 'calendar/kalender.txt',
  messages: 'messages/messages.json',
  holidays: 'holidays/schulferien-nds.json',
} as const;
