import { CLASSES, DAY_IDS } from '../config/app-constants.js';

export const DEFAULT_CLASSES = Object.freeze([...CLASSES]);
export const SCHOOL_DAY_IDS = Object.freeze([...DAY_IDS]);

export const DAY_TOKEN_MAP = Object.freeze(new Map([
  ['montag', 'mo'], ['mo', 'mo'],
  ['dienstag', 'di'], ['di', 'di'],
  ['mittwoch', 'mi'], ['mi', 'mi'],
  ['donnerstag', 'do'], ['do', 'do'],
  ['freitag', 'fr'], ['fr', 'fr']
]));
