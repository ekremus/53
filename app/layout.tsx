import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AoE2 Weekly — Haftalık 4v4 Maçları",
  description: "Haftalık Age of Empires II 4v4 maçları, takım skorları ve oyuncu sıralaması.",
  applicationName: "AoE2 Weekly",
  openGraph: {
    title: "AoE2 Weekly",
    description: "Dostluk baki. Skor kayıt altında.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#eee6d5",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
