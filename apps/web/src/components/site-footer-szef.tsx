import { Logo } from '@/components/logo';
import { mockHours, mockLocation } from '@/lib/mock/szef-donald';
import { HoursTable, SiteFooter } from '@repo/ui';
import { Facebook, Instagram } from 'lucide-react';
import Link from 'next/link';

/**
 * Brand-bound SiteFooter — Szef Donald copy and the operating hours pulled
 * from the local mock. Wraps the theme-agnostic `<SiteFooter>` primitive.
 */
export function SzefSiteFooter() {
  return (
    <SiteFooter
      brandSlot={
        <div className="flex flex-col gap-4">
          <Logo variant="inverse" size={40} />
          <p className="text-body text-surface/80">Kebab the way it should be.</p>
          <div className="flex items-center gap-3">
            <Link
              href="#"
              aria-label="Instagram"
              className="text-surface/60 transition-colors hover:text-accent"
            >
              <Instagram size={20} strokeWidth={1.5} />
            </Link>
            <Link
              href="#"
              aria-label="Facebook"
              className="text-surface/60 transition-colors hover:text-accent"
            >
              <Facebook size={20} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      }
      columns={[
        {
          heading: 'Menu',
          body: (
            <>
              <Link href="/menu#kebab" className="hover:text-accent">
                Kebab
              </Link>
              <Link href="/menu#falafel" className="hover:text-accent">
                Falafel
              </Link>
              <Link href="/menu#tacos" className="hover:text-accent">
                Tacos
              </Link>
              <Link href="/menu#box" className="hover:text-accent">
                Box & Plates
              </Link>
              <Link href="/menu#drinks" className="hover:text-accent">
                Drinks
              </Link>
              <Link href="/menu" className="text-accent hover:underline">
                View full menu →
              </Link>
            </>
          ),
        },
        {
          heading: 'Visit',
          body: (
            <>
              <div className="flex flex-col leading-relaxed text-surface/80">
                <span className="font-semibold text-surface">{mockLocation.address1}</span>
                <span>{mockLocation.address2}</span>
              </div>
              <Link
                href={`tel:${mockLocation.phone.replace(/\s/g, '')}`}
                className="hover:text-accent"
              >
                {mockLocation.phone}
              </Link>
              <div className="mt-2 text-surface/80">
                <HoursTable hours={mockHours} layout="compact" highlightToday={false} />
              </div>
            </>
          ),
        },
        {
          heading: 'Company',
          body: (
            <>
              <Link href="/about" className="hover:text-accent">
                About
              </Link>
              <Link href="/contact" className="hover:text-accent">
                Contact
              </Link>
              <Link href="/account/loyalty" className="hover:text-accent">
                Loyalty
              </Link>
              <Link href="/account/referrals" className="hover:text-accent">
                Referrals
              </Link>
            </>
          ),
        },
      ]}
      bottom={{
        copyright: '© 2026 Szef Donald sp. z o.o. · NIP 1234567890',
        legal: [
          { href: '#', label: 'Privacy' },
          { href: '#', label: 'Terms' },
          { href: '#', label: 'Cookies' },
        ],
      }}
    />
  );
}
