import '@yaireo/tagify/dist/tagify.css';
import "./globals.css";
import React from "react";
import Navigation from '@/components/ui/Navigation';
import { getConfig } from '@/components/lib/config';

const { appName } = getConfig();

export const metadata = {
  title: appName,
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
