import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const corePath = path.join(process.cwd(), 'src/lib/timetable/selection-core.ts');
const source = fs.readFileSync(corePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: corePath,
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const core = await import(moduleUrl);

export function parseTimetableFilename(filename, stat) {
  return core.parseTimetableFilename(filename, { lastModifiedMs: stat?.mtimeMs });
}

export function compareTimetable(a, b) {
  return core.compareTimetable(a, b);
}

export function selectLatestTimetable(files) {
  return core.selectLatestTimetable(files);
}
