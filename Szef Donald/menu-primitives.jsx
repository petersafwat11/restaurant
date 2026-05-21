/* ============================================================
   Menu page primitives — @repo/ui (page 2 extractions)
   ============================================================ */

const { useState: mUseState, useEffect: mUseEffect, useRef: mUseRef, useCallback: mUseCallback, useMemo: mUseMemo } = React;

/* ---------- SearchInput ---------- */
const SearchInput = ({ value, onChange, placeholder = "Search the menu…", debounceMs = 200, size = "md", autoFocus }) => {
  const [local, setLocal] = mUseState(value);
  mUseEffect(() => setLocal(value), [value]);
  mUseEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, debounceMs]);
  const ref = mUseRef(null);
  mUseEffect(() => {
    if (autoFocus) ref.current?.focus();
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocus]);
  return (
    <div className={`search-input search-input--${size}`}>
      <span className="search-input__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3.5-3.5"/>
        </svg>
      </span>
      <input
        ref={ref}
        className="search-input__field"
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        role="searchbox"
        aria-label="Search the menu"
      />
      {local && (
        <button className="search-input__clear" aria-label="Clear search" onClick={() => { setLocal(""); onChange(""); }}>
          <Icon name="close" size={14} stroke={2}/>
        </button>
      )}
    </div>
  );
};

