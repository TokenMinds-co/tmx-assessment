import { TmxAssessmentLogo } from "@/components/shared/tmx-assessment-logo";

/** The sign-in pages: the TMX Assessment logo above one centered card on the canvas. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8">
        <TmxAssessmentLogo className="self-center" />
        {children}
      </div>
    </main>
  );
}
