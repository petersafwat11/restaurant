/* global React, window */
const { useState, useRef, useEffect } = React;
const Icon = window.Icon;

/* ============================================================
   Sidebar
   ============================================================ */
const NAV = [
  { group: '', items: [
    { id: 'overview', label: 'Overview', icon: 'Home', href: 'Overview.html' },
  ]},
  { group: 'Operate', items: [
    { id: 'orders', label: 'Orders', icon: 'Receipt', count: 14, href: 'Orders.html' },
    { id: 'kds', label: 'Kitchen Display', icon: 'Utensils' },
    { id: 'reservations', label: 'Reservations', icon: 'Calendar', count: 6 },
  ]},
  { group: 'Catalog', items: [
    { id: 'menu', label: 'Menu', icon: 'Utensils', href: 'Menu.html' },
    { id: 'promos', label: 'Promotions', icon: 'Tag' },
  ]},
  { group: 'People', items: [
    { id: 'customers', label: 'Customers', icon: 'Users' },
    { id: 'reviews', label: 'Reviews', icon: 'Star', count: 3 },
    { id: 'staff', label: 'Staff', icon: 'Shield' },
  ]},
  { group: 'Insights', items: [
    { id: 'reports', label: 'Reports', icon: 'FileBar' },
    { id: 'audit', label: 'Audit log', icon: 'History' },
  ]},
  { group: 'Configure', items: [
    { id: 'locations', label: 'Locations', icon: 'MapPin' },
    { id: 'inbox', label: 'Contact messages', icon: 'Inbox', count: 2 },
    { id: 'settings', label: 'Settings', icon: 'Cog' },
  ]},
];

function Sidebar({ collapsed, onToggle, activeId = 'overview' }) {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <div className="mark">TK</div>
        <div className="name">Test Kitchen</div>
      </div>
      <div className="nav-scroll">
        {NAV.map((g, gi) => (
          <div className="nav-group" key={gi}>
            {g.group && <div className="nav-group-label">{g.group}</div>}
            {g.items.map(it => {
              const Ico = Icon[it.icon] || Icon.Home;
              const isActive = it.id === activeId;
              const href = it.href || '#';
              return (
                <a key={it.id}
                   className={'nav-item' + (isActive ? ' active' : '')}
                   href={href}
                   tabIndex={0}
                   onClick={e => { if (!it.href) e.preventDefault(); }}
                   aria-current={isActive ? 'page' : undefined}>
                  <Ico size={16}/>
                  <span className="nav-label">{it.label}</span>
                  {it.count != null && <span className="count">{it.count}</span>}
                </a>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <div className="avatar sm">MR</div>
        <div className="sidebar-foot-text">
          <div className="n">Maya Reyes</div>
          <div className="r">Owner</div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Topbar
   ============================================================ */
function Topbar({ title = 'Overview', range, setRange, showDateRange = true, showRestSwitch = true, leftExtras, rightExtras }) {
  const [restOpen, setRestOpen] = useState(false);
  const [currentRest, setCurrentRest] = useState('The Test Kitchen');

  return (
    <div className="topbar" role="banner">
      <h1 className="tb-title">{title}</h1>

      {showRestSwitch && (
        <div style={{ position: 'relative' }}>
          <button className="rest-switch" onClick={() => setRestOpen(o => !o)} aria-haspopup="listbox" aria-expanded={restOpen}>
            <span className="glyph">TK</span>
            <span>{currentRest}</span>
            <Icon.Chevron size={14}/>
          </button>
          {restOpen && (
            <div className="popover" role="listbox" style={{ left: 0 }} onMouseLeave={() => setRestOpen(false)}>
              {['The Test Kitchen', 'Brick Lane Annex'].map(n => (
                <div key={n}
                     className={'opt' + (n === currentRest ? ' active' : '')}
                     role="option"
                     aria-selected={n === currentRest}
                     onClick={() => { setCurrentRest(n); setRestOpen(false); }}>
                  <span className="glyph" style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: 'var(--surface)', display: 'grid', placeItems: 'center',
                    fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)'
                  }}>{n.split(' ').map(x => x[0]).join('').slice(0,2)}</span>
                  <span>{n}</span>
                  <span className="check"><Icon.Check size={14}/></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDateRange && <DateRangeSegment range={range} setRange={setRange}/>}

      {leftExtras}

      <div className="tb-spacer"/>

      {rightExtras || (
        <>
          <div className="tb-search" role="button" tabIndex={0} aria-label="Global search">
            <Icon.Search size={14}/>
            <span>Search orders, customers, items…</span>
            <span className="kbd">⌘K</span>
          </div>

          <button className="icon-btn" aria-label="Notifications">
            <Icon.Bell size={16}/>
            <span className="dot"/>
          </button>
          <button className="icon-btn" aria-label="Settings">
            <Icon.Cog size={16}/>
          </button>
          <button className="icon-btn" aria-label="Account" style={{ width: 32, height: 32 }}>
            <span className="avatar sm" style={{ width: 28, height: 28 }}>MR</span>
          </button>
        </>
      )}
    </div>
  );
}

function DateRangeSegment({ range, setRange }) {
  const segs = [
    { id: 'today', label: 'Today' },
    { id: '7d',    label: '7 days' },
    { id: '30d',   label: '30 days' },
    { id: 'custom', label: 'Custom' },
  ];
  const [customOpen, setCustomOpen] = useState(false);
  const refs = useRef([]);

  function onKey(e, i) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (i + dir + segs.length) % segs.length;
      refs.current[next]?.focus();
      const id = segs[next].id;
      if (id !== 'custom') setRange(id);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="segmented" role="tablist" aria-label="Date range">
        {segs.map((s, i) => (
          <button key={s.id}
                  ref={el => refs.current[i] = el}
                  role="tab"
                  aria-pressed={range === s.id || (s.id === 'custom' && customOpen)}
                  onClick={() => {
                    if (s.id === 'custom') setCustomOpen(o => !o);
                    else { setRange(s.id); setCustomOpen(false); }
                  }}
                  onKeyDown={e => onKey(e, i)}>
            {s.id === 'custom' && <Icon.Calendar size={12}/>}
            {s.label}
          </button>
        ))}
      </div>
      {customOpen && (
        <div className="popover" style={{ right: 0, minWidth: 260 }}>
          <div style={{ padding: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>Custom range</div>
          <div style={{ display: 'flex', gap: 8, padding: 8 }}>
            <input type="date" defaultValue="2026-05-01"
                   style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)',
                            border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px',
                            fontFamily: 'inherit', fontSize: 12 }}/>
            <input type="date" defaultValue="2026-05-15"
                   style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)',
                            border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px',
                            fontFamily: 'inherit', fontSize: 12 }}/>
          </div>
          <div className="opt" onClick={() => setCustomOpen(false)}
               style={{ color: 'var(--accent)', justifyContent: 'center' }}>
            Apply
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar });
