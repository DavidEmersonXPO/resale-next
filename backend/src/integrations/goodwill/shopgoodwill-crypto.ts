import { createCipheriv, createDecipheriv } from 'crypto';

const ZERO_IV = Buffer.from('0000000000000000');

export const encryptToUrlSafeBase64 = (
  plainText: string,
  base64UrlKey?: string | null,
): string => {
  if (!plainText) return '';
  if (base64UrlKey) {
    const utf8Key = Buffer.from(base64UrlKey, 'utf8');
    if ([16, 24, 32].includes(utf8Key.length)) {
      try {
        const encrypted = encryptAesCbc(plainText, utf8Key);
        if (encrypted) return encrypted;
      } catch {
        // fallback below
      }
    }
  }

  const keyBytes = decodeBase64Url(base64UrlKey ?? '');
  const cipherBytes = encryptAesCtr(Buffer.from(plainText, 'utf8'), keyBytes);
  const base64 = Buffer.from(cipherBytes).toString('base64');
  return encodeURIComponent(base64);
};

const encryptAesCbc = (plainText: string, key: Buffer) => {
  const cipher = createCipheriv('aes-256-cbc', key, ZERO_IV);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  return encodeURIComponent(encrypted.toString('base64'));
};

const encryptAesCtr = (plainBytes: Buffer, key: Buffer) => {
  const ec = createCipheriv('aes-256-ecb', key, null);
  ec.setAutoPadding(false);

  const counter = Buffer.alloc(16);
  const output = Buffer.alloc(plainBytes.length);
  let offset = 0;

  while (offset < plainBytes.length) {
    const block = ec.update(counter);
    const blockSize = Math.min(block.length, plainBytes.length - offset);
    for (let i = 0; i < blockSize; i++) {
      output[offset + i] = block[i] ^ plainBytes[offset + i];
    }
    offset += blockSize;
    incrementCounter(counter);
  }

  return output;
};

const incrementCounter = (counter: Buffer) => {
  for (let i = counter.length - 1; i >= 0; i--) {
    counter[i]++;
    if (counter[i] !== 0) break;
  }
};

const decodeBase64Url = (value: string) => {
  if (!value) return Buffer.alloc(16);
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  return Buffer.from(padded, 'base64');
};
