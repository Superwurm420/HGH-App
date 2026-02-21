import { CLASSES, DAY_IDS } from '../src/config/app-constants.js';
import { DEFAULT_CLASSES, SCHOOL_DAY_IDS, DAY_TOKEN_MAP } from '../src/domain/school-model.js';

if (DEFAULT_CLASSES.join('|') !== CLASSES.join('|')) {
  throw new Error('DEFAULT_CLASSES should stay in sync with CLASSES');
}

if (SCHOOL_DAY_IDS.join('|') !== DAY_IDS.join('|')) {
  throw new Error('SCHOOL_DAY_IDS should stay in sync with DAY_IDS');
}

if (DAY_TOKEN_MAP.get('montag') !== 'mo' || DAY_TOKEN_MAP.get('fr') !== 'fr') {
  throw new Error('DAY_TOKEN_MAP token mapping mismatch');
}

console.log('school-model tests passed');
