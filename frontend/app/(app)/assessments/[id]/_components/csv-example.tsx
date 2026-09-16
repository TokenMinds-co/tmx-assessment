"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ScoringMethod } from "@/lib/api/assessments";
import { cn } from "@/lib/utils";

/*
 * The first rows of the question CSV template, shown in the import dialog so
 * the shape of the file is clear without downloading it. They mirror the
 * examples the API writes into the template (backend canonical/csv-questions.ts);
 * the download is still the one with every column.
 */

interface Example {
  columns: string[];
  rows: string[][];
  /** What a row that isn't shown here does differently. */
  note: string;
}

const EXAMPLES: Record<ScoringMethod, Example> = {
  CORRECT_ANSWER: {
    columns: ["type", "stem", "option_a", "option_b", "option_c", "option_d", "correct"],
    rows: [
      [
        "single_choice",
        "What is the main point of the message?",
        "The sender is rejecting the proposal.",
        "The sender wants a smaller first phase.",
        "The sender thinks the proposal is going in the wrong direction.",
        "The sender wants to delay all work.",
        "B",
      ],
      [
        "true_false",
        "True or False: Ben would like to stop working for a short time.",
        "True",
        "False",
        "",
        "",
        "A",
      ],
    ],
    note: "A blank type means single choice. Options run to option_f, and correct names the right one by its letter.",
  },
  ALIGNMENT: {
    columns: ["type", "stem", "scale_size", "scale_min_label", "scale_max_label", "employer_prompt", "employer_value"],
    rows: [
      [
        "rating_scale",
        "How important is it to you that a job lets you use many different skills?",
        "5",
        "Not important",
        "Extremely important",
        "To what extent does this role require a variety of different skills?",
        "3",
      ],
    ],
    note: "A choice scale sets type to choice_scale and writes its wording in option_a to option_f instead of the scale columns.",
  },
};

const OPTIONAL_COLUMNS =
  "ref, section, difficulty, instruction, context, media, rationale, transcript, shuffle_options and keep_last_option_fixed";

/*
 * The table scrolls sideways rather than squeezing, the way the row preview
 * below it does. Without a floor on the question column, the alignment
 * example's long column names crush it to one word per line.
 */

/** The template's example rows, as a table. Open by default, because it's what a first-time importer needs. */
export function CsvExample({ scoringMethod }: { scoringMethod: ScoringMethod }) {
  const [open, setOpen] = useState(true);
  const example = EXAMPLES[scoringMethod];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="self-start">
          {open ? "Hide the example" : "Show an example"}
          <ChevronDownIcon data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableCaption className="sr-only">The example rows from the question CSV template</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {example.columns.map((column) => (
                  <TableHead key={column} className={cn("font-mono normal-case", column === "stem" && "min-w-44")}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {example.rows.map((row) => (
                <TableRow key={row[1]}>
                  {row.map((value, index) => (
                    <TableCell key={example.columns[index]} className="max-w-52 align-top text-xs whitespace-normal">
                      {value || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          {example.note} Only stem is required; the template also has {OPTIONAL_COLUMNS}.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
