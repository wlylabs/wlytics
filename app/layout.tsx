import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-zinc-50 text-gray-900`}
      >
        <Sidebar />
        <div className="flex min-h-screen flex-col pt-14 lg:ml-60 lg:pt-0">
          <main className="flex-1">{children}</main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
