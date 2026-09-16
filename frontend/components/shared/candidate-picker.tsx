"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronsUpDownIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type Candidate, searchCandidates } from "@/lib/api/candidates";
import { candidateKeys } from "@/lib/query-keys";

export type CandidateChoice =
  | { kind: "existing"; candidate: Candidate }
  | { kind: "new"; name: string; email: string };

export interface CandidateErrors {
  name?: string;
  email?: string;
  choice?: string;
}

/**
 * Picks who gets the tests: search the candidates already entered, or add a
 * new one by name and email. Nobody has to type a known candidate's details again.
 */
export function CandidatePicker({
  value,
  onChange,
  errors = {},
}: {
  value: CandidateChoice | null;
  onChange: (value: CandidateChoice | null) => void;
  errors?: CandidateErrors;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const text = useDebouncedValue(search.trim(), 250);
  const results = useQuery({
    queryKey: candidateKeys.search(text),
    queryFn: () => searchCandidates(text),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  if (value?.kind === "new") {
    return (
      <FieldSet>
        <FieldLegend variant="label">New candidate</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="candidate-name">Name</FieldLabel>
            <Input
              id="candidate-name"
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="candidate-email">Email</FieldLabel>
            <Input
              id="candidate-email"
              type="email"
              value={value.email}
              onChange={(event) => onChange({ ...value, email: event.target.value })}
              autoComplete="off"
              aria-invalid={errors.email ? true : undefined}
            />
            <FieldError>{errors.email}</FieldError>
          </Field>
        </FieldGroup>
        <Button type="button" variant="link" size="sm" className="self-start px-0" onClick={() => onChange(null)}>
          Choose someone already added instead
        </Button>
      </FieldSet>
    );
  }

  const selected = value?.kind === "existing" ? value.candidate : null;

  return (
    <Field data-invalid={errors.choice ? true : undefined}>
      <FieldLabel htmlFor="candidate-picker">Candidate</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="candidate-picker"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={errors.choice ? true : undefined}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="truncate">
                {selected.name} <span className="text-muted-foreground">· {selected.email}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Search by name or email</span>
            )}
            <ChevronsUpDownIcon data-icon="inline-end" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Name or email" />
            <CommandList>
              {results.isPending ? (
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : results.data && results.data.length > 0 ? (
                <CommandGroup heading={text ? "Matches" : "Recent candidates"}>
                  {results.data.map((candidate) => (
                    <CommandItem
                      key={candidate.id}
                      value={candidate.id}
                      onSelect={() => {
                        onChange({ kind: "existing", candidate });
                        setOpen(false);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{candidate.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{candidate.email}</span>
                      </div>
                      {selected?.id === candidate.id ? <CheckIcon /> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {text ? `No one matches “${text}”.` : "No candidates yet."}
                </p>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__new"
                  onSelect={() => {
                    const typed = search.trim();
                    onChange(
                      typed.includes("@")
                        ? { kind: "new", name: "", email: typed }
                        : { kind: "new", name: typed, email: "" },
                    );
                    setOpen(false);
                  }}
                >
                  <UserPlusIcon />
                  {search.trim() ? `Add “${search.trim()}” as a new candidate` : "Add a new candidate"}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FieldError>{errors.choice}</FieldError>
    </Field>
  );
}
