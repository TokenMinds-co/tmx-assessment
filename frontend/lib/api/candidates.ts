import { apiFetch } from "@/lib/api/client";

/** Candidates, for the send dialog's search. */

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  invitationCount: number;
  createdAt: string;
}

export async function searchCandidates(search: string, limit = 8): Promise<Candidate[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (search) query.set("search", search);
  const { items } = await apiFetch<{ items: Candidate[] }>(`/api/candidates?${query}`);
  return items;
}
