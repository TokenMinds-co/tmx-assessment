import {
  ArchiveIcon,
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  LoaderCircleIcon,
  PencilIcon,
  TimerOffIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AssessmentStatus } from "@/lib/api/assessments";
import type { InvitationStatus } from "@/lib/api/invitations";
import type { AttemptStatus } from "@/lib/api/take";

// Status colors always come with an icon and a label (docs/design-system.md).

type BadgeVariant = "secondary" | "success" | "warning" | "info" | "outline" | "soft";

interface Look {
  label: string;
  variant: BadgeVariant;
  icon: LucideIcon;
}

function StatusBadge({ look }: { look: Look }) {
  const Icon = look.icon;
  return (
    <Badge variant={look.variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {look.label}
    </Badge>
  );
}

const ASSESSMENT: Record<AssessmentStatus, Look> = {
  DRAFT: { label: "Draft", variant: "outline", icon: PencilIcon },
  PUBLISHED: { label: "Published", variant: "success", icon: CircleCheckIcon },
  ARCHIVED: { label: "Archived", variant: "secondary", icon: ArchiveIcon },
};

const INVITATION: Record<InvitationStatus, Look> = {
  NOT_STARTED: { label: "Not started", variant: "secondary", icon: CircleDashedIcon },
  IN_PROGRESS: { label: "In progress", variant: "info", icon: LoaderCircleIcon },
  COMPLETED: { label: "Completed", variant: "success", icon: CircleCheckIcon },
  EXPIRED: { label: "Link expired", variant: "warning", icon: ClockIcon },
  REVOKED: { label: "Revoked", variant: "outline", icon: BanIcon },
};

const ATTEMPT: Record<AttemptStatus, Look> = {
  NOT_STARTED: { label: "Not started", variant: "secondary", icon: CircleDashedIcon },
  IN_PROGRESS: { label: "In progress", variant: "info", icon: LoaderCircleIcon },
  SUBMITTED: { label: "Done", variant: "success", icon: CircleCheckIcon },
  EXPIRED: { label: "Timed out", variant: "warning", icon: TimerOffIcon },
};

export const AssessmentStatusBadge = ({ status }: { status: AssessmentStatus }) => (
  <StatusBadge look={ASSESSMENT[status]} />
);

export const InvitationStatusBadge = ({ status }: { status: InvitationStatus }) => (
  <StatusBadge look={INVITATION[status]} />
);

export const AttemptStatusBadge = ({ status }: { status: AttemptStatus }) => (
  <StatusBadge look={ATTEMPT[status]} />
);
