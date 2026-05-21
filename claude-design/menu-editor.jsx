/* global React, window */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const Icon = window.Icon;
const {
  DetailDrawer, ActionModal, FormField, CurrencyInput, InlineEdit, Switch,
  DragReorderList, ImageUploader, SectionedDrawerBody, SchedulePicker, TypeBadge,
  formatMoney,
} = window;

/* ============================================================
   Section 1 — Details
   ============================================================ */
function DetailsSection({ form, set, categories }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField id="d-name" label="Name" required hint={`${form.name?.length || 0}/80`}>
          <input className="form-input" maxLength={80} value={form.name || ''}
                 onChange={e => set('name', e.target.value)}/>
        </FormField>
      </div>
      <FormField id="d-slug" label="Slug" helper={`…/${form.slug || 'item'}`}>
        <input className="form-input" value={form.slug || ''}
               onChange={e => set('slug', e.target.value)}/>
      </FormField>
      <FormField id="d-cat" label="Category" required>
        <select className="form-select" value={form.categoryId || ''}
                onChange={e => set('categoryId', e.target.value)}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </FormField>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField id="d-desc" label="Description" hint={`${form.description?.length || 0}/500`}>
          <textarea className="form-textarea" rows={3} maxLength={500}
                    value={form.description || ''}
                    onChange={e => set('description', e.target.value)}/>
        </FormField>
      </div>
      <FormField id="d-price" label="Base price" required>
        <CurrencyInput value={form.basePrice} onChange={v => set('basePrice', v)} min={0}/>
      </FormField>
      <FormField id="d-cmp" label="Compare-at price"
                 helper="Original price, struck through, when set">
        <CurrencyInput value={form.compareAt} onChange={v => set('compareAt', v)} min={0}/>
      </FormField>
      <FormField id="d-cal" label="Calories">
        <input className="form-input tnum" type="number" min={0} value={form.calories ?? ''}
               onChange={e => set('calories', e.target.value === '' ? null : Number(e.target.value))}/>
      </FormField>
      <FormField id="d-prep" label="Prep time" hint="minutes">
        <input className="form-input tnum" type="number" min={0} value={form.prepMinutes ?? ''}
               onChange={e => set('prepMinutes', e.target.value === '' ? null : Number(e.target.value))}/>
      </FormField>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField id="d-spice" label="Spice level">
          <div className="spice-row">
            {[0,1,2,3].map(n => (
              <button key={n} type="button"
                      className={'spice-dot' + ((form.spiceLevel || 0) >= n && n > 0 ? ' on' : '') + (n === 0 && (form.spiceLevel || 0) === 0 ? ' on' : '')}
                      onClick={() => set('spiceLevel', n)}
                      aria-label={`Spice level ${n}`}
                      style={n === 0 ? { background: 'var(--surface)', borderColor: 'var(--border)' } : undefined}/>
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              {form.spiceLevel === 0 ? 'None' : `${form.spiceLevel}/3`}
            </span>
          </div>
        </FormField>
      </div>
    </div>
  );
}

/* ============================================================
   Section 2 — Dietary & flags
   ============================================================ */
function DietarySection({ form, set }) {
  function toggle(flag) {
    const cur = form.dietary || [];
    set('dietary', cur.includes(flag) ? cur.filter(x => x !== flag) : [...cur, flag]);
  }
  const flags = [
    { id: 'V',  label: 'Vegetarian',  desc: 'No meat, fish, poultry' },
    { id: 'Ve', label: 'Vegan',       desc: 'No animal products' },
    { id: 'GF', label: 'Gluten-free', desc: 'No gluten-containing grains' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {flags.map(f => (
        <div key={f.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', background: 'var(--surface-elev)',
          border: '1px solid var(--border)', borderRadius: 8,
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{f.desc}</div>
          </div>
          <Switch checked={(form.dietary || []).includes(f.id)} onChange={() => toggle(f.id)}
                  ariaLabel={f.label}/>
        </div>
      ))}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', background: 'var(--surface-elev)',
        border: '1px solid var(--border)', borderRadius: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>
            <span style={{ color: 'var(--accent)' }}>★</span> Featured
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Highlighted on the customer menu home
          </div>
        </div>
        <Switch checked={!!form.featured} onChange={v => set('featured', v)} ariaLabel="Featured"/>
      </div>
    </div>
  );
}

/* ============================================================
   Section 3 — Images
   ============================================================ */
function ImagesSection({ form, set }) {
  const images = form.images || [];
  return (
    <ImageUploader
      images={images}
      max={8}
      aspect={4/3}
      onAdd={async (files) => {
        // fake 600ms upload, returns {id, url}
        await new Promise(r => setTimeout(r, 600));
        const next = [...files].map((f, i) => ({
          id: 'img_local_' + Date.now() + '_' + i,
          url: URL.createObjectURL(f),
          alt: '',
        }));
        set('images', [...images, ...next]);
        return next;
      }}
      onRemove={(id) => set('images', images.filter(i => i.id !== id))}
      onReorder={(orderedIds) => set('images', orderedIds.map(id => images.find(i => i.id === id)))}
    />
  );
}

/* ============================================================
   Section 4 — Modifier groups
   ============================================================ */
function ModifierGroupsSection({ form, set }) {
  const groups = form.modifierGroups || [];

  function updateGroup(gid, patch) {
    set('modifierGroups', groups.map(g => g.id === gid ? { ...g, ...patch } : g));
  }
  function removeGroup(gid) {
    set('modifierGroups', groups.filter(g => g.id !== gid));
  }
  function addGroup() {
    set('modifierGroups', [...groups, {
      id: 'g_' + Date.now(),
      name: 'New group',
      required: false, min: 0, max: 1,
      options: [],
    }]);
  }
  function reorderGroups(next) { set('modifierGroups', next); }

  if (groups.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: 32,
        background: 'var(--surface-elev)', border: '1px dashed var(--border)',
        borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13,
      }}>
        No modifier groups. Add one if this item has size, add-ons, or other choices.
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={addGroup}>
            <Icon.Plus size={14}/> Add modifier group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <DragReorderList
        items={groups}
        rowKey={g => g.id}
        onReorder={reorderGroups}
        renderItem={(g, drag) => (
          <ModifierGroupCard
            group={g}
            dragProps={drag.handleProps}
            onChange={patch => updateGroup(g.id, patch)}
            onRemove={() => removeGroup(g.id)}/>
        )}
      />
      <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--accent)' }} onClick={addGroup}>
        <Icon.Plus size={14}/> Add modifier group
      </button>
    </div>
  );
}

function ModifierGroupCard({ group, dragProps, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);

  function updateOption(oid, patch) {
    onChange({ options: group.options.map(o => o.id === oid ? { ...o, ...patch } : o) });
  }
  function addOption() {
    onChange({ options: [...group.options, {
      id: 'o_' + Date.now(),
      name: 'New option',
      priceDelta: 0,
      isDefault: false,
    }] });
  }
  function removeOption(oid) {
    onChange({ options: group.options.filter(o => o.id !== oid) });
  }
  function reorderOptions(next) { onChange({ options: next }); }

  return (
    <>
      <div className="mg-card">
        <div className="mg-head">
          <span {...dragProps} style={{ cursor: 'grab' }}>
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ color: 'var(--text-tertiary)' }}>
              <circle cx="2" cy="3" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="11" r="1"/>
              <circle cx="8" cy="3" r="1"/><circle cx="8" cy="7" r="1"/><circle cx="8" cy="11" r="1"/>
            </svg>
          </span>
          <InlineEdit value={group.name} onCommit={v => onChange({ name: v })}
                      variant="body" ariaLabel="Group name"/>
          <div className="mg-controls" onClick={e => e.stopPropagation()}>
            <label>
              Required
              <Switch checked={group.required} onChange={v => onChange({ required: v })}
                      ariaLabel="Required" size="sm"/>
            </label>
            <label>
              Min
              <input type="number" min={0} value={group.min}
                     onChange={e => onChange({ min: Math.max(0, Number(e.target.value)) })}/>
            </label>
            <label>
              Max
              <input type="number" min={1} value={group.max}
                     onChange={e => onChange({ max: Math.max(1, Number(e.target.value)) })}/>
            </label>
          </div>
          <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }} aria-label="Toggle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                 strokeLinecap="round" strokeLinejoin="round"
                 style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }} aria-label="Delete group">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
            </svg>
          </button>
        </div>
        {expanded && (
          <div className="mg-body">
            {group.options.length > 0 && (
              <DragReorderList
                items={group.options}
                rowKey={o => o.id}
                onReorder={reorderOptions}
                renderItem={(o, drag) => (
                  <div className="mg-opt-row">
                    <span {...drag.handleProps} style={{ cursor: 'grab' }}>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ color: 'var(--text-tertiary)' }}>
                        <circle cx="2" cy="3" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="11" r="1"/>
                        <circle cx="8" cy="3" r="1"/><circle cx="8" cy="7" r="1"/><circle cx="8" cy="11" r="1"/>
                      </svg>
                    </span>
                    <InlineEdit value={o.name} onCommit={v => updateOption(o.id, { name: v })}
                                variant="body" ariaLabel="Option name"/>
                    <CurrencyInput value={o.priceDelta} onChange={v => updateOption(o.id, { priceDelta: v || 0 })}
                                   allowSign/>
                    <div className="opt-default">
                      Default
                      <Switch size="sm" checked={!!o.isDefault}
                              onChange={v => updateOption(o.id, { isDefault: v })}
                              ariaLabel="Default option"/>
                    </div>
                    <button className="icon-btn sm" onClick={() => removeOption(o.id)} aria-label="Remove option">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                           strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
                      </svg>
                    </button>
                  </div>
                )}
              />
            )}
            <button className="mg-add-opt" onClick={addOption}>
              <Icon.Plus size={12}/> Add option
            </button>
          </div>
        )}
      </div>
      <ActionModal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title={`Delete group "${group.name}"?`}
        subtitle="This will remove all its options."
        primary={{ label: 'Delete group', tone: 'destructive', onClick: () => { onRemove(); setConfirmDel(false); } }}
        secondary={{ label: 'Cancel', onClick: () => setConfirmDel(false) }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {group.options.length} option{group.options.length === 1 ? '' : 's'} will be deleted.
        </div>
      </ActionModal>
    </>
  );
}

