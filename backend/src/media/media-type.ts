export interface MediaType {
  mimeType: string;
  extension: string;
  kind: 'audio' | 'image';
}

const MP3: MediaType = {
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  kind: 'audio',
};
const M4A: MediaType = {
  mimeType: 'audio/mp4',
  extension: 'm4a',
  kind: 'audio',
};
const WAV: MediaType = {
  mimeType: 'audio/wav',
  extension: 'wav',
  kind: 'audio',
};
const OGG: MediaType = {
  mimeType: 'audio/ogg',
  extension: 'ogg',
  kind: 'audio',
};
const PNG: MediaType = {
  mimeType: 'image/png',
  extension: 'png',
  kind: 'image',
};
const JPEG: MediaType = {
  mimeType: 'image/jpeg',
  extension: 'jpg',
  kind: 'image',
};
const WEBP: MediaType = {
  mimeType: 'image/webp',
  extension: 'webp',
  kind: 'image',
};

export const SUPPORTED_MEDIA_MESSAGE =
  'Upload an MP3, M4A, WAV or OGG audio file, or a PNG, JPEG or WebP image.';

const ascii = (data: Buffer, start: number, end: number) =>
  data.length >= end ? data.toString('latin1', start, end) : '';

/**
 * The file's type, read from its first bytes. The Content-Type the browser
 * sends is ignored, because anyone can set it. Null for anything else.
 */
export function detectMediaType(data: Buffer): MediaType | null {
  if (data.length < 4) return null;

  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return JPEG;
  if (ascii(data, 0, 8) === '\x89PNG\r\n\x1a\n') return PNG;
  if (ascii(data, 0, 4) === 'RIFF') {
    if (ascii(data, 8, 12) === 'WAVE') return WAV;
    if (ascii(data, 8, 12) === 'WEBP') return WEBP;
    return null;
  }
  if (ascii(data, 0, 4) === 'OggS') return OGG;
  if (ascii(data, 4, 8) === 'ftyp') return M4A;
  // An ID3 tag, or an MPEG audio frame header (11 sync bits set).
  if (ascii(data, 0, 3) === 'ID3') return MP3;
  if (data[0] === 0xff && (data[1] & 0xe0) === 0xe0) return MP3;
  return null;
}
