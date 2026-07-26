import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host") ?? "localhost:3000";
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "53",
    description: "Haftalık Age of Empires II 4v4 maçları, takım skorları ve oyuncu sıralaması.",
    applicationName: "53",
    openGraph: {
      title: "53",
      description: "Age of Empires II 4v4 maç takipçisi.",
      type: "website",
      images: [{ url: imageUrl, width: 1672, height: 941, alt: "53" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "53",
      description: "Age of Empires II 4v4 maç takipçisi.",
      images: [imageUrl],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#17110c",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
