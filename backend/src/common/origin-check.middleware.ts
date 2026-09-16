import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie sessions: rejects a state-changing request that a
 * browser sent from an origin we don't trust. Trusted are the CORS origins
 * and the API's own origin, which the Swagger docs page calls from. Requests
 * with no Origin header (curl, server-side calls from Next.js) pass, because
 * browsers always send it on cross-origin writes. See docs/api-conventions.md.
 */
export function originCheck(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('origin');
    if (
      SAFE_METHODS.has(req.method) ||
      origin === undefined ||
      allowed.has(origin) ||
      origin === `${req.protocol}://${req.host}`
    ) {
      next();
      return;
    }
    res.status(403).json({
      statusCode: 403,
      message: 'Cross-origin request blocked.',
      error: 'Forbidden',
    });
  };
}
