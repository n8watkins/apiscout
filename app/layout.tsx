import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "APIScout — Search, filter & test 1,500+ free public APIs in your browser",
    template: "%s · APIScout",
  },
  description:
    "A fast, searchable frontend for the public-apis directory. Filter free public APIs by category, auth, HTTPS and CORS — then test any no-auth, CORS-enabled API live in your browser with a built-in playground.",
  keywords: [
    "public APIs",
    "free APIs",
    "no-auth API",
    "CORS-enabled API",
    "test API in browser",
    "API directory",
    "REST API list",
    "developer tools",
  ],
  authors: [{ name: "Nathan Watkins", url: SITE.n8builds }],
  creator: "Nathan Watkins",
  alternates: { canonical: SITE.url },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: "APIScout",
    title: "APIScout — Search, filter & test free public APIs in your browser",
    description:
      "Search 1,500+ free public APIs, filter by CORS + no-auth, and test them live in your browser.",
  },
  twitter: {
    card: "summary_large_image",
    title: "APIScout — free public API directory + live playground",
    description:
      "Search 1,500+ free public APIs, filter by CORS + no-auth, and test them live in your browser.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "APIScout",
    url: SITE.url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Search, filter and test 1,500+ free public APIs live in your browser. Filter by category, auth type, HTTPS and CORS.",
    author: { "@type": "Person", name: "Nathan Watkins", url: SITE.n8builds },
    isBasedOn: SITE.source,
  };
  return (
    <html lang="en">
      <body className={`${inter.className} bg-bg text-ink antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
