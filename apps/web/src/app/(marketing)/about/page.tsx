import { Container, SectionHeader } from '@repo/ui';

export default function AboutPage() {
  return (
    <>
      <section className="bg-bg pt-section-y-mobile sm:pt-section-y">
        <Container>
          <SectionHeader
            eyebrow="Our story"
            title="Kebab the way it should be."
            description="We opened Szef Donald in 2014 with one rule: nothing comes out of a freezer."
            align="center"
          />
        </Container>
      </section>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-image-lg bg-surface-warm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1100&q=85"
                alt="Cook turning meat on the grill"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-4 text-body-l text-fg">
              <p>
                Bread is baked through the day. Falafel is rolled by hand every morning. Meat is
                marinated for eighteen hours before it touches the grill.
              </p>
              <p className="text-fg-muted">
                We're a small team — three cooks and a counter — and we keep it that way on purpose.
                Every wrap is made by someone who's been here long enough to care.
              </p>
              <p className="text-fg-muted">
                Eleven years on, we're still in the same spot on Marszałkowska, still slicing the
                same way, still arguing over the sauce.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { label: '11 years', sub: 'Open since 2014' },
              { label: '~1,200 / week', sub: 'Wraps in high season' },
              { label: '4.8', sub: 'Average across 1,247 reviews' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-1 rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 text-center"
              >
                <span className="font-display text-[40px] font-medium text-fg">{s.label}</span>
                <span className="text-small text-fg-muted">{s.sub}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