/* ---------- FilterPillGroup ---------- */
const FilterPillGroup = ({ options, value, onChange, allowMultiple = true, ariaLabel = "Filters" }) => {
  const toggle = (id) => {
    if (id === "all") return onChange(["all"]);
    if (!allowMultiple) return onChange([id]);
    const without = value.filter(v => v !== "all");
    const next = without.includes(id) ? without.filter(v => v !== id) : [...without, id];
    onChange(next.length === 0 ? ["all"] : next);
  };
  return (
    <div className="filter-pills" role="group" aria-label={ariaLabel}>
      {options.map(o => {
        const active = value.includes(o.id);
        return (
          <button
            key={o.id}
            className={`filter-pill ${active ? "filter-pill--active" : ""}`}
            aria-pressed={active}
            onClick={() => toggle(o.id)}
          >
            {o.icon}
            {o.label}
            {o.count != null && <span className="filter-pill__count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

/* ---------- MenuSubNav ---------- */
const MenuSubNav = ({ sections, activeId, onSelect }) => {
  const wrapRef = mUseRef(null);
  mUseEffect(() => {
    const el = wrapRef.current?.querySelector(`[data-pill="${activeId}"]`);
    if (el) el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [activeId]);
  return (
    <Container>
      <div className="menu-subnav__inner" ref={wrapRef} role="tablist" aria-label="Menu categories">
        {sections.map(s => (
          <button
            key={s.id}
            data-pill={s.id}
            role="tab"
            aria-selected={activeId === s.id}
            className={`subnav-pill ${activeId === s.id ? "subnav-pill--active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            {s.label}
            {s.count != null && <span className="subnav-pill__count">{s.count}</span>}
          </button>
        ))}
      </div>
    </Container>
  );
};

/* ---------- QuantityStepper ---------- */
const QuantityStepper = ({ value, onChange, min = 1, max = 99, size = "md", ariaLabel = "Quantity" }) => (
  <div className={`qty-stepper qty-stepper--${size}`} role="group" aria-label={ariaLabel}>
    <button
      className="qty-stepper__btn"
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      aria-label="Decrease quantity"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
    </button>
    <span className="qty-stepper__value" aria-live="polite">{value}</span>
    <button
      className="qty-stepper__btn"
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      aria-label="Increase quantity"
    >
      <Icon name="plus" size={14} stroke={2.4}/>
    </button>
  </div>
);

/* ---------- ModifierGroup ---------- */
const ModifierGroup = ({ group, value, onChange, error }) => {
  const isMulti = group.max > 1;
  const hint = isMulti
    ? (group.min > 0 ? `Choose ${group.min === group.max ? group.min : `at least ${group.min}${group.max < 99 ? `, up to ${group.max}` : ""}`}` : `Optional · up to ${group.max}`)
    : `Choose one`;

  const toggle = (id, option) => {
    if (option.unavailable) return;
    if (!isMulti) return onChange([id]);
    const has = value.includes(id);
    if (has) {
      if (value.length <= group.min) return; // would violate min
      return onChange(value.filter(v => v !== id));
    } else {
      if (value.length >= group.max) return; // would violate max
      return onChange([...value, id]);
    }
  };

  return (
    <fieldset className="mod-group" aria-invalid={!!error}>
      <div className="mod-group__head">
        <legend style={{ padding: 0 }}>
          <div className="mod-group__name">{group.name}</div>
          <div className="mod-group__hint">{hint}</div>
        </legend>
        {group.required && group.min > 0 && (
          <span className="mod-group__required">Required</span>
        )}
      </div>
      <div className="mod-options">
        {group.options.map(opt => {
          const selected = value.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`mod-option ${selected ? "mod-option--selected" : ""} ${opt.unavailable ? "mod-option--unavailable" : ""}`}
              onClick={(e) => { e.preventDefault(); toggle(opt.id, opt); }}
            >
              <span className={`mod-option__control ${isMulti ? "mod-option__control--check" : "mod-option__control--radio"}`}>
                {isMulti
                  ? <span className="mod-option__check-tick"><Icon name="check" size={12} stroke={3}/></span>
                  : <span className="mod-option__radio-dot"/>}
              </span>
              <span className="mod-option__name">
                {opt.name}
                {opt.unavailable && <span className="sold-out-chip" style={{ marginLeft: 8 }}>Sold out</span>}
              </span>
              {opt.priceDelta !== 0 && (
                <span className={`mod-option__delta ${opt.priceDelta < 0 ? "mod-option__delta--free" : ""}`}>
                  {opt.priceDelta > 0 ? "+" : "−"}{formatMoney(Math.abs(opt.priceDelta), "PLN")}
                </span>
              )}
              <input type={isMulti ? "checkbox" : "radio"} className="sr-only" checked={selected} readOnly aria-required={group.required}/>
            </label>
          );
        })}
      </div>
      {error && <div className="mod-group__error" role="alert">{error}</div>}
    </fieldset>
  );
};

/* ---------- ItemDetailSheet ---------- */
const useDefaultModifierState = (item) => {
  return mUseMemo(() => {
    if (!item) return {};
    const state = {};
    (item.modifierGroups || []).forEach(g => {
      const defaults = g.options.filter(o => o.default).map(o => o.id);
      state[g.id] = defaults.length ? defaults : [];
    });
    return state;
  }, [item?.id]);
};

const computeUnitPrice = (item, modState) => {
  if (!item) return 0;
  let total = item.price.amount;
  (item.modifierGroups || []).forEach(g => {
    const selected = modState[g.id] || [];
    selected.forEach(optId => {
      const opt = g.options.find(o => o.id === optId);
      if (opt) total += opt.priceDelta;
    });
  });
  return total;
};

const ItemDetailSheet = ({ open, onOpenChange, item, onAddToCart }) => {
  const initialMod = useDefaultModifierState(item);
  const [modState, setModState] = mUseState(initialMod);
  const [qty, setQty] = mUseState(1);
  const [notes, setNotes] = mUseState("");
  const [tryAdded, setTryAdded] = mUseState(false);
  const [exiting, setExiting] = mUseState(false);
  const closeBtnRef = mUseRef(null);

  // reset state when item changes / sheet opens
  mUseEffect(() => {
    if (open && item) {
      setModState(initialMod);
      setQty(1);
      setNotes("");
      setTryAdded(false);
    }
  }, [open, item?.id]);

  // escape closes
  mUseEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = mUseCallback(() => {
    setExiting(true);
    setTimeout(() => { setExiting(false); onOpenChange(false); }, 260);
  }, [onOpenChange]);

  if (!open || !item) return null;

  const unitPrice = computeUnitPrice(item, modState);
  const total = unitPrice * qty;

  // validation
  const unfilled = (item.modifierGroups || []).filter(g => g.required && (modState[g.id] || []).length < g.min);
  const canAdd = unfilled.length === 0 && !item.unavailable;

  const handleAdd = () => {
    if (!canAdd) {
      setTryAdded(true);
      return;
    }
    // Build flat modifier list
    const mods = [];
    (item.modifierGroups || []).forEach(g => {
      (modState[g.id] || []).forEach(optId => {
        const opt = g.options.find(o => o.id === optId);
        if (opt) mods.push({ groupName: g.name, optionName: opt.name, priceDelta: opt.priceDelta });
      });
    });
    onAddToCart({
      itemId: item.id,
      name: item.name,
      image: item.image?.src,
      unitPrice,
      quantity: qty,
      modifiers: mods,
      notes: notes.trim() || undefined,
    });
    handleClose();
  };

  return (
    <>
      <div className={`sheet-backdrop ${exiting ? "sheet-backdrop--exit" : ""}`} onClick={handleClose} aria-hidden="true"/>
      <div className={`sheet ${exiting ? "sheet--exit" : ""}`} role="dialog" aria-modal="true" aria-label={`${item.name} details`}>
        <div className="sheet__header">
          <span/>
          <button ref={closeBtnRef} className="sheet__close" onClick={handleClose} aria-label="Close">
            <Icon name="close" size={20}/>
          </button>
        </div>
        <div className="sheet__body">
          <div className="idsheet__gallery">
            <img src={item.image.src} alt={item.image.alt}/>
          </div>
          <div className="idsheet__body">
            <div className="idsheet__title-block">
              {item.flags?.length > 0 && (
                <div className="dish-card__flags">
                  {item.flags.map(f => {
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
              <h2 className="t-h2" style={{ margin: 0 }}>{item.name}</h2>
              <div className="idsheet__meta">
                <span style={{ textTransform: "capitalize" }}>{item.categoryId}</span>
                {item.prepMinutes && <><span className="dot"/><span>{item.prepMinutes} min</span></>}
                {item.calories && <><span className="dot"/><span>{item.calories} kcal</span></>}
              </div>
              <div className="idsheet__price">{formatMoney(unitPrice, "PLN")}</div>
              {item.longDescription && (
                <p className="idsheet__longdesc t-body-l" style={{ margin: 0 }}>{item.longDescription}</p>
              )}
            </div>

            {item.allergens?.length > 0 && (
              <div className="idsheet__allergens">
                <span className="t-caption" style={{ color: "rgb(var(--text-tertiary))" }}>Allergens</span>
                <div className="allergen-chips">
                  {item.allergens.map(a => <span key={a} className="allergen-chip">{a}</span>)}
                </div>
              </div>
            )}

            {(item.modifierGroups || []).map(g => {
              const v = modState[g.id] || [];
              const showError = tryAdded && g.required && v.length < g.min;
              return (
                <ModifierGroup
                  key={g.id}
                  group={g}
                  value={v}
                  onChange={(next) => setModState(s => ({ ...s, [g.id]: next }))}
                  error={showError ? `Please choose at least ${g.min === 1 ? "one" : g.min}.` : undefined}
                />
              );
            })}

            <div className="instructions-block">
              <label className="instructions-label" htmlFor="instructions">Special instructions</label>
              <textarea
                id="instructions"
                className="instructions-textarea"
                placeholder="Anything we should know? (no onions, extra sauce…)"
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <span className="instructions-counter">{notes.length}/200</span>
            </div>

            <div>
              <span className="instructions-label" style={{ display: "block", marginBottom: 10 }}>Quantity</span>
              <QuantityStepper value={qty} onChange={setQty} size="lg"/>
            </div>
          </div>
        </div>
        <div className="sheet__footer idsheet__footer">
          <div>
            <div className="idsheet__total-label">Total</div>
            <div className="idsheet__total-value">{formatMoney(total, "PLN")}</div>
          </div>
          <button
            className="idsheet__add"
            onClick={handleAdd}
            disabled={item.unavailable}
            title={item.unavailable ? "Sold out today — back tomorrow." : (unfilled.length ? `Choose: ${unfilled.map(g => g.name).join(", ")}` : "")}
          >
            Add to cart
            <Icon name="bag" size={18}/>
          </button>
        </div>
      </div>
    </>
  );
};

/* ---------- CartLineItem ---------- */
const CartLineItem = ({ line, onUpdateQty, onRemove, variant = "editable", currency = "PLN" }) => {
  const lineTotal = line.unitPrice * line.quantity;
  const modSummary = line.modifiers.map(m => m.optionName).join(" · ");
  return (
    <div className="cart-line">
      {line.image && <img className="cart-line__img" src={line.image} alt=""/>}
      <div className="cart-line__mid">
        <div className="cart-line__name">{line.name}</div>
        {modSummary && <div className="cart-line__mods">{modSummary}</div>}
        {line.notes && <div className="cart-line__note">Note: {line.notes}</div>}
      </div>
      <div className="cart-line__right">
        <div className="cart-line__total">{formatMoney(lineTotal, currency)}</div>
        {variant === "editable" && (
          <>
            <QuantityStepper value={line.quantity} onChange={onUpdateQty} size="sm"/>
            <button className="cart-line__remove" onClick={onRemove}>Remove</button>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- CartSheet ---------- */
const CartSheet = ({ open, onOpenChange, lines, onUpdateQty, onRemove, onCheckout, currency = "PLN", notes }) => {
  const [exiting, setExiting] = mUseState(false);
  mUseEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => { setExiting(false); onOpenChange(false); }, 260);
  };

  if (!open) return null;

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <>
      <div className={`sheet-backdrop ${exiting ? "sheet-backdrop--exit" : ""}`} onClick={handleClose} aria-hidden="true"/>
      <div className={`sheet sheet--cart ${exiting ? "sheet--exit" : ""}`} role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="sheet__header sheet__header--titled">
          <div>
            <span className="sheet__title">Your cart</span>
            {lines.length > 0 && <span className="sheet__count-chip">({itemCount} {itemCount === 1 ? "item" : "items"})</span>}
          </div>
          <button className="sheet__close" onClick={handleClose} aria-label="Close cart">
            <Icon name="close" size={20}/>
          </button>
        </div>
        <div className="sheet__body">
          {lines.length === 0 ? (
            <EmptyState
              size="lg"
              icon={<Icon name="bag" size={36} stroke={1.4}/>}
              title="Your cart is empty"
              description="Browse the menu and add something tasty."
              action={{ label: "Browse menu", onClick: handleClose }}
            />
          ) : (
            <>
              <div className="cart-list">
                {lines.map(line => (
                  <CartLineItem
                    key={line.id}
                    line={line}
                    onUpdateQty={(q) => onUpdateQty(line.id, q)}
                    onRemove={() => onRemove(line.id)}
                    currency={currency}
                  />
                ))}
              </div>
              {notes && (
                <div className="cart-notes">
                  <label className="instructions-label" htmlFor="cart-notes">Notes for the kitchen</label>
                  <textarea
                    id="cart-notes"
                    className="instructions-textarea"
                    placeholder={notes.placeholder || "Anything we should know about your order?"}
                    maxLength={200}
                    value={notes.value}
                    onChange={(e) => notes.onChange(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>
        {lines.length > 0 && (
          <div className="sheet__footer">
            <div className="cart-footer-rows">
              <div className="cart-footer-row">
                <span className="cart-footer-row__label">Subtotal</span>
                <span className="cart-footer-row__value">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="cart-footer-row cart-footer-row--pending">
                <span className="cart-footer-row__label">Delivery</span>
                <span className="cart-footer-row__value">Calculated at checkout</span>
              </div>
              <div className="cart-footer-divider"/>
              <div className="cart-footer-row cart-footer-row--total">
                <span className="cart-footer-row__label">Total</span>
                <span className="cart-footer-row__value">{formatMoney(subtotal, currency)}</span>
              </div>
            </div>
            <button className="cart-checkout" onClick={onCheckout}>
              Checkout · {formatMoney(subtotal, currency)}
              <Icon name="arrowRight" size={18}/>
            </button>
            <div className="cart-footer-caption">Free baklava on first order — code at checkout.</div>
          </div>
        )}
      </div>
    </>
  );
};

/* ---------- FloatingCartButton ---------- */
const FloatingCartButton = ({ itemCount, total, currency = "PLN", onClick }) => {
  if (itemCount === 0) return null;
  return (
    <button className="floating-cart" onClick={onClick} aria-label={`View cart, ${itemCount} items, ${formatMoney(total, currency)}`}>
      <Icon name="bag" size={20}/>
      <span>View cart</span>
      <span className="floating-cart__count">{itemCount}</span>
      <span className="floating-cart__dot"/>
      <span className="floating-cart__total">{formatMoney(total, currency)}</span>
    </button>
  );
};

/* ---------- EmptyState ---------- */
const EmptyState = ({ icon, title, description, action, size = "md" }) => (
  <div className={`empty-state empty-state--${size}`}>
    {icon && <div className="empty-state__icon">{icon}</div>}
    <div className="empty-state__title">{title}</div>
    {description && <div className="empty-state__desc">{description}</div>}
    {action && (
      action.href
        ? <a className="btn btn--ghost" href={action.href}>{action.label}</a>
        : <button className="btn btn--ghost" onClick={action.onClick}>{action.label}</button>
    )}
  </div>
);

Object.assign(window, {
  SearchInput, FilterPillGroup, MenuSubNav, QuantityStepper,
  ModifierGroup, ItemDetailSheet, CartSheet, CartLineItem,
  FloatingCartButton, EmptyState,
});
