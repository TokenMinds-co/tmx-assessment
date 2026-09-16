const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const SESSION_COOKIE_NAME = 'tmx_hr_session';

/**
 * A session ends this long after sign-in, however active the user is. The
 * cookie expires at this point too; the shorter idle timeout
 * (SESSION_TTL_DAYS) is enforced on the server.
 */
export const SESSION_ABSOLUTE_TTL_MS = 30 * DAY;

/**
 * How often an active session's idle expiry is pushed forward. Doing it at
 * most once an hour keeps it to one database write per session per hour.
 */
export const SESSION_RENEW_INTERVAL_MS = HOUR;

export const INVITATION_TTL_MS = 7 * DAY;
export const PASSWORD_RESET_TTL_MS = HOUR;

/** Length is the only password rule, following NIST SP 800-63B. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const toDays = (ms: number): number => Math.round(ms / DAY);
export const toMinutes = (ms: number): number => Math.round(ms / MINUTE);
