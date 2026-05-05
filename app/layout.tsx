import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'NDS Art Resizer',
  description: 'Ridimensiona immagini e scarica copertine per Nintendo DS da GameTDB',
  openGraph: {
    title: 'NDS Art Resizer',
    description: 'Ridimensiona immagini e scarica copertine per Nintendo DS da GameTDB',
    siteName: 'NDS Art Resizer',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NDS Art Resizer',
    description: 'Ridimensiona immagini e scarica copertine per Nintendo DS',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
