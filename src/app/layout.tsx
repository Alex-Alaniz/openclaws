import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'OpenClaws — Connect All Your Tools',
  description: 'Your own 24/7 AI assistant with 1000+ integrations. Deploy in under 1 minute.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/openclaw.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://openclaws.biz'),
  openGraph: {
    title: 'OpenClaws — Connect All Your Tools',
    description: 'Your own 24/7 AI assistant with 1000+ integrations. Deploy in under 1 minute.',
    type: 'website',
    url: 'https://openclaws.biz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenClaws — Connect All Your Tools',
    description: 'Your own 24/7 AI assistant with 1000+ integrations.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
