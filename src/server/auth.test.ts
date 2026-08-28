import { describe, expect, it } from 'vitest';

import { MIN_PASSWORD_LENGTH, validateNewPassword } from './auth';
import { hashPassword, verifyPassword } from './services/password';

describe('validateNewPassword', () => {
  it('lässt ein ausreichend langes, geändertes Passwort zu', () => {
    expect(validateNewPassword('altesPasswort', 'neuesGeheimnis1')).toEqual({ ok: true });
  });

  it('weist zu kurze Passwörter ab', () => {
    const tooShort = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword('altesPasswort', tooShort)).toEqual({ ok: false, reason: 'zu-kurz' });
  });

  it('akzeptiert genau die Mindestlänge', () => {
    expect(validateNewPassword('altesPasswort', 'a'.repeat(MIN_PASSWORD_LENGTH))).toEqual({ ok: true });
  });

  it('weist ein unverändertes Passwort ab', () => {
    expect(validateNewPassword('gleichesPasswort', 'gleichesPasswort'))
      .toEqual({ ok: false, reason: 'unveraendert' });
  });

  // Ein zu kurzes UND unverändertes Passwort soll die Längenmeldung liefern,
  // sonst schickt man die Nutzerin zu einem Passwort, das ohnehin abgelehnt wird.
  it('meldet bei zu kurz und unverändert die Länge', () => {
    expect(validateNewPassword('kurz', 'kurz')).toEqual({ ok: false, reason: 'zu-kurz' });
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
