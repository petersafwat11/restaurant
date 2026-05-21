/* global React, ReactDOM, window */
const { useState, useEffect, useMemo, useRef, useCallback } = React;
const Icon = window.Icon;
const {
  Sidebar, Topbar,
  PageHeader, FilterPillGroup, StatusPill, TypeBadge, RelativeTime,
  BulkActionBar, DetailDrawer, ActivityTimeline, ActionModal, DataTable,
  Button,
  STATUS_MAP, TRANSITIONS, ADVANCE_NEXT,
  buildOrderColumns, OrderDrawerBody, RefundModal, CancelModal, ExportModal, Cheatsheet,
  fmtUSD,
} = window;

/* ============================================================
   Topbar extras
   ============================================================ */
function LivePulseChip({ count, onClick }) {
  if (count > 0) {
    return (
      <button className="live-chip" onClick={onClick}>
        <span className="pulse-dot" style={{ margin: 0 }}/>
        <span><span className="tnum">{count}</span> new in last 5 min</span>
      </button>
    );
  }
  return (
    <span className="live-chip idle">
      <span className="status-dot" style={{ background: 'var(--text-tertiary)' }}/>
      All caught up
    </span>
  );
}

function SoundToggle({ muted, onToggle }) {
  return (
    <button className={'icon-btn' + (muted ? ' muted' : '')} onClick={onToggle}
            aria-label={muted ? 'Unmute new-order chime' : 'Mute new-order chime'}>
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4z"/>
          <path d="m22 9-6 6M16 9l6 6"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4z"/>
          <path d="M16 9a4 4 0 0 1 0 6"/>
          <path d="M19 6a8 8 0 0 1 0 12"/>
        </svg>
      )}
    </button>
  );
}

/* ============================================================
   Filter controls
   ============================================================ */
function MultiSelectDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const summary = value.length === 0 ? label : `${label}: ${value.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="ms-trigger" onClick={() => setOpen(o => !o)}>
        <span>{summary}</span>
        {value.length > 0 && <span className="ms-count">{value.length}</span>}
        <Icon.Chevron size={12}/>
      </button>
      {open && (
        <div className="popover" style={{ left: 0, minWidth: 200 }}>
          {options.map(opt => (
            <div key={opt} className="opt"
                 onClick={() => {
                   const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt];
                   onChange(next);
                 }}>
              <input type="checkbox" readOnly checked={value.includes(opt)}/>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSelectDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="ms-trigger" onClick={() => setOpen(o => !o)}>
        <span>{label}: <span style={{ color: 'var(--text)' }}>{value}</span></span>
        <Icon.Chevron size={12}/>
      </button>
      {open && (
        <div className="popover" style={{ left: 0, minWidth: 200 }}>
          {options.map(o => (
            <div key={o} className={'opt' + (o === value ? ' active' : '')}
                 onClick={() => { onChange(o); setOpen(false); }}>
              <span>{o}</span>
              <span className="check"><Icon.Check size={14}/></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Drawer header + footer
   ============================================================ */
function DrawerHeader({ order, onClose }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="t-h2" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}>
            {order.orderNumber}
          </h2>
          <TypeBadge label={order.type.replace('_', ' ')}/>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close drawer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 6 12 12M18 6 6 18"/>
          </svg>
        </button>
      </div>
      <div className="dd-meta">
        <span>{order.customer.firstName} {order.customer.lastName}</span>
        <span className="sep">·</span>
        <span className="tnum">{order.customer.phone}</span>
        <span className="sep">·</span>
        <RelativeTime at={order.placedAt}/>
      </div>
      <div style={{ marginTop: 12 }}>
        <StatusPill status={order.status} size="md"/>
      </div>
    </>
  );
}

function DrawerFooter({ order, onAdvance, onRefund, onCancel }) {
  const nextStatus = TRANSITIONS[order.status]?.[0];
  const isTerminal = ['DELIVERED','CANCELLED'].includes(order.status);
  const nextLabel = nextStatus ? STATUS_MAP[nextStatus]?.label : '';
  return (
    <>
      <button className="btn btn-primary" disabled={!nextStatus} onClick={() => nextStatus && onAdvance(order, nextStatus)}
              style={{ flex: 1 }}>
        {nextStatus ? `Advance to ${nextLabel} →` : isTerminal ? 'Order complete' : 'No next state'}
      </button>
      <button className="btn btn-ghost" onClick={() => onRefund(order)}
              disabled={isTerminal && order.status === 'CANCELLED'}>
        Refund
      </button>
      {!isTerminal && (
        <button className="btn btn-ghost" onClick={() => onCancel(order)} style={{ color: 'var(--negative)' }}>
          Cancel
        </button>
      )}
      <button className="btn btn-ghost">Print</button>
    </>
  );
}

/* ============================================================
   Main App
   ============================================================ */
function App() {
  const [collapsed, setCollapsed] = useState(false);

  // data
  const [orders, setOrders] = useState(() => window.OrdersMock.buildAllOrders());
  const [newCounter, setNewCounter] = useState(0); // for new-orders-in-last-5-min

  // filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState([]);
  const [location, setLocation] = useState('The Test Kitchen');
  const [range, setRange] = useState('today');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortLabel, setSortLabel] = useState('Newest first');

  // table
  const [selected, setSelected] = useState(new Set());
  const [focusedKey, setFocusedKey] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // drawer + modals
  const [openId, setOpenId] = useState(null);
  const [refundFor, setRefundFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);

  // UX
  const [muted, setMuted] = useState(() => localStorage.getItem('admin.sound.muted') === 'true');
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const searchRef = useRef(null);

  // collapse sidebar on narrow
  useEffect(() => {
    function onResize() { setCollapsed(window.innerWidth < 1280); }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  // live arrivals every 8–20s
  useEffect(() => {
    let timer;
    function schedule() {
      const delay = 8000 + Math.random() * 12000;
      timer = setTimeout(() => {
        const seq = 1247 + 247 + window.__newOrderSeq;
        const rnd = window.OrdersMock.mulberry32(Date.now() & 0xffff);
        const fresh = window.OrdersMock.makeOrderDetail(rnd, seq, {
          status: 'PENDING', secondsAgo: 1, isNew: true,
        });
        fresh.orderNumber = 'R-2026-' + String(2764 + 247 + window.__newOrderSeq).padStart(6, '0');
        window.__newOrderSeq++;
        setOrders(prev => [fresh, ...prev]);
        setNewCounter(c => c + 1);
        // chime — silent stub, but document.title flash so the live signal is visible
        if (!muted && document.hidden) {
          // would play /sounds/new-order.mp3 here
        }
        // strip isNew after 3s
        setTimeout(() => {
          setOrders(prev => prev.map(o => o.id === fresh.id ? { ...o, isNew: false } : o));
        }, 3000);
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timer);
  }, [muted]);

  // newCounter decays over 5 minutes
  useEffect(() => {
    const id = setInterval(() => setNewCounter(c => Math.max(0, c - 1)), 25000);
    return () => clearInterval(id);
  }, []);

  /* derived */
  const counts = useMemo(() => window.OrdersMock.statusCounts(orders), [orders]);

  const filtered = useMemo(() => {
    let f = orders;
    if (statusFilter !== 'all') f = f.filter(o => o.status === statusFilter);
    if (typeFilter.length) f = f.filter(o => typeFilter.includes(o.type));
    if (paymentFilter.length) f = f.filter(o => {
      const ps = o.paymentStatus;
      return paymentFilter.some(p => p.toLowerCase() === ps);
    });
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      f = f.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customer.firstName + ' ' + o.customer.lastName).toLowerCase().includes(q) ||
        o.customer.phone.toLowerCase().includes(q)
      );
    }
    if (sortLabel === 'Oldest first') f = [...f].sort((a, b) => a.placedAt - b.placedAt);
    else if (sortLabel === 'Highest total') f = [...f].sort((a, b) => b.total - a.total);
    else if (sortLabel === 'Longest wait') f = [...f].sort((a, b) => (b.elapsedSinceConfirmedSec || 0) - (a.elapsedSinceConfirmedSec || 0));
    return f;
  }, [orders, statusFilter, typeFilter, paymentFilter, debouncedSearch, sortLabel]);

  const pageOrders = useMemo(
    () => filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filtered, pageIndex, pageSize]
  );
  useEffect(() => { setPageIndex(0); }, [statusFilter, typeFilter, paymentFilter, debouncedSearch, sortLabel]);

  // show loading overlay briefly on filter change for UX polish
  useEffect(() => {
    setLoadingOverlay(true);
    const id = setTimeout(() => setLoadingOverlay(false), 220);
    return () => clearTimeout(id);
  }, [statusFilter, typeFilter, paymentFilter, debouncedSearch, sortLabel, pageIndex, pageSize]);

  const selectedOrders = useMemo(() => orders.filter(o => selected.has(o.id)), [orders, selected]);
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.total, 0);
  const allSelSameStatus = selectedOrders.length > 0 && new Set(selectedOrders.map(o => o.status)).size === 1;
  const selStatus = allSelSameStatus ? selectedOrders[0].status : null;
  const canAdvanceSel = selStatus && TRANSITIONS[selStatus]?.length > 0;

  /* actions */
  const advance = useCallback((order, next) => {
    const nextStatus = next || TRANSITIONS[order.status]?.[0];
    if (!nextStatus) return;
    setOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: nextStatus,
      timeline: [...o.timeline, {
        id: 'ev_' + Date.now(),
        status: nextStatus,
        at: Date.now(),
        actor: 'Maya R.',
        role: 'Manager',
      }],
    } : o));
  }, []);

  const openOrder = useCallback((order) => setOpenId(order.id), []);
  const closeDrawer = useCallback(() => setOpenId(null), []);
  const openOrderObj = useMemo(() => orders.find(o => o.id === openId), [orders, openId]);

  const refundFn = useCallback((order) => setRefundFor(order), []);
  const cancelFn = useCallback((order) => setCancelFor(order), []);

  const orderColumns = useMemo(() =>
    buildOrderColumns({
      onAdvance: advance,
      onView: openOrder,
      onRefund: refundFn,
      onCancel: cancelFn,
    }),
    [advance, openOrder, refundFn, cancelFn]
  );

  const rowDecorator = useCallback((o) => {
    const ageSec = (Date.now() - o.placedAt) / 1000;
    if (o.status === 'PENDING' && ageSec > 120) return { borderLeft: 'var(--negative)' };
    if (o.isNew) return { isNew: true };
    return {};
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      // ? toggles cheatsheet
      if (e.key === '?' && !inField) { e.preventDefault(); setCheatOpen(v => !v); return; }
      // Esc handled by modals/drawer
      // search focus
      if ((e.key === '/' && !inField) || (e.key === 'f' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      // status pill numbers 1–8
      if (!inField && /^[1-8]$/.test(e.key)) {
        const map = ['all','PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
        setStatusFilter(map[Number(e.key) - 1]);
        return;
      }
      // ⌘A select all on page
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !inField) {
        e.preventDefault();
        const next = new Set(selected);
        pageOrders.forEach(o => next.add(o.id));
        setSelected(next);
        return;
      }
      if (inField) return;
      // row nav
      if (e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const ids = pageOrders.map(o => o.id);
        const cur = focusedKey ? ids.indexOf(focusedKey) : -1;
        const delta = (e.key === 'j' || e.key === 'ArrowDown') ? 1 : -1;
        const next = Math.max(0, Math.min(ids.length - 1, cur + delta));
        setFocusedKey(ids[next]);
        // scroll into view in a controlled way
        const row = document.querySelector(`tr[data-row-key="${ids[next]}"]`);
        if (row) {
          const rect = row.getBoundingClientRect();
          if (rect.top < 100 || rect.bottom > window.innerHeight - 40) {
            window.scrollBy({ top: rect.top - 200, behavior: 'instant' });
          }
        }
        return;
      }
      if (e.key === 'Enter' && focusedKey) {
        const o = orders.find(x => x.id === focusedKey);
        if (o) openOrder(o);
      }
      if (e.key === ' ' && focusedKey) {
        e.preventDefault();
        setSelected(prev => {
          const next = new Set(prev);
          if (next.has(focusedKey)) next.delete(focusedKey); else next.add(focusedKey);
          return next;
        });
      }
      // drawer shortcuts
      if (openOrderObj) {
        if (e.key === 'ArrowRight') { advance(openOrderObj); }
        if (e.key.toLowerCase() === 'r') setRefundFor(openOrderObj);
        if (e.key.toLowerCase() === 'c') setCancelFor(openOrderObj);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageOrders, focusedKey, selected, openOrderObj, orders, advance, openOrder]);

  /* status pill options */
  const pillOptions = [
    { id: 'all', label: 'All', count: counts.ALL },
    { id: 'PENDING', label: 'Pending', count: counts.PENDING, color: STATUS_MAP.PENDING.color, dot: true },
    { id: 'CONFIRMED', label: 'Confirmed', count: counts.CONFIRMED, color: STATUS_MAP.CONFIRMED.color, dot: true },
    { id: 'PREPARING', label: 'Preparing', count: counts.PREPARING, color: STATUS_MAP.PREPARING.color, dot: true },
    { id: 'READY', label: 'Ready', count: counts.READY, color: STATUS_MAP.READY.color, dot: true },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for delivery', count: counts.OUT_FOR_DELIVERY, color: STATUS_MAP.OUT_FOR_DELIVERY.color, dot: true },
    { id: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED, color: STATUS_MAP.DELIVERED.color, dot: true },
    { id: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED, color: STATUS_MAP.CANCELLED.color, dot: true },
  ];

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <Sidebar collapsed={collapsed} activeId="orders"/>
      <main className="main">
        <Topbar title="Orders" range={range} setRange={setRange}
                showDateRange={false} showRestSwitch={false}
                leftExtras={
                  <LivePulseChip count={newCounter} onClick={() => {
                    setStatusFilter('all'); setNewCounter(0); window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}/>
                }
                rightExtras={
                  <>
                    <div className="tb-search" role="button" tabIndex={0} aria-label="Global search">
                      <Icon.Search size={14}/>
                      <span>Search orders, customers, items…</span>
                      <span className="kbd">⌘K</span>
                    </div>
                    <SoundToggle muted={muted} onToggle={() => {
                      const next = !muted; setMuted(next);
                      localStorage.setItem('admin.sound.muted', String(next));
                    }}/>
                    <button className="icon-btn" aria-label="Notifications"><Icon.Bell size={16}/><span className="dot"/></button>
                    <button className="icon-btn" aria-label="Settings"><Icon.Cog size={16}/></button>
                    <button className="icon-btn" aria-label="Account" style={{ width: 32, height: 32 }}>
                      <span className="avatar sm" style={{ width: 28, height: 28 }}>MR</span>
                    </button>
                  </>
                }/>

        <div className="content">
          <PageHeader
            rows={[
              <FilterPillGroup value={statusFilter} onChange={setStatusFilter} options={pillOptions}/>,
              <>
                <MultiSelectDropdown label="Type" options={['Delivery','Pickup','Dine-in']}
                                     value={typeFilter.map(t => t === 'DINE_IN' ? 'Dine-in' : t[0] + t.slice(1).toLowerCase())}
                                     onChange={v => setTypeFilter(v.map(x => x === 'Dine-in' ? 'DINE_IN' : x.toUpperCase()))}/>
                <SingleSelectDropdown label="When" options={['Today','7 days','30 days','Custom…']}
                                      value={range === 'today' ? 'Today' : range === '7d' ? '7 days' : range === '30d' ? '30 days' : 'Custom…'}
                                      onChange={v => setRange(v === 'Today' ? 'today' : v === '7 days' ? '7d' : v === '30 days' ? '30d' : 'custom')}/>
                <SingleSelectDropdown label="Location" options={['The Test Kitchen','Brick Lane Annex']}
                                      value={location} onChange={setLocation}/>
                <MultiSelectDropdown label="Payment" options={['Paid','Pending','Refunded']}
                                     value={paymentFilter} onChange={setPaymentFilter}/>
                <div style={{ flex: 1 }}/>
                <div className="input-search">
                  <Icon.Search size={14}/>
                  <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                         placeholder="Search by order #, customer, or phone…"/>
                  <span className="kbd" style={{
                    fontSize: 11, padding: '1px 5px', borderRadius: 4,
                    background: 'var(--surface-elev)', border: '1px solid var(--border)',
                    color: 'var(--text-tertiary)', fontFamily: 'ui-monospace, monospace'
                  }}>/</span>
                </div>
              </>,
              <>
                <div style={{ flex: 1 }}/>
                <SingleSelectDropdown label="Sort" options={['Newest first','Oldest first','Highest total','Longest wait']}
                                      value={sortLabel} onChange={setSortLabel}/>
                <Button tone="accent-text" icon="FileBar" onClick={() => setExportOpen(true)}>Export</Button>
              </>,
            ]}
            bulk={
              <BulkActionBar
                count={selected.size}
                onClear={() => setSelected(new Set())}
                actions={[
                  {
                    label: canAdvanceSel ? `Advance to ${STATUS_MAP[TRANSITIONS[selStatus][0]].label}` : 'Advance',
                    icon: 'Arrow',
                    disabled: !canAdvanceSel,
                    tooltip: !allSelSameStatus ? 'All selected orders must share the same status' : undefined,
                    onClick: () => {
                      selectedOrders.forEach(o => advance(o));
                      setSelected(new Set());
                    },
                  },
                  { label: 'Print receipts', icon: 'FileBar', onClick: () => {} },
                  { label: 'Cancel', tone: 'destructive', onClick: () => {
                      if (selectedOrders[0]) setCancelFor(selectedOrders[0]);
                    } },
                ]}
                meta={selected.size ? `${fmtUSD(selectedTotal)} selected` : null}
              />
            }
          />

          <DataTable
            data={pageOrders}
            columns={orderColumns}
            rowKey={r => r.id}
            onRowClick={openOrder}
            selection={{ mode: 'multi', selected, onChange: setSelected }}
            pagination={{
              pageIndex, pageSize, total: filtered.length,
              onPageChange: setPageIndex,
              onPageSizeChange: ps => { setPageSize(ps); setPageIndex(0); },
            }}
            rowDecorator={rowDecorator}
            focusedKey={focusedKey}
            onFocusChange={setFocusedKey}
            loadingOverlay={loadingOverlay && filtered.length > 0}
            emptyState={
              <div>
                <div className="t-body" style={{ color: 'var(--text-secondary)' }}>
                  {statusFilter === 'all' && !debouncedSearch && typeFilter.length === 0 && paymentFilter.length === 0
                    ? 'No orders yet today. They\'ll appear here in real time.'
                    : 'No orders match these filters'}
                </div>
                {(statusFilter !== 'all' || debouncedSearch || typeFilter.length || paymentFilter.length) && (
                  <button className="btn btn-ghost" style={{ marginTop: 16 }}
                          onClick={() => { setStatusFilter('all'); setSearch(''); setTypeFilter([]); setPaymentFilter([]); }}>
                    Clear filters
                  </button>
                )}
              </div>
            }
          />
        </div>

        <DetailDrawer
          open={!!openOrderObj}
          onClose={closeDrawer}
          ariaLabel="Order detail"
          header={openOrderObj && <DrawerHeader order={openOrderObj} onClose={closeDrawer}/>}
          footer={openOrderObj && (
            <DrawerFooter
              order={openOrderObj}
              onAdvance={advance}
              onRefund={refundFn}
              onCancel={cancelFn}
            />
          )}>
          {openOrderObj && <OrderDrawerBody order={openOrderObj}/>}
        </DetailDrawer>

        <RefundModal order={refundFor} open={!!refundFor} onClose={() => setRefundFor(null)}
                     onSubmit={(data) => {
                       setOrders(prev => prev.map(o => o.id === refundFor.id ? {
                         ...o,
                         paymentStatus: data.amount >= o.total ? 'refunded' : 'partial',
                         refunds: [...o.refunds, { ...data, at: Date.now(), by: 'Maya R.' }],
                       } : o));
                     }}/>
        <CancelModal order={cancelFor} open={!!cancelFor} onClose={() => setCancelFor(null)}
                     onSubmit={(data) => {
                       setOrders(prev => prev.map(o => o.id === cancelFor.id ? {
                         ...o,
                         status: 'CANCELLED',
                         timeline: [...o.timeline, {
                           id: 'ev_cancel_' + Date.now(),
                           status: 'CANCELLED',
                           at: Date.now(),
                           actor: 'Maya R.',
                           role: 'Manager',
                           note: data.reason + (data.note ? ' — ' + data.note : ''),
                         }],
                       } : o));
                     }}/>
        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)}/>
        <Cheatsheet open={cheatOpen} onClose={() => setCheatOpen(false)}/>

        <button className="help-fab" onClick={() => setCheatOpen(true)} aria-label="Keyboard shortcuts">?</button>
      </main>
    </div>
  );
}

window.__newOrderSeq = 0;
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
