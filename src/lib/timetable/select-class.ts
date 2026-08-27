/**
 * Wählt die anzuzeigende Klasse.
 *
 * Vorrang hat der `?klasse=`-Parameter, sofern er im aktiven Stundenplan
 * vorkommt; sonst die erste Klasse. Der Vergleich ist unabhängig von Groß- und
 * Kleinschreibung, damit ein von Hand getippter Link wie `?klasse=ht11`
 * genauso funktioniert wie der aus der Klassenauswahl.
 */
export function resolveSelectedClass(classes: string[], requested?: string): string | null {
  if (classes.length === 0) return null;

  const wanted = requested?.trim().toUpperCase();
  if (wanted) {
    const match = classes.find((code) => code.toUpperCase() === wanted);
    if (match) return match;
  }

  return classes[0];
}
