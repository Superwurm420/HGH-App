import { describe, expect, it } from 'vitest';

import { hasPassword, validateNewPassword } from './auth';
import { hashPassword, verifyPassword } from './services/password';

describe('validateNewPassword', () => {
  it('lässt ein geändertes Passwort zu', () => {
    expect(validateNewPassword('altesPasswort', 'neuesGeheimnis1')).toEqual({ ok: true });
  });

  // Bewusst keine Mindestlänge: Die Länge bestimmt die Redaktion, nicht der Code.
  it('akzeptiert auch sehr kurze Passwörter', () => {
    expect(validateNewPassword('altesPasswort', 'a')).toEqual({ ok: true });
  });

  // Ein leeres Passwort wäre kein Passwort, sondern der passwortlose Zustand
  // der Ersteinrichtung — das Konto stünde damit dauerhaft offen.
  it('weist ein leeres Passwort ab', () => {
    expect(validateNewPassword('altesPasswort', '')).toEqual({ ok: false, reason: 'leer' });
  });

  it('weist ein unverändertes Passwort ab', () => {
    expect(validateNewPassword('gleichesPasswort', 'gleichesPasswort'))
      .toEqual({ ok: false, reason: 'unveraendert' });
  });

  describe('Erstvergabe (kein bisheriges Passwort)', () => {
    it('lässt jedes nicht-leere Passwort zu', () => {
      expect(validateNewPassword('', 'x')).toEqual({ ok: true });
    });

    // Ohne bisheriges Passwort gibt es nichts, wozu das neue „unverändert"
    // sein könnte — der leere String darf hier nicht als Vergleichswert dienen.
    it('meldet bei leerer Eingabe „leer" und nicht „unveraendert"', () => {
      expect(validateNewPassword('', '')).toEqual({ ok: false, reason: 'leer' });
    });
  });
});

describe('hasPassword', () => {
  it('erkennt ein Konto ohne Passwort am leeren Hash', () => {
    expect(hasPassword('')).toBe(false);
  });

  it('erkennt ein Konto mit Passwort', async () => {
    expect(hasPassword(await hashPassword('egal'))).toBe(true);
  });

  // Der leere Hash muss unbestätigbar sein, sonst wäre er als Markierung
  // gefährlich: Ein passendes Passwort dürfte es nicht geben.
  it('kein Passwort kann gegen einen leeren Hash bestätigt werden', async () => {
    expect(await verifyPassword('', '')).toBe(false);
    expect(await verifyPassword('irgendetwas', '')).toBe(false);
  });
});

describe('Passwort-Hashing', () => {
  it('erkennt das richtige Passwort wieder', async () => {
    const hash = await hashPassword('meinGeheimnis123');
    expect(await verifyPassword('meinGeheimnis123', hash)).toBe(true);
  });

  it('weist ein falsches Passwort ab', async () => {
    const hash = await hashPassword('meinGeheimnis123');
    expect(await verifyPassword('meinGeheimnis124', hash)).toBe(false);
  });

  it('erzeugt für dasselbe Passwort unterschiedliche Hashes (zufälliges Salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('gleich'), hashPassword('gleich')]);
    expect(a).not.toBe(b);
    expect(await verifyPassword('gleich', a)).toBe(true);
    expect(await verifyPassword('gleich', b)).toBe(true);
  });

  it('kommt mit einem beschädigten Hash zurecht, statt zu werfen', async () => {
    expect(await verifyPassword('egal', 'kein-doppelpunkt')).toBe(false);
    expect(await verifyPassword('egal', '')).toBe(false);
  });
});
