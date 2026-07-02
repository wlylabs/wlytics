import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "wlytics",
    template: "%s · wlytics",
  },
  description: "AI-powered content pipeline for tech articles (Groq + Gemini → WordPress)",
  applicationName: "wlytics",
  openGraph: {
    title: "wlytics",
    description: "AI-powered content pipeline for tech articles",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-white text-[#111111]`}
      >
        <AppShell>{children}</AppShell>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#111111",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: { primary: "#fff", secondary: "#111111" },
            },
            error: {
              style: {
                background: "#ef4444",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
