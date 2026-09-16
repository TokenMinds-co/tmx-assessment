"use client";

import { UploadIcon } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/** A drop zone that's also a file picker. */
export function FileDrop({
  accept,
  file,
  onFile,
  hint,
}: {
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  hint: string;
}) {
  const [over, setOver] = useState(false);
  const inputId = useId();

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const dropped = event.dataTransfer.files[0];
        if (dropped) onFile(dropped);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong bg-secondary/50 px-6 py-7 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:border-primary/60 hover:bg-primary-soft/60",
        over && "border-primary bg-primary-soft",
      )}
    >
      <UploadIcon aria-hidden="true" className="mb-1 size-5 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {file ? file.name : "Drop a file here, or choose one"}
      </span>
      <span className="text-xs text-muted-foreground">
        {file ? "Choose another file to replace it." : hint}
      </span>
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </label>
  );
}
