"use client";

import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoringMethod } from "@/lib/api/assessments";
import type { AnswerReview as Review, Choice } from "@/lib/api/invitations";
import { cn } from "@/lib/utils";

const WIDE_ONLY = "hidden md:table-cell";

/** Every question with the candidate's answer next to the expected one. Hidden until asked for. */
export function AnswerReview({ answers, scoringMethod }: { answers: Review[]; scoringMethod: ScoringMethod }) {
  const [open, setOpen] = useState(false);
  const alignment = scoringMethod === "ALIGNMENT";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="self-start">
          {open ? "Hide answers" : `Show answers (${answers.length})`}
          <ChevronDownIcon data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableCaption className="sr-only">Each question with the candidate’s answer</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead className={WIDE_ONLY}>{alignment ? "Role profile" : "Right answer"}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Result</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {answers.map((answer) => (
                <TableRow key={answer.questionId}>
                  <TableCell className="align-top text-muted-foreground tabular-nums">{answer.number}</TableCell>
                  <TableCell className="min-w-56 align-top whitespace-normal">
                    <span className="line-clamp-3 text-foreground">{answer.stem}</span>
                    {answer.section ? (
                      <span className="text-xs text-muted-foreground">{answer.section}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="min-w-40 align-top whitespace-normal">
                    {answer.chosen ? describe(answer.chosen) : <span className="text-muted-foreground">No answer</span>}
                  </TableCell>
                  <TableCell className={cn("min-w-40 align-top whitespace-normal text-muted-foreground", WIDE_ONLY)}>
                    {answer.expected ? describe(answer.expected) : "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <Result answer={answer} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function describe(choice: Choice): string {
  return choice.text && choice.text !== choice.label ? `${choice.label}. ${choice.text}` : choice.label;
}

function Result({ answer }: { answer: Review }) {
  if (answer.isCorrect === true) {
    return <CheckIcon aria-label="Right" className="size-4 text-success" />;
  }
  if (answer.isCorrect === false) {
    return <XIcon aria-label="Wrong" className="size-4 text-destructive" />;
  }
  if (answer.candidateValue === null || answer.employerValue === null) return null;
  const gap = Math.abs(answer.candidateValue - answer.employerValue);
  return (
    <span
      className={cn("text-xs font-semibold tabular-nums", gap >= 2 ? "text-warning" : "text-muted-foreground")}
      aria-label={`${gap} away from the role profile`}
    >
      {gap === 0 ? "=" : `±${gap}`}
    </span>
  );
}
