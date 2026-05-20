import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";
import Toast from "@/components/shared/Toast";
import ClickSounds from "@/components/shared/ClickSounds";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "hireloop — terminal interview practice",
    template: "%s · hireloop",
  },
  description:
    "AI-powered mock interviews for every tech role. Voice or text. Honest scoring. Instant debrief.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${ibmPlexSans.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-bg font-mono text-paper antialiased">
        <Navbar />
        {children}
        <Toast />
        <ClickSounds />
      </body>
    </html>
  );
}
