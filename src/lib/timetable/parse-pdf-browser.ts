import { parseTimetablePdf, type PdfGetDocument, type TimetableParseResult } from './parse-pdf';

/** Der Ausschnitt von pdfjs, den wir tatsächlich benutzen. */
interface PdfJsModule {
  getDocument: PdfGetDocument;
  GlobalWorkerOptions: { workerSrc: string };
  VerbosityLevel?: { ERRORS?: number };
  /** Die Zeichenbefehle — nötig, um das Tabellenraster aus dem PDF zu lesen. */
  OPS?: Record<string, number>;
}

/**
 * Als Variable statt als Literal — damit kein Bundler den Pfad auflöst und
 * pdfjs mit einbaut. Die Datei wird von scripts/prebuild.mjs nach public/
 * kopiert und erst beim ersten PDF-Upload geladen.
 */
const PDFJS_URL = '/pdfjs/pdf.min.mjs';
const PDFJS_WORKER_URL = '/pdfjs/pdf.worker.min.mjs';

/** Einmal geladen, für weitere Uploads wiederverwendet. */
let pdfjsPromise: Promise<PdfJsModule> | null = null;

function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PDFJS_URL)
      .then((module: PdfJsModule) => {
        module.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return module;
      })
      .catch((error: unknown) => {
        // Beim nächsten Versuch neu laden, statt den Fehler dauerhaft zu behalten.
        pdfjsPromise = null;
        throw error;
      });
  }

  return pdfjsPromise;
}

/**
 * Wertet ein Stundenplan-PDF im Browser des Admins aus.
 *
 * Serverseitig wäre das auf dem kostenlosen Cloudflare-Plan nicht möglich:
 * Dort stehen 10 ms CPU-Zeit pro Request zur Verfügung, das Auswerten eines
 * Stundenplans liegt weit darüber.
 */
export async function parseTimetableFileInBrowser(file: File): Promise<TimetableParseResult> {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();

  return parseTimetablePdf(data, pdfjs.getDocument, {
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
    ops: pdfjs.OPS,
  });
}
