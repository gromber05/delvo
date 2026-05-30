import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const arimo = localFont({
  src: "../public/Arimo-VariableFont_wght.ttf",
  variable: "--font-arimo",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Delvo",
  description: "An AI powered assistant",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon-nobg.png",
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
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "font-sans", arimo.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
