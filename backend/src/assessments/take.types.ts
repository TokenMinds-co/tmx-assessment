import type { Request } from 'express';
import type { Prisma } from '../generated/prisma/client';

/** What InvitationTokenGuard loads for a candidate link. */
export const takeInvitationInclude = {
  candidate: { select: { name: true } },
  sentBy: { select: { name: true } },
  attempts: { select: { id: true, status: true, deadlineAt: true } },
} satisfies Prisma.AssessmentInvitationInclude;

export type TakeInvitation = Prisma.AssessmentInvitationGetPayload<{
  include: typeof takeInvitationInclude;
}>;

export interface TakeRequest extends Request {
  invitation?: TakeInvitation;
}
