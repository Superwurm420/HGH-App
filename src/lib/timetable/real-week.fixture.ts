/**
 * Nachbau einer echten Planwoche der Schule mit allen sieben Klassen.
 *
 * ZELLEN ist, was im PDF steht: je Zelle Text, Lehrerkürzel, Raum und über wie
 * viele Stunden sie reicht. ERWARTET ist, was der Parser daraus machen muss.
 *
 * Der kleine Plan in parse-pdf.test.ts prüft die Regeln einzeln; diese Woche
 * prüft sie im Zusammenspiel und in echter Größe: sieben Klassen nebeneinander,
 * Doppelstunden, Blockveranstaltungen, mehrzeilige Zellen, Räume mal auf der
 * oberen und mal auf der unteren Zeile.
 */

export interface FixtureCell {
  period: number;
  /** Über wie viele Stunden die Zelle reicht. */
  span: number;
  text: string;
  teacher?: string;
  room?: string;
  /** Raumnummer auf der ersten statt auf der zweiten Zeile der Zelle. */
  roomOnFirstLine?: boolean;
}

export const ZELLEN: Record<string, Record<string, FixtureCell[]>> = {
  HT11: {
    MO: [{"period":1,"span":2,"text":"Deutsch","teacher":"MEL","room":"6"},{"period":3,"span":2,"text":"Modul1/KuSti","teacher":"MEL","room":"6"},{"period":5,"span":2,"text":"Modul7/Excel","teacher":"WED","room":"3","roomOnFirstLine":true},{"period":7,"span":1,"text":"HENKEL vom 23. - 25 Interne"},{"period":8,"span":1,"text":"Schulung (Raum 7)"}],
    DI: [{"period":3,"span":2,"text":"Modul2/Obfl","teacher":"WED","room":"6","roomOnFirstLine":true},{"period":5,"span":2,"text":"Englisch","teacher":"WEN","room":"9"},{"period":7,"span":1,"text":"Serviceteam"}],
    MI: [{"period":3,"span":2,"text":"Modul1/Wsk","teacher":"TAM","room":"5","roomOnFirstLine":true},{"period":5,"span":2,"text":"Modul1/CAD","teacher":"HOFF","room":"4"},{"period":7,"span":2,"text":"Modul2/Statik","teacher":"HOFF","room":"5"}],
    DO: [{"period":1,"span":2,"text":"Modul2/FT","teacher":"STE","room":"1","roomOnFirstLine":true},{"period":3,"span":2,"text":"Politik","teacher":"STI","room":"8"},{"period":5,"span":2,"text":"Mathematik","teacher":"TAM","room":"5"},{"period":7,"span":2,"text":"Modul6/Mark/DTP","teacher":"STI","room":"3/8","roomOnFirstLine":true}],
    FR: [{"period":1,"span":2,"text":"Modul2/CNC","teacher":"HOFF","room":"4"},{"period":3,"span":2,"text":"Modul7/ReWe","teacher":"STI","room":"8"}],
  },
  HT12: {
    MO: [{"period":3,"span":2,"text":"Modul7/Excel","teacher":"WED","room":"3","roomOnFirstLine":true},{"period":5,"span":2,"text":"Modul2/Statik","teacher":"HOFF","room":"1"}],
    DI: [{"period":1,"span":2,"text":"Politik","teacher":"STI","room":"8"},{"period":3,"span":2,"text":"Englisch","teacher":"WEN","room":"9","roomOnFirstLine":true},{"period":5,"span":2,"text":"Modul2/Obfl","teacher":"WED","room":"6"},{"period":7,"span":1,"text":"Serviceteam"}],
    MI: [{"period":1,"span":2,"text":"Modul7/ReWe","teacher":"STI","room":"8","roomOnFirstLine":true},{"period":3,"span":2,"text":"Modul1/CAD","teacher":"HOFF","room":"4"},{"period":5,"span":2,"text":"Modul1/Wsk","teacher":"TAM","room":"5"},{"period":7,"span":2,"text":"Modul6/Mark/DTP","teacher":"STI","room":"3/8","roomOnFirstLine":true}],
    DO: [{"period":1,"span":2,"text":"Deutsch","teacher":"MEL","room":"5"},{"period":3,"span":2,"text":"Mathematik","teacher":"TAM","room":"5"},{"period":5,"span":2,"text":"Modul1/KuSti","teacher":"MEL","room":"5","roomOnFirstLine":true}],
    FR: [{"period":3,"span":2,"text":"Modul2/CNC","teacher":"HOFF","room":"4"},{"period":5,"span":2,"text":"Modul2/FT","teacher":"STE","room":"1"}],
  },
  HT21: {
    MO: [{"period":1,"span":2,"text":"Modul4/FeKo","teacher":"HOG","room":"5","roomOnFirstLine":true},{"period":3,"span":2,"text":"Modul5/AV","teacher":"TAM","room":"5"},{"period":5,"span":2,"text":"Modul5/Betriebsplanung","teacher":"HOG","room":"5"},{"period":7,"span":2,"text":"Buchführung","teacher":"TAM","room":"5","roomOnFirstLine":true}],
    DI: [{"period":1,"span":2,"text":"Modul4/Excel bis 21.3","teacher":"WED","room":"3"},{"period":3,"span":2,"text":"NAT/Chemie","teacher":"STI","room":"8"}],
    MI: [{"period":3,"span":2,"text":"Modul8/BWL","teacher":"STI","room":"8","roomOnFirstLine":true},{"period":5,"span":2,"text":"Modul8/ReWe","teacher":"STI","room":"8"},{"period":7,"span":2,"text":"Geschäftskunde","teacher":"STE","room":"1"}],
    DO: [{"period":1,"span":2,"text":"NAT/Chemie","teacher":"STI","room":"8","roomOnFirstLine":true},{"period":3,"span":2,"text":"Englisch","teacher":"HOFF","room":"1"},{"period":5,"span":2,"text":"Modul4/Obfl","teacher":"WED","room":"6"},{"period":7,"span":2,"text":"Mathematik","teacher":"TAM","room":"5","roomOnFirstLine":true}],
    FR: [{"period":1,"span":2,"text":"Modul3/MöKo","teacher":"STE","room":"1"},{"period":3,"span":2,"text":"Modul3/MöKo","teacher":"STE","room":"1"},{"period":5,"span":2,"text":"Modul4/CAD","teacher":"HOFF","room":"4","roomOnFirstLine":true}],
  },
  HT22: {
    MO: [{"period":1,"span":10,"text":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF \"LYS\""}],
    DI: [{"period":1,"span":10,"text":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF \"LYS\""}],
    MI: [{"period":1,"span":10,"text":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF \"LYS\"","roomOnFirstLine":true}],
    DO: [{"period":1,"span":10,"text":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF \"LYS\""}],
    FR: [{"period":1,"span":6,"text":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF \"LYS\""}],
  },
  G11: {
    MO: [{"period":1,"span":2,"text":"Materialkunde","teacher":"BER/WEZ","room":"7","roomOnFirstLine":true},{"period":3,"span":1,"text":"Freihandzeichnen-Aufgabe","room":"9"},{"period":4,"span":1,"text":"ohne Lehrer"},{"period":5,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEZ","room":"4","roomOnFirstLine":true},{"period":7,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEZ","room":"4"}],
    DI: [{"period":1,"span":2,"text":"Politik","teacher":"STI","room":"8"},{"period":3,"span":2,"text":"Englisch","teacher":"WEN","room":"9","roomOnFirstLine":true}],
    MI: [{"period":1,"span":2,"text":"Rechnungswesen","teacher":"STI","room":"8"},{"period":3,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9"},{"period":5,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9","roomOnFirstLine":true},{"period":7,"span":2,"text":"CAD","teacher":"WEN","room":"4"}],
    DO: [{"period":1,"span":2,"text":"Deutsch","teacher":"MEL","room":"5"},{"period":3,"span":2,"text":"Mathematik","teacher":"TAM","room":"5","roomOnFirstLine":true},{"period":5,"span":2,"text":"KuSti","teacher":"MEL","room":"5"}],
    FR: [],
  },
  G21: {
    MO: [{"period":3,"span":2,"text":"Entwurf/Konstruktion","teacher":"BER/WEZ","room":"4"},{"period":5,"span":2,"text":"Entwurf/Konstruktion","teacher":"BER","room":"4","roomOnFirstLine":true},{"period":7,"span":2,"text":"Buchführung","teacher":"TAM","room":"5"}],
    DI: [{"period":1,"span":2,"text":"CAD","teacher":"WEN","room":"9"},{"period":3,"span":2,"text":"Haustechnik","teacher":"WEZ/PET","room":"5","roomOnFirstLine":true},{"period":5,"span":2,"text":"Haustechnik","teacher":"WEZ/PET","room":"5"},{"period":7,"span":1,"text":"Serviceteam"}],
    MI: [{"period":1,"span":2,"text":"Freihandzeichnen","teacher":"WEN","room":"9","roomOnFirstLine":true},{"period":3,"span":2,"text":"Fertigungstechnik","teacher":"WED","room":"6"},{"period":5,"span":2,"text":"EDV/Excel","teacher":"WED","room":"3"},{"period":7,"span":2,"text":"Geschäftskunde","teacher":"STE","room":"1","roomOnFirstLine":true}],
    DO: [{"period":3,"span":2,"text":"Designgeschichte","teacher":"STE","room":"BS"},{"period":5,"span":2,"text":"Englisch","teacher":"HOFF","room":"1"},{"period":7,"span":2,"text":"Meisterstücke Beratung","teacher":"STE","room":"5","roomOnFirstLine":true}],
    FR: [{"period":1,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9"},{"period":3,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9"},{"period":5,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9","roomOnFirstLine":true}],
  },
  GT01: {
    MO: [{"period":1,"span":2,"text":"Materialkunde","teacher":"BER/WEZ","room":"7"},{"period":3,"span":2,"text":"Entwurf/Konstruktion","teacher":"BER/WEZ","room":"4"},{"period":5,"span":2,"text":"Entwurf/Konstruktion","teacher":"BER","room":"4","roomOnFirstLine":true}],
    DI: [{"period":1,"span":2,"text":"CAD","teacher":"WEN","room":"9"},{"period":3,"span":2,"text":"Haustechnik","teacher":"WEZ/PET","room":"5"},{"period":5,"span":2,"text":"Haustechnik","teacher":"WEZ/PET","room":"5","roomOnFirstLine":true}],
    MI: [{"period":1,"span":2,"text":"Freihandzeichnen","teacher":"WEN","room":"9"},{"period":3,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9"},{"period":5,"span":2,"text":"Entwurf/Konstruktion","teacher":"WEN","room":"9","roomOnFirstLine":true},{"period":7,"span":2,"text":"CAD","teacher":"WEN","room":"4"}],
    DO: [{"period":3,"span":2,"text":"Designgeschichte","teacher":"STE","room":"BS"}],
    FR: [],
  },
};

export const ERWARTET = {
  HT11: {
    MO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Deutsch","detail":"MEL","room":"6"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul1/KuSti","detail":"MEL","room":"6"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul7/Excel","detail":"WED","room":"3"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"HENKEL vom 23. - 25 Interne Schulung (Raum 7)"}],
    DI: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul2/Obfl","detail":"WED","room":"6"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Englisch","detail":"WEN","room":"9"},{"period":7,"time":"14.10 - 14.55","subject":"Serviceteam"}],
    MI: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul1/Wsk","detail":"TAM","room":"5"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul1/CAD","detail":"HOFF","room":"4"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Modul2/Statik","detail":"HOFF","room":"5"}],
    DO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Modul2/FT","detail":"STE","room":"1"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Politik","detail":"STI","room":"8"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Mathematik","detail":"TAM","room":"5"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Modul6/Mark/DTP","detail":"STI","room":"3/8"}],
    FR: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Modul2/CNC","detail":"HOFF","room":"4"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul7/ReWe","detail":"STI","room":"8"}],
  },
  HT12: {
    MO: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul7/Excel","detail":"WED","room":"3"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul2/Statik","detail":"HOFF","room":"1"}],
    DI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Politik","detail":"STI","room":"8"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Englisch","detail":"WEN","room":"9"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul2/Obfl","detail":"WED","room":"6"},{"period":7,"time":"14.10 - 14.55","subject":"Serviceteam"}],
    MI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Modul7/ReWe","detail":"STI","room":"8"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul1/CAD","detail":"HOFF","room":"4"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul1/Wsk","detail":"TAM","room":"5"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Modul6/Mark/DTP","detail":"STI","room":"3/8"}],
    DO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Deutsch","detail":"MEL","room":"5"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Mathematik","detail":"TAM","room":"5"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul1/KuSti","detail":"MEL","room":"5"}],
    FR: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul2/CNC","detail":"HOFF","room":"4"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul2/FT","detail":"STE","room":"1"}],
  },
  HT21: {
    MO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Modul4/FeKo","detail":"HOG","room":"5"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul5/AV","detail":"TAM","room":"5"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul5/Betriebsplanung","detail":"HOG","room":"5"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Buchführung","detail":"TAM","room":"5"}],
    DI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Modul4/Excel bis 21.3","detail":"WED","room":"3"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"NAT/Chemie","detail":"STI","room":"8"}],
    MI: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul8/BWL","detail":"STI","room":"8"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul8/ReWe","detail":"STI","room":"8"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Geschäftskunde","detail":"STE","room":"1"}],
    DO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"NAT/Chemie","detail":"STI","room":"8"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Englisch","detail":"HOFF","room":"1"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul4/Obfl","detail":"WED","room":"6"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Mathematik","detail":"TAM","room":"5"}],
    FR: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Modul3/MöKo","detail":"STE","room":"1"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Modul3/MöKo","detail":"STE","room":"1"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Modul4/CAD","detail":"HOFF","room":"4"}],
  },
  HT22: {
    MO: [{"period":1,"periodEnd":10,"time":"8.00 - 17.15","subject":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF LYS"}],
    DI: [{"period":1,"periodEnd":10,"time":"8.00 - 17.15","subject":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF LYS"}],
    MI: [{"period":1,"periodEnd":10,"time":"8.00 - 17.15","subject":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF LYS"}],
    DO: [{"period":1,"periodEnd":10,"time":"8.00 - 17.15","subject":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF LYS"}],
    FR: [{"period":1,"periodEnd":10,"time":"8.00 - 17.15","subject":"UNTERNEHMENSPROJEKT SERIENFERTIGUNG USF LYS"}],
  },
  G11: {
    MO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Materialkunde","detail":"BER/WEZ","room":"7"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Freihandzeichnen-Aufgabe ohne Lehrer","room":"9"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Entwurf/Konstruktion","detail":"WEZ","room":"4"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Entwurf/Konstruktion","detail":"WEZ","room":"4"}],
    DI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Politik","detail":"STI","room":"8"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Englisch","detail":"WEN","room":"9"}],
    MI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Rechnungswesen","detail":"STI","room":"8"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"CAD","detail":"WEN","room":"4"}],
    DO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Deutsch","detail":"MEL","room":"5"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Mathematik","detail":"TAM","room":"5"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"KuSti","detail":"MEL","room":"5"}],
    FR: [],
  },
  G21: {
    MO: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Entwurf/Konstruktion","detail":"BER/WEZ","room":"4"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Entwurf/Konstruktion","detail":"BER","room":"4"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Buchführung","detail":"TAM","room":"5"}],
    DI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"CAD","detail":"WEN","room":"9"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Haustechnik","detail":"WEZ/PET","room":"5"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Haustechnik","detail":"WEZ/PET","room":"5"},{"period":7,"time":"14.10 - 14.55","subject":"Serviceteam"}],
    MI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Freihandzeichnen","detail":"WEN","room":"9"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Fertigungstechnik","detail":"WED","room":"6"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"EDV/Excel","detail":"WED","room":"3"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Geschäftskunde","detail":"STE","room":"1"}],
    DO: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Designgeschichte","detail":"STE","room":"BS"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Englisch","detail":"HOFF","room":"1"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"Meisterstücke Beratung","detail":"STE","room":"5"}],
    FR: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"}],
  },
  GT01: {
    MO: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Materialkunde","detail":"BER/WEZ","room":"7"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Entwurf/Konstruktion","detail":"BER/WEZ","room":"4"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Entwurf/Konstruktion","detail":"BER","room":"4"}],
    DI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"CAD","detail":"WEN","room":"9"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Haustechnik","detail":"WEZ/PET","room":"5"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Haustechnik","detail":"WEZ/PET","room":"5"}],
    MI: [{"period":1,"periodEnd":2,"time":"8.00 - 9.30","subject":"Freihandzeichnen","detail":"WEN","room":"9"},{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"},{"period":5,"periodEnd":6,"time":"11.40 - 13.10","subject":"Entwurf/Konstruktion","detail":"WEN","room":"9"},{"period":7,"periodEnd":8,"time":"14.10 - 15.40","subject":"CAD","detail":"WEN","room":"4"}],
    DO: [{"period":3,"periodEnd":4,"time":"9.50 - 11.20","subject":"Designgeschichte","detail":"STE","room":"BS"}],
    FR: [],
  },
};
