import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'OpenClaws — Connect All Your Tools',
  description: 'Your own 24/7 AI assistant with 1000+ integrations. Deploy in under 1 minute.',
  icons: { icon: '/openclaw.png' },
  metadataBase: new URL('https://openclaws.biz'),
  openGraph: {
    title: 'OpenClaws — Connect All Your Tools',
    description: 'Your own 24/7 AI assistant with 1000+ integrations. Deploy in under 1 minute.',
    type: 'website',
    url: 'https://openclaws.biz',
  },
  twitter: {
    card: 'summary',
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
