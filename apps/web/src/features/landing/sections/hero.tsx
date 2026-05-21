import { Logo } from '@/components/logo';
import { Hero, Stars } from '@repo/ui';

export function LandingHero() {
  return (
    <Hero
      eyebrow="Kebab · Falafel · Tacos · Since 2014"
      title={
        <>
          Real kebab.
          <br />
          <em className="font-display italic text-accent">Made daily</em>
          <br />
          from scratch.
        </>
      }
      description="Hand-rolled falafel, marinated overnight. Bread baked through the day. Take-away or eat in — every order is built to order."
      primaryCta={{ label: 'View the menu', href: '/menu' }}
      secondaryCta={{ label: 'Order now', href: '/menu' }}
      rating={{
        value: 4.8,
        count: 1247,
        renderStars: (v) => <Stars value={v} size={16} />,
      }}
      media={
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-image-lg bg-surface-warm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1633321702518-7feccafb94d5?auto=format&fit=crop&w=1400&q=85"
            alt="Overhead shot of a freshly wrapped kebab on warm cream paper, lit from above"
            className="h-full w-full object-cover"
          />
        </div>
      }
      decoration={
        <>
          <div className="absolute -left-4 -top-4 flex items-center gap-2 rounded-card bg-surface-elevated px-3 py-2 shadow-md">
            <span className="relative grid h-2 w-2 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-positive" />
            </span>
            <div className="leading-tight">
              <div className="text-small font-semibold text-fg">Open now</div>
              <div className="text-[12px] text-fg-subtle">Closes at 22:00</div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 flex items-center gap-2 rounded-card bg-surface-elevated px-3 py-2 shadow-md">
            <Logo variant="mark" size={32} />
            <div className="leading-tight">
              <div className="font-display text-small font-medium text-fg">Szef Donald</div>
              <div className="text-[12px] text-fg-subtle">Warszawa Centrum</div>
            </div>
          </div>
        </>
      }
    />
  );
}
