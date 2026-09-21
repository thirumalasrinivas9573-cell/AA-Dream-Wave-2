import "./globals.css";

import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { siteMetadata, siteViewport } from "@/config/metadata";
import { fontVariables } from "@/lib/fonts";

export const metadata = siteMetadata;
export const viewport = siteViewport;

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Dream Wave root layout — single application entry point.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppProviders>
          <div id="app-root" className="flex min-h-full flex-1 flex-col">
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
