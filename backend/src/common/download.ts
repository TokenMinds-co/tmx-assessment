import type { Response } from 'express';

/** Put first in a CSV so Excel reads it as UTF-8. */
export const UTF8_BOM = String.fromCharCode(0xfeff);

/** Makes the browser save the response as a file called `filename`. */
export function sendAsFile(
  res: Response,
  filename: string,
  contentType?: string,
): void {
  if (contentType) res.setHeader('Content-Type', contentType);
  const safe = filename.replace(/[^\w.-]+/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
}
