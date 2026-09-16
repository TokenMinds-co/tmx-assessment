/**
 * A small CSV reader and writer (RFC 4180), used for question imports and
 * exports. It handles quoted values with commas, quotes and line breaks, a
 * byte-order mark, CRLF or LF line endings, and the semicolon or tab
 * separators some spreadsheet apps write.
 */

export class CsvError extends Error {
  constructor(
    message: string,
    /** The spreadsheet row (1-based) the problem starts on. */
    readonly row: number,
  ) {
    super(message);
    this.name = 'CsvError';
  }
}

const SEPARATORS = [',', ';', '\t'];

/**
 * Every record in the file, in order, as lists of raw values. Blank records
 * stay in the list, so an index still matches the spreadsheet row number.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const separator = detectSeparator(text);
  const records: string[][] = [];
  let record: string[] = [];
  let value = '';
  let inQuotes = false;
  // True once a value has opened with a quote, so `""` is an empty value.
  let quotedValue = false;

  const endValue = () => {
    record.push(value);
    value = '';
    quotedValue = false;
  };
  const endRecord = () => {
    endValue();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char !== '"') value += char;
      else if (text[i + 1] === '"') {
        value += '"';
        i++;
      } else inQuotes = false;
      continue;
    }
    if (char === '"' && value === '' && !quotedValue) {
      inQuotes = true;
      quotedValue = true;
    } else if (char === separator) {
      endValue();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRecord();
    } else {
      value += char;
    }
  }

  if (inQuotes) {
    throw new CsvError(
      `Row ${records.length + 1} has a quoted value that never closes. Check for a stray " character.`,
      records.length + 1,
    );
  }
  if (value !== '' || record.length > 0 || quotedValue) endRecord();
  return records;
}

/** CSV text with CRLF line endings, quoting only the values that need it. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

function quote(value: string): string {
  return /[",\r\n]/.test(value) || value !== value.trim()
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/** The separator used most often in the header row, outside quotes. */
function detectSeparator(text: string): string {
  const counts = new Map(SEPARATORS.map((separator) => [separator, 0]));
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === '\n' || char === '\r')) break;
    else if (!inQuotes && counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }
  let best = ',';
  let most = 0;
  for (const [separator, count] of counts) {
    if (count > most) {
      best = separator;
      most = count;
    }
  }
  return best;
}
