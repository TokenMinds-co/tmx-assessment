import { Prisma } from '../generated/prisma/client';

/** True when a write broke a unique constraint, such as a duplicate email. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