/* ============================================================
   Section 5 — Availability
   ============================================================ */
function AvailabilitySection({ form, set }) {
  const alwaysOn = !form.schedule;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 14px', background: 'var(--surface-elev)',
        border: '1px solid var(--border)', borderRadius: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Always available</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Whenever the restaurant is open
          </div>
        </div>
        <Switch checked={alwaysOn}
                onChange={v => set('schedule', v
                  ? null
                  : { days: ['Mon','Tue','Wed','Thu','Fri'], windows: [{ from: '11:00', to: '14:00' }] })}/>
      </div>
      {!alwaysOn && (
        <div style={{ padding: 14, background: 'var(--surface-elev)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <SchedulePicker
            value={form.schedule}
            onChange={v => set('schedule', v)}
            helper="Item will only appear in the customer menu during these times."/>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   The Item Editor Drawer (orchestrator)
   ============================================================ */
function ItemEditorDrawer({ open, item, isNew, categories, onClose, onSave, onDelete, onToggleAvailable }) {
  const [form, setForm] = useState(item);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { setForm(item); setDirty(false); }, [item?.id, open]);

  const set = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  }, []);

  function attemptClose() {
    if (dirty) setDiscardOpen(true);
    else onClose();
  }

  function save() {
    onSave(form);
    setDirty(false);
  }

  // ⌘S to save
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (valid) save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, form, dirty]);

  if (!form) return null;

  const valid = (form.name || '').trim().length > 0 && form.basePrice != null && form.categoryId;
  const missingFields = [];
  if (!(form.name || '').trim()) missingFields.push('Name');
  if (form.basePrice == null) missingFields.push('Base price');
  if (!form.categoryId) missingFields.push('Category');

  const cat = categories.find(c => c.id === form.categoryId);

  const header = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEdit value={form.name}
                      onCommit={v => set('name', v)}
                      variant="h2"
                      placeholder="New item"
                      ariaLabel="Item name"/>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {cat?.name || '—'} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{form.slug || (isNew ? 'auto' : '')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>Available</span>
            <Switch checked={form.available} onChange={v => { set('available', v); }}
                    ariaLabel="Available toggle"/>
          </div>
          <button className="icon-btn" onClick={attemptClose} aria-label="Close drawer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 6 12 12M18 6 6 18"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  const footer = (
    <div className="drawer-footer-spread">
      <div>
        {!isNew && (
          <button className="btn btn-ghost" style={{ color: 'var(--negative)' }} onClick={() => setDeleteOpen(true)}>
            Delete item
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost" onClick={attemptClose}>Cancel</button>
        <button className="btn btn-primary"
                disabled={!valid}
                title={!valid ? `Missing: ${missingFields.join(', ')}` : undefined}
                onClick={save}>
          {isNew ? 'Create item' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <DetailDrawer
        open={open}
        onClose={attemptClose}
        width={640}
        ariaLabel="Item editor"
        header={header}
        footer={footer}>
        <SectionedDrawerBody
          sections={[
            { id: 'details', label: 'Details', icon: 'FileBar',
              children: <DetailsSection form={form} set={set} categories={categories}/> },
            { id: 'dietary', label: 'Dietary',
              children: <DietarySection form={form} set={set}/> },
            { id: 'images', label: 'Images',
              children: <ImagesSection form={form} set={set}/> },
            { id: 'modifiers', label: 'Modifiers',
              children: <ModifierGroupsSection form={form} set={set}/> },
            { id: 'availability', label: 'Availability',
              children: <AvailabilitySection form={form} set={set}/> },
          ]}
        />
      </DetailDrawer>

      <ActionModal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard changes?"
        subtitle="You have unsaved changes. Closing will lose them."
        primary={{ label: 'Discard', tone: 'destructive', onClick: () => { setDiscardOpen(false); setDirty(false); onClose(); } }}
        secondary={{ label: 'Keep editing', onClick: () => setDiscardOpen(false) }}/>

      <window.ItemDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        item={form}
        onConfirm={() => { onDelete(form); onClose(); }}/>
    </>
  );
}

Object.assign(window, { ItemEditorDrawer });
