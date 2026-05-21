/* global React, ReactDOM, window */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const Icon = window.Icon;
const {
  Sidebar, Topbar, PageHeader, FilterPillGroup, DataTable, BulkActionBar,
  TwoPaneLayout, ItemEditorDrawer,
  CategoryPane, CategoryModal, CategoryDeleteModal, ItemDeleteModal,
  buildItemColumns, formatMoney, Cheatsheet,
} = window;

/* ============================================================
   Toast (tiny)
   ============================================================ */
let toastSeq = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'success') => {
    const id = ++toastSeq;
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500);
  }, []);
  const node = (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.msg}</div>)}
    </div>
  );
  return [node, push];
}

/* ============================================================
   New blank item template
   ============================================================ */
function newItem(categoryId) {
  return {
    id: 'new_' + Date.now(),
    slug: '',
    categoryId: categoryId || null,
    name: '',
    description: '',
    basePrice: null,
    compareAt: null,
    currency: 'USD',
    calories: null,
    prepMinutes: null,
    spiceLevel: 0,
    featured: false,
    dietary: [],
    available: true,
    images: [],
    modifierGroups: [],
    schedule: null,
    updatedAt: Date.now(),
  };
}

/* ============================================================
   Main App
   ============================================================ */
function App() {
  const [collapsed, setCollapsed] = useState(false);

  // data
  const initial = useMemo(() => window.MenuMock.buildMenu(), []);
  const [categories, setCategories] = useState(initial.categories);
  const [itemsByCategory, setItemsByCategory] = useState(initial.itemsByCategory);

  // selection
  const [activeCat, setActiveCat] = useState('ALL');
  const [filter, setFilter] = useState('all'); // all/available/unavailable/featured/V/Ve/GF
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sortBy, setSortBy] = useState('Position');
  const [selected, setSelected] = useState(new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // modals + drawer
  const [editorState, setEditorState] = useState({ open: false, item: null, isNew: false });
  const [catModal, setCatModal] = useState({ open: false, initial: null });
  const [catDel, setCatDel] = useState({ open: false, category: null });
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [toastNode, toast] = useToast();

  // collapse on narrow
  useEffect(() => {
    function onResize() { setCollapsed(window.innerWidth < 1280); }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  /* ---------------- derived ---------------- */
  const allItems = useMemo(
    () => Object.values(itemsByCategory).flat(),
    [itemsByCategory]
  );
  const totalItems = allItems.length;

  const itemsInScope = useMemo(() => {
    if (activeCat === 'ALL') return allItems;
    return itemsByCategory[activeCat] || [];
  }, [activeCat, allItems, itemsByCategory]);

  const filtered = useMemo(() => {
    let f = itemsInScope;
    if (filter === 'available') f = f.filter(i => i.available);
    else if (filter === 'unavailable') f = f.filter(i => !i.available);
    else if (filter === 'featured') f = f.filter(i => i.featured);
    else if (filter === 'V') f = f.filter(i => i.dietary.includes('V'));
    else if (filter === 'Ve') f = f.filter(i => i.dietary.includes('Ve'));
    else if (filter === 'GF') f = f.filter(i => i.dietary.includes('GF'));

    if (debounced) {
      const q = debounced.toLowerCase();
      f = f.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.slug.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      );
    }

    const sorted = [...f];
    if (sortBy === 'Name A→Z') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'Price low→high') sorted.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));
    else if (sortBy === 'Most ordered (30d)') sorted.sort((a, b) => (b.orderedLast30d || 0) - (a.orderedLast30d || 0));
    else if (sortBy === 'Recently updated') sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    // Position = leave as-is (insertion order from mock or after reorder)

    return sorted;
  }, [itemsInScope, filter, debounced, sortBy]);

  const pageItems = useMemo(
    () => filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filtered, pageIndex, pageSize]
  );

  useEffect(() => { setPageIndex(0); }, [activeCat, filter, debounced, sortBy]);

  /* ---------------- counts for pills ---------------- */
  const counts = useMemo(() => {
    const all = itemsInScope.length;
    return {
      all,
      available: itemsInScope.filter(i => i.available).length,
      unavailable: itemsInScope.filter(i => !i.available).length,
      featured: itemsInScope.filter(i => i.featured).length,
      V: itemsInScope.filter(i => i.dietary.includes('V')).length,
      Ve: itemsInScope.filter(i => i.dietary.includes('Ve')).length,
      GF: itemsInScope.filter(i => i.dietary.includes('GF')).length,
    };
  }, [itemsInScope]);

  /* ---------------- mutators ---------------- */
  function setItemsForCat(catId, updater) {
    setItemsByCategory(prev => ({ ...prev, [catId]: updater(prev[catId] || []) }));
  }

  function updateItem(updated) {
    const cat = updated.categoryId;
    // moved to a different category?
    const prevCat = allItems.find(i => i.id === updated.id)?.categoryId;
    setItemsByCategory(prev => {
      const next = { ...prev };
      if (prevCat && prevCat !== cat) {
        next[prevCat] = next[prevCat].filter(i => i.id !== updated.id);
        next[cat] = [...(next[cat] || []), { ...updated, updatedAt: Date.now() }];
      } else {
        next[cat] = next[cat].map(i => i.id === updated.id ? { ...updated, updatedAt: Date.now() } : i);
      }
      return next;
    });
    // refresh counts
    setCategories(prev => prev.map(c => ({
      ...c,
      itemCount: (itemsByCategory[c.id] || []).filter(i => i.id !== updated.id).length + (c.id === cat ? 1 : 0),
    })));
    toast('Item saved');
  }

  function createItem(item) {
    const it = { ...item, id: 'item_' + Date.now(), slug: item.slug || `menu/${item.categoryId}/${(item.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, updatedAt: Date.now() };
    setItemsByCategory(prev => ({ ...prev, [it.categoryId]: [...(prev[it.categoryId] || []), it] }));
    setCategories(prev => prev.map(c => c.id === it.categoryId ? { ...c, itemCount: c.itemCount + 1 } : c));
    toast('Item created');
    // keep drawer open but in "edit" mode for the new item
    setEditorState({ open: true, item: it, isNew: false });
  }

  function deleteItem(item) {
    setItemsByCategory(prev => ({ ...prev, [item.categoryId]: prev[item.categoryId].filter(i => i.id !== item.id) }));
    setCategories(prev => prev.map(c => c.id === item.categoryId ? { ...c, itemCount: c.itemCount - 1 } : c));
    toast('Item deleted', 'error');
  }

  function toggleAvailable(item, v) {
    setItemsByCategory(prev => ({
      ...prev,
      [item.categoryId]: prev[item.categoryId].map(i => i.id === item.id ? { ...i, available: v } : i),
    }));
    toast(v ? 'Marked available' : 'Marked unavailable');
  }

  function reorderItemsInCategory(next) {
    // sort=Position; reorder pageItems within filtered
    if (activeCat === 'ALL') return; // disallow reorder in all-items view
    setItemsByCategory(prev => ({ ...prev, [activeCat]: next }));
  }

  /* category mutations */
  function reorderCategories(next) { setCategories(next); }
  function addCategory(data) {
    const id = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cat = { id, name: data.name, slug: data.slug || id, description: data.description, image: data.image, itemCount: 0 };
    setCategories(prev => [...prev, cat]);
    setItemsByCategory(prev => ({ ...prev, [id]: [] }));
    toast('Category created');
  }
  function editCategory(data) {
    setCategories(prev => prev.map(c => c.id === catModal.initial.id ? { ...c, ...data } : c));
    toast('Category updated');
  }
  function deleteCategory({ moveTo }) {
    const id = catDel.category.id;
    if (moveTo && itemsByCategory[id]) {
      setItemsByCategory(prev => ({
        ...prev,
        [moveTo]: [...(prev[moveTo] || []), ...(prev[id] || []).map(i => ({ ...i, categoryId: moveTo }))],
        [id]: undefined,
      }));
      setCategories(prev => prev.map(c => c.id === moveTo
        ? { ...c, itemCount: c.itemCount + (catDel.category.itemCount || 0) }
        : c).filter(c => c.id !== id));
    } else {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
    if (activeCat === id) setActiveCat('ALL');
    toast('Category deleted', 'error');
  }

  /* ---------------- selection helpers ---------------- */
  const selectedItems = useMemo(() => allItems.filter(i => selected.has(i.id)), [allItems, selected]);
  function applyToSelected(updater) {
    setItemsByCategory(prev => {
      const next = { ...prev };
      for (const it of selectedItems) {
        next[it.categoryId] = next[it.categoryId].map(i => i.id === it.id ? updater(i) : i);
      }
      return next;
    });
  }

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '?' && !inField) { e.preventDefault(); setCheatOpen(v => !v); return; }
      if (!inField && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'f'))) {
        e.preventDefault();
        document.querySelector('input[data-search-items]')?.focus();
      }
      if (!inField && e.key.toLowerCase() === 'n') {
        // N = new
        if (activeCat && activeCat !== 'ALL') {
          setEditorState({ open: true, item: newItem(activeCat), isNew: true });
        } else {
          setCatModal({ open: true, initial: null });
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCat]);

  /* ---------------- item action menu (3-dot) ---------------- */
  const [actionMenu, setActionMenu] = useState(null); // { item, x, y }
  useEffect(() => {
    if (!actionMenu) return;
    function onDoc() { setActionMenu(null); }
    setTimeout(() => document.addEventListener('mousedown', onDoc, { once: true }), 0);
  }, [actionMenu]);

  /* ---------------- columns ---------------- */
  const sortByPosition = sortBy === 'Position' && activeCat !== 'ALL';
  const columns = useMemo(() => buildItemColumns({
    showCategory: activeCat === 'ALL',
    sortByPosition,
    onToggleAvailable: toggleAvailable,
    onOpenActions: (item, el) => {
      const r = el.getBoundingClientRect();
      setActionMenu({ item, x: r.right - 180, y: r.bottom + 6 });
    },
    getCategoryName: (id) => categories.find(c => c.id === id)?.name || '—',
  }), [activeCat, sortByPosition, categories]);

  /* ---------------- Drag handle integration for table rows ---------------- */
  // We inject __dragHandleProps onto rows when sort=Position. Implement via row wrappers — DataTable doesn't natively
  // support drag, so we wrap the data with handle props and use the cell render.
  const dragRef = useRef({ from: null });
  function tableRowDecorator(row) {
    if (!sortByPosition) return {};
    return {};
  }
  // augment rows with drag handle props (using HTML5 drag on the row element)
  const augmentedPage = useMemo(() => {
    if (!sortByPosition) return pageItems;
    return pageItems.map((row, idx) => ({
      ...row,
      __dragHandleProps: {
        draggable: true,
        onDragStart: (e) => {
          dragRef.current = { from: idx, id: row.id };
          try { e.dataTransfer.setData('text/plain', row.id); } catch {}
          e.dataTransfer.effectAllowed = 'move';
        },
      },
    }));
  }, [pageItems, sortByPosition]);

  useEffect(() => {
    if (!sortByPosition) return;
    // attach DnD listeners on the table rows
    const rows = document.querySelectorAll('.dt-tbl tbody tr');
    rows.forEach((r, idx) => {
      r.ondragover = (e) => { e.preventDefault(); };
      r.ondrop = (e) => {
        e.preventDefault();
        const from = dragRef.current.from;
        if (from == null || from === idx) return;
        const next = [...pageItems];
        const [moved] = next.splice(from, 1);
        next.splice(idx, 0, moved);
        // splice back into full filtered list (which is == itemsInCategory if sort=Position)
        reorderItemsInCategory(next);
        dragRef.current = { from: null };
      };
    });
  }, [augmentedPage, sortByPosition, pageItems]);

  /* ---------------- pill options ---------------- */
  const pillOptions = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'available', label: 'Available', count: counts.available, color: 'var(--positive)', dot: true },
    { id: 'unavailable', label: 'Unavailable', count: counts.unavailable, color: 'var(--negative)', dot: true },
    { id: 'featured', label: 'Featured', count: counts.featured, color: 'var(--accent)', dot: true },
    { id: 'V', label: 'Vegetarian', count: counts.V },
    { id: 'Ve', label: 'Vegan', count: counts.Ve },
    { id: 'GF', label: 'Gluten-free', count: counts.GF },
  ];

  /* ---------------- render ---------------- */
  const activeCategory = categories.find(c => c.id === activeCat);
  const headerTitle = activeCat === 'ALL' ? 'All items' : (activeCategory?.name || 'Category');
  const headerCount = activeCat === 'ALL' ? totalItems : (activeCategory?.itemCount || 0);

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <Sidebar collapsed={collapsed} activeId="menu"/>
      <main className="main">
        <Topbar title="Menu" showDateRange={false} showRestSwitch={true}
                rightExtras={
                  <>
                    <div className="tb-search" role="button" tabIndex={0} aria-label="Global search">
                      <Icon.Search size={14}/>
                      <span>Search orders, customers, items…</span>
                      <span className="kbd">⌘K</span>
                    </div>
                    <button className="icon-btn" aria-label="Notifications"><Icon.Bell size={16}/><span className="dot"/></button>
                    <button className="icon-btn" aria-label="Settings"><Icon.Cog size={16}/></button>
                    <button className="icon-btn" aria-label="Account" style={{ width: 32, height: 32 }}>
                      <span className="avatar sm" style={{ width: 28, height: 28 }}>MR</span>
                    </button>
                  </>
                }/>

        <div className="menu-page" style={{ margin: 0, height: 'calc(100vh - var(--topbar-h))' }}>
          <TwoPaneLayout
            leftWidth={280}
            left={
              <CategoryPane
                categories={categories}
                activeId={activeCat}
                totalItems={totalItems}
                onSelectCategory={setActiveCat}
                onReorder={reorderCategories}
                onAdd={() => setCatModal({ open: true, initial: null })}
                onEdit={(cat) => setCatModal({ open: true, initial: cat })}
                onDelete={(cat) => setCatDel({ open: true, category: cat })}
              />
            }
            right={
              <div className="item-pane">
                <div className="item-pane-head">
                  <div className="item-pane-title-row">
                    <div className="item-pane-title">
                      <h2>{headerTitle}</h2>
                      <span className="count-chip">{headerCount} item{headerCount === 1 ? '' : 's'}</span>
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={activeCat === 'ALL'}
                      title={activeCat === 'ALL' ? 'Select a category to add an item' : undefined}
                      onClick={() => setEditorState({ open: true, item: newItem(activeCat), isNew: true })}>
                      <Icon.Plus size={14}/> Add item
                    </button>
                  </div>
                  <PageHeader
                    rows={[
                      <FilterPillGroup value={filter} onChange={setFilter} options={pillOptions}/>,
                      <>
                        <div style={{ flex: 1 }}/>
                        <SortDropdown value={sortBy} onChange={setSortBy}
                                      options={['Position','Name A→Z','Price low→high','Most ordered (30d)','Recently updated']}/>
                        <div className="input-search" style={{ width: 280 }}>
                          <Icon.Search size={14}/>
                          <input data-search-items value={search} onChange={e => setSearch(e.target.value)}
                                 placeholder="Search by item name…"/>
                          <span className="kbd" style={{
                            fontSize: 11, padding: '1px 5px', borderRadius: 4,
                            background: 'var(--surface-elev)', border: '1px solid var(--border)',
                            color: 'var(--text-tertiary)', fontFamily: 'ui-monospace, monospace'
                          }}>/</span>
                        </div>
                      </>,
                    ]}
                    bulk={
                      <BulkActionBar
                        count={selected.size}
                        onClear={() => setSelected(new Set())}
                        actions={[
                          { label: 'Make available', icon: 'Check',
                            onClick: () => { applyToSelected(i => ({ ...i, available: true })); toast(`${selected.size} marked available`); setSelected(new Set()); } },
                          { label: 'Make unavailable',
                            onClick: () => { applyToSelected(i => ({ ...i, available: false })); toast(`${selected.size} marked unavailable`); setSelected(new Set()); } },
                          { label: 'Move to category…', onClick: () => setBulkMoveOpen(true) },
                          { label: 'Duplicate', onClick: () => {
                            const copies = selectedItems.map(it => ({ ...it, id: 'item_dup_' + Date.now() + '_' + it.id, name: it.name + ' (copy)' }));
                            setItemsByCategory(prev => {
                              const next = { ...prev };
                              for (const c of copies) next[c.categoryId] = [...(next[c.categoryId] || []), c];
                              return next;
                            });
                            setCategories(prev => prev.map(c => ({
                              ...c,
                              itemCount: c.itemCount + copies.filter(x => x.categoryId === c.id).length,
                            })));
                            toast(`Duplicated ${copies.length} item${copies.length === 1 ? '' : 's'}`);
                            setSelected(new Set());
                          }},
                          { label: 'Delete', tone: 'destructive', onClick: () => {
                            for (const it of selectedItems) deleteItem(it);
                            setSelected(new Set());
                          } },
                        ]}/>
                    }
                  />
                </div>
                <div className="item-pane-scroll">
                  <DataTable
                    data={augmentedPage}
                    columns={columns}
                    rowKey={r => r.id}
                    onRowClick={r => setEditorState({ open: true, item: r, isNew: false })}
                    selection={{ mode: 'multi', selected, onChange: setSelected }}
                    pagination={{
                      pageIndex, pageSize, total: filtered.length,
                      onPageChange: setPageIndex,
                      onPageSizeChange: ps => { setPageSize(ps); setPageIndex(0); },
                    }}
                    emptyState={
                      <div>
                        <div className="t-body" style={{ color: 'var(--text-secondary)' }}>
                          {debounced || filter !== 'all'
                            ? 'No items match these filters.'
                            : activeCat === 'ALL'
                            ? 'No items yet. Add a category, then add items to it.'
                            : 'No items in this category yet.'}
                        </div>
                        {activeCat !== 'ALL' && (
                          <button className="btn btn-ghost" style={{ marginTop: 16 }}
                                  onClick={() => setEditorState({ open: true, item: newItem(activeCat), isNew: true })}>
                            <Icon.Plus size={14}/> Add item
                          </button>
                        )}
                      </div>
                    }
                  />
                </div>
              </div>
            }
          />
        </div>

        {/* 3-dot row action menu */}
        {actionMenu && (
          <div className="popover" style={{ position: 'fixed', top: actionMenu.y, left: actionMenu.x, minWidth: 180, zIndex: 60 }}>
            <div className="opt" onClick={() => { setEditorState({ open: true, item: actionMenu.item, isNew: false }); setActionMenu(null); }}>
              <Icon.Eye size={14}/> Edit
            </div>
            <div className="opt" onClick={() => {
              const copy = { ...actionMenu.item, id: 'item_dup_' + Date.now(), name: actionMenu.item.name + ' (copy)' };
              setItemsByCategory(prev => ({ ...prev, [copy.categoryId]: [...(prev[copy.categoryId] || []), copy] }));
              setCategories(prev => prev.map(c => c.id === copy.categoryId ? { ...c, itemCount: c.itemCount + 1 } : c));
              toast('Item duplicated');
              setActionMenu(null);
            }}>
              <Icon.Plus size={14}/> Duplicate
            </div>
            <div className="opt" style={{ color: 'var(--negative)' }} onClick={() => {
              deleteItem(actionMenu.item);
              setActionMenu(null);
            }}>
              Delete
            </div>
          </div>
        )}

        <ItemEditorDrawer
          open={editorState.open}
          item={editorState.item}
          isNew={editorState.isNew}
          categories={categories}
          onClose={() => setEditorState({ open: false, item: null, isNew: false })}
          onSave={(updated) => {
            if (editorState.isNew) createItem(updated);
            else updateItem(updated);
          }}
          onDelete={(item) => deleteItem(item)}
          onToggleAvailable={toggleAvailable}/>

        <CategoryModal
          open={catModal.open}
          initial={catModal.initial}
          onClose={() => setCatModal({ open: false, initial: null })}
          onSubmit={(data) => { catModal.initial ? editCategory(data) : addCategory(data); }}/>

        <CategoryDeleteModal
          open={catDel.open}
          category={catDel.category}
          otherCategories={categories.filter(c => c.id !== catDel.category?.id)}
          onClose={() => setCatDel({ open: false, category: null })}
          onConfirm={deleteCategory}/>

        <Cheatsheet open={cheatOpen} onClose={() => setCheatOpen(false)}/>

        <button className="help-fab" onClick={() => setCheatOpen(true)} aria-label="Keyboard shortcuts">?</button>
        {toastNode}
      </main>
    </div>
  );
}

/* simple sort dropdown */
function SortDropdown({ value, onChange, options }) {
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
        <span>Sort: <span style={{ color: 'var(--text)' }}>{value}</span></span>
        <Icon.Chevron size={12}/>
      </button>
      {open && (
        <div className="popover" style={{ right: 0, minWidth: 220 }}>
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

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
