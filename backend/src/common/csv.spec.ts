import { CsvError, parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('reads plain values', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('reads quoted commas, doubled quotes and line breaks', () => {
    const text = 'stem,context\r\n"One, two","He said ""hi""\r\nthen left"\r\n';

    expect(parseCsv(text)).toEqual([
      ['stem', 'context'],
      ['One, two', 'He said "hi"\r\nthen left'],
    ]);
  });

  it('drops a byte-order mark and keeps empty values', () => {
    expect(parseCsv('﻿a,,c\n"",x,\n')).toEqual([
      ['a', '', 'c'],
      ['', 'x', ''],
    ]);
  });

  it('keeps blank rows so indexes match spreadsheet rows', () => {
    expect(parseCsv('a\n\nb')).toEqual([['a'], [''], ['b']]);
  });

  it('detects semicolon and tab separators', () => {
    expect(parseCsv('a;b\n"1;2";3')).toEqual([
      ['a', 'b'],
      ['1;2', '3'],
    ]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('reports a quote that never closes', () => {
    expect(() => parseCsv('a,b\n"open,1\n')).toThrow(CsvError);
    try {
      parseCsv('a,b\n"open,1\n');
    } catch (error) {
      expect((error as CsvError).row).toBe(2);
    }
  });
});

describe('toCsv', () => {
  it('quotes only what needs quoting, and round-trips', () => {
    const rows = [
      ['ref', 'stem'],
      ['Q1', 'Plain'],
      ['Q2', 'Comma, "quotes"\nand a line break'],
      ['Q3', ' padded '],
    ];
    const text = toCsv(rows);

    expect(text.split('\r\n')[1]).toBe('Q1,Plain');
    expect(text).toContain('"Comma, ""quotes""\nand a line break"');
    expect(parseCsv(text)).toEqual(rows);
  });
});
