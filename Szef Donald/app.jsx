/* ============================================================
   App composition
   ============================================================ */

const { useState: uState, useEffect: uEffect, useRef: uRef, useCallback: uCb } = React;

/* ---------- Toast manager ---------- */
const ToastStack = ({ toasts, onUndo, onDismiss }) => (
  <div className="toast-wrap" aria-live="polite" aria-atomic="false">
    {toasts.map(t => (
      <div key={t.id} className={`toast ${t.exiting ? "toast--exit" : ""}`}>
        <span className="toast__dot"><Icon name="check" size={16} stroke={2.6}/></span>
        <span className="toast__msg">
          <strong>Added to cart</strong>
          <div className="t-small t-tertiary" style={{ marginTop: 2 }}>
            1 × {t.dish.name}
          </div>
        </span>
        <button className="toast__undo" onClick={() => onUndo(t.id)}>Undo</button>
      </div>
    ))}
  </div>
);

/* ---------- Mobile menu ---------- */
const MobileMenu = ({ open, onClose, lang, setLang }) => {
  if (!open) return null;
  return (
    <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile menu">
      <div className="mobile-menu__top">
        <Logo size={36}/>
        <button className="cart-btn" onClick={onClose} aria-label="Close menu">
          <Icon name="close" size={22}/>
        </button>
      </div>
      <nav className="mobile-menu__links">
        <a className="mobile-menu__link" href="Szef Donald — Menu.html" onClick={onClose}>Menu</a>
        <a className="mobile-menu__link" href="#about" onClick={onClose}>About</a>
        <a className="mobile-menu__link" href="#locations" onClick={onClose}>Locations</a>
        <a className="mobile-menu__link" href="#contact" onClick={onClose}>Contact</a>
      </nav>
      <div className="mobile-menu__bottom">
        <LanguageSwitcher value={lang} onChange={setLang}/>
        <a href="#featured" className="btn btn--primary btn--lg" style={{ width: "100%" }} onClick={onClose}>
          Order now <Icon name="arrowRight" size={18}/>
        </a>
      </div>
    </div>
  );
};

/* ---------- App ---------- */
const App = () => {
  const [scrolled, setScrolled] = uState(false);
  const [cartCount, setCartCount] = uState(0);
  const [lang, setLang] = uState("EN");
  const [toasts, setToasts] = uState([]);
  const [mobileOpen, setMobileOpen] = uState(false);
  const toastIdRef = uRef(0);

  // Scroll state for nav
  uEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal on scroll (with a guaranteed fallback so content always becomes visible)
  uEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    // Anything that's already in the initial viewport — mark visible BEFORE
    // we opt into the hidden state, so it never flashes.
    const vh = window.innerHeight || 800;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.95) el.classList.add("is-in");
    });
    // Now switch on the hidden-until-revealed CSS — only below-fold items
    // will actually be hidden.
    document.documentElement.classList.add("js-ready");

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });
    els.forEach(el => { if (!el.classList.contains("is-in")) io.observe(el); });
    // Final safety net — if anything is still hidden after 1.2s, reveal it
    const fallback = setTimeout(() => {
      document.querySelectorAll(".reveal:not(.is-in)").forEach(el => el.classList.add("is-in"));
    }, 1200);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  const showToast = uCb((dish) => {
    const id = ++toastIdRef.current;
    setToasts(ts => [...ts, { id, dish, exiting: false }]);
    setTimeout(() => {
      setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 240);
    }, 3200);
  }, []);

  const handleAdd = uCb((dish) => {
    setCartCount(c => c + 1);
    showToast(dish);
  }, [showToast]);

  const handleUndo = uCb((id) => {
    setCartCount(c => Math.max(0, c - 1));
    setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 240);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>

      <SiteNav
        variant={scrolled ? "solid" : "transparent"}
        logo={<Logo size={36}/>}
        links={[
          { href: "Szef Donald — Menu.html", label: "Menu", active: false },
          { href: "#about", label: "About" },
          { href: "#locations", label: "Locations" },
          { href: "#contact", label: "Contact" },
        ]}
        rightSlot={<>
          <LanguageSwitcher value={lang} onChange={setLang}/>
          <CartButton count={cartCount}/>
          <a href="#featured" className="btn btn--primary btn--sm" style={{ height: 40 }}>
            Order now
          </a>
        </>}
        onOpenMobile={() => setMobileOpen(true)}
      />

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} lang={lang} setLang={setLang}/>

      <main id="main">
        <HeroSection/>
        <CategoriesSection/>
        <FeaturedSection onAdd={handleAdd}/>
        <StorySection/>
        <HoursLocationSection/>
        <TestimonialsSection/>
        <NewsletterSection/>
      </main>

      <SiteFooter lang={lang} setLang={setLang}/>

      <ToastStack toasts={toasts} onUndo={handleUndo}/>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
