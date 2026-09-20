import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";
import Toast from "@/components/shared/Toast";

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

const DESCRIPTION =
  "AI-powered mock interviews for every tech role. Voice or text. Honest scoring. Instant debrief.";

export const metadata: Metadata = {
  title: {
    default: "hireloop — terminal interview practice",
    template: "%s · hireloop",
  },
  description: DESCRIPTION,
  applicationName: "hireloop",
  // Without this, Next resolves og:image against http://localhost:3000 and
  // shared links show no preview card.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  ),
  // `icon.png`, `apple-icon.png` and `opengraph-image.png` in this folder
  // are picked up automatically by the App Router; the entries below give
  // shared links a title, a description and the logo card.
  openGraph: {
    type: "website",
    siteName: "hireloop",
    title: "hireloop — terminal interview practice",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "hireloop — terminal interview practice",
    description: DESCRIPTION,
  },
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
      </body>
    </html>
  );
}
