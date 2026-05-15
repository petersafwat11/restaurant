import './globals.css';
import { AppProviders } from '@/providers/app-providers';

// TODO(ui): apply real <head>/metadata in design-system sprint
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
