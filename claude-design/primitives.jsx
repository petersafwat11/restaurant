/* global React, window */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const Icon = window.Icon;

/* ============================================================
   STATUS / TYPE MAPS (shared)
   ============================================================ */
const STATUS_MAP = {
  PENDING:          { label: 'Pending',          color: '#5B6070' },
  CONFIRMED:        { label: 'Confirmed',        color: '#A78BFA' },
  PREPARING:        { label: 'Preparing',        color: '#FBBF24' },
  READY:            { label: 'Ready',            color: '#7FE8C8' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', color: '#60A5FA' },
  DELIVERED:        { label: 'Delivered',        color: '#34D399' },
  CANCELLED:        { label: 'Cancelled',        color: '#F87171' },
  REFUNDED:         { label: 'Refunded',         color: '#A78BFA' },
};

// next valid transitions
const ADVANCE_NEXT = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'OUT_FOR_DELIVERY',     // for delivery; for pickup/dine_in we use DELIVERED
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const TRANSITIONS = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY:     ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const PAYMENT_MAP = {
  paid:      { label: 'Paid',      color: '#34D399' },
  pending:   { label: 'Pending',   color: '#FBBF24' },
  refunded:  { label: 'Refunded',  color: '#A78BFA' },
  partial:   { label: 'Partial',   color: '#A78BFA' },
};

/* ============================================================
   1. PageHeader
   ============================================================
   /** @example
   *   <PageHeader rows={[<FilterRow/>, <SearchRow/>, <ActionsRow/>]} bulk={selected.size ? <BulkActionBar .../> : null}/>
   */
function PageHeader({ title, rows = [], bulk }) {
  return (
    <div className="page-header">
      {title && <h1 className="t-h1 page-header-title">{title}</h1>}
      {rows.map((r, i) => (
        <div key={i} className="ph-row">{r}</div>
      ))}
      {bulk}
    </div>
  );
}

/* ============================================================
   2. FilterPillGroup
   ============================================================
   /** @example
   *   <FilterPillGroup value={status} onChange={setStatus}
   *     options={[{id:'all', label:'All', count:247}, {id:'PENDING', label:'Pending', count:6, color:'#FBBF24', dot:true}]}/>
   */
function FilterPillGroup({ value, onChange, options }) {
  return (
    <div className="fpg" role="tablist">
      {options.map(opt => (
        <button key={opt.id}
                role="tab"
                aria-selected={value === opt.id}
                className={'fpg-pill' + (value === opt.id ? ' active' : '')}
                onClick={() => onChange(opt.id)}>
          {opt.dot && (
            <span className="fpg-dot" style={{ background: opt.color || 'var(--text-tertiary)' }}/>
          )}
          <span>{opt.label}</span>
          {opt.count != null && <span className="fpg-count tnum">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   3. StatusPill (with optional transitions menu)
   ============================================================
   /** @example
   *   <StatusPill status={order.status} map={STATUS_MAP}
   *     transitions={TRANSITIONS[order.status]} onTransition={advance}/>
   */
function StatusPill({ status, map = STATUS_MAP, size = 'md', transitions, onTransition, disabled, withDot = true }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const m = map[status] || { label: status, color: 'var(--text-tertiary)' };
  const interactive = transitions && transitions.length > 0 && onTransition && !disabled;

  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (!wrapRef.current?.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="sp-wrap" ref={wrapRef}>
      <span className={'status-pill ' + size + (interactive ? ' interactive' : '') + (disabled ? ' disabled' : '')}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={e => { if (interactive) { e.stopPropagation(); setOpen(o => !o); } }}
            onKeyDown={e => {
              if (interactive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(o => !o); }
            }}
            style={{ '--sp-color': m.color }}>
        {withDot && <span className="status-dot" style={{ background: m.color }}/>}
        <span>{m.label}</span>
        {interactive && <Icon.Chevron size={12} stroke={1.75}/>}
      </span>
      {open && (
        <div className="popover sp-menu" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--text-tertiary)',
                        textTransform: 'uppercase', letterSpacing: '0.06em' }}>Advance to</div>
          {transitions.map(t => {
            const tm = map[t] || { label: t, color: 'var(--text)' };
            return (
              <div key={t} className="opt"
                   onClick={() => { onTransition(t); setOpen(false); }}>
                <span className="status-dot" style={{ background: tm.color }}/>
                <span>{tm.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </span>
  );
}

/* ============================================================
   4. TypeBadge — neutral, no fill
   ============================================================
   /** @example  <TypeBadge label="DELIVERY"/> */
function TypeBadge({ label, tone = 'neutral' }) {
  return <span className={'tb tb-' + tone}>{label}</span>;
}

/* ============================================================
   5. RelativeTime
   ============================================================
   /** @example <RelativeTime at={order.placedAt}/> */
function RelativeTime({ at, refreshMs = 15000, tooltipAbsolute = true }) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(t => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  let label;
  if (s < 5) label = 'just now';
  else if (s < 60) label = s + 's ago';
  else if (s < 3600) label = Math.floor(s / 60) + 'm ago';
  else if (s < 86400) label = Math.floor(s / 3600) + 'h ago';
  else label = Math.floor(s / 86400) + 'd ago';
  const abs = tooltipAbsolute ? new Date(at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : undefined;
  return <span title={abs}>{label}</span>;
}

/* ============================================================
   6. BulkActionBar
   ============================================================
   /** @example
   *   <BulkActionBar count={2} onClear={clearSel}
   *     actions={[{ label: 'Advance', icon: 'Arrow', onClick: advanceSel, disabled: !sameStatus }]}
   *     meta="$1,247.32 selected"/>
   */
function BulkActionBar({ count, onClear, actions = [], meta }) {
  if (!count) return null;
  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <div className="bb-left">
        <span className="bb-count tnum">{count} selected</span>
        <button className="link-accent" onClick={onClear}>Clear</button>
      </div>
      <div className="bb-mid">
        {actions.map((a, i) => {
          const Ico = a.icon ? Icon[a.icon] : null;
          return (
            <button key={i}
                    className={'bb-action' + (a.tone === 'destructive' ? ' destructive' : '')}
                    title={a.tooltip}
                    disabled={a.disabled}
                    onClick={a.onClick}>
              {Ico && <Ico size={14}/>}
              {a.label}
            </button>
          );
        })}
      </div>
      <div className="bb-right tnum">{meta}</div>
    </div>
  );
}

/* ============================================================
   7. DetailDrawer
   ============================================================
   /** @example
   *   <DetailDrawer open={!!sel} onClose={close} header={<DrawerHeader/>}
   *     footer={<DrawerFooter/>} ariaLabel="Order detail">
   *     <DrawerBody/>
   *   </DetailDrawer>
   */
function DetailDrawer({ open, onClose, width = 480, header, footer, children, ariaLabel }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const node = (
    <>
      <div className={'dd-backdrop' + (open ? ' open' : '')} onClick={onClose}/>
      <aside className={'dd' + (open ? ' open' : '')}
             style={{ width }}
             aria-label={ariaLabel} role="dialog">
        <div className="dd-head">{header}</div>
        <div className="dd-body">{children}</div>
        {footer && <div className="dd-foot">{footer}</div>}
      </aside>
    </>
  );
  // Portal to body so position:fixed is unambiguously viewport-relative
  return ReactDOM.createPortal(node, document.body);
}

/* ============================================================
   8. ActivityTimeline
   ============================================================
   /** @example
   *   <ActivityTimeline events={[
   *     { id:'e1', color:'#A78BFA', title:'Confirmed', at:Date.now()-1200000, actor:'Maya R.', role:'Owner' },
   *     { id:'e2', color:'#7FE8C8', title:'Ready', at:Date.now()-200000, current:true },
   *   ]}/>
   */
function ActivityTimeline({ events = [] }) {
  return (
    <ol className="atl">
      {events.map((e, i) => (
        <li key={e.id} className={'atl-item' + (e.current ? ' current' : '')}>
          <span className="atl-line"/>
          <span className="atl-dot" style={{ background: e.color, boxShadow: e.current ? `0 0 0 3px ${e.color}33` : 'none' }}/>
          <div className="atl-content">
            <div className="atl-title">{e.title}</div>
            <div className="atl-meta">
              <RelativeTime at={e.at}/>
              {e.actor && <span className="atl-actor">· {e.actor}{e.role && <span className="atl-role">{e.role}</span>}</span>}
            </div>
            {e.note && <div className="atl-note">{e.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ============================================================
   9. ActionModal
   ============================================================
   /** @example
   *   <ActionModal open={open} onClose={close} title="Refund order R-2026-002764"
   *     subtitle="Up to $67.78 available to refund."
   *     primary={{ label: 'Issue refund', onClick: submit, helper: 'This will email the customer' }}
   *     secondary={{ label: 'Cancel', onClick: close }}>
   *     <RefundForm/>
   *   </ActionModal>
   */
function ActionModal({ open, onClose, title, subtitle, children, primary, secondary, width = 440 }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const node = (
    <div className="am-backdrop" onClick={onClose}>
      <div className="am" style={{ width }} onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="am-head">
          <div>
            <div className="am-title">{title}</div>
            {subtitle && <div className="am-sub">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 6 12 12M18 6 6 18"/>
            </svg>
          </button>
        </div>
        <div className="am-body">{children}</div>
        <div className="am-foot">
          {primary?.helper && <span className="am-helper">{primary.helper}</span>}
          <div style={{ display: 'flex', gap: 8 }}>
            {secondary && (
              <button className="btn btn-ghost" onClick={secondary.onClick}>{secondary.label}</button>
            )}
            {primary && (
              <button className={'btn ' + (primary.tone === 'destructive' ? 'btn-destructive' : 'btn-primary')}
                      onClick={primary.onClick} disabled={primary.disabled}>
                {primary.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(node, document.body);
}

/* ============================================================
   10. DataTable<T>
   ============================================================
   /** @example
   *   <DataTable data={orders} columns={orderColumns} rowKey={r => r.id}
   *     selection={{mode:'multi', selected, onChange:setSel}}
   *     onRowClick={openDrawer}
   *     rowDecorator={r => ({ borderLeft: stale(r) ? 'var(--negative)' : undefined })}
   *     pagination={{ pageIndex, pageSize, total, onPageChange, onPageSizeChange }}/>
   */
function DataTable({
  data, columns, rowKey,
  onRowClick,
  selection,
  pagination,
  sort,
  rowDecorator,
  focusedKey,
  onFocusChange,
  loading,
  loadingOverlay,
  emptyState,
  errorState,
  stickyHeader = true,
}) {
  const selSet = selection?.selected;
  const allOnPageKeys = data.map(rowKey);
  const allSelectedOnPage = allOnPageKeys.length > 0 && allOnPageKeys.every(k => selSet?.has(k));
  const someSelectedOnPage = !allSelectedOnPage && allOnPageKeys.some(k => selSet?.has(k));

  function toggleAll() {
    if (!selection) return;
    const next = new Set(selSet);
    if (allSelectedOnPage) allOnPageKeys.forEach(k => next.delete(k));
    else allOnPageKeys.forEach(k => next.add(k));
    selection.onChange(next);
  }
  function toggleRow(k, e) {
    if (!selection) return;
    e?.stopPropagation();
    const next = new Set(selSet);
    if (next.has(k)) next.delete(k); else next.add(k);
    selection.onChange(next);
  }

  function onHeadClick(col) {
    if (!sort || !col.sortable) return;
    const dir = sort.id === col.id && sort.dir === 'asc' ? 'desc' : 'asc';
    sort.onChange({ id: col.id, dir });
  }

  if (errorState) {
    return (
      <div className="dt dt-state">
        <div className="dt-empty">
          <div className="t-h2">Couldn't load orders</div>
          <div className="t-small" style={{ marginTop: 4 }}>{errorState.message}</div>
          {errorState.onRetry && (
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={errorState.onRetry}>Retry</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dt-wrap">
      <div className={'dt' + (loadingOverlay ? ' overlayed' : '')}>
        <table className="tbl dt-tbl">
          <thead className={stickyHeader ? 'sticky' : ''}>
            <tr>
              {selection && (
                <th className="dt-cb">
                  <Checkbox checked={allSelectedOnPage}
                            indeterminate={someSelectedOnPage}
                            onChange={toggleAll}
                            ariaLabel="Select all on page"/>
                </th>
              )}
              {columns.map(c => (
                <th key={c.id}
                    className={(c.align === 'right' ? 'ralign' : '') + (c.sortable ? ' sortable' : '')}
                    style={{ width: c.width }}
                    onClick={() => onHeadClick(c)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {c.header}
                    {c.sortable && sort?.id === c.id && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={sort.dir === 'asc' ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'}/>
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="dt-skel-row">
                    {selection && <td className="dt-cb"><div className="skel" style={{ width: 14, height: 14 }}/></td>}
                    {columns.map(c => (
                      <td key={c.id} className={c.align === 'right' ? 'ralign' : ''}>
                        <div className="skel" style={{ width: c.skelWidth || '60%', height: 12 }}/>
                      </td>
                    ))}
                  </tr>
                ))
              : data.length === 0
              ? null
              : data.map(row => {
                  const k = rowKey(row);
                  const dec = rowDecorator ? rowDecorator(row) : {};
                  const isSelected = selSet?.has(k);
                  const isFocused = focusedKey === k;
                  return (
                    <tr key={k}
                        data-row-key={k}
                        tabIndex={0}
                        className={[
                          dec.isNew ? 'live-new' : '',
                          isSelected ? 'selected' : '',
                          isFocused ? 'focused' : '',
                          dec.dim ? 'dim' : '',
                        ].filter(Boolean).join(' ')}
                        style={dec.borderLeft ? { boxShadow: `inset 2px 0 0 ${dec.borderLeft}` } : undefined}
                        onClick={() => onRowClick?.(row)}
                        onFocus={() => onFocusChange?.(k)}>
                      {selection && (
                        <td className="dt-cb" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isSelected}
                                    onChange={e => toggleRow(k, e)}
                                    ariaLabel="Select row"/>
                        </td>
                      )}
                      {columns.map(c => (
                        <td key={c.id} className={c.align === 'right' ? 'ralign' : ''} style={{ width: c.width }}>
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && data.length === 0 && (
          <div className="dt-empty">{emptyState || 'No results.'}</div>
        )}
        {loadingOverlay && (
          <div className="dt-overlay-spinner"><div className="spinner"/></div>
        )}
      </div>
      {pagination && data.length > 0 && (
        <Pagination {...pagination}/>
      )}
    </div>
  );
}

/* ---- DataTable bits ---- */
function Checkbox({ checked, indeterminate, onChange, ariaLabel }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className="cb">
      <input ref={ref} type="checkbox" checked={!!checked} onChange={onChange} aria-label={ariaLabel}/>
      <span className="cb-box" aria-hidden="true">
        {checked && !indeterminate && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        )}
        {indeterminate && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0D12" strokeWidth="3" strokeLinecap="round">
            <path d="M5 12h14"/>
          </svg>
        )}
      </span>
    </label>
  );
}

function Pagination({ pageIndex, pageSize, total, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(total, (pageIndex + 1) * pageSize);

  function pages() {
    const cur = pageIndex;
    const last = pageCount - 1;
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const out = new Set([0, 1, last - 1, last, cur - 1, cur, cur + 1]);
    return Array.from(out).filter(i => i >= 0 && i <= last).sort((a, b) => a - b);
  }
  const ps = pages();

  return (
    <div className="dt-pag">
      <div className="dt-pag-left">
        <span className="t-small tnum">Showing {start}–{end} of {total.toLocaleString()}</span>
      </div>
      <div className="dt-pag-right">
        <span className="t-small" style={{ color: 'var(--text-tertiary)' }}>Rows per page</span>
        <select className="select-mini" value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <div className="dt-pag-pages">
          <button className="icon-btn sm" disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)} aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          {ps.map((p, i) => {
            const prev = ps[i - 1];
            const gap = prev != null && p - prev > 1;
            return (
              <React.Fragment key={p}>
                {gap && <span style={{ color: 'var(--text-tertiary)', padding: '0 4px' }}>…</span>}
                <button className={'pag-num' + (p === pageIndex ? ' active' : '')}
                        onClick={() => onPageChange(p)}>{p + 1}</button>
              </React.Fragment>
            );
          })}
          <button className="icon-btn sm" disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageIndex + 1)} aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Light helpers re-exported
   ============================================================ */
function Button({ tone = 'ghost', size = 'md', icon, children, ...rest }) {
  const Ico = icon ? Icon[icon] : null;
  return (
    <button className={`btn btn-${tone} btn-${size}`} {...rest}>
      {Ico && <Ico size={14}/>}
      {children}
    </button>
  );
}

Object.assign(window, {
  STATUS_MAP, TRANSITIONS, ADVANCE_NEXT, PAYMENT_MAP,
  PageHeader, FilterPillGroup, StatusPill, TypeBadge, RelativeTime,
  BulkActionBar, DetailDrawer, ActivityTimeline, ActionModal, DataTable,
  Checkbox, Button,
});
