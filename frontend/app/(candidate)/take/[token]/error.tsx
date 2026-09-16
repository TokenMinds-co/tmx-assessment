"use client";

import { Button } from "@/components/ui/button";
import { CandidateMessage } from "./_components/candidate-message";

export default function TakeError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <CandidateMessage
      title="Something went wrong"
      action={<Button onClick={() => retry()}>Try again</Button>}
    >
      Your answers so far are saved. Try again, and if it keeps happening, reply to the email your link
      came in.
    </CandidateMessage>
  );
}
