/* ============================================================
   Menu page — app composition + cart store
   ============================================================ */

const { useState: zS, useEffect: zE, useRef: zR, useCallback: zC, useMemo: zM } = React;

/* ---------- Cart store (localStorage-backed) ---------- */
const CART_KEY = "szef-donald-cart";

const useCartStore = () => {
  const [lines, setLines] = zS(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [notes, setNotes] = zS("");

  zE(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch {}
  }, [lines]);

  const addLine = zC((newLine) => {
    const id = `cl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setLines(prev => [...prev, { id, ...newLine }]);
  }, []);
  const updateQty = zC((id, qty) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, quantity: Math.max(1, qty) } : l));
  }, []);
  const removeLine = zC((id) => {
    setLines(prev => prev.filter(l => l.id !== id));
  }, []);
  const clear = zC(() => setLines([]), []);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return { lines, addLine, updateQty, removeLine, clear, itemCount, subtotal, notes, setNotes };
};

/* ---------- Toast manager (top-right) ---------- */
const useToasts = () => {
  const [toasts, setToasts] = zS([]);
  const idRef = zR(0);
  const lastUndoRef = zR(null);
  const show = zC((dish, qty = 1, onUndo) => {
    const id = ++idRef.current;
    lastUndoRef.current = onUndo;
    setToasts(ts => [...ts, { id, dish, qty, exiting: false }]);
    setTimeout(() => {
      setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 240);
    }, 4200);
  }, []);
  const undo = zC((id) => {
    lastUndoRef.current?.();
    setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 240);
  }, []);
  return { toasts, show, undo };
};

const ToastStack = ({ toasts, onUndo }) => (
  <div className="toast-wrap" aria-live="polite">
    {toasts.map(t => (
      <div key={t.id} className={`toast ${t.exiting ? "toast--exit" : ""}`}>
        <span className="toast__dot"><Icon name="check" size={16} stroke={2.6}/></span>
        <span className="toast__msg">
          <strong>Added to cart</strong>
          <div className="t-small t-tertiary" style={{ marginTop: 2 }}>
            {t.qty} × {t.dish.name}
          </div>
        </span>
        <button className="toast__undo" onClick={() => onUndo(t.id)}>Undo</button>
      </div>
    ))}
  </div>
);

/* ---------- Mobile menu (re-used from landing) ---------- */
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
        <a className="mobile-menu__link" href="Szef Donald — Landing.html#about" onClick={onClose}>About</a>
        <a className="mobile-menu__link" href="Szef Donald — Landing.html#locations" onClick={onClose}>Locations</a>
        <a className="mobile-menu__link" href="Szef Donald — Landing.html#contact" onClick={onClose}>Contact</a>
      </nav>
      <div className="mobile-menu__bottom">
        <LanguageSwitcher value={lang} onChange={setLang}/>
      </div>
    </div>
  );
};

/* ---------- Filter logic ---------- */
const matchesFilters = (dish, filters) => {
  if (filters.length === 0 || filters.includes("all")) return true;
  // Spicy must explicitly match a 'spicy' flag; dietary filters must all be satisfied.
  return filters.every(f => dish.flags?.includes(f));
};
const matchesSearch = (dish, q) => {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  return (
    dish.name.toLowerCase().includes(needle) ||
    dish.description?.toLowerCase().includes(needle) ||
    dish.categoryId.toLowerCase().includes(needle)
  );
};

/* ---------- Main App ---------- */
const MenuApp = () => {
  const cart = useCartStore();
  const toasts = useToasts();
  const [scrolled, setScrolled] = zS(false);
  const [stickyOn, setStickyOn] = zS(false);
  const [lang, setLang] = zS("EN");
  const [mobileOpen, setMobileOpen] = zS(false);

  const [search, setSearch] = zS("");
  const [filters, setFilters] = zS(["all"]);
  const [activeCat, setActiveCat] = zS("all");
  const [sheetItem, setSheetItem] = zS(null);
  const [cartOpen, setCartOpen] = zS(false);

  const stuckRowRef = zR(null);
  const subnavRef = zR(null);

  // scroll-based UI states
  zE(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      // sticky shadow when actually at top:0 from offset
      if (stuckRowRef.current) {
        const r = stuckRowRef.current.getBoundingClientRect();
        setStickyOn(r.top <= 72 + 1);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Filter dishes
  const filteredDishes = zM(() => {
    return mockDishes.filter(d => matchesFilters(d, filters) && matchesSearch(d, search));
  }, [search, filters]);

  // Group by category, keep only categories with results
  const categoryGroups = zM(() => {
    return mockMenuCategories
      .map(cat => ({ ...cat, dishes: filteredDishes.filter(d => d.categoryId === cat.id) }))
      .filter(g => g.dishes.length > 0);
  }, [filteredDishes]);

  // Scroll-spy for sub-nav active state
  zE(() => {
    if (categoryGroups.length === 0) return;
    const sections = categoryGroups.map(c => document.getElementById(`cat-${c.id}`)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      // Pick the first section whose top is below the sticky chrome line
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const id = visible[0].target.id.replace("cat-", "");
        setActiveCat(id);
      }
    }, { rootMargin: "-200px 0px -60% 0px", threshold: 0 });
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, [categoryGroups.length]);

  // Quick-add handler
  const handleQuickAdd = zC((dish) => {
    if (dish.unavailable) return;
    if (dish.modifierGroups && dish.modifierGroups.length > 0) {
      setSheetItem(dish);
      return;
    }
    // Direct add for items without modifiers
    const lineSnapshot = {
      itemId: dish.id,
      name: dish.name,
      image: dish.image?.src,
      unitPrice: dish.price.amount,
      quantity: 1,
      modifiers: [],
    };
    cart.addLine(lineSnapshot);
    toasts.show(dish, 1, () => {
      // Undo: pop the most recent matching line
      cart.removeLine(cart.lines[cart.lines.length - 1]?.id);
    });
  }, [cart, toasts]);

  // Sheet add-to-cart handler
  const handleSheetAdd = zC((newLine) => {
    cart.addLine(newLine);
    const dish = mockDishes.find(d => d.id === newLine.itemId);
    toasts.show(dish || { name: newLine.name }, newLine.quantity);
  }, [cart, toasts]);

  // Sub-nav click — smooth scroll
  const goToCategory = zC((id) => {
    setActiveCat(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 200;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  const subnavSections = [{ id: "all", label: "All" }, ...mockMenuCategories.map(c => ({ id: c.id, label: c.label, count: c.itemCount }))];

  const showSearchEmpty = filteredDishes.length === 0 && search.trim();
  const showFilterEmpty = filteredDishes.length === 0 && !search.trim() && !filters.includes("all");

  return (
    <div className="menu-page">
      <a href="#main" className="skip-link">Skip to content</a>

      <SiteNav
        variant={scrolled ? "solid" : "solid"} /* Menu page is always solid */
        logo={<Logo size={36}/>}
        links={[
          { href: "Szef Donald — Menu.html", label: "Menu", active: true },
          { href: "Szef Donald — Landing.html#about", label: "About" },
          { href: "Szef Donald — Landing.html#locations", label: "Locations" },
          { href: "Szef Donald — Landing.html#contact", label: "Contact" },
        ]}
        rightSlot={<>
          <LanguageSwitcher value={lang} onChange={setLang}/>
          <CartButton count={cart.itemCount} onClick={() => setCartOpen(true)}/>
          <button className="btn btn--primary btn--sm" style={{ height: 40 }} onClick={() => cart.itemCount > 0 ? setCartOpen(true) : null}>
            Order now
          </button>
        </>}
        onOpenMobile={() => setMobileOpen(true)}
      />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} lang={lang} setLang={setLang}/>

      <main id="main">
        {/* Page header */}
        <section className="menu-header">
          <Container>
            <span className="t-eyebrow">Menu</span>
            <h1 className="t-h1" style={{ margin: "16px 0 16px", textWrap: "balance", maxWidth: 720 }}>Built fresh, made to order.</h1>
            <p className="t-body-l t-secondary" style={{ margin: 0, maxWidth: 640 }}>
              47 dishes across six categories. Filter or search to find your usual.
            </p>
          </Container>
        </section>

        {/* Sticky search + filter */}
        <div ref={stuckRowRef} className={`menu-stuck-stack ${stickyOn ? "is-stuck" : ""}`}>
          <Container>
            <div className="menu-search-filter">
              <SearchInput value={search} onChange={setSearch}/>
              <FilterPillGroup
                ariaLabel="Dietary filters"
                value={filters}
                onChange={setFilters}
                options={[
                  { id: "all",         label: "All" },
                  { id: "vegetarian",  label: "Vegetarian", icon: <Icon name="leaf" size={14} stroke={2}/> },
                  { id: "vegan",       label: "Vegan",      icon: <Icon name="leaf" size={14} stroke={2}/> },
                  { id: "gluten-free", label: "Gluten-free",icon: <Icon name="wheat" size={14} stroke={2}/> },
                  { id: "spicy",       label: "Spicy",      icon: <Icon name="flame" size={14} stroke={2}/> },
                ]}
              />
            </div>
          </Container>
        </div>

        {/* Sticky sub-nav */}
        <div className={`menu-subnav ${stickyOn ? "is-stuck" : ""}`} ref={subnavRef}>
          <MenuSubNav
            sections={subnavSections}
            activeId={activeCat}
            onSelect={goToCategory}
          />
        </div>

        <Container>
          {showSearchEmpty && (
            <EmptyState
              size="lg"
              icon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/>
                <path d="m20 20-3.5-3.5"/>
                <path d="m8 8 6 6M14 8l-6 6"/>
              </svg>}
              title={`Nothing matches "${search}"`}
              description="Try a different word, or clear filters."
              action={{ label: "Clear search", onClick: () => setSearch("") }}
            />
          )}
          {showFilterEmpty && (
            <EmptyState
              size="lg"
              icon={<Icon name="leaf" size={36} stroke={1.6}/>}
              title="No dishes match your filters"
              description="Combine fewer filters to see more options."
              action={{ label: "Clear filters", onClick: () => setFilters(["all"]) }}
            />
          )}

          {categoryGroups.map(cat => (
            <section key={cat.id} id={`cat-${cat.id}`} className="cat-section" aria-labelledby={`h-${cat.id}`}>
              <div className="cat-section__head">
                <h2 id={`h-${cat.id}`} className="t-h2 cat-section__title">{cat.label}</h2>
                <div className="cat-section__meta">
                  {cat.dishes.length} {cat.dishes.length === 1 ? "item" : "items"}
                  {cat.description && <> · {cat.description}</>}
                </div>
              </div>
              <div className="dish-grid">
                {cat.dishes.map(d => (
                  <MenuDishCard
                    key={d.id}
                    dish={d}
                    onOpenSheet={() => setSheetItem(d)}
                    onAdd={() => handleQuickAdd(d)}
                  />
                ))}
              </div>
            </section>
          ))}
        </Container>
      </main>

      <SiteFooter lang={lang} setLang={setLang}/>

      {/* Floating cart */}
      <FloatingCartButton
        itemCount={cart.itemCount}
        total={cart.subtotal}
        currency="PLN"
        onClick={() => setCartOpen(true)}
      />

      {/* Sheets */}
      <ItemDetailSheet
        open={!!sheetItem}
        onOpenChange={(o) => !o && setSheetItem(null)}
        item={sheetItem}
        onAddToCart={handleSheetAdd}
      />
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={cart.lines}
        onUpdateQty={cart.updateQty}
        onRemove={cart.removeLine}
        onCheckout={() => { window.location.href = "Szef Donald — Checkout.html"; }}
        notes={{ value: cart.notes, onChange: cart.setNotes }}
      />

      <ToastStack toasts={toasts.toasts} onUndo={toasts.undo}/>
    </div>
  );
};

/* ---------- Menu-page DishCard — uses reserved flag space + sold-out chip ---------- */
const MenuDishCard = ({ dish, onOpenSheet, onAdd }) => {
  const handleCardClick = (e) => {
    // Only intercept clicks not on the add button
    if (e.target.closest(".dish-add")) return;
    e.preventDefault();
    onOpenSheet();
  };
  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd();
  };

  return (
    <a
      className={`dish-card ${dish.unavailable ? "dish-card--sold-out" : ""}`}
      href="#"
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpenSheet(); } }}
    >
      <div className="dish-card__media">
        <img className="dish-card__img" src={dish.image.src} alt={dish.image.alt} loading="lazy"/>
      </div>
      <div className="dish-card__body">
        <div className="dish-card__flags dish-card__flags--reserve">
          {dish.unavailable && <span className="sold-out-chip">Sold out today</span>}
          {!dish.unavailable && dish.flags?.map(f => {
            const m = FLAG_META[f] || { label: f, cls: "" };
            return (
              <span key={f} className={`flag-chip ${m.cls}`} title={m.title}>
                {m.icon && <Icon name={m.icon} size={11} stroke={2}/>}
                {m.label}
              </span>
            );
          })}
        </div>
        <h3 className="t-h3 dish-card__name">{dish.name}</h3>
        {dish.description && <p className="dish-card__desc" style={{ margin: 0 }}>{dish.description}</p>}
        <div className="dish-card__foot">
          <span className="t-price">{formatMoney(dish.price.amount, dish.price.currency)}</span>
          {!dish.unavailable && (
            <button
              className="dish-add"
              aria-label={`Add ${dish.name} to cart`}
              onClick={handleAddClick}
            >
              <Icon name="plus" size={18} stroke={2.4}/>
            </button>
          )}
        </div>
      </div>
    </a>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<MenuApp/>);
