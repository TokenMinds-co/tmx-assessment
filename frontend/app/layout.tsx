import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "TMX HR", template: "%s · TMX HR" },
  description: "An internal HR app for recruitment and candidate assessments.",
  // An internal tool: keep every page out of search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The font variables go on <html>, where the `--font-sans` token reads them.
    <html lang="en" className={cn(inter.variable, geistMono.variable, "h-full")}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={200}>
          <Providers>{children}</Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
