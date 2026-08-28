import { describe, expect, it } from 'vitest';

import { arrayBufferToBase64 } from '@/lib/base64';
import { Base64DecodeError, base64ToBytes } from './base64';

describe('Base64 round-trip', () => {
  it('überträgt Binärdaten inklusive 0x00 und 0xFF unverändert', () => {
    const original = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x80, 0x01]);
    const decoded = base64ToBytes(arrayBufferToBase64(original.buffer as ArrayBuffer));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('überträgt alle 256 Bytewerte', () => {
    const original = new Uint8Array(256).map((_, index) => index);
    const decoded = base64ToBytes(arrayBufferToBase64(original.buffer as ArrayBuffer));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('kommt mit Daten über der Blockgröße klar', () => {
    const original = new Uint8Array(0x8000 * 2 + 17).map((_, index) => index % 256);
    const decoded = base64ToBytes(arrayBufferToBase64(original.buffer as ArrayBuffer));
    expect(decoded.byteLength).toBe(original.byteLength);
    expect(decoded[decoded.length - 1]).toBe(original[original.length - 1]);
  });

  it('behält den %PDF-Header, den die Route prüft', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7\n…');
    const decoded = base64ToBytes(arrayBufferToBase64(pdf.buffer as ArrayBuffer));
    expect(String.fromCharCode(...decoded.subarray(0, 5))).toBe('%PDF-');
  });
});

describe('base64ToBytes', () => {
  it('wirft bei ungültigem Base64 einen Base64DecodeError', () => {
    expect(() => base64ToBytes('kein gültiges base64!!')).toThrow(Base64DecodeError);
  });

  it('liefert für den leeren String ein leeres Array', () => {
    expect(base64ToBytes('').byteLength).toBe(0);
  });
});
