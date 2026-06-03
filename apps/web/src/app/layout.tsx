import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MieterPlus — eine App von ADB',
    template: '%s · MieterPlus',
  },
  description:
    'MieterPlus: Mängel und Anfragen einfach an deinen Vermieter melden — und als Vermieter zentral verwalten.',
  applicationName: 'MieterPlus',
  authors: [{ name: 'ADB' }],
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
