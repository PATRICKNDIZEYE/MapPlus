import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { TrpcProvider } from '@/providers/TrpcProvider';
import './globals.css';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Map+ — Indoor Building Intelligence',
  description: 'Map+ digitises commercial buildings into searchable, navigable digital experiences for visitors, owners, and tenants.',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${font.variable}`}>
      <body className="h-full bg-slate-50 font-jakarta antialiased">
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
