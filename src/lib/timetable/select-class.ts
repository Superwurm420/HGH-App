/**
 * Findet den passenden Klassencode aus der Liste, unabhängig von Groß- und
 * Kleinschreibung und umschließenden Leerzeichen. Damit funktioniert ein von
 * Hand getippter Link wie `?klasse=ht11` genauso wie der aus der Auswahl.
 */
export function matchClass(classes: string[], candidate: string | null | undefined): string | null {
  const wanted = candidate?.trim().toUpperCase();
  if (!wanted) return null;
  return classes.find((code) => code.toUpperCase() === wanted) ?? null;
}

/**
 * Wählt die anzuzeigende Klasse.
 *
 * Reihenfolge: `?klasse=` aus der URL, dann die zuletzt gespeicherte Klasse,
 * sonst die erste im Plan.
 *
 * Server Components und der ClassSelector im Browser benutzen bewusst dieselbe
 * Funktion — vorher gab es zwei Fassungen, und die im Browser verglich streng
 * nach Schreibweise. Die Seite zeigte dadurch eine andere Klasse an, als im
 * Auswahlfeld stand.
 */
export function resolveSelectedClass(
  classes: string[],
  requested?: string | null,
  stored?: string | null,
): string | null {
  if (classes.length === 0) return null;
  return matchClass(classes, requested) ?? matchClass(classes, stored) ?? classes[0];
}
