import type { Metadata } from "next";
import localFont from "next/font/local";
import { DebugLayoutProbe } from "@/components/debug/DebugLayoutProbe";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

// No dedicated mono font file exists — use PrimeformProDemo as mono fallback
const fontMono = localFont({
  src: [
    { path: "../../public/fonts/PrimeformProDemo-Regular.otf", weight: '400' },
  ],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Coldstart | AI-Powered Outreach",
  description: "Cold emails that actually get replies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <DebugLayoutProbe />
        {children}
      </body>
    </html>
  );
}
