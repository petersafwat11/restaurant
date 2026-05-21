/* global React, window, Recharts */
const { useState, useEffect, useMemo, useRef } = React;
const Icon = window.Icon;

const {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} = window.Recharts || {};

const HEX = window.MOCK.STATUS_HEX;

/* ============================================================
   Helpers
   ============================================================ */
const fmtUSD = (n, opts = {}) => {
  const { abbrev = false, decimals = 2 } = opts;
  if (abbrev) {
    if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return '$' + Math.round(n);
  }
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const fmtPct = n => n.toFixed(1) + '%';
const fmtRelTime = ts => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  return h + 'h ago';
};
const fmtPrep = sec => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

/* ============================================================
   KPI Card
   ============================================================ */
function KpiCard({ label, value, valueColor, delta, sparkData, sparkColor = '#7FE8C8' }) {
  const up = delta >= 0;
  return (
    <div className="card sm kpi">
      <div className="label">
        <span className="t-caption">{label}</span>
      </div>
      <div className="value-block">
        <div className="value" style={{ color: valueColor || 'var(--text)' }}>{value}</div>
        <div className={'delta ' + (up ? 'up' : 'down')}>
          {up ? <Icon.ArrowUp size={12}/> : <Icon.ArrowDown size={12}/>}
          <span>{Math.abs(delta).toFixed(1)}%</span>
          <span className="since">vs. prev period</span>
        </div>
      </div>
      <div className="spark">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
            <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.75} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiRow({ data }) {
  const { kpis, series } = data;
  const sp = series.points.map(p => ({ v: p.revenue }));
  const so = series.points.map(p => ({ v: p.orders }));
  const sa = series.points.map(p => ({ v: p.orders ? p.revenue / Math.max(1, p.orders) : 0 }));

  const cr = kpis.completionRate;
  const crColor = cr >= 95 ? 'var(--positive)' : cr < 90 ? 'var(--negative)' : 'var(--text)';

  return (
    <div className="kpi-row">
      <KpiCard label="Revenue" value={fmtUSD(kpis.revenue, { decimals: 0 })} delta={kpis.deltas.revenue} sparkData={sp}/>
      <KpiCard label="Orders" value={fmtInt(kpis.orders)} delta={kpis.deltas.orders} sparkData={so}/>
      <KpiCard label="Avg order value" value={fmtUSD(kpis.aov)} delta={kpis.deltas.aov} sparkData={sa}/>
      <KpiCard label="Completion rate" value={fmtPct(kpis.completionRate)} valueColor={crColor} delta={kpis.deltas.completionRate} sparkData={sp.slice(0, 12)}/>
      <KpiCard label="New customers" value={fmtInt(kpis.newCustomers)} delta={kpis.deltas.newCustomers} sparkData={so}/>
    </div>
  );
}

/* ============================================================
   Revenue chart
   ============================================================ */
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="t">{label}</div>
      {payload.map(p => (
        <div className="row" key={p.dataKey}>
          <span className="lbl">
            <span className="sw" style={{ background: p.stroke }}/>
            {p.dataKey === 'revenue' ? 'Revenue' : 'Orders'}
          </span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>
            {p.dataKey === 'revenue' ? fmtUSD(p.value, { decimals: 0 }) : fmtInt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueChart({ data, range }) {
  const [showOrders, setShowOrders] = useState(false);
  const points = data.series.points;

  return (
    <div className="card" style={{ minHeight: 360 }}>
      <div className="card-head">
        <h2 className="t-h2">Revenue</h2>
        <div className="right">
          <div className="legend-toggle" role="group" aria-label="Series">
            <button aria-pressed={true}>
              <span className="swatch" style={{ background: 'var(--accent)' }}/>
              Revenue
            </button>
            <button aria-pressed={showOrders} onClick={() => setShowOrders(o => !o)}>
              <span className="swatch" style={{ background: 'var(--info)' }}/>
              Orders
            </button>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7FE8C8" stopOpacity={0.25}/>
                <stop offset="100%" stopColor="#7FE8C8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
            <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fill: '#5B6070', fontSize: 11 }}
                   interval={range === 'today' ? 2 : range === '7d' ? 0 : 4}/>
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5B6070', fontSize: 11 }}
                   tickFormatter={v => v >= 1000 ? '$' + (v/1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/,'') + 'k' : '$' + v}
                   width={48}/>
            <Tooltip content={<RevenueTooltip/>} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeDasharray: '3 3' }}/>
            <Area type="monotone" dataKey="revenue" stroke="#7FE8C8" strokeWidth={2}
                  fill="url(#revGrad)" isAnimationActive={true} animationDuration={400}/>
            {showOrders && (
              <Area type="monotone" dataKey="orders" stroke="#A78BFA" strokeWidth={1.5}
                    fill="transparent" yAxisId={0} isAnimationActive={true}/>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* a11y summary */}
      <table className="sr-only" aria-label="Revenue data">
        <thead><tr><th>Time</th><th>Revenue</th><th>Orders</th></tr></thead>
        <tbody>{points.map(p => <tr key={p.t}><td>{p.t}</td><td>{p.revenue}</td><td>{p.orders}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Orders by status donut
   ============================================================ */
function StatusDonut({ data, range }) {
  const items = data.byStatus;
  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="card" style={{ minHeight: 360, display: 'flex', flexDirection: 'column' }}>
      <div className="card-head">
        <h2 className="t-h2">Orders by status</h2>
        <span className="t-caption">{range === 'today' ? 'Today' : range === '7d' ? '7 days' : '30 days'}</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={items} dataKey="count" nameKey="status"
                 innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270}
                 stroke="var(--surface)" strokeWidth={2} paddingAngle={1}
                 isAnimationActive={true} animationDuration={500}>
              {items.map(it => <Cell key={it.status} fill={HEX[it.status]}/>)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const pct = ((p.value / total) * 100).toFixed(1);
              return (
                <div className="chart-tooltip">
                  <div className="row">
                    <span className="lbl">
                      <span className="sw" style={{ background: p.payload.fill }}/>
                      {p.name.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.value} · {pct}%</span>
                  </div>
                </div>
              );
            }}/>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <div style={{ textAlign: 'center' }}>
            <div className="big">{fmtInt(total)}</div>
            <div className="small">Orders {range === 'today' ? 'today' : range === '7d' ? '· 7d' : '· 30d'}</div>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {items.map(it => {
          const pct = total ? ((it.count / total) * 100) : 0;
          return (
            <div className="item" key={it.status}>
              <span className="sw" style={{ background: HEX[it.status] }}/>
              <span className="name">{it.status.replace(/_/g, ' ').toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase())}</span>
              <span className="cnt tnum">{fmtInt(it.count)}</span>
              <span className="pct tnum">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Top items table
   ============================================================ */
function TopItems({ data }) {
  const [tab, setTab] = useState('revenue');
  const items = useMemo(() => {
    const arr = [...data.topItems];
    arr.sort((a, b) => tab === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty);
    return arr;
  }, [data, tab]);

  return (
    <div className="card" style={{ minHeight: 320 }}>
      <div className="card-head">
        <h2 className="t-h2">Top items</h2>
        <div className="right">
          <div className="tabs">
            <button aria-pressed={tab === 'revenue'} onClick={() => setTab('revenue')}>By revenue</button>
            <button aria-pressed={tab === 'qty'} onClick={() => setTab('qty')}>By quantity</button>
          </div>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Item</th>
            <th className="ralign">Qty sold</th>
            <th className="ralign">Revenue</th>
            <th className="ralign">Trend</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} tabIndex={0}>
              <td>
                <div className="item-cell">
                  <div className="item-thumb">{it.name[0]}</div>
                  <div className="item-meta">
                    <div className="name">{it.name}</div>
                    <div className="cat">{it.category}</div>
                  </div>
                </div>
              </td>
              <td className="ralign tnum">{fmtInt(it.qty)}</td>
              <td className="ralign tnum">{fmtUSD(it.revenue)}</td>
              <td className="ralign">
                <div style={{ width: 64, height: 24, marginLeft: 'auto' }}>
                  <ResponsiveContainer>
                    <LineChart data={it.sparkline.map(v => ({ v }))}>
                      <Line type="monotone" dataKey="v" stroke="#7FE8C8" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card-foot">
        <a href="#" className="link-accent" onClick={e => e.preventDefault()}>
          View full report <Icon.Arrow size={12}/>
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   Live panel
   ============================================================ */
function LivePanel({ data }) {
  const { live } = data;
  return (
    <div className="card" style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
      <div className="card-head">
        <h2 className="t-h2">
          <span className="pulse-dot"/>
          Live
        </h2>
        <span className="t-caption">Realtime</span>
      </div>
      <div style={{ flex: 1 }}>
        <div className="live-stat">
          <div>
            <div className="l">Active orders</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Confirmed → Out for delivery</div>
          </div>
          <div className="v">{live.activeOrders}</div>
        </div>
        <div className="live-stat">
          <div>
            <div className="l">In the kitchen</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Currently being prepared</div>
          </div>
          <div className="v">{live.inKitchen}</div>
        </div>
        <div className="live-stat">
          <div>
            <div className="l">Avg prep time</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Confirmed → Ready, today</div>
          </div>
          <div className="v">{fmtPrep(live.avgPrepSeconds)}</div>
        </div>
      </div>
      <div className="live-actions">
        <button className="btn-ghost">Open orders <Icon.Arrow size={12}/></button>
        <button className="btn-ghost">Kitchen view <Icon.Arrow size={12}/></button>
      </div>
    </div>
  );
}

/* ============================================================
   Recent orders feed
   ============================================================ */
function RecentOrders({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [tick, setTick] = useState(0);
  const counterRef = useRef(1500);

  // re-sync if initial changes (range switch)
  useEffect(() => { setOrders(initialOrders); }, [initialOrders]);

  // periodically prepend a new order
  useEffect(() => {
    const rnd = window.MOCK.mulberry32(Date.now() & 0xffff);
    let timer;
    function schedule() {
      const delay = 12000 + Math.random() * 13000;
      timer = setTimeout(() => {
        const fresh = window.MOCK.makeOrder(rnd, 1);
        fresh.id = 'ord_' + (counterRef.current++);
        fresh.orderNumber = 'R-2026-' + String(1248 + counterRef.current).padStart(6, '0');
        fresh.placedAt = Date.now();
        fresh.isNew = true;
        setOrders(prev => {
          const next = [fresh, ...prev].slice(0, 8);
          return next;
        });
        // strip isNew after 3s
        setTimeout(() => {
          setOrders(prev => prev.map(o => o.id === fresh.id ? { ...o, isNew: false } : o));
        }, 3000);
        schedule();
      }, delay);
    }
    schedule();
    // tick for relative time
    const tickT = setInterval(() => setTick(t => t + 1), 15000);
    return () => { clearTimeout(timer); clearInterval(tickT); };
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="t-h2">Recent orders</h2>
        <a href="#" className="link-accent" onClick={e => e.preventDefault()}>
          View all <Icon.Arrow size={12}/>
        </a>
      </div>
      <table className="tbl orders-tbl">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Type</th>
            <th>Status</th>
            <th className="ralign">Total</th>
            <th className="ralign">Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className={o.isNew ? 'live-new' : ''} tabIndex={0}>
              <td><span className="ord-num">{o.orderNumber}</span></td>
              <td>
                <div className="cust-cell">
                  <span className="avatar sm">{o.customer.firstName[0]}{o.customer.lastInitial}</span>
                  <span>{o.customer.firstName} {o.customer.lastInitial}.</span>
                </div>
              </td>
              <td>
                <span className="items-cell" title={o.items}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{o.itemCount} items · </span>
                  {o.items.split(' · ')[1]}
                </span>
              </td>
              <td><span className="badge">{o.type.replace('_', ' ')}</span></td>
              <td>
                <span className="status-cell">
                  <span className="status-dot" style={{ background: HEX[o.status] }}/>
                  <span>{o.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                </span>
              </td>
              <td className="ralign tnum">{fmtUSD(o.total)}</td>
              <td className="ralign" style={{ color: 'var(--text-tertiary)' }}>{fmtRelTime(o.placedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { KpiRow, RevenueChart, StatusDonut, TopItems, LivePanel, RecentOrders });
