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
  themeColor: '#051f18',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen w-full overflow-x-hidden bg-[#051f18]">
        {children}
      </body>
    </html>
  );
}
