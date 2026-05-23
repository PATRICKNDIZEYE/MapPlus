import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { TrpcProvider } from '@/providers/TrpcProvider';
import './globals.css';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'mallGuide — The Mall Guide by yoGuide',
  description: 'mallGuide is an integrated ecosystem connecting mall managers, tenants, and shoppers into one intelligent, seamlessly working whole.',
};

export const viewport: Viewport = {
  themeColor: '#4B0082',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`h-full ${font.variable}`}>
      <body className="h-full bg-slate-50 font-jakarta antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TrpcProvider>{children}</TrpcProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
