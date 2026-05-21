/* global React, window */
const { useState, useEffect, useRef, useMemo } = React;
const Icon = window.Icon;
const { STATUS_MAP, PAYMENT_MAP, TRANSITIONS } = window;
const {
  StatusPill, TypeBadge, RelativeTime, ActivityTimeline, ActionModal, DetailDrawer, Button, Checkbox
} = window;

/* ============================================================
   Formatters
   ============================================================ */
const fmtUSD = (n, { decimals = 2 } = {}) => '$' + n.toLocaleString('en-US', {
  minimumFractionDigits: decimals, maximumFractionDigits: decimals
});
const fmtSecs = (s) => {
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}m ${String(r).padStart(2, '0')}s`;
};
const fmtMin = (s) => Math.floor(s / 60) + 'm';
const fmtPlural = (n, one, many) => n === 1 ? `${n} ${one}` : `${n} ${many || (one + 's')}`;

/* ============================================================
   Cell renderers
   ============================================================ */
function CustomerCell({ order }) {
  return (
    <div className="cust-cell-stack">
      <span className="avatar sm">{order.customer.firstName[0]}{order.customer.lastInitial}</span>
      <div style={{ minWidth: 0 }}>
        <div className="name">{order.customer.firstName} {order.customer.lastInitial}.</div>
        <div className="phone">{order.customer.phone}</div>
      </div>
    </div>
  );
}

function ItemsCell({ order }) {
  const names = order.items.map(i => i.name).join(', ');
  return (
    <div className="items-truncate" title={names}>
      <span className="count">{fmtPlural(order.itemCount, 'item')}</span>
      <span className="list"> · {names}</span>
    </div>
  );
}

function PaymentCell({ order }) {
  const ps = PAYMENT_MAP[order.paymentStatus] || PAYMENT_MAP.pending;
  return (
    <span className="pay-cell">
      <span className="pay-icon">{order.payment.icon}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{order.payment.label}</span>
      <span className="status-dot" style={{ background: ps.color, width: 6, height: 6 }}/>
    </span>
  );
}

function ElapsedCell({ order }) {
  const active = ['CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY'].includes(order.status);
  if (!active || order.elapsedSinceConfirmedSec == null) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
  const mins = order.elapsedSinceConfirmedSec / 60;
  const cls = mins > 20 ? 'bad' : mins > 10 ? 'warn' : '';
  return <span className={'elapsed-cell ' + cls}>{Math.floor(mins)}m</span>;
}

function RowActionsCell({ order, onAdvance, onView, onRefund, onCancel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const canAdvance = TRANSITIONS[order.status]?.length > 0;
  const isTerminal = ['DELIVERED','CANCELLED'].includes(order.status);

  return (
    <div className="row-actions action-menu-wrap" ref={ref}>
      <button className="icon-btn sm" onClick={e => { e.stopPropagation(); setOpen(o => !o); }} aria-label="Row actions">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div className="popover action-menu" onClick={e => e.stopPropagation()}>
          <div className="opt" onClick={() => { onView(order); setOpen(false); }}>
            <Icon.Eye size={14}/> View
          </div>
          {canAdvance && (
            <div className="opt" onClick={() => { onAdvance(order); setOpen(false); }}>
              <Icon.Arrow size={14}/> Advance →
            </div>
          )}
          {!isTerminal && (
            <div className="opt" onClick={() => { onRefund(order); setOpen(false); }}>
              <Icon.Receipt size={14}/> Refund
            </div>
          )}
          {!isTerminal && (
            <div className="opt" onClick={() => { onCancel(order); setOpen(false); }}
                 style={{ color: 'var(--negative)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                   strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>
              Cancel
            </div>
          )}
          <div className="opt">
            <Icon.FileBar size={14}/> Print receipt
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Column definitions
   ============================================================ */
function buildOrderColumns({ onAdvance, onView, onRefund, onCancel }) {
  return [
    {
      id: 'orderNumber', header: 'Order #', width: 150, skelWidth: '70%',
      render: o => <span style={{
        fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
        fontSize: 12, letterSpacing: '0.02em', color: 'var(--text)'
      }}>{o.orderNumber}</span>
    },
    {
      id: 'customer', header: 'Customer', width: 220, skelWidth: '80%',
      render: o => <CustomerCell order={o}/>
    },
    {
      id: 'items', header: 'Items',
      render: o => <ItemsCell order={o}/>
    },
    {
      id: 'type', header: 'Type', width: 110,
      render: o => <TypeBadge label={o.type.replace('_', ' ')}/>
    },
    {
      id: 'status', header: 'Status', width: 200,
      render: o => (
        <StatusPill status={o.status}
                    transitions={TRANSITIONS[o.status]}
                    onTransition={next => onAdvance(o, next)}/>
      )
    },
    {
      id: 'payment', header: 'Payment', width: 160,
      render: o => <PaymentCell order={o}/>
    },
    {
      id: 'total', header: 'Total', width: 100, align: 'right', sortable: true, skelWidth: 50,
      render: o => <span className="tnum" style={{ fontWeight: 500 }}>{fmtUSD(o.total)}</span>
    },
    {
      id: 'placed', header: 'Placed', width: 110, align: 'right', sortable: true, skelWidth: 60,
      render: o => <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}><RelativeTime at={o.placedAt}/></span>
    },
    {
      id: 'elapsed', header: 'Elapsed', width: 80, align: 'right',
      render: o => <ElapsedCell order={o}/>
    },
    {
      id: 'actions', header: '', width: 48,
      render: o => (
        <RowActionsCell order={o}
                        onAdvance={onAdvance}
                        onView={onView}
                        onRefund={onRefund}
                        onCancel={onCancel}/>
      )
    },
  ];
}

/* ============================================================
   Drawer body
   ============================================================ */
function OrderDrawerBody({ order }) {
  const subtotalLine = order.subtotal;
  return (
    <>
      <div className="drawer-section">
        <h3>Items</h3>
        {order.items.map(item => (
          <div className="drawer-line" key={item.id}>
            <div>
              <div className="name">{item.name}</div>
              {item.mods.length > 0 && (
                <div className="mods">{item.mods.join(' · ')}</div>
              )}
              {item.note && <div className="mods" style={{ fontStyle: 'italic' }}>“{item.note}”</div>}
            </div>
            <div className="price-stack">
              <div className="qty">{item.qty} × {fmtUSD(item.unitPrice)}</div>
              <div className="total tnum">{fmtUSD(item.qty * item.unitPrice)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="drawer-section">
        <h3>Pricing</h3>
        <table className="price-table">
          <tbody>
            <tr><td className="pt-label">Subtotal</td><td className="tnum">{fmtUSD(subtotalLine)}</td></tr>
            <tr><td className="pt-label">Tax (8.75%)</td><td className="tnum">{fmtUSD(order.tax)}</td></tr>
            {order.deliveryFee > 0 && <tr><td className="pt-label">Delivery fee</td><td className="tnum">{fmtUSD(order.deliveryFee)}</td></tr>}
            {order.tip > 0 && <tr><td className="pt-label">Tip</td><td className="tnum">{fmtUSD(order.tip)}</td></tr>}
            {order.discount > 0 && <tr><td className="pt-label">Discount</td><td className="tnum" style={{ color: 'var(--positive)' }}>−{fmtUSD(order.discount)}</td></tr>}
            {order.loyaltyRedemption > 0 && <tr><td className="pt-label">Loyalty redemption</td><td className="tnum" style={{ color: 'var(--positive)' }}>−{fmtUSD(order.loyaltyRedemption)}</td></tr>}
            <tr className="pt-divider"><td/><td/></tr>
            <tr className="pt-total"><td>Grand total</td><td className="tnum">{fmtUSD(order.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="drawer-section">
        <h3>Payment</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div className="pay-cell">
            <span className="pay-icon">{order.payment.icon}</span>
            <span style={{ color: 'var(--text)', fontSize: 13 }}>{order.payment.label}</span>
          </div>
          <StatusPill status={order.paymentStatus.toUpperCase()}
                      map={{
                        PAID: { label: 'Paid', color: 'var(--positive)' },
                        PENDING: { label: 'Pending', color: 'var(--warning)' },
                        REFUNDED: { label: 'Refunded', color: 'var(--info)' },
                        PARTIAL: { label: 'Partial', color: 'var(--info)' },
                      }}/>
        </div>
        <Copyable text={order.paymentRef}/>
        {order.refunds.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {order.refunds.map((r, i) => (
              <div key={i} style={{
                padding: 10,
                background: 'var(--surface-elev)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
              }}>
                <div>
                  <div style={{ color: 'var(--text)' }}>Refund: {r.reason}</div>
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                    by {r.by} · <RelativeTime at={r.at}/>
                  </div>
                </div>
                <div className="tnum" style={{ color: 'var(--negative)', fontWeight: 500 }}>−{fmtUSD(r.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="drawer-section">
        <h3>Customer</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="avatar md">{order.customer.firstName[0]}{order.customer.lastInitial}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              {order.customer.firstName} {order.customer.lastName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              <Copyable text={order.customer.phone} mono={false}/> ·{' '}
              <Copyable text={order.customer.email} mono={false}/>
            </div>
          </div>
        </div>
        {order.type === 'DELIVERY' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.address}</div>
            <div className="map-thumb"><div className="pin"/></div>
          </>
        )}
        {order.type === 'DINE_IN' && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Table: <strong style={{ color: 'var(--text)' }}>{order.table}</strong></div>
        )}
        {order.type === 'PICKUP' && order.pickupTime && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Pickup: <strong style={{ color: 'var(--text)' }}>
              {new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </strong> · <RelativeTime at={order.pickupTime}/>
          </div>
        )}
        <a className="link-accent" href="#" onClick={e => e.preventDefault()} style={{ marginTop: 12, display: 'inline-flex' }}>
          View customer <Icon.Arrow size={12}/>
        </a>
      </div>

      <div className="drawer-section">
        <h3>Timeline</h3>
        <ActivityTimeline events={order.timeline.map((ev, i) => ({
          id: ev.id,
          color: STATUS_MAP[ev.status]?.color || 'var(--text-tertiary)',
          title: STATUS_MAP[ev.status]?.label || ev.status,
          at: ev.at,
          actor: ev.actor,
          role: ev.role,
          note: ev.note,
          current: i === order.timeline.length - 1,
        }))}/>
      </div>
    </>
  );
}

function Copyable({ text, mono = true }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try { navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <span className="copyable" onClick={copy} style={{ fontFamily: mono ? undefined : 'inherit' }}>
      {copied ? <span className="copied">Copied</span> : text}
      {!copied && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <rect x="9" y="9" width="11" height="11" rx="2"/>
          <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
        </svg>
      )}
    </span>
  );
}

/* ============================================================
   Refund + Cancel modals
   ============================================================ */
function RefundModal({ order, open, onClose, onSubmit }) {
  const [mode, setMode] = useState('full');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('Customer requested');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open && order) { setMode('full'); setAmount(order.total); setReason('Customer requested'); setNote(''); }
  }, [open, order?.id]);
  if (!order) return null;
  const valid = (mode === 'full' || (amount > 0 && amount <= order.total)) && reason && (reason !== 'Other' || note.length > 0);

  return (
    <ActionModal open={open} onClose={onClose}
                 title={`Refund order ${order.orderNumber}`}
                 subtitle={`Up to ${fmtUSD(order.total)} available to refund.`}
                 primary={{
                   label: `Issue refund · ${fmtUSD(mode === 'full' ? order.total : (Number(amount) || 0))}`,
                   onClick: () => { onSubmit({ amount: mode === 'full' ? order.total : Number(amount), reason, note }); onClose(); },
                   disabled: !valid,
                   helper: 'This will email the customer.',
                 }}
                 secondary={{ label: 'Cancel', onClick: onClose }}>
      <div className="form-radio-group" style={{ marginBottom: 14 }}>
        <div className={'form-radio' + (mode === 'full' ? ' active' : '')} onClick={() => { setMode('full'); setAmount(order.total); }}>
          Full refund
        </div>
        <div className={'form-radio' + (mode === 'partial' ? ' active' : '')} onClick={() => setMode('partial')}>
          Partial
        </div>
      </div>

      {mode === 'partial' && (
        <div className="form-field">
          <label>Amount (USD)</label>
          <input className="form-input tnum" type="number" min={0} max={order.total} step={0.01}
                 value={amount} onChange={e => setAmount(e.target.value)}/>
        </div>
      )}

      <div className="form-field">
        <label>Reason</label>
        <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}>
          <option>Customer requested</option>
          <option>Item out of stock</option>
          <option>Wrong item delivered</option>
          <option>Food quality issue</option>
          <option>Duplicate order</option>
          <option>Other</option>
        </select>
      </div>

      {reason === 'Other' && (
        <div className="form-field">
          <label>Notes</label>
          <textarea className="form-textarea" maxLength={500} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="What happened?"/>
        </div>
      )}
    </ActionModal>
  );
}

function CancelModal({ order, open, onClose, onSubmit }) {
  const [reason, setReason] = useState('Out of stock');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setReason('Out of stock'); setNote(''); } }, [open]);
  if (!order) return null;
  return (
    <ActionModal open={open} onClose={onClose}
                 title={`Cancel order ${order.orderNumber}?`}
                 subtitle="The customer will be notified. This can't be undone."
                 primary={{
                   label: 'Cancel order',
                   tone: 'destructive',
                   onClick: () => { onSubmit({ reason, note }); onClose(); },
                 }}
                 secondary={{ label: 'Keep order', onClick: onClose }}>
      <div className="form-field">
        <label>Reason</label>
        <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}>
          <option>Out of stock</option>
          <option>Restaurant closed</option>
          <option>Customer requested</option>
          <option>Payment issue</option>
          <option>Other</option>
        </select>
      </div>
      <div className="form-field">
        <label>Notes (optional)</label>
        <textarea className="form-textarea" maxLength={500} value={note} onChange={e => setNote(e.target.value)}/>
      </div>
    </ActionModal>
  );
}

/* ============================================================
   Export modal (lightweight)
   ============================================================ */
function ExportModal({ open, onClose }) {
  const [kind, setKind] = useState('orders');
  const [range, setRange] = useState('today');
  const [format, setFormat] = useState('csv');
  return (
    <ActionModal open={open} onClose={onClose} title="Export report"
                 subtitle="We'll email you when the file is ready."
                 primary={{ label: 'Request export', onClick: onClose }}
                 secondary={{ label: 'Cancel', onClick: onClose }}>
      <div className="form-field">
        <label>Report</label>
        <select className="form-select" value={kind} onChange={e => setKind(e.target.value)}>
          <option value="orders">Orders</option>
          <option value="customers">Customers</option>
          <option value="sales_by_item">Sales by item</option>
        </select>
      </div>
      <div className="form-field">
        <label>Date range</label>
        <select className="form-select" value={range} onChange={e => setRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom…</option>
        </select>
      </div>
      <div className="form-field">
        <label>Format</label>
        <div className="form-radio-group">
          <div className={'form-radio' + (format === 'csv' ? ' active' : '')} onClick={() => setFormat('csv')}>CSV</div>
          <div className={'form-radio' + (format === 'xlsx' ? ' active' : '')} onClick={() => setFormat('xlsx')}>XLSX</div>
        </div>
      </div>
    </ActionModal>
  );
}

/* ============================================================
   Cheatsheet
   ============================================================ */
function Cheatsheet({ open, onClose }) {
  const items = [
    ['↓ / ↑', 'Move row focus'],
    ['j / k', 'Move row focus'],
    ['Enter', 'Open drawer'],
    ['Esc', 'Close drawer / modal'],
    ['Space', 'Toggle row selection'],
    ['⌘A', 'Select all on page'],
    ['/ or ⌘F', 'Focus search'],
    ['1–8', 'Jump to status pill'],
    ['→', 'Advance status (in drawer)'],
    ['R', 'Refund (in drawer)'],
    ['C', 'Cancel (in drawer)'],
    ['?', 'Toggle this cheatsheet'],
  ];
  return (
    <ActionModal open={open} onClose={onClose} title="Keyboard shortcuts" width={520}
                 primary={{ label: 'Close', onClick: onClose }}>
      <div className="cs-grid">
        {items.map(([k, d], i) => (
          <div className="row" key={i}>
            <span>{d}</span>
            <span className="cs-key">{k}</span>
          </div>
        ))}
      </div>
    </ActionModal>
  );
}

Object.assign(window, {
  buildOrderColumns,
  OrderDrawerBody,
  RefundModal,
  CancelModal,
  ExportModal,
  Cheatsheet,
  fmtUSD,
  fmtPlural,
});
