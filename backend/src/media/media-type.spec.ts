import { detectMediaType } from './media-type';

const bytes = (...parts: (string | number[])[]) =>
  Buffer.concat(
    parts.map((part) =>
      typeof part === 'string'
        ? Buffer.from(part, 'latin1')
        : Buffer.from(part),
    ),
  );

describe('detectMediaType', () => {
  it.each([
    ['an ID3-tagged MP3', bytes('ID3', [3, 0, 0, 0]), 'audio/mpeg'],
    ['a bare MP3 frame', bytes([0xff, 0xfb, 0x90, 0x44]), 'audio/mpeg'],
    ['an M4A', bytes([0, 0, 0, 0x20], 'ftypM4A '), 'audio/mp4'],
    ['a WAV', bytes('RIFF', [0, 0, 0, 0], 'WAVE'), 'audio/wav'],
    ['an OGG', bytes('OggS', [0, 2]), 'audio/ogg'],
    ['a PNG', bytes([0x89], 'PNG\r\n\x1a\n'), 'image/png'],
    ['a JPEG', bytes([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    ['a WebP', bytes('RIFF', [0, 0, 0, 0], 'WEBP'), 'image/webp'],
  ])('recognises %s', (_name, data, mimeType) => {
    expect(detectMediaType(data)?.mimeType).toBe(mimeType);
  });

  it('rejects anything else', () => {
    expect(detectMediaType(Buffer.from('plain text file'))).toBeNull();
    expect(detectMediaType(bytes('RIFF', [0, 0, 0, 0], 'AVI '))).toBeNull();
    expect(detectMediaType(Buffer.from([0xff]))).toBeNull();
  });
});
