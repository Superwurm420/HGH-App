// Zentrale Pfad-/URL-Konfiguration (Single Source of Truth)

export const PATHS = Object.freeze({
  content: {
    timetableJson: './content/stundenplan.json',
    timetablePdfRawJson: './content/stundenplan.pdf.raw.json',
    calendarIcs: './content/kalender.ics',
    calendarSourcesDir: './content/txt/calendars/',
    calendarSourceFiles: ['./content/txt/calendars/schule.txt','./content/txt/calendars/klasse-hgt2.txt','./content/txt/calendars/ferien.txt'],
    adminReadme: './content/README_admin.txt',
  },
  assets: {
    planDir: './content/timetables/',
    funMessagesJson: './assets/data/fun-messages.json',
    announcements: {
      listTxt: './content/txt/events/files.txt',
      dir: './content/txt/events/',
    },
    tvSlides: {
      indexJson: './assets/tv-slides/slides.json',
      dir: './assets/tv-slides/',
    },
  },
  data: {
    announcementsJson: './assets/data/runtime/announcements.json',
    bellTimesJson: './assets/data/runtime/bell-times.json',
  },
});
