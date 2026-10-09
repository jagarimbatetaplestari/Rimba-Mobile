import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rimba — Digital Garden & Focus World',
  description: 'Cultivate your calm diorama garden with mindful focus sessions.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rimba',
  },
  icons: {
    icon: '/logo-web.webp',
    apple: '/logo-web.webp',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#165643',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full overflow-hidden">
      <body className="antialiased fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none bg-[#165643]">
        {children}
      </body>
    </html>
  );
}
