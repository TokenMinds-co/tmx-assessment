import { apiUpload } from "@/lib/api/client";

/** Question audio and images (backend/docs/assessments.md). */

export interface MediaAsset {
  id: string;
  url: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}

/** The API's limit. Checked here too, so a big file fails before it uploads. */
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg";

export function uploadMedia(file: File): Promise<MediaAsset> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<MediaAsset>("/api/media", form);
}
