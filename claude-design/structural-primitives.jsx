/* global React, window */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const Icon = window.Icon;

/* ============================================================
   STRUCTURAL PRIMITIVES — page 3
   ============================================================ */

/* ---------------- 4. DragReorderList<T> ---------------- */
/** @example
 *   <DragReorderList items={categories} rowKey={c => c.id}
 *     onReorder={setCategories}
 *     renderItem={(c, drag) => <Row {...drag.handleProps}/>}/>
 */
function DragReorderList({ items, rowKey, onReorder, renderItem, orientation = 'vertical',
                           axisLock = true, disabled, emptyState, gap = 8 }) {
  const [dragId, setDragId] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragIdxRef = useRef(null);

  if (items.length === 0 && emptyState) return <>{emptyState}</>;

  function onDragStart(e, idx, id) {
    if (disabled) { e.preventDefault(); return; }
    setDragId(id);
    dragIdxRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    try { e.dataTransfer.setData('text/plain', id); } catch {}
  }
  function onDragOver(e, idx) {
    if (dragId == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  }
  function onDrop(e, idx) {
    e.preventDefault();
    const from = dragIdxRef.current;
    if (from == null || from === idx) { reset(); return; }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    const insertAt = idx > from ? idx - 1 : idx;
    next.splice(insertAt, 0, moved);
    onReorder(next);
    reset();
  }
  function reset() {
    setDragId(null); setOverIdx(null); dragIdxRef.current = null;
  }

  return (
    <div className={'drl drl-' + orientation} style={{ gap }}>
      {items.map((item, i) => {
        const id = rowKey(item);
        const isDragging = id === dragId;
        return (
          <React.Fragment key={id}>
            {overIdx === i && dragIdxRef.current !== i && (
              <div className="drl-indicator" aria-hidden="true"/>
            )}
            <div
              className={'drl-row' + (isDragging ? ' is-dragging' : '')}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
            >
              {renderItem(item, {
                isDragging,
                handleProps: {
                  draggable: !disabled,
                  onDragStart: (e) => onDragStart(e, i, id),
                  onDragEnd: reset,
                  className: 'drl-handle',
                  'aria-label': 'Drag to reorder',
                  tabIndex: 0,
                },
              })}
            </div>
          </React.Fragment>
        );
      })}
      {overIdx === items.length && (
        <div className="drl-indicator" aria-hidden="true"/>
      )}
      {/* drop-zone after last item */}
      <div className="drl-end"
           onDragOver={(e) => onDragOver(e, items.length)}
           onDrop={(e) => onDrop(e, items.length)}/>
    </div>
  );
}

/* ---------------- 5. ImageUploader ---------------- */
/** @example
 *   <ImageUploader images={item.images} onAdd={uploadFn} onRemove={remove}
 *     onReorder={reorderIds} max={8} aspect={4/3}/>
 */
function ImageUploader({ images, onAdd, onRemove, onReorder, max = 8, aspect = 4/3, layout = 'grid', acceptText }) {
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const canAddMore = images.length < max;
  const help = acceptText || `Drop images here or click to upload — up to ${max}, JPG/PNG/WebP, max 5 MB`;

  async function handleFiles(files) {
    const list = [...files].slice(0, max - images.length);
    if (list.length === 0) return;
    setUploading(true);
    try { await onAdd(list); } finally { setUploading(false); }
  }

  return (
    <div className="iu">
      {canAddMore && (
        <div className={'iu-drop' + (over ? ' over' : '') + (uploading ? ' uploading' : '')}
             onDragOver={e => { e.preventDefault(); setOver(true); }}
             onDragLeave={() => setOver(false)}
             onDrop={e => {
               e.preventDefault(); setOver(false);
               handleFiles(e.dataTransfer.files);
             }}
             onClick={() => inputRef.current?.click()}
             role="button" tabIndex={0}>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden
                 onChange={e => handleFiles(e.target.files)}/>
          <div className="iu-drop-glyph">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <circle cx="9" cy="11" r="2"/>
              <path d="m21 19-6-7-5 5-3-3-4 5"/>
            </svg>
          </div>
          <div className="iu-drop-text">{uploading ? 'Uploading…' : help}</div>
        </div>
      )}
      {images.length > 0 && (
        <DragReorderList
          items={images}
          rowKey={img => img.id}
          orientation={layout === 'row' ? 'horizontal' : 'horizontal'}
          onReorder={next => onReorder(next.map(i => i.id))}
          gap={10}
          renderItem={(img, drag) => {
            const { className: handleCls, ...handleRest } = drag.handleProps;
            return (
              <div className={'iu-tile ' + (handleCls || '')} {...handleRest} style={{ aspectRatio: aspect }}>
                <img src={img.url} alt={img.alt || ''} draggable={false} loading="lazy"/>
                {images.indexOf(img) === 0 && <span className="iu-primary">Primary</span>}
                <button className="iu-remove" onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                        aria-label="Remove image">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18"/>
                  </svg>
                </button>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

/* ---------------- 6. TwoPaneLayout ---------------- */
/** @example
 *   <TwoPaneLayout left={<Categories/>} right={<Items/>} leftWidth={280}/>
 */
function TwoPaneLayout({ left, right, leftWidth = 280, divider = true, collapseBelow = 1100 }) {
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    function onResize() { setStacked(window.innerWidth < collapseBelow); }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [collapseBelow]);

  if (stacked) {
    return (
      <div className="two-pane stacked">
        <div className="two-pane-left">{left}</div>
        {divider && <div className="two-pane-divider h"/>}
        <div className="two-pane-right">{right}</div>
      </div>
    );
  }
  return (
    <div className="two-pane" style={{ gridTemplateColumns: `${leftWidth}px 1fr` }}>
      <div className="two-pane-left">{left}</div>
      {divider && <div className="two-pane-divider"/>}
      <div className="two-pane-right">{right}</div>
    </div>
  );
}

/* ---------------- 7. SectionedDrawerBody ---------------- */
/** @example
 *   <SectionedDrawerBody sections={[
 *     { id: 'details', label: 'Details', children: <Details/> },
 *     { id: 'images', label: 'Images', children: <Images/> },
 *   ]}/>
 */
function SectionedDrawerBody({ sections, initialSection }) {
  const [active, setActive] = useState(initialSection || sections[0]?.id);
  const scrollerRef = useRef(null);
  const rootRef = useRef(null);
  const sectionRefs = useRef({});

  // Make parent (.dd-body) flush so our internal grid controls height
  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (parent && parent.classList.contains('dd-body')) {
      parent.classList.add('no-pad');
      return () => parent.classList.remove('no-pad');
    }
  }, []);

  // scrollspy
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    function onScroll() {
      let bestId = sections[0]?.id;
      let bestDist = Infinity;
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        // measure section top relative to scroller top
        const offset = rect.top - rootRect.top;
        if (offset >= -8 && offset < bestDist) {
          bestDist = offset;
          bestId = s.id;
        }
      }
      setActive(bestId);
    }
    root.addEventListener('scroll', onScroll);
    return () => root.removeEventListener('scroll', onScroll);
  }, [sections]);

  function jump(id) {
    const root = scrollerRef.current;
    const el = sectionRefs.current[id];
    if (!root || !el) return;
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - rootRect.top + root.scrollTop - 8;
    root.scrollTo({ top: offset, behavior: 'smooth' });
  }

  return (
    <div className="sdb" ref={rootRef}>
      <div className="sdb-body" ref={scrollerRef}>
        {sections.map(s => (
          <section
            key={s.id}
            id={s.id}
            ref={el => sectionRefs.current[s.id] = el}
            className="sdb-section"
            data-section-id={s.id}
          >
            <h3 className="sdb-section-head">{s.label}</h3>
            {s.children}
          </section>
        ))}
      </div>
      <nav className="sdb-rail" aria-label="Sections">
        {sections.map(s => {
          const Ico = s.icon ? Icon[s.icon] : null;
          return (
            <button
              key={s.id}
              className={'sdb-rail-item' + (active === s.id ? ' active' : '')}
              onClick={() => jump(s.id)}
              title={s.label}
              aria-current={active === s.id ? 'true' : undefined}
            >
              {Ico ? <Ico size={14}/> : <span className="sdb-dot"/>}
              <span className="sdb-rail-label">{s.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ---------------- 8. SchedulePicker ---------------- */
/** @example
 *   <SchedulePicker value={item.schedule} onChange={setSchedule}/>
 */
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function SchedulePicker({ value, onChange, helper }) {
  const days = value?.days || [];
  const windows = value?.windows || [{ from: '11:00', to: '14:00' }];

  function setDays(next) { onChange({ days: next, windows }); }
  function setWindows(next) { onChange({ days, windows: next }); }

  function toggleDay(d) {
    setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d]);
  }
  function addWindow() {
    setWindows([...windows, { from: '17:00', to: '21:00' }]);
  }
  function updateWindow(i, patch) {
    setWindows(windows.map((w, idx) => idx === i ? { ...w, ...patch } : w));
  }
  function removeWindow(i) {
    setWindows(windows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="sched">
      <div className="sched-days" role="group" aria-label="Days of week">
        {DAYS.map(d => (
          <button key={d}
                  type="button"
                  className={'sched-day' + (days.includes(d) ? ' on' : '')}
                  aria-pressed={days.includes(d)}
                  onClick={() => toggleDay(d)}>
            {d.slice(0, 1)}
          </button>
        ))}
      </div>
      <div className="sched-windows">
        {windows.map((w, i) => (
          <div className="sched-window" key={i}>
            <input type="time" className="form-input mini" value={w.from} onChange={e => updateWindow(i, { from: e.target.value })}/>
            <span className="sched-sep">–</span>
            <input type="time" className="form-input mini" value={w.to} onChange={e => updateWindow(i, { to: e.target.value })}/>
            <button className="icon-btn sm" onClick={() => removeWindow(i)} aria-label="Remove window">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addWindow} type="button">
          <Icon.Plus size={12}/> Add window
        </button>
      </div>
      {helper && <div className="sched-helper">{helper}</div>}
    </div>
  );
}

Object.assign(window, {
  DragReorderList, ImageUploader, TwoPaneLayout, SectionedDrawerBody, SchedulePicker
});
