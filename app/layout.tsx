import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import Sidebar from "@/components/layout/Sidebar";
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
  description: "AI-powered content pipeline for tech articles (Groq + Gemini → Blogger)",
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
        <Sidebar />
        {/* pb-16 = clearance for mobile bottom nav; lg:pb-0 removes it on desktop */}
        <div className="flex min-h-screen flex-col pb-16 lg:ml-64 lg:pb-0">
          <main className="flex-1">{children}</main>
        </div>
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
