/* ============================================================
   Landing sections + Site footer
   ============================================================ */

/* ---------- Hero section ---------- */
const HeroSection = () => (
  <Hero
    eyebrow="Kebab · Falafel · Tacos · Since 2014"
    title={<>Real kebab.<br/><em>Made daily</em><br/>from scratch.</>}
    description="Hand-rolled falafel, marinated overnight. Bread baked through the day. Take-away or eat in — every order is built to order."
    primaryCta={{ label: "View the menu", href: "Szef Donald — Menu.html" }}
    secondaryCta={{ label: "Order now", href: "#featured" }}
    rating={{ value: 4.8, count: 1247 }}
    media={
      <img
        className="hero__media-img"
        src="https://images.unsplash.com/photo-1633321702518-7feccafb94d5?auto=format&fit=crop&w=1400&q=85"
        alt="Overhead shot of a freshly wrapped kebab on warm cream paper, lit from above"
      />
    }
    decoration={<>
      <div className="hero__chip hero__chip--tl">
        <span className="dot-pulse"/>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>Open now</div>
          <div className="t-small t-tertiary" style={{ marginTop: 2 }}>Closes at 22:00</div>
        </div>
      </div>
      <div className="hero__chip hero__chip--br">
        <Logo variant="mark" size={36}/>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500, lineHeight: 1.1 }}>Szef Donald</div>
          <div className="t-small t-tertiary" style={{ marginTop: 2 }}>Warszawa Centrum</div>
        </div>
      </div>
    </>}
  />
);

/* ---------- Categories ---------- */
const CategoriesSection = () => (
  <section className="section section--bg" aria-labelledby="cats-h" style={{ paddingTop: 96, paddingBottom: 64 }}>
    <Container>
      <SectionHeader
        id="cats-h"
        eyebrow="Explore"
        title="What we serve"
        action={{ label: "View full menu", href: "Szef Donald — Menu.html" }}
      />
      <div className="cat-grid">
        {mockCategories.map(c => (
          <CategoryCard
            key={c.slug}
            href={`/menu/${c.slug}`}
            image={{ src: c.image, alt: `${c.label} category` }}
            label={c.label}
            itemCount={c.itemCount}
          />
        ))}
      </div>
    </Container>
  </section>
);

