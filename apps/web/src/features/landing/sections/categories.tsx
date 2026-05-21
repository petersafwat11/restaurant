import { mockCategories } from '@/lib/mock/szef-donald';
import { CategoryCard, Container, SectionHeader } from '@repo/ui';

export function LandingCategories() {
  return (
    <section aria-labelledby="cats-h" className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <SectionHeader
          id="cats-h"
          eyebrow="Explore"
          title="What we serve"
          action={{ label: 'View full menu', href: '/menu' }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {mockCategories.map((c) => (
            <CategoryCard
              key={c.slug}
              href={`/menu#${c.slug}`}
              image={{ src: c.image, alt: `${c.label} category` }}
              label={c.label}
              itemCount={c.itemCount}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
