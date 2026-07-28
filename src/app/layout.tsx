import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black, Space_Grotesk, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentMember } from "@/lib/auth";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://home-ice-coral.vercel.app"),
  title: "HomeIce",
  description: "Family operations for the Spiers",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HomeIce" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0F1A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("hi-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const member = await getCurrentMember();

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <AppShell
          member={
            member
              ? { id: member.id, name: member.name, color: member.color, isAdmin: member.isAdmin }
              : null
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
