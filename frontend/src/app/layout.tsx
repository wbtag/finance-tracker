import '@yaireo/tagify/dist/tagify.css';
import "./globals.css";
import React from "react";
import Navigation from '@/components/ui/Navigation';
import { getConfig } from '@/components/lib/config';

// Config is mounted at runtime, not available during `next build`, so never prerender.
export const dynamic = 'force-dynamic';

export function generateMetadata() {
  return {
    title: getConfig().appName,
    description: "",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <meta name="viewport" content="width=1024" />
      </head>
      <body style={{backgroundColor: '#09002f'}}>
        <Navigation appName={getConfig().appName} />
        {children}
      </body>
    </html>
  );
}
