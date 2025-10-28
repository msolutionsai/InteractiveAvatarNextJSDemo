import "@/styles/globals.css";
import { Metadata } from "next";
import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Assistant Virtuel Katya",
    template: `%s - Assistant Virtuel`,
  },
  icons: {
    icon: "/heygen-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} font-sans`}
      lang="fr"
    >
      <head />
      <body className="min-h-screen bg-black text-white">
        <main className="relative flex flex-col h-screen w-screen">
          {/* ✅ NAVBAR SUPPRIMÉE */}
          {children}
        </main>
      </body>
    </html>
  );
}
