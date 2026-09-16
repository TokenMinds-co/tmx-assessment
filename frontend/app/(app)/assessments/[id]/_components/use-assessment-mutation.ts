"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AssessmentDetail } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { assessmentKeys } from "@/lib/query-keys";

/**
 * A change to a test. Every such call answers with the whole test, so the
 * answer replaces the cached copy and the library list refreshes behind it.
 * Errors become a toast unless the caller shows them in place.
 */
export function useAssessmentMutation<TVariables = void>(
  assessmentId: string,
  mutationFn: (variables: TVariables) => Promise<AssessmentDetail>,
  { toastErrors = true }: { toastErrors?: boolean } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(assessmentKeys.detail(assessmentId), detail);
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
    onError: toastErrors ? (error) => toast.error(errorMessage(error)) : undefined,
  });
}
