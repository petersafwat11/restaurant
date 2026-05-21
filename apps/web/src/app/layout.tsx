import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/providers/app-providers';

/**
 * Brand display family: Fraunces (variable, optical-size aware).
 * Used on hero, h1–h2, prices.
 */
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-display',
  axes: ['opsz'],
  // Variable font: use `weight: 'variable'` so axes work alongside it.
  weight: 'variable',
});

/**
 * Body family: Inter (variable, with stylistic set 01 for friendlier digits).
 */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'Szef Donald — Real kebab. Made daily.',
  description:
    'Kebab, falafel and tacos made fresh through the day. Order online for delivery, pickup, or eat in.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-bg text-fg antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
