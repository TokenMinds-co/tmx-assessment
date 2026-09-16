import { TmxHrLogo } from "@/components/shared/tmx-hr-logo";

/** The sign-in pages: the TMX HR logo above one centered card on the canvas. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8">
        <TmxHrLogo className="self-center" />
        {children}
      </div>
    </main>
  );
}
