/* ============================================================
   Confirmation / Success page
   ============================================================ */

const { useState: kS, useEffect: kE, useRef: kR } = React;
const LAST_ORDER_KEY_C = "szef-donald-last-order";

const DEMO_ORDER = {
  orderId: "SD-2026-0042",
  lines: [
    {
      id: "demo_1",
      itemId: "box-kebab-frytki",
      name: "Box Kebab Frytki",
      image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
      unitPrice: 32,
      quantity: 1,
      modifiers: [
        { groupName: "Meat", optionName: "Mieszane", priceDelta: 0 },
        { groupName: "Sauce", optionName: "Czosnkowy", priceDelta: 0 },
      ],
    },
    {
      id: "demo_2",
      itemId: "box-strips-mega",
      name: "Box Strips Mega",
      image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80",
      unitPrice: 39,
      quantity: 1,
      modifiers: [{ groupName: "Sauce", optionName: "Tahini", priceDelta: 0 }],
      notes: "Extra crispy please",
    },
  ],
  contact: { name: "Jan Kowalski", phone: "512 345 678", email: "jan@example.com" },
  address: { street: "Marszałkowska 102", apartment: "Apt 5B", postalCode: "00-026", city: "Warszawa", country: "PL" },
  orderType: "delivery",
  timeSlot: { kind: "asap" },
  subtotal: 71,
  discount: null,
  delivery: { amount: 5 },
  tip: 0,
  total: 76,
};

const CopyButton = ({ value }) => {
  const [copied, setCopied] = kS(false);
  const onClick = () => {
    try {
      navigator.clipboard?.writeText(value);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="copy-btn" onClick={onClick} aria-label="Copy order number">
      {copied
        ? <Icon name="check" size={16} stroke={2.6}/>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>}
    </button>
  );
};

const ConfirmationApp = () => {
  const [order, setOrder] = kS(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY_C);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEMO_ORDER;
  });
  const [lang, setLang] = kS("EN");
  const [mobileOpen, setMobileOpen] = kS(false);
  const titleRef = kR(null);

  // Focus the heading on mount (a11y)
  kE(() => { titleRef.current?.focus?.(); }, []);

  const firstName = (order.contact?.name || "").split(" ")[0] || "friend";
  const isDelivery = order.orderType === "delivery";
  const isPickup   = order.orderType === "pickup";
  const isEatin    = order.orderType === "eatin";

  // Compute ETA
  const etaLabel = order.timeSlot?.kind === "scheduled"
    ? new Date(order.timeSlot.iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : isDelivery ? "~25 min"
    : isPickup ? "~12 min"
    : "~10 min";

  const etaTitle = isDelivery ? "Estimated delivery time" : isPickup ? "Ready for pickup in" : "Service time";
  const etaSub = isDelivery
    ? "We'll text you when it's out for delivery."
    : isPickup
      ? "We'll text you when it's ready for pickup."
      : "We'll text you when the kitchen starts.";

  return (
    <div className="confirm-page-wrap">
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
          <a href="#" className="link-cta" style={{ borderBottom: "none" }}>
            <Icon name="bag" size={20}/>
          </a>
        </>}
        onOpenMobile={() => setMobileOpen(true)}
      />

      <main id="main" className="confirm-page" style={{ paddingTop: 72 + 48 }}>
        <Container size="narrow">
          <SuccessHero
            title={<span ref={titleRef} tabIndex="-1">Order confirmed</span>}
            description={`Thanks, ${firstName} — we got it.`}
            meta={
              <div className="order-id-card">
                <div>
                  <div className="order-id-card__caption">Order number</div>
                  <div className="order-id-card__id">{order.orderId}</div>
                </div>
                <CopyButton value={order.orderId}/>
              </div>
            }
          />

          <div className="eta-card">
            <div className="eta-card__caption">{etaTitle}</div>
            <div className="eta-card__big">{etaLabel}</div>
            <div className="eta-card__sub">{etaSub}</div>
          </div>

          <OrderProgressStepper
            mode={isDelivery ? "delivery" : isPickup ? "pickup" : "eatin"}
            status="confirmed"
          />

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <a href="#" className="link-cta">
              Track your order <Icon name="arrowRight" size={14}/>
            </a>
          </div>

          <div style={{ marginTop: 56 }}>
            <OrderSummaryPanel
              variant="inline"
              lines={order.lines}
              subtotal={order.subtotal}
              delivery={order.delivery}
              discount={order.discount}
              tip={order.tip || 0}
              total={order.total}
              currency="PLN"
              showEditCart={false}
            />
          </div>

          <div className="confirm-details-grid">
            <div className="confirm-detail-card">
              <div className="confirm-detail-card__caption">{isDelivery ? "Deliver to" : isPickup ? "Pick up from" : "Your table"}</div>
              {isDelivery && (
                <>
                  <div className="confirm-detail-card__line confirm-detail-card__line--strong">{order.address.street}</div>
                  {order.address.apartment && <div className="confirm-detail-card__line">{order.address.apartment}</div>}
                  <div className="confirm-detail-card__line" style={{ color: "rgb(var(--text-secondary))" }}>{order.address.postalCode} {order.address.city || "Warszawa"}</div>
                </>
              )}
              {isPickup && (
                <>
                  <div className="confirm-detail-card__line confirm-detail-card__line--strong">Szef Donald</div>
                  <div className="confirm-detail-card__line">Marszałkowska 102</div>
                  <div className="confirm-detail-card__line" style={{ color: "rgb(var(--text-secondary))" }}>00-026 Warszawa</div>
                  <a href="#" className="confirm-detail-card__action">Get directions →</a>
                </>
              )}
              {isEatin && (
                <div className="confirm-detail-card__line confirm-detail-card__line--strong" style={{ fontSize: 22 }}>
                  Table {order.tableNumber || "12"}
                </div>
              )}
            </div>
            <div className="confirm-detail-card">
              <div className="confirm-detail-card__caption">Contact</div>
              <div className="confirm-detail-card__line confirm-detail-card__line--strong">{order.contact.name || "Jan Kowalski"}</div>
              <div className="confirm-detail-card__line" style={{ color: "rgb(var(--text-secondary))" }}>+48 {order.contact.phone || "512 345 678"}</div>
              <div className="confirm-detail-card__line" style={{ color: "rgb(var(--text-secondary))" }}>{order.contact.email || "jan@example.com"}</div>
              <a href="#" className="confirm-detail-card__action">Edit contact →</a>
            </div>
          </div>

          <div className="confirm-actions">
            <a href="#" className="btn btn--primary btn--lg">
              Track your order <Icon name="arrowRight" size={18}/>
            </a>
            <a href="Szef Donald — Menu.html" className="btn btn--ghost btn--lg">
              Back to menu
            </a>
          </div>

          <div className="confirm-note">
            We sent a confirmation to {order.contact.email || "jan@example.com"}.
          </div>
        </Container>
      </main>

      <SiteFooter lang={lang} setLang={setLang}/>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<ConfirmationApp/>);
