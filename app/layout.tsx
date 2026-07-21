import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Nexa Notes | Gemeinsam denken, klar organisieren",
  description: "Moderne Notizbücher, schnelle Notizen und gemeinsame Bearbeitung in einem ruhigen Arbeitsbereich.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
