/* ============================================================
   @repo/ui primitives — Szef Donald customer web
   ============================================================ */

const { useState, useEffect, useRef, useCallback } = React;

/* ---------- Container ---------- */
const Container = ({ size = "default", children, className = "", ...props }) => (
  <div className={`container ${size === "narrow" ? "container--narrow" : size === "wide" ? "container--wide" : ""} ${className}`} {...props}>
    {children}
  </div>
);

/* ---------- LanguageSwitcher ---------- */
const LanguageSwitcher = ({ value, onChange, invert = false }) => (
  <div className="lang-switch" role="group" aria-label="Language">
    {["PL", "EN"].map(l => (
      <button
        key={l}
        className="lang-switch__btn"
        aria-pressed={value === l}
        onClick={() => onChange(l)}
      >{l}</button>
    ))}
  </div>
);

/* ---------- CartButton ---------- */
const CartButton = ({ count = 0, onClick }) => (
  <button className="cart-btn" onClick={onClick} aria-label={`Cart, ${count} items`}>
    <Icon name="bag" size={22} />
    {count > 0 && <span className="cart-bubble" aria-hidden="true">{count}</span>}
  </button>
);

/* ---------- SiteNav ---------- */
const SiteNav = ({ logo, links, rightSlot, variant = "transparent", onOpenMobile }) => (
  <header className={`site-nav ${variant === "solid" ? "site-nav--solid" : ""}`}>
    <Container className="site-nav__inner">
      <a href="#top" aria-label="Szef Donald home">{logo}</a>
      <nav className="site-nav__links" aria-label="Primary">
        {links.map(l => (
          <a key={l.href} href={l.href} className={`site-nav__link ${l.active ? "site-nav__link--active" : ""}`}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="site-nav__right">
        {rightSlot}
        <button className="hamburger" aria-label="Open menu" onClick={onOpenMobile}>
          <Icon name="menu" size={22} />
        </button>
      </div>
    </Container>
  </header>
);

/* ---------- SectionHeader ---------- */
const SectionHeader = ({ eyebrow, title, description, align = "left", action, id }) => (
  <div className={`section-header ${align === "center" ? "section-header--center" : ""}`}>
    <div className="section-header__main">
      {eyebrow && <span className="t-eyebrow section-header__eyebrow">{eyebrow}</span>}
      <h2 id={id} className="t-h1" style={{ margin: 0, textWrap: "balance" }}>{title}</h2>
      {description && <p className="t-body-l section-header__desc" style={{ margin: 0 }}>{description}</p>}
    </div>
    {action && (
      <a href={action.href} className="link-cta" style={{ flexShrink: 0 }}>
        {action.label} <Icon name="arrowRight" size={16} />
      </a>
    )}
  </div>
);

/* ---------- Hero ---------- */
const Hero = ({ eyebrow, title, description, primaryCta, secondaryCta, media, decoration, rating }) => (
  <section className="hero" id="top">
    {/* decorative hexagon */}
    <svg className="hero__deco" viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="currentColor"/>
    </svg>
    <Container className="hero__inner">
      <div className="hero__text reveal">
        {eyebrow && <span className="t-eyebrow">{eyebrow}</span>}
        <h1 className="t-hero hero__title">{title}</h1>
        {description && <p className="t-body-l hero__desc">{description}</p>}
        <div className="hero__ctas">
          {primaryCta && (
            <a href={primaryCta.href} className="btn btn--primary btn--lg">
              {primaryCta.label} <Icon name="arrowRight" size={18} />
            </a>
          )}
          {secondaryCta && (
            <a href={secondaryCta.href} className="btn btn--ghost btn--lg">
              {secondaryCta.label}
            </a>
          )}
        </div>
        {rating && (
          <div className="hero__rating">
            <Stars rating={rating.value} />
            <span className="hero__rating-num">{rating.value.toFixed(1)}</span>
            <span className="hero__rating-dot" aria-hidden="true"/>
            <span className="t-small t-tertiary">Based on {rating.count.toLocaleString()} Google reviews</span>
          </div>
        )}
      </div>
      <div className="hero__media reveal">
        {media}
        {decoration}
      </div>
    </Container>
  </section>
);

/* ---------- CategoryCard ---------- */
const CategoryCard = ({ href, image, label, itemCount }) => (
  <a className="cat-card" href={href}>
    <img className="cat-card__img" src={image.src} alt={image.alt} loading="lazy"/>
    <div className="cat-card__overlay"/>
    <div className="cat-card__label">
      <div className="cat-card__title">{label}</div>
      {itemCount != null && <div className="cat-card__count">{itemCount} items</div>}
    </div>
  </a>
);

/* ---------- DishCard ---------- */
const FLAG_META = {
  vegetarian:    { label: "V", cls: "flag-chip--positive", title: "Vegetarian" },
  vegan:         { label: "Vegan", cls: "flag-chip--positive", title: "Vegan" },
  "gluten-free": { label: "GF", cls: "flag-chip--info", title: "Gluten-free" },
  spicy:         { label: "Spicy", cls: "flag-chip--warning", title: "Spicy", icon: "chili" },
  featured:      { label: "Featured", cls: "flag-chip--accent", title: "Featured" },
};

const DishCard = ({ href, image, name, description, price, flags = [], onAdd, unavailable }) => {
  const [loading, setLoading] = useState(false);

  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    if (onAdd) {
      await Promise.resolve(onAdd());
    }
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
  }, [onAdd]);

  return (
    <a className="dish-card" href={href}>
      <div className="dish-card__media">
        <img className="dish-card__img" src={image.src} alt={image.alt} loading="lazy"/>
      </div>
      <div className="dish-card__body">
        {flags.length > 0 && (
          <div className="dish-card__flags">
            {flags.map(f => {
              const m = FLAG_META[f] || { label: f, cls: "" };
              return (
                <span key={f} className={`flag-chip ${m.cls}`} title={m.title}>
                  {m.icon && <Icon name={m.icon} size={11} stroke={2}/>}
                  {m.label}
                </span>
              );
            })}
          </div>
        )}
        <h3 className="t-h3 dish-card__name">{name}</h3>
        {description && <p className="dish-card__desc" style={{ margin: 0 }}>{description}</p>}
        <div className="dish-card__foot">
          <span className="t-price">{formatMoney(price.amount, price.currency)}</span>
          {onAdd && !unavailable && (
            <button
              className={`dish-add ${loading ? "dish-add--loading" : ""}`}
              aria-label={`Add ${name} to cart`}
              onClick={handleAdd}
            >
              {loading ? <span className="spinner" /> : <Icon name="plus" size={18} stroke={2.4}/>}
            </button>
          )}
        </div>
      </div>
    </a>
  );
};

/* ---------- TestimonialCard ---------- */
const TestimonialCard = ({ quote, author, rating, source }) => (
  <article className="testi-card">
    <Stars rating={rating} size={16}/>
    <p className="testi-card__quote" style={{ margin: 0 }}>"{quote}"</p>
    <div className="testi-card__foot">
      <span className="avatar" aria-hidden="true">{author.name.charAt(0)}</span>
      <div className="testi-card__author">
        <span className="testi-card__name">{author.name}</span>
        {author.meta && <span className="testi-card__meta">{author.meta}</span>}
      </div>
      {source === "google" && (
        <span className="source-pill"><Icon name="google" size={12} stroke={0}/> Google</span>
      )}
      {source && source !== "google" && (
        <span className="source-pill">{source.charAt(0).toUpperCase() + source.slice(1)}</span>
      )}
    </div>
  </article>
);

/* ---------- HoursTable ---------- */
const DAY_LABEL = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
const DAY_JS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

const HoursTable = ({ hours, highlightToday = true, layout = "list" }) => {
  const todayKey = DAY_JS[new Date().getDay()];

  if (layout === "compact") {
    // Group consecutive matching ranges
    const groups = [];
    hours.forEach((row) => {
      const last = groups[groups.length - 1];
      const sig = row.closed ? "closed" : `${row.open}-${row.close}`;
      if (last && last.sig === sig) {
        last.endDay = row.day;
      } else {
        groups.push({ sig, startDay: row.day, endDay: row.day, ...row });
      }
    });
    return (
      <div className="footer-compact-hours">
        {groups.map((g, i) => (
          <div key={i}>
            <span>{g.startDay === g.endDay ? DAY_LABEL[g.startDay] : `${DAY_LABEL[g.startDay]}–${DAY_LABEL[g.endDay]}`}</span>
            <span>{g.closed ? "Closed" : `${g.open}–${g.close}`}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className="hours-table">
      <tbody>
        {hours.map(row => {
          const isToday = highlightToday && row.day === todayKey;
          return (
            <tr key={row.day} className={isToday ? "today" : ""} aria-current={isToday ? "date" : undefined}>
              <td>{DAY_LABEL[row.day]}</td>
              <td>
                {row.closed
                  ? <span className="closed">Closed</span>
                  : `${row.open}–${row.close}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

/* ---------- NewsletterForm ---------- */
const NewsletterForm = ({ placeholder = "Your email", ctaLabel = "Subscribe", onSubmit, successMessage = "Welcome! Check your inbox for the code." }) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      await onSubmit(email);
      setState("success");
    } catch {
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="newsletter__success">
        <span className="check-icon"><Icon name="check" size={18} stroke={2.6}/></span>
        <span className="t-body" style={{ fontWeight: 500 }}>{successMessage}</span>
      </div>
    );
  }

  return (
    <form className="newsletter__form" onSubmit={handleSubmit} noValidate>
      <input
        className="newsletter__input"
        type="email"
        placeholder={placeholder}
        value={email}
        onChange={e => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
        aria-label="Email address"
        required
      />
      <button type="submit" className="newsletter__btn" disabled={state === "loading"}>
        {state === "loading" ? "…" : ctaLabel}
      </button>
    </form>
  );
};

Object.assign(window, {
  Container, LanguageSwitcher, CartButton, SiteNav, SectionHeader,
  Hero, CategoryCard, DishCard, TestimonialCard, HoursTable, NewsletterForm,
});
