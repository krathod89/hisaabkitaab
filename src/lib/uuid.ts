/**
 * RFC-4122 v4 UUID. Uses crypto.getRandomValues when available (web + Hermes
 * with the URL polyfill), falling back to Math.random. Client-generated ids let
 * us create rows offline that upsert cleanly into Postgres (uuid primary keys).
 */
export function uuid(): string {
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex: string[] = [];
  for (let i = 0; i < 256; i++) hex.push((i + 0x100).toString(16).slice(1));
  const b = bytes;
  return (
    hex[b[0]] + hex[b[1]] + hex[b[2]] + hex[b[3]] + '-' +
    hex[b[4]] + hex[b[5]] + '-' +
    hex[b[6]] + hex[b[7]] + '-' +
    hex[b[8]] + hex[b[9]] + '-' +
    hex[b[10]] + hex[b[11]] + hex[b[12]] + hex[b[13]] + hex[b[14]] + hex[b[15]]
  );
}
