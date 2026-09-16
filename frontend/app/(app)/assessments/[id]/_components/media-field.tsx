"use client";

import { useMutation } from "@tanstack/react-query";
import { FileAudioIcon, RefreshCwIcon, TriangleAlertIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { MediaRef } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { AUDIO_ACCEPT, MAX_MEDIA_BYTES, uploadMedia } from "@/lib/api/media";

const TOO_BIG = "That file is over 10 MB. Use a shorter or more compressed clip.";

/**
 * A question's audio clip. The file uploads straight away; the question points
 * to it once the question is saved.
 */
export function MediaField({
  media,
  fileName,
  onChange,
}: {
  media: MediaRef | null;
  /** A file an import named that hasn't been uploaded yet. */
  fileName: string | null;
  onChange: (media: MediaRef | null, fileName: string | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooBig, setTooBig] = useState(false);

  const upload = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (asset) =>
      onChange({ id: asset.id, url: asset.url, mimeType: asset.mimeType, originalName: asset.originalName }, null),
  });

  function pick(file: File | undefined) {
    if (!file) return;
    const big = file.size > MAX_MEDIA_BYTES;
    setTooBig(big);
    if (!big) upload.mutate(file);
  }

  const choose = () => inputRef.current?.click();
  const error = tooBig ? TOO_BIG : upload.error ? errorMessage(upload.error) : undefined;
  const busyIcon = upload.isPending ? <Spinner data-icon="inline-start" /> : null;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>Audio</FieldLabel>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={AUDIO_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {media ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-secondary/50 p-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileAudioIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">{media.originalName}</span>
          </div>
          <audio controls preload="none" src={media.url} className="h-9 w-full lg:w-64" />
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={choose} disabled={upload.isPending}>
              {busyIcon ?? <RefreshCwIcon data-icon="inline-start" />}
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null, null)}>
              <XIcon data-icon="inline-start" />
              Remove
            </Button>
          </div>
        </div>
      ) : fileName ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft p-3 text-warning">
          <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Needs its file:</span> {fileName}. Upload it before you publish.
          </p>
          <div className="flex gap-1">
            <Button type="button" size="sm" onClick={choose} disabled={upload.isPending}>
              {busyIcon ?? <UploadIcon data-icon="inline-start" />}
              Upload
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null, null)}>
              No audio
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={choose} disabled={upload.isPending}>
            {busyIcon ?? <UploadIcon data-icon="inline-start" />}
            {upload.isPending ? "Uploading…" : "Add audio"}
          </Button>
          <FieldDescription>Optional. MP3, M4A, WAV or OGG, up to 10 MB.</FieldDescription>
        </div>
      )}
      <FieldError>{error}</FieldError>
    </Field>
  );
}
