/* ============================================================
   Checkout primitives — @repo/ui (page 3 extractions)
   ============================================================ */

const { useState: cS, useEffect: cE, useRef: cR, useMemo: cM, useCallback: cC } = React;

/* ============================================================
   FormField — slot-children wrapper
   ============================================================ */
const FormField = ({ id, label, required, helper, error, layout = "stacked", size = "md", prefix, suffix, children }) => {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // Inject id / accessibility props into the child input
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id,
        "aria-required": required || undefined,
        "aria-invalid": !!error || undefined,
        "aria-describedby": [helperId, errorId].filter(Boolean).join(" ") || undefined,
        className: [
          children.props.className || "input",
          error ? "input--error" : "",
          prefix ? "input--with-prefix" : "",
          suffix ? "input--with-suffix" : "",
        ].filter(Boolean).join(" "),
      })
    : children;
  return (
    <div className={`field field--${layout} field--size-${size}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}{required && <span className="field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="field__input-wrap">
        {prefix && <span className="field__prefix">{prefix}</span>}
        {child}
        {suffix && <span className="field__suffix">{suffix}</span>}
      </div>
      {error && <div id={errorId} className="field__error" role="alert">
        <Icon name="close" size={12} stroke={2.4}/>{error}
      </div>}
      {!error && helper && <div id={helperId} className="field__helper">{helper}</div>}
    </div>
  );
};

/* ============================================================
   Checkbox (small helper used in Contact "Save my info")
   ============================================================ */
const Checkbox = ({ checked, onChange, label, caption, id }) => (
  <label className={`checkbox-row ${checked ? "checkbox-row--checked" : ""}`} htmlFor={id}>
    <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
    <span className="checkbox-row__box" aria-hidden="true">
      {checked && <Icon name="check" size={13} stroke={3}/>}
    </span>
    <span className="checkbox-row__label-stack">
      <span className="checkbox-row__label">{label}</span>
      {caption && <span className="checkbox-row__caption">{caption}</span>}
    </span>
  </label>
);

/* ============================================================
   RadioCardGroup
   ============================================================ */
const RadioCardGroup = ({ options, value, onChange, layout = "horizontal", columns = 2, ariaLabel, rowVariant = false }) => {
  const layoutClass = layout === "grid"
    ? `radio-cards--grid-${columns}`
    : `radio-cards--${layout}`;
  return (
    <div className={`radio-cards ${layoutClass}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button
            type="button"
            key={o.id}
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            title={o.disabled ? o.disabledReason : undefined}
            className={`radio-card ${rowVariant ? "radio-card--row" : ""} ${active ? "radio-card--active" : ""} ${o.disabled ? "radio-card--disabled" : ""}`}
            onClick={() => !o.disabled && onChange(o.id)}
          >
            {o.icon && <span className="radio-card__icon">{o.icon}</span>}
            <div className="radio-card__main">
              <div className="radio-card__top">
                <span className="radio-card__label">{o.label}</span>
                {!rowVariant && o.badge && <span className={`radio-card__badge ${o.badgeTone ? `radio-card__badge--${o.badgeTone}` : ""}`}>{o.badge}</span>}
              </div>
              {o.description && <div className="radio-card__desc">{o.description}</div>}
            </div>
            {rowVariant && o.badge && <span className={`radio-card__badge ${o.badgeTone ? `radio-card__badge--${o.badgeTone}` : ""}`}>{o.badge}</span>}
            <span className="radio-card__radio" aria-hidden="true"><span className="radio-card__radio-dot"/></span>
          </button>
        );
      })}
    </div>
  );
};

/* ============================================================
   AddressAutocomplete
   ============================================================ */
