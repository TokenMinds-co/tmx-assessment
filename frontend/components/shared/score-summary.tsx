import { TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AlignmentFlag, ScoringMethod, SectionScore } from "@/lib/api/assessments";
import type { BandSummary } from "@/lib/api/invitations";
import { formatPercent, plural } from "@/lib/format";

export interface ScoreSummaryData {
  score: number | null;
  bandLabel: string | null;
  correctCount: number | null;
  questionCount: number;
  answeredCount: number;
  sections: SectionScore[];
  flags: AlignmentFlag[];
}

/**
 * A test's score for staff: the total and its band, what the band means, a
 * bar per section, and, for the motivation test, the gaps to raise in an
 * interview. Candidates never see this.
 */
export function ScoreSummary({
  result,
  scoringMethod,
  band,
}: {
  result: ScoreSummaryData;
  scoringMethod: ScoringMethod;
  band?: BandSummary | null;
}) {
  const alignment = scoringMethod === "ALIGNMENT";
  const unanswered = result.questionCount - result.answeredCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {formatPercent(result.score)}
        </p>
        {result.bandLabel ? (
          <Badge variant="soft" className="h-7 px-3 text-sm">
            {result.bandLabel}
          </Badge>
        ) : null}
        <p className="basis-full text-sm text-muted-foreground">
          {alignment
            ? "How closely the answers match the role profile."
            : `${result.correctCount ?? 0} of ${result.questionCount} correct.`}
          {unanswered > 0 ? ` ${plural(unanswered, "question")} left blank.` : ""}
        </p>
      </div>

      {band && (band.interpretation || band.recommendedAction) ? (
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          {band.interpretation ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                What it means
              </dt>
              <dd className="leading-relaxed text-foreground">{band.interpretation}</dd>
            </div>
          ) : null}
          {band.recommendedAction ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Suggested next step
              </dt>
              <dd className="leading-relaxed text-foreground">{band.recommendedAction}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {result.sections.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {alignment ? "By dimension" : "By skill"}
          </h3>
          <ul className="flex flex-col gap-3">
            {result.sections.map((section) => (
              <li key={section.sectionId ?? section.name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate text-foreground">{section.name}</span>
                  <span className="shrink-0 font-semibold text-foreground tabular-nums">
                    {formatPercent(section.score)}
                    {section.correct !== null ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {section.correct}/{section.total}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-r-[4px] bg-primary/15">
                  <div
                    className="h-full origin-left bg-chart-1"
                    style={{ transform: `scaleX(${section.score})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.flags.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TriangleAlertIcon aria-hidden="true" className="size-4 text-warning" />
            Gaps to talk about ({result.flags.length})
          </h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {result.flags.map((flag) => (
              <li
                key={flag.questionId}
                className="flex flex-col gap-2 px-3 py-2.5 text-sm md:flex-row md:items-center md:gap-4"
              >
                <span className="min-w-0 flex-1 leading-snug text-foreground">
                  {flag.ref ? <span className="font-semibold">{flag.ref} · </span> : null}
                  {flag.stem}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant={flag.direction === "CANDIDATE_WANTS_MORE" ? "warning" : "info"}>
                    {flag.direction === "CANDIDATE_WANTS_MORE" ? "Wants more" : "Role offers more"}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Role {flag.employerValue} · Candidate {flag.candidateValue}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