/* ---------- Featured dishes ---------- */
const FeaturedSection = ({ onAdd }) => (
  <section className="section section--surface" aria-labelledby="featured-h" id="featured">
    <Container>
      <SectionHeader
        id="featured-h"
        eyebrow="Most loved"
        title="Our customers' favourites"
        description="The ten things people order over and over."
        action={{ label: "See all 47 dishes", href: "Szef Donald — Menu.html" }}
      />
      <div className="dish-grid">
        {mockFeaturedDishes.map(d => (
          <DishCard
            key={d.href}
            href={d.href}
            image={d.image}
            name={d.name}
            description={d.description}
            price={d.price}
            flags={d.flags}
            onAdd={() => onAdd(d)}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 56 }}>
        <a href="Szef Donald — Menu.html" className="btn btn--ghost btn--lg">
          View the full menu <Icon name="arrowRight" size={18}/>
        </a>
      </div>
    </Container>
  </section>
);

/* ---------- Story ---------- */
const StorySection = () => (
  <section className="section section--bg" aria-labelledby="story-h">
    <Container>
      <div className="story">
        <div className="story__text">
          <span className="t-eyebrow">Our story</span>
          <h2 id="story-h" className="t-h1 story__title" style={{ textWrap: "balance" }}>
            Kebab the way<br/>it should be.
          </h2>
          <p className="t-body-l story__p">
            We opened Szef Donald in 2014 with one rule: nothing comes out of a freezer. Bread is baked through the day. Falafel is rolled by hand every morning. Meat is marinated for eighteen hours before it touches the grill.
          </p>
          <p className="t-body-l story__p t-secondary">
            We're a small team — three cooks and a counter — and we keep it that way on purpose. Every wrap is made by someone who's been here long enough to care.
          </p>
          <a href="#about" className="link-cta" style={{ marginTop: 12 }}>
            Read our full story <Icon name="arrowRight" size={16}/>
          </a>
        </div>
        <div className="story__media">
          <img
            className="story__img"
            src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1100&q=85"
            alt="Cook turning meat on the grill, warm light"
          />
          <div className="story__stats">
            <div>
              <div className="story__stat-num">11 years</div>
              <div className="story__stat-label">Open since 2014</div>
            </div>
            <div className="story__stat-divider"/>
            <div>
              <div className="story__stat-num">~1,200<span style={{ fontSize: 18 }}> /wk</span></div>
              <div className="story__stat-label">Wraps served in high season</div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  </section>
);

/* ---------- Hours + Location ---------- */
const MapPlaceholder = () => (
  <div className="map-frame" role="img" aria-label="Map showing Szef Donald on Marszałkowska 102, Warsaw">
    <svg className="streets" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="streetGrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M0 24 H48 M24 0 V48" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" fill="none"/>
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#streetGrid)"/>
      {/* primary roads */}
      <path d="M0 130 Q 120 110 200 140 T 400 160" stroke="rgba(255,255,255,0.85)" strokeWidth="6" fill="none"/>
      <path d="M210 0 Q 200 120 220 200 T 250 300" stroke="rgba(255,255,255,0.85)" strokeWidth="6" fill="none"/>
      <path d="M0 60 L 400 50" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" fill="none"/>
      <path d="M40 0 L 60 300" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" fill="none"/>
      <path d="M340 0 L 360 300" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" fill="none"/>
      {/* park */}
      <ellipse cx="100" cy="220" rx="55" ry="32" fill="rgb(79 123 60 / 0.35)"/>
      <ellipse cx="320" cy="80" rx="40" ry="22" fill="rgb(79 123 60 / 0.3)"/>
      {/* block tints */}
      <rect x="65" y="65" width="140" height="60" fill="rgb(42 31 24 / 0.04)"/>
      <rect x="230" y="170" width="100" height="80" fill="rgb(42 31 24 / 0.04)"/>
    </svg>
    <div className="map-pin">
      <div className="map-pin__pulse"/>
      <svg width="44" height="56" viewBox="0 0 44 56" aria-hidden="true">
        <path d="M22 0c-12 0-22 9-22 21 0 16 22 35 22 35S44 37 44 21C44 9 34 0 22 0Z" fill="rgb(var(--accent))" />
        <circle cx="22" cy="20" r="7" fill="white"/>
        <circle cx="22" cy="20" r="3" fill="rgb(var(--accent))"/>
      </svg>
    </div>
    <div style={{
      position: "absolute", left: 16, top: 16,
      background: "white", padding: "6px 12px", borderRadius: 8,
      fontSize: 12, fontWeight: 500, color: "rgb(var(--text-primary))",
      boxShadow: "var(--shadow-sm)"
    }}>
      Marszałkowska 102
    </div>
  </div>
);

const HoursLocationSection = () => (
  <section className="section section--surface" aria-labelledby="findus-h">
    <Container>
      <div className="hours-loc">
        <div>
          <SectionHeader id="findus-h" eyebrow="Find us" title="Open seven days." />
          <div className="address-block">
            <div className="address-line-1">{mockLocation.address1}</div>
            <div className="address-line-2 t-body">{mockLocation.address2}</div>
            <a className="address-phone t-body" href={`tel:${mockLocation.phone.replace(/\s/g, "")}`}>
              {mockLocation.phone}
            </a>
          </div>
          <div className="action-row">
            <a className="action-pill" href="#"><Icon name="nav" size={14}/> Get directions</a>
            <a className="action-pill" href={`tel:${mockLocation.phone.replace(/\s/g, "")}`}><Icon name="phone" size={14}/> Call us</a>
            <a className="action-pill" href="#"><Icon name="share" size={14}/> Share location</a>
          </div>
          <HoursTable hours={mockHours} highlightToday layout="list"/>
        </div>
        <div>
          <MapPlaceholder/>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <a href="#" className="link-cta">View larger map <Icon name="arrowUpRight" size={14}/></a>
          </div>
        </div>
      </div>
    </Container>
  </section>
);

/* ---------- Testimonials ---------- */
const TestimonialsSection = () => (
  <section className="section section--bg" aria-labelledby="reviews-h">
    <Container>
      <SectionHeader
        id="reviews-h"
        eyebrow="Reviews"
        title="Trusted by thousands."
        description="4.8 average rating across 1,247 reviews on Google."
        align="center"
      />
      <div className="testi-grid">
        {mockTestimonials.slice(0, 3).map((t, i) => (
          <TestimonialCard key={i} {...t}/>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <a href="#" className="link-cta">
          Read all 1,247 reviews on Google <Icon name="arrowUpRight" size={14}/>
        </a>
      </div>
    </Container>
  </section>
);

/* ---------- Newsletter ---------- */
const NewsletterSection = () => (
  <section className="newsletter" aria-labelledby="nl-h">
    <Container>
      <SectionHeader
        id="nl-h"
        eyebrow="Stay in touch"
        title="Get a free baklava on your first order."
        description="Join the list — occasional emails, never spam. Unsubscribe whenever."
        align="center"
      />
      <NewsletterForm
        onSubmit={async () => { await new Promise(r => setTimeout(r, 600)); }}
      />
    </Container>
  </section>
);

/* ---------- Footer ---------- */
const SiteFooter = ({ lang, setLang }) => (
  <footer className="site-footer">
    <Container>
      <div className="site-footer__grid">
        <div>
          <Logo variant="inverse" size={40}/>
          <p className="footer-tagline t-body">Kebab the way it should be.</p>
          <div className="footer-socials">
            <a className="footer-social" href="#" aria-label="Instagram"><Icon name="instagram" size={18}/></a>
            <a className="footer-social" href="#" aria-label="Facebook"><Icon name="facebook" size={18}/></a>
            <a className="footer-social" href="#" aria-label="TikTok"><Icon name="tiktok" size={18}/></a>
          </div>
        </div>
        <div>
          <span className="t-caption">Menu</span>
          <div className="footer-links">
            <a className="footer-link" href="#">Kebab</a>
            <a className="footer-link" href="#">Falafel</a>
            <a className="footer-link" href="#">Tacos</a>
            <a className="footer-link" href="#">Box & Plates</a>
            <a className="footer-link" href="#">Drinks</a>
            <a className="footer-link" href="#" style={{ color: "rgb(var(--accent))" }}>View full menu →</a>
          </div>
        </div>
        <div>
          <span className="t-caption">Visit</span>
          <div className="footer-links">
            <div style={{ color: "rgb(var(--surface) / 0.85)", fontSize: 15, lineHeight: 1.55 }}>
              <div style={{ fontWeight: 600 }}>{mockLocation.address1}</div>
              <div style={{ color: "rgb(var(--surface) / 0.7)" }}>{mockLocation.address2}</div>
            </div>
            <a className="footer-link" href={`tel:${mockLocation.phone.replace(/\s/g, "")}`}>{mockLocation.phone}</a>
          </div>
          <div style={{ marginTop: 20 }}>
            <HoursTable hours={mockHours} layout="compact" highlightToday={false}/>
          </div>
        </div>
        <div>
          <span className="t-caption">Company</span>
          <div className="footer-links">
            <a className="footer-link" href="#about">About</a>
            <a className="footer-link" href="#">Careers</a>
            <a className="footer-link" href="#">Press</a>
            <a className="footer-link" href="#">Contact</a>
            <a className="footer-link" href="#">Loyalty</a>
            <a className="footer-link" href="#">Gift cards</a>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <div>© 2026 Szef Donald sp. z o.o. · NIP 1234567890</div>
        <div className="site-footer__legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Cookies</a>
        </div>
        <LanguageSwitcher value={lang} onChange={setLang}/>
      </div>
    </Container>
  </footer>
);

Object.assign(window, {
  HeroSection, CategoriesSection, FeaturedSection, StorySection,
  HoursLocationSection, TestimonialsSection, NewsletterSection, SiteFooter
});
