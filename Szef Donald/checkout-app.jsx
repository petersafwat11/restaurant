/* ============================================================
   Checkout page — composition
   ============================================================ */

const { useState: xS, useEffect: xE, useRef: xR, useMemo: xM, useCallback: xCB } = React;
const CART_KEY_CO = "szef-donald-cart";
const LAST_ORDER_KEY = "szef-donald-last-order";

/* ---------- Cart hook shared with menu ---------- */
const useCheckoutCart = () => {
  const [lines, setLines] = xS(() => {
    try {
      const raw = localStorage.getItem(CART_KEY_CO);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [notes, setNotes] = xS("");

  xE(() => {
    try { localStorage.setItem(CART_KEY_CO, JSON.stringify(lines)); } catch {}
  }, [lines]);

  const updateQty = xCB((id, qty) => setLines(prev => prev.map(l => l.id === id ? { ...l, quantity: Math.max(1, qty) } : l)), []);
  const removeLine = xCB((id) => setLines(prev => prev.filter(l => l.id !== id)), []);
  const clear = xCB(() => { setLines([]); try { localStorage.removeItem(CART_KEY_CO); } catch {} }, []);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return { lines, setLines, updateQty, removeLine, clear, itemCount, subtotal, notes, setNotes };
};

/* ---------- Auto-seed with 2 sample dishes if cart empty ---------- */
const SEED_LINES = [
  {
    id: "seed_1",
    itemId: "box-kebab-frytki",
    name: "Box Kebab Frytki",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
    unitPrice: 32,
    quantity: 1,
    modifiers: [
      { groupName: "Meat",  optionName: "Mieszane", priceDelta: 0 },
      { groupName: "Sauce", optionName: "Czosnkowy", priceDelta: 0 },
      { groupName: "Sauce", optionName: "Ostry",    priceDelta: 0 },
    ],
  },
  {
    id: "seed_2",
    itemId: "box-strips-mega",
    name: "Box Strips Mega",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80",
    unitPrice: 39,
    quantity: 1,
    modifiers: [
      { groupName: "Sauce", optionName: "Tahini", priceDelta: 0 },
    ],
    notes: "Extra crispy please",
  },
];

/* ---------- Platform detection (Apple Pay / Google Pay availability) ---------- */
const detectPlatform = () => {
  const ua = navigator.userAgent || "";
  return {
    apple:  /Mac|iPhone|iPad/.test(ua),
    google: /Chrome|Android/.test(ua) && !/Edg/.test(ua),
  };
};

/* ---------- Compute summary numbers ---------- */
const computeSummary = ({ subtotal, orderType, appliedPromo, tip }) => {
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountPercent) discountAmount = subtotal * appliedPromo.discountPercent / 100;
    else if (appliedPromo.discountAmount) discountAmount = Math.min(appliedPromo.discountAmount, subtotal);
  }
  const subAfterDiscount = subtotal - discountAmount;
  let deliveryAmount = 0;
  let deliveryLabel = null;
  if (orderType === "pickup" || orderType === "eatin") {
    deliveryLabel = "Free";
  } else if (subAfterDiscount >= mockDeliveryConfig.freeOverAmount) {
    deliveryLabel = "Free";
  } else {
    deliveryAmount = mockDeliveryConfig.feeAmount;
  }
  const total = subAfterDiscount + deliveryAmount + (tip || 0);
  return {
    discount: discountAmount > 0 ? { amount: discountAmount, label: appliedPromo.label } : null,
    delivery: deliveryLabel ? { label: deliveryLabel } : { amount: deliveryAmount },
    total,
  };
};

/* ---------- Main checkout app ---------- */
const CheckoutApp = () => {
  const cart = useCheckoutCart();
  const [scrolled, setScrolled] = xS(false);
  const [lang, setLang] = xS("EN");
  const [mobileOpen, setMobileOpen] = xS(false);

  // Auto-seed if cart empty on first load
  xE(() => {
    if (cart.lines.length === 0 && !sessionStorage.getItem("co-seeded")) {
      cart.setLines(SEED_LINES);
      sessionStorage.setItem("co-seeded", "1");
    }
  }, []);

  // Form state
  const [orderType, setOrderType] = xS("delivery");      // delivery | pickup | eatin
  const [contact, setContact] = xS({ name: "", phone: "", email: "" });
  const [saveInfo, setSaveInfo] = xS(false);
  const [address, setAddress] = xS({ street: "", apartment: "", city: "", postalCode: "", country: "PL", notes: "" });
  const [tableNumber, setTableNumber] = xS("");
  const [timeSlot, setTimeSlot] = xS({ kind: "asap" });
  const [orderNotes, setOrderNotes] = xS("");
  const [showOrderNotes, setShowOrderNotes] = xS(false);
  const [paymentMethod, setPaymentMethod] = xS("card");
  const [card, setCard] = xS({ number: "", exp: "", cvc: "", name: "" });
  const [blikDigits, setBlikDigits] = xS(["", "", "", "", "", ""]);
  const [tip, setTip] = xS(0);
  const [appliedPromo, setAppliedPromo] = xS(null);

  // Section completion state
  const [completed, setCompleted] = xS({ 1: false, 2: false, 3: false, 5: false });
  const [errors, setErrors] = xS({});
  const [cartOpen, setCartOpen] = xS(false);
  const [submitting, setSubmitting] = xS(false);
  const [submitError, setSubmitError] = xS(false);

  const sectionRefs = { 1: xR(null), 2: xR(null), 3: xR(null), 4: xR(null), 5: xR(null), 6: xR(null) };

  // Scroll-state for nav
  xE(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const platform = xM(() => detectPlatform(), []);

  /* ---------- Validation per section ---------- */
  const validateSection = (n) => {
    const e = {};
    if (n === 2) {
      if (!contact.name.trim()) e.name = "Please enter your name.";
      if (!contact.phone.trim()) e.phone = "Phone is required.";
      else if (contact.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number.";
      if (!contact.email.trim()) e.email = "Email is required.";
      else if (!contact.email.includes("@")) e.email = "Enter a valid email address.";
    }
    if (n === 3) {
      if (orderType === "delivery") {
        if (!address.street.trim()) e.street = "Add your address.";
        if (!address.postalCode.trim()) e.postalCode = "Postal code required.";
      } else if (orderType === "eatin") {
        if (!tableNumber.trim()) e.table = "Table number required.";
      }
    }
    if (n === 5) {
      if (paymentMethod === "card") {
        if (!card.number.replace(/\D/g, "").length) e.cardNumber = "Card number required.";
        if (!card.exp.trim()) e.cardExp = "Expiry required.";
        if (!card.cvc.trim()) e.cardCvc = "CVC required.";
        if (!card.name.trim()) e.cardName = "Cardholder name required.";
      }
      if (paymentMethod === "blik") {
        if (blikDigits.join("").length !== 6) e.blik = "Enter all 6 digits.";
      }
    }
    return e;
  };

  /* ---------- Section state per index ---------- */
  const sectionStatus = (n) => {
    if (n === 1) return completed[1] ? "complete" : "active";
    if (n === 2) {
      if (!completed[1]) return "pending";
      if (errors._section === 2) return "error";
      return completed[2] ? "complete" : "active";
    }
    if (n === 3) {
      if (!completed[2]) return "pending";
      if (errors._section === 3) return "error";
      return completed[3] ? "complete" : "active";
    }
    if (n === 4) return completed[3] ? "active" : "pending";  // notes is optional, always available after step 3
    if (n === 5) {
      if (!completed[3]) return "pending";
      if (errors._section === 5) return "error";
      return completed[5] ? "complete" : "active";
    }
    if (n === 6) return completed[3] ? "active" : "pending";
    return "pending";
  };

  /* ---------- Section continue handler ---------- */
  const continueFrom = (n) => {
    const e = validateSection(n);
    if (Object.keys(e).length > 0) {
      setErrors({ ...e, _section: n });
      return;
    }
    setErrors({});
    setCompleted(c => ({ ...c, [n]: true }));
    // Scroll to next section
    const next = n === 1 ? 2 : n === 2 ? 3 : n === 3 ? 5 : null;
    if (next && sectionRefs[next]?.current) {
      setTimeout(() => sectionRefs[next].current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  const editSection = (n) => {
    setCompleted(c => ({ ...c, [n]: false }));
    setTimeout(() => sectionRefs[n]?.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  /* ---------- Apply promo ---------- */
  const onApplyPromo = async (code) => {
    await new Promise(r => setTimeout(r, 600));
    const found = mockPromoCodes[code];
    if (!found) return { ok: false, error: "Code not valid." };
    setAppliedPromo({ code, ...found });
    return { ok: true, ...found };
  };

  /* ---------- Summary numbers ---------- */
  const summary = xM(() => computeSummary({
    subtotal: cart.subtotal,
    orderType,
    appliedPromo,
    tip,
  }), [cart.subtotal, orderType, appliedPromo, tip]);

  /* ---------- Section summaries (for collapsed view) ---------- */
  const orderTypeSummary = ({
    delivery: "Delivery",
    pickup:   "Pickup · Marszałkowska 102",
    eatin:    "Eat in",
  })[orderType];

  const contactSummary = `${contact.name} · +48 ${contact.phone}`;
  const whereWhenSummary = orderType === "delivery"
    ? `${address.street}${address.apartment ? `, ${address.apartment}` : ""} · ${timeSlot.kind === "asap" ? "ASAP" : new Date(timeSlot.iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
    : orderType === "pickup"
      ? `Marszałkowska 102 · ${timeSlot.kind === "asap" ? "ASAP" : new Date(timeSlot.iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
      : `Table ${tableNumber}`;
  const paymentSummary = ({
    card:      `Card ending in ${(card.number.replace(/\s/g, "").slice(-4) || "····")}`,
    blik:      "BLIK",
    applepay:  "Apple Pay",
    googlepay: "Google Pay",
    cod:       "Cash on delivery",
  })[paymentMethod];

  /* ---------- Place order ---------- */
  const placeOrder = async () => {
    // Validate all
    const allErrors = { ...validateSection(2), ...validateSection(3), ...validateSection(5) };
    if (Object.keys(allErrors).length > 0) {
      setErrors({ ...allErrors, _section: !completed[2] ? 2 : !completed[3] ? 3 : 5 });
      sectionRefs[!completed[2] ? 2 : !completed[3] ? 3 : 5]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSubmitting(true);
    setSubmitError(false);
    await new Promise(r => setTimeout(r, 1200));
    // Stash to sessionStorage
    const orderId = "SD-2026-0042";
    const snapshot = {
      orderId,
      lines: cart.lines,
      contact, address, tableNumber, orderType, timeSlot,
      orderNotes, paymentMethod, tip,
      subtotal: cart.subtotal,
      ...summary,
      placedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(snapshot));
    cart.clear();
    sessionStorage.removeItem("co-seeded");
    // Navigate to confirmation
    window.location.href = `Szef Donald — Confirmation.html`;
  };

  /* ---------- Edit cart from summary ---------- */
  const handleEditCart = () => setCartOpen(true);

  /* ---------- Empty cart edge case ---------- */
  if (cart.lines.length === 0 && sessionStorage.getItem("co-seeded")) {
    // Real empty state — user cleared the cart after seeding
    return (
      <CheckoutChrome scrolled cart={cart} lang={lang} setLang={setLang} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onCartIcon={() => {}}>
        <Container>
          <div className="co-header">
            <a href="Szef Donald — Menu.html" className="co-back"><Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }}/> Back to menu</a>
          </div>
          <EmptyState
            size="lg"
            icon={<Icon name="bag" size={36} stroke={1.4}/>}
            title="Your cart is empty"
            description="Add something tasty before checking out."
            action={{ label: "Browse menu", href: "Szef Donald — Menu.html" }}
          />
        </Container>
      </CheckoutChrome>
    );
  }

  return (
    <CheckoutChrome
      scrolled={scrolled}
      cart={cart}
      lang={lang} setLang={setLang}
      mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
      onCartIcon={() => setCartOpen(true)}
    >
      {submitting && (
        <div className="submit-backdrop">
          <span className="submit-spinner"/>
        </div>
      )}
      {submitError && (
        <div className="top-banner" role="alert">
          <Icon name="close" size={16} stroke={2.4}/>
          <span>Couldn't place your order — try again.</span>
          <button className="top-banner__retry" onClick={placeOrder}>Retry</button>
        </div>
      )}

      <Container>
        <div className="co-header">
          <a href="Szef Donald — Menu.html" className="co-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
            </svg>
            Back to menu
          </a>
          <span className="t-eyebrow">Checkout</span>
          <h1 className="t-h1" style={{ margin: "12px 0 0", textWrap: "balance" }}>Almost there.</h1>
        </div>

        <div className="co-body">
          {/* LEFT: sections */}
          <div className="co-left">
            {/* Section 1 — Order type */}
            <div ref={sectionRefs[1]}>
              <CheckoutSection
                step={1}
                title="How do you want it?"
                status={sectionStatus(1)}
                summary={orderTypeSummary}
                onEdit={() => editSection(1)}
              >
                <RadioCardGroup
                  ariaLabel="Order type"
                  value={orderType}
                  onChange={(v) => { setOrderType(v); setCompleted(c => ({ ...c, 1: true })); }}
                  options={[
                    {
                      id: "delivery",
                      label: "Delivery",
                      description: "20–40 min",
                      icon: <OTIcon kind="delivery"/>,
                      badge: cart.subtotal >= mockDeliveryConfig.freeOverAmount ? "Free" : formatMoney(mockDeliveryConfig.feeAmount, "PLN"),
                      badgeTone: cart.subtotal >= mockDeliveryConfig.freeOverAmount ? "positive" : null,
                    },
                    {
                      id: "pickup",
                      label: "Pickup",
                      description: "Ready in 10–15 min · Marszałkowska 102",
                      icon: <OTIcon kind="pickup"/>,
                      badge: "No fee",
                      badgeTone: "positive",
                    },
                    {
                      id: "eatin",
                      label: "Eat in",
                      description: "Order from your table",
                      icon: <OTIcon kind="eatin"/>,
                    },
                  ]}
                />
                <div>
                  <button type="button" className="btn btn--primary" onClick={() => continueFrom(1)} style={{ marginTop: 4 }}>
                    Continue
                  </button>
                </div>
              </CheckoutSection>
            </div>

            {/* Section 2 — Contact */}
            <div ref={sectionRefs[2]}>
              <CheckoutSection
                step={2}
                title="Contact"
                status={sectionStatus(2)}
                summary={contactSummary}
                onEdit={() => editSection(2)}
                rightSlot={sectionStatus(2) === "active" && <a href="#" className="co-section__edit">Already a customer? Sign in →</a>}
              >
                <FormField id="contact-name" label="Name" required error={errors.name}>
                  <input className="input" type="text" autoComplete="name" placeholder="Jan Kowalski"
                    value={contact.name} onChange={(e) => setContact(c => ({ ...c, name: e.target.value }))}/>
                </FormField>
                <FormField id="contact-phone" label="Phone" required error={errors.phone} helper="We'll text you when your order is on the way."
                  prefix="+48">
                  <input className="input" type="tel" autoComplete="tel" placeholder="512 345 678"
                    value={contact.phone} onChange={(e) => setContact(c => ({ ...c, phone: e.target.value }))}/>
                </FormField>
                <FormField id="contact-email" label="Email" required error={errors.email} helper="For the receipt and order confirmation.">
                  <input className="input" type="email" autoComplete="email" placeholder="jan@example.com"
                    value={contact.email} onChange={(e) => setContact(c => ({ ...c, email: e.target.value }))}/>
                </FormField>
                <Checkbox id="save-info" checked={saveInfo} onChange={setSaveInfo}
                  label="Save my info for next time"
                  caption="Stored in your browser. Not shared."/>
                <div>
                  <button type="button" className="btn btn--primary" onClick={() => continueFrom(2)}>
                    Continue
                  </button>
                </div>
              </CheckoutSection>
            </div>

            {/* Section 3 — When + Where */}
            <div ref={sectionRefs[3]}>
              <CheckoutSection
                step={3}
                title={orderType === "delivery" ? "Where + When" : orderType === "pickup" ? "When to pick up" : "Your table"}
                status={sectionStatus(3)}
                summary={whereWhenSummary}
                onEdit={() => editSection(3)}
              >
                {orderType === "delivery" && <>
                  <AddressAutocomplete value={address} onChange={setAddress} error={errors.street}/>
                  <div className="field-grid">
                    <div className="col-6">
                      <FormField id="addr-apt" label="Apt / Floor" helper="Optional">
                        <input className="input" type="text" placeholder="Apt 5B / Floor 3"
                          value={address.apartment} onChange={(e) => setAddress(a => ({ ...a, apartment: e.target.value }))}/>
                      </FormField>
                    </div>
                    <div className="col-6">
                      <FormField id="addr-postal" label="Postal code" required error={errors.postalCode}>
                        <input className="input" type="text" autoComplete="postal-code" placeholder="00-026"
                          value={address.postalCode} onChange={(e) => setAddress(a => ({ ...a, postalCode: e.target.value }))}/>
                      </FormField>
                    </div>
                  </div>
                  <FormField id="addr-notes" label="Delivery instructions" helper="Optional · 200 chars">
                    <textarea className="textarea" rows="3" maxLength={200}
                      placeholder="Gate code, doorman, where to leave it…"
                      value={address.notes} onChange={(e) => setAddress(a => ({ ...a, notes: e.target.value }))}/>
                  </FormField>
                  <div className="summary-divider" style={{ margin: "8px 0" }}/>
                  <div>
                    <div className="field__label" style={{ marginBottom: 12 }}>When</div>
                    <TimeSlotPicker mode="delivery" value={timeSlot} onChange={setTimeSlot} earliestSlotMinutes={20}/>
                  </div>
                </>}

                {orderType === "pickup" && <>
                  <div className="pickup-card">
                    <Logo variant="mark" size={40}/>
                    <div className="pickup-card__main">
                      <div className="pickup-card__name">Szef Donald — Marszałkowska 102</div>
                      <div className="pickup-card__sub">00-026 Warszawa · +48 22 555 01 23</div>
                    </div>
                    <a href="#" className="link-cta">Get directions <Icon name="arrowUpRight" size={14}/></a>
                  </div>
                  <div>
                    <div className="field__label" style={{ marginBottom: 12 }}>When</div>
                    <TimeSlotPicker mode="pickup" value={timeSlot} onChange={setTimeSlot} earliestSlotMinutes={10}/>
                  </div>
                </>}

                {orderType === "eatin" && <>
                  <FormField id="table-num" label="Table number" required error={errors.table} helper="Look for the number on your table, or scan the QR.">
                    <input className="input" type="number" min="1" max="99" placeholder="12"
                      value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}/>
                  </FormField>
                  <button type="button" className="add-note-link" onClick={() => alert("QR scanner — coming soon")}>
                    Scan QR instead →
                  </button>
                </>}

                <div>
                  <button type="button" className="btn btn--primary" onClick={() => continueFrom(3)}>
                    Continue
                  </button>
                </div>
              </CheckoutSection>
            </div>

            {/* Section 4 — Order notes (optional, always-active after section 3) */}
            {completed[3] && (
              <div ref={sectionRefs[4]}>
                <CheckoutSection
                  step={4}
                  title="Anything else? (optional)"
                  status="active"
                >
                  {!showOrderNotes && !orderNotes ? (
                    <button type="button" className="add-note-link" onClick={() => setShowOrderNotes(true)}>
                      <Icon name="plus" size={14} stroke={2.4}/> Add a note
                    </button>
                  ) : (
                    <FormField id="order-notes" label="" helper={`${orderNotes.length}/200 — for the kitchen`}>
                      <textarea
                        className="textarea" rows="3" maxLength={200}
                        placeholder="Special instructions for the kitchen…"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        autoFocus={showOrderNotes && !orderNotes}
                      />
                    </FormField>
                  )}
                </CheckoutSection>
              </div>
            )}

            {/* Section 5 — Payment */}
            {completed[3] && (
              <div ref={sectionRefs[5]}>
                <CheckoutSection
                  step={5}
                  title="Payment"
                  status={sectionStatus(5)}
                  summary={paymentSummary}
                  onEdit={() => editSection(5)}
                >
                  <RadioCardGroup
                    ariaLabel="Payment method"
                    layout="vertical"
                    rowVariant
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={[
                      { id: "card", label: "Card", description: "Visa, Mastercard, Amex.", icon: <PMIcon method="card"/> },
                      { id: "blik", label: "BLIK", description: "Enter the 6-digit code from your bank app.", icon: <PMIcon method="blik"/> },
                      { id: "applepay", label: "Apple Pay", description: "One-tap on your iPhone or Mac.", icon: <PMIcon method="applepay"/>, disabled: !platform.apple, disabledReason: "Available on Apple devices." },
                      { id: "googlepay", label: "Google Pay", description: "One-tap with your Google account.", icon: <PMIcon method="googlepay"/>, disabled: !platform.google, disabledReason: "Available on Chrome / Android." },
                      ...(orderType === "delivery" && summary.total < 100 ? [
                        { id: "cod", label: "Cash on delivery", description: "Pay the driver in cash when it arrives.", icon: <PMIcon method="cod"/> }
                      ] : []),
                    ]}
                  />

                  {paymentMethod === "card" && (
                    <div className="field-grid" style={{ marginTop: 12 }}>
                      <div className="col-12">
                        <FormField id="cc-num" label="Card number" required error={errors.cardNumber}>
                          <input className="input" type="text" autoComplete="cc-number" placeholder="1234 1234 1234 1234" inputMode="numeric"
                            value={card.number} onChange={(e) => setCard(c => ({ ...c, number: e.target.value }))}/>
                        </FormField>
                      </div>
                      <div className="col-6">
                        <FormField id="cc-exp" label="Expiry" required error={errors.cardExp}>
                          <input className="input" type="text" autoComplete="cc-exp" placeholder="MM/YY"
                            value={card.exp} onChange={(e) => setCard(c => ({ ...c, exp: e.target.value }))}/>
                        </FormField>
                      </div>
                      <div className="col-6">
                        <FormField id="cc-cvc" label="CVC" required error={errors.cardCvc}>
                          <input className="input" type="text" autoComplete="cc-csc" placeholder="123" maxLength="4" inputMode="numeric"
                            value={card.cvc} onChange={(e) => setCard(c => ({ ...c, cvc: e.target.value }))}/>
                        </FormField>
                      </div>
                      <div className="col-12">
                        <FormField id="cc-name" label="Cardholder name" required error={errors.cardName}>
                          <input className="input" type="text" autoComplete="cc-name" placeholder="Jan Kowalski"
                            value={card.name} onChange={(e) => setCard(c => ({ ...c, name: e.target.value }))}/>
                        </FormField>
                      </div>
                      <div className="col-12" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgb(var(--text-tertiary))", fontSize: 12 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Secured by Stripe.
                      </div>
                    </div>
                  )}

                  {paymentMethod === "blik" && (
                    <div style={{ marginTop: 8 }}>
                      <div className="field__label" style={{ marginBottom: 8 }}>BLIK code</div>
                      <div className="blik-row">
                        {blikDigits.map((d, i) => (
                          <input
                            key={i}
                            className="blik-digit"
                            inputMode="numeric"
                            maxLength="1"
                            value={d}
                            onChange={(e) => {
                              const ch = e.target.value.replace(/\D/g, "").slice(0, 1);
                              setBlikDigits(arr => { const n = [...arr]; n[i] = ch; return n; });
                              if (ch && i < 5) {
                                e.target.parentElement.children[i + 1]?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !blikDigits[i] && i > 0) {
                                e.target.parentElement.children[i - 1]?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                      <div className="field__helper" style={{ marginTop: 10 }}>Open your bank app and tap "BLIK" to get a code.</div>
                      {errors.blik && <div className="field__error" style={{ marginTop: 8 }}><Icon name="close" size={12} stroke={2.4}/>{errors.blik}</div>}
                    </div>
                  )}

                  {(paymentMethod === "applepay" || paymentMethod === "googlepay") && (
                    <div style={{ marginTop: 8 }}>
                      <button type="button" className="pay-with-btn">
                        <PMIcon method={paymentMethod}/>
                        {paymentMethod === "applepay" ? "Pay with Apple Pay" : "Pay with Google Pay"}
                      </button>
                      <div className="tip-caption" style={{ textAlign: "center", marginTop: 12 }}>You'll confirm on your device.</div>
                    </div>
                  )}

                  {paymentMethod === "cod" && (
                    <div style={{ marginTop: 8, padding: "12px 16px", background: "rgb(var(--surface))", borderRadius: 12, fontSize: 14 }}>
                      The driver will collect <strong>{formatMoney(summary.total, "PLN")}</strong> in cash. Please have it ready.
                    </div>
                  )}

                  <div>
                    <button type="button" className="btn btn--primary" onClick={() => continueFrom(5)} style={{ marginTop: 8 }}>
                      Continue
                    </button>
                  </div>
                </CheckoutSection>
              </div>
            )}

            {/* Section 6 — Tip (optional) */}
            {completed[3] && (
              <div ref={sectionRefs[6]}>
                <CheckoutSection
                  step={6}
                  title="Add a tip for the team? (optional)"
                  status="active"
                >
                  <TipPicker subtotal={cart.subtotal} value={tip} onChange={setTip}/>
                </CheckoutSection>
              </div>
            )}
          </div>

          {/* RIGHT: sticky summary */}
          <div className="co-right">
            <OrderSummaryPanel
              variant="sticky-rail"
              lines={cart.lines}
              subtotal={cart.subtotal}
              delivery={summary.delivery}
              discount={summary.discount}
              tip={tip}
              total={summary.total}
              currency="PLN"
              showEditCart
              onEditCart={handleEditCart}
              promoInput={<PromoCodeInput applied={appliedPromo} onApply={onApplyPromo} onRemove={() => setAppliedPromo(null)}/>}
              ctaSlot={
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <button className="summary-cta" onClick={placeOrder} disabled={submitting}>
                    {submitting ? <><span className="spinner"/> Placing order…</> : <>Place order · {formatMoney(summary.total, "PLN")} <Icon name="arrowRight" size={18}/></>}
                  </button>
                  <div className="summary-terms">
                    By placing this order, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
                  </div>
                  <PaymentLogos/>
                </div>
              }
            />
          </div>
        </div>
      </Container>

      {/* Mobile sticky bottom bar */}
      <div className="mobile-summary">
        <div className="mobile-summary__totals">
          <span className="mobile-summary__caption">{cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} · Total</span>
          <span className="mobile-summary__total">{formatMoney(summary.total, "PLN")}</span>
        </div>
        <button className="mobile-summary__expand" onClick={() => setCartOpen(true)} aria-label="View order details">
          <Icon name="bag" size={18}/>
        </button>
        <button className="mobile-summary__cta" onClick={placeOrder} disabled={submitting}>
          {submitting ? "…" : <>Place order <Icon name="arrowRight" size={16}/></>}
        </button>
      </div>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={cart.lines}
        onUpdateQty={cart.updateQty}
        onRemove={cart.removeLine}
        onCheckout={() => setCartOpen(false)}
        notes={{ value: cart.notes, onChange: cart.setNotes }}
      />
    </CheckoutChrome>
  );
};

/* ---------- Chrome wrapper (nav + footer) ---------- */
const CheckoutChrome = ({ children, scrolled, cart, lang, setLang, mobileOpen, setMobileOpen, onCartIcon }) => (
  <div className="checkout-page">
    <a href="#main" className="skip-link">Skip to content</a>
    <SiteNav
      variant="solid"
      logo={<Logo size={36}/>}
      links={[
        { href: "Szef Donald — Menu.html", label: "Menu" },
        { href: "Szef Donald — Landing.html#about", label: "About" },
        { href: "Szef Donald — Landing.html#locations", label: "Locations" },
        { href: "Szef Donald — Landing.html#contact", label: "Contact" },
      ]}
      rightSlot={<>
        <LanguageSwitcher value={lang} onChange={setLang}/>
        <CartButton count={cart?.itemCount || 0} onClick={onCartIcon}/>
      </>}
      onOpenMobile={() => setMobileOpen(true)}
    />
    <main id="main" style={{ paddingTop: 72 }}>
      {children}
    </main>
    <SiteFooter lang={lang} setLang={setLang}/>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<CheckoutApp/>);
