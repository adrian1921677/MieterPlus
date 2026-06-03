import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Mieter + — eine App von ADB',
    template: '%s · Mieter +',
  },
  description:
    'Mieter +: Mängel und Anfragen einfach an deinen Vermieter melden — und als Vermieter zentral verwalten. Eine App von ADB Dienstleistungen.',
  applicationName: 'Mieter +',
  authors: [{ name: 'ADB Dienstleistungen' }],
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#2563a8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning className={jakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