const AddressAutocomplete = ({ value, onChange, error, placeholder = "Start typing your street…" }) => {
  const [q, setQ] = cS(value?.street || "");
  const [open, setOpen] = cS(false);
  const [matches, setMatches] = cS([]);
  const [activeIdx, setActiveIdx] = cS(-1);
  const [searching, setSearching] = cS(false);
  const wrapRef = cR(null);

  cE(() => setQ(value?.street || ""), [value?.street]);

  cE(() => {
    if (!q.trim()) { setMatches([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const lc = q.toLowerCase();
      setMatches(mockAddressAutocomplete.filter(a => a.street.toLowerCase().includes(lc)).slice(0, 6));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  cE(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (a) => {
    onChange({ ...a, apartment: value?.apartment || "", notes: value?.notes || "" });
    setQ(a.street);
    setOpen(false);
    setActiveIdx(-1);
  };

  const onKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(matches.length - 1, i + 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(matches[activeIdx]); }
    if (e.key === "Escape")    { setOpen(false); setActiveIdx(-1); }
  };

  return (
    <div className="autocomplete" ref={wrapRef}>
      <FormField
        id="address-street"
        label="Street address"
        required
        error={error}
        suffix={searching ? <span className="spinner" style={{ borderColor: "rgb(var(--text-tertiary) / 0.3)", borderTopColor: "rgb(var(--text-primary))" }}/> : null}
      >
        <input
          className="input"
          type="text"
          autoComplete="street-address"
          placeholder={placeholder}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); onChange({ ...(value || { city: "", postalCode: "", country: "PL" }), street: e.target.value }); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
      </FormField>
      {open && q.trim().length > 0 && (
        <div className="autocomplete__list" role="listbox">
          {matches.length > 0 ? (
            matches.map((m, i) => (
              <button
                type="button"
                key={m.street}
                role="option"
                aria-selected={i === activeIdx}
                className={`autocomplete__item ${i === activeIdx ? "autocomplete__item--active" : ""}`}
                onClick={() => pick(m)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="autocomplete__item-pin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s-8-7.7-8-13a8 8 0 1 1 16 0c0 5.3-8 13-8 13Z"/>
                    <circle cx="12" cy="9" r="3"/>
                  </svg>
                </span>
                <span className="autocomplete__item-main">
                  <span className="autocomplete__item-street">{m.street}</span>
                  <span className="autocomplete__item-sub">{m.postalCode} {m.city}</span>
                </span>
              </button>
            ))
          ) : !searching ? (
            <div className="autocomplete__no-results">
              No matches — enter manually below.
              <button type="button" className="autocomplete__no-results-link" onClick={() => setOpen(false)}>
                Skip autocomplete
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   TimeSlotPicker
   ============================================================ */
const TimeSlotPicker = ({ value, onChange, mode, earliestSlotMinutes, slotDurationMinutes = 15, slotsAheadHours = 3, closedReason }) => {
  // Build slots
  const slots = cM(() => {
    const now = new Date();
    const earliest = new Date(now.getTime() + earliestSlotMinutes * 60_000);
    // round up to next slot boundary
    const m = earliest.getMinutes();
    const rounded = new Date(earliest);
    const add = (slotDurationMinutes - (m % slotDurationMinutes)) % slotDurationMinutes;
    rounded.setMinutes(m + add, 0, 0);
    const out = [];
    const end = new Date(rounded.getTime() + slotsAheadHours * 60 * 60_000);
    for (let t = new Date(rounded); t < end; t = new Date(t.getTime() + slotDurationMinutes * 60_000)) {
      // closed past 22:00 (delivery cutoff)
      const h = t.getHours();
      const m2 = t.getMinutes();
      const disabled = (mode === "delivery" && (h >= 22 || (h === 21 && m2 > 30)));
      out.push({ iso: t.toISOString(), label: `${String(h).padStart(2, "0")}:${String(m2).padStart(2, "0")}`, disabled });
    }
    return out;
  }, [earliestSlotMinutes, slotDurationMinutes, slotsAheadHours, mode]);

  const isAsap = value.kind === "asap";
  const asapLabel = mode === "delivery"
    ? `ASAP · ${earliestSlotMinutes}–${earliestSlotMinutes + 20} min`
    : `ASAP · ${earliestSlotMinutes}–${earliestSlotMinutes + 5} min`;

  if (closedReason) {
    return (
      <div className="tsp">
        <div className="tsp__closed-banner">
          <Icon name="phone" size={18}/> {/* fallback icon */}
          <span>{closedReason}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tsp" role="radiogroup" aria-label={mode === "delivery" ? "Delivery time" : "Pickup time"}>
      <div className="tsp__tabs">
        <button
          type="button"
          className={`tsp__tab ${isAsap ? "tsp__tab--active" : ""}`}
          role="radio"
          aria-checked={isAsap}
          onClick={() => onChange({ kind: "asap" })}
        >
          <span className="tsp__tab-label">ASAP</span>
          <span className="tsp__tab-sub">{mode === "delivery" ? `${earliestSlotMinutes}–${earliestSlotMinutes + 20} min` : `${earliestSlotMinutes}–${earliestSlotMinutes + 5} min`}</span>
        </button>
        <button
          type="button"
          className={`tsp__tab ${!isAsap ? "tsp__tab--active" : ""}`}
          role="radio"
          aria-checked={!isAsap}
          onClick={() => onChange({ kind: "scheduled", iso: slots[0]?.iso })}
        >
          <span className="tsp__tab-label">Schedule</span>
          <span className="tsp__tab-sub">Pick a later slot</span>
        </button>
      </div>
      {!isAsap && (
        <div className="tsp__grid">
          {slots.map(s => (
            <button
              type="button"
              key={s.iso}
              className={`tsp__slot ${value.kind === "scheduled" && value.iso === s.iso ? "tsp__slot--active" : ""}`}
              disabled={s.disabled}
              onClick={() => onChange({ kind: "scheduled", iso: s.iso })}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   PromoCodeInput
   ============================================================ */
const PromoCodeInput = ({ applied, onApply, onRemove, collapsed = true }) => {
  const [open, setOpen] = cS(!collapsed || !!applied);
  const [code, setCode] = cS("");
  const [error, setError] = cS("");
  const [loading, setLoading] = cS(false);

  if (applied) {
    return (
      <div className="promo">
        <div className="promo__applied">
          <Icon name="check" size={14} stroke={2.6}/>
          <strong>{applied.code}</strong>
          <span style={{ opacity: 0.8 }}>· {applied.label}</span>
          <button className="promo__remove" onClick={onRemove} aria-label="Remove promo">
            <Icon name="close" size={11} stroke={2.4}/>
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="promo">
        <button className="promo__toggle" type="button" onClick={() => setOpen(true)}>Have a code?</button>
      </div>
    );
  }

  const submit = async (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    const res = await onApply(code.trim().toUpperCase());
    setLoading(false);
    if (!res.ok) setError(res.error);
    else setCode("");
  };

  return (
    <form className="promo" onSubmit={submit}>
      <div className="promo__row">
        <input
          className="promo__input"
          placeholder="Enter code"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          aria-label="Promo code"
        />
        <button type="submit" className="promo__apply" disabled={loading || !code.trim()}>
          {loading ? "…" : "Apply"}
        </button>
      </div>
      {error && <div className="promo__error">{error}</div>}
    </form>
  );
};

/* ============================================================
   OrderSummaryPanel
   ============================================================ */
const OrderSummaryPanel = ({ lines, currency = "PLN", subtotal, delivery, discount, tip, total, showEditCart = true, onEditCart, promoInput, ctaSlot, variant = "sticky-rail" }) => {
  return (
    <aside className={`summary-panel ${variant === "inline" ? "summary-panel--inline" : ""}`} aria-label="Order summary">
      <div className="summary-panel__head">
        <span className="summary-panel__title">Order summary</span>
        {showEditCart && onEditCart && (
          <button type="button" className="summary-panel__edit" onClick={onEditCart}>Edit cart</button>
        )}
      </div>
      <div className="summary-lines">
        {lines.map(line => (
          <div className="summary-line" key={line.id}>
            {line.image && <img className="summary-line__img" src={line.image} alt=""/>}
            <div className="summary-line__mid">
              <div className="summary-line__name">{line.name}</div>
              {line.modifiers.length > 0 && (
                <div className="summary-line__mods">{line.modifiers.map(m => m.optionName).join(" · ")}</div>
              )}
              {line.notes && <div className="summary-line__mods" style={{ fontStyle: "italic" }}>Note: {line.notes}</div>}
            </div>
            <div className="summary-line__right">
              <div className="summary-line__qty">× {line.quantity}</div>
              <div className="summary-line__price">{formatMoney(line.unitPrice * line.quantity, currency)}</div>
            </div>
          </div>
        ))}
      </div>
      {promoInput && <>
        <div className="summary-divider"/>
        {promoInput}
      </>}
      <div className="summary-divider"/>
      <div className="summary-rows">
        <div className="summary-row">
          <span className="summary-row__label">Subtotal</span>
          <span className="summary-row__value">{formatMoney(subtotal, currency)}</span>
        </div>
        {discount && (
          <div className="summary-row summary-row--discount">
            <span className="summary-row__label">Discount · {discount.label}</span>
            <span className="summary-row__value">−{formatMoney(discount.amount, currency)}</span>
          </div>
        )}
        <div className={`summary-row ${delivery && "label" in delivery ? "summary-row--free" : ""}`}>
          <span className="summary-row__label">Delivery</span>
          <span className="summary-row__value">
            {"label" in delivery ? delivery.label : formatMoney(delivery.amount, currency)}
          </span>
        </div>
        {tip > 0 && (
          <div className="summary-row">
            <span className="summary-row__label">Tip</span>
            <span className="summary-row__value">{formatMoney(tip, currency)}</span>
          </div>
        )}
        <div className="summary-divider"/>
        <div className="summary-row summary-row--total">
          <span className="summary-row__label">Total</span>
          <span className="summary-row__value">{formatMoney(total, currency)}</span>
        </div>
      </div>
      {ctaSlot}
    </aside>
  );
};

/* ============================================================
   CheckoutSection (accordion-style)
   ============================================================ */
const CheckoutSection = ({ step, title, status, summary, onEdit, rightSlot, children }) => {
  const isCollapsed = status === "complete" || status === "pending";
  return (
    <section className={`co-section co-section--${status}`} aria-labelledby={`co-sec-${step}`}>
      <div className="co-section__head">
        <span className="co-section__num" aria-hidden="true">
          {status === "complete" ? <Icon name="check" size={16} stroke={3}/> :
           status === "error"    ? "!" :
           step}
        </span>
        <div className="co-section__title">
          <span id={`co-sec-${step}`}>{title}</span>
          {summary && status === "complete" && <span className="co-section__summary">{summary}</span>}
        </div>
        <div className="co-section__right">
          {rightSlot}
          {status === "complete" && onEdit && (
            <button type="button" className="co-section__edit" onClick={onEdit}>Edit</button>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="co-section__body">
          {children}
        </div>
      )}
    </section>
  );
};

/* ============================================================
   TipPicker
   ============================================================ */
const TipPicker = ({ subtotal, value, onChange, presets = [0, 5, 10, 15], allowCustom = true, currency = "PLN" }) => {
  const [showCustom, setShowCustom] = cS(false);
  const [custom, setCustom] = cS("");

  const isPresetActive = (p) => !showCustom && Math.abs((subtotal * p / 100) - value) < 0.01;

  return (
    <div>
      <div className="tip-row" role="radiogroup" aria-label="Tip">
        {presets.map(p => {
          const amt = subtotal * p / 100;
          const active = isPresetActive(p);
          return (
            <button
              type="button"
              key={p}
              role="radio"
              aria-checked={active}
              className={`tip-chip ${active ? "tip-chip--active" : ""}`}
              onClick={() => { setShowCustom(false); setCustom(""); onChange(amt); }}
            >
              <span>{p === 0 ? "No tip" : `${p}%`}</span>
              {p > 0 && <span className="tip-chip__amt">{formatMoney(amt, currency)}</span>}
            </button>
          );
        })}
        {allowCustom && (
          <button
            type="button"
            className={`tip-chip ${showCustom ? "tip-chip--active" : ""}`}
            onClick={() => setShowCustom(true)}
          >
            Other
          </button>
        )}
      </div>
      {showCustom && (
        <div className="tip-custom-wrap">
          <FormField id="tip-custom" label="" size="sm" suffix="zł">
            <input
              className="input"
              type="number"
              min="0" max="100" step="0.5"
              placeholder="0,00"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                const n = parseFloat(e.target.value.replace(",", "."));
                onChange(isNaN(n) ? 0 : Math.min(100, Math.max(0, n)));
              }}
              autoFocus
            />
          </FormField>
        </div>
      )}
      <div className="tip-caption">100% of tips go to the team.</div>
    </div>
  );
};

/* ============================================================
   OrderProgressStepper
   ============================================================ */
const STEPS_BY_MODE = {
  delivery: ["Confirmed", "Preparing", "On the way", "Delivered"],
  pickup:   ["Confirmed", "Preparing", "Ready for pickup", "Picked up"],
  eatin:    ["Confirmed", "Preparing", "Served"],
};
const STATUS_TO_INDEX = {
  confirmed: 0, preparing: 1, "on-the-way": 2, "ready": 2, delivered: 3, "picked-up": 3, served: 2,
};

const OrderProgressStepper = ({ mode, status }) => {
  const labels = STEPS_BY_MODE[mode] || STEPS_BY_MODE.delivery;
  const currentIdx = STATUS_TO_INDEX[status] ?? 0;
  return (
    <div className="steps" role="list" aria-label="Order progress">
      {labels.map((label, i) => {
        const state = i < currentIdx ? "complete" : i === currentIdx ? "current" : "pending";
        return (
          <div key={label} className={`step step--${state}`} role="listitem">
            <span className="step__circle">
              {state === "complete" ? <Icon name="check" size={14} stroke={3}/> :
               state === "current"  ? <span style={{ width: 8, height: 8, background: "white", borderRadius: "50%" }}/> :
               <span style={{ fontSize: 11, fontWeight: 600 }}>{i + 1}</span>}
            </span>
            {i < labels.length - 1 && <span className="step__connector"/>}
            <span className="step__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ============================================================
   SuccessHero
   ============================================================ */
const SuccessHero = ({ icon, title, description, meta }) => (
  <header className="success-hero">
    <div className="success-hero__icon">{icon || <SuccessHexagonMark/>}</div>
    <h1 className="success-hero__title" tabIndex="-1">{title}</h1>
    {description && <p className="success-hero__desc">{description}</p>}
    {meta && <div className="success-hero__meta">{meta}</div>}
  </header>
);

Object.assign(window, {
  FormField, Checkbox, RadioCardGroup, AddressAutocomplete,
  TimeSlotPicker, PromoCodeInput, OrderSummaryPanel, CheckoutSection,
  TipPicker, OrderProgressStepper, SuccessHero,
});
