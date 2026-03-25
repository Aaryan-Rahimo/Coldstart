import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const fontSans = localFont({
  src: [
    { path: "../../public/fonts/CreatoDisplay-Light.otf",   weight: "300" },
    { path: "../../public/fonts/CreatoDisplay-Regular.otf", weight: "400" },
    { path: "../../public/fonts/CreatoDisplay-Bold.otf",    weight: "700" },
  ],
  variable: "--font-sans",
});

const fontMono = localFont({
  src: [
    { path: "../../public/fonts/PrimeformProDemo-Regular.otf", weight: "400" },
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
      className={cn(fontSans.variable, fontMono.variable, "antialiased")}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}