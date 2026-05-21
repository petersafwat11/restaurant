/* global React, ReactDOM, window */
const { useState, useMemo, useEffect } = React;

function App() {
  const [range, setRange] = useState('today');
  const [collapsed, setCollapsed] = useState(false);

  const data = useMemo(() => window.MOCK.buildOverview(range), [range]);

  // collapse sidebar on narrow viewport
  useEffect(() => {
    function onResize() { setCollapsed(window.innerWidth < 1280); }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <window.Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} activeId="overview"/>
      <main className="main">
        <window.Topbar range={range} setRange={setRange}/>
        <div className="content">
          <window.KpiRow data={data}/>
          <div className="row-8-4">
            <window.RevenueChart data={data} range={range}/>
            <window.StatusDonut data={data} range={range}/>
          </div>
          <div className="row-8-4">
            <window.TopItems data={data}/>
            <window.LivePanel data={data}/>
          </div>
          <window.RecentOrders initialOrders={data.recentOrders}/>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
