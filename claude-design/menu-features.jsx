/* global React, window */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const Icon = window.Icon;
const {
  PageHeader, FilterPillGroup, TypeBadge, DataTable, DragReorderList,
  ActionModal, FormField, ImageUploader, InlineEdit, Switch,
} = window;

/* ============================================================
   Format helpers
   ============================================================ */
function formatMoney(amount, currency = 'USD') {
  if (amount == null) return '—';
  return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ============================================================
   Category row + list
   ============================================================ */
function CategoryRow({ cat, active, onSelect, onEdit, onDelete, dragProps, virtual, totalItems }) {
  const initial = cat.name?.[0] || '?';
  return (
    <div className={'cat-row' + (active ? ' active' : '') + (virtual ? ' virtual' : '')}
         onClick={onSelect}
         tabIndex={0}
         onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}>
      {!virtual && dragProps && (
        <span {...dragProps}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2" cy="3" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="11" r="1"/>
            <circle cx="8" cy="3" r="1"/><circle cx="8" cy="7" r="1"/><circle cx="8" cy="11" r="1"/>
          </svg>
        </span>
      )}
      {virtual && <span style={{ width: 10 }}/>}
      <span className="cat-thumb">
        {cat.image
          ? <img src={cat.image} alt=""/>
          : virtual
          ? <Icon.FileBar size={14}/>
          : initial}
      </span>
      <span className="cat-name">{cat.name}</span>
      <span className="cat-count">{virtual ? totalItems : cat.itemCount}</span>
      {!virtual && (
        <span className="cat-actions">
          <button className="icon-btn sm" onClick={e => { e.stopPropagation(); onEdit(cat); }} aria-label="Edit category">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/>
            </svg>
          </button>
          <button className="icon-btn sm" onClick={e => { e.stopPropagation(); onDelete(cat); }} aria-label="Delete category">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
            </svg>
          </button>
        </span>
      )}
    </div>
  );
}

function CategoryPane({ categories, activeId, onSelectCategory, onReorder, onAdd, onEdit, onDelete, totalItems }) {
  return (
    <div className="cat-pane">
      <div className="cat-pane-head">
        <span className="t-caption" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Categories
          <span style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-tertiary)', fontSize: 11, padding: '1px 6px', borderRadius: 6,
            fontVariantNumeric: 'tabular-nums', letterSpacing: 0,
          }}>{categories.length}</span>
        </span>
      </div>
      <div className="cat-pane-scroll">
        <CategoryRow cat={{ name: 'All items' }} virtual={true} totalItems={totalItems}
                     active={activeId === 'ALL'} onSelect={() => onSelectCategory('ALL')}/>
        <DragReorderList
          items={categories}
          rowKey={c => c.id}
          onReorder={onReorder}
          renderItem={(cat, drag) => (
            <CategoryRow
              cat={cat}
              active={activeId === cat.id}
              onSelect={() => onSelectCategory(cat.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              dragProps={drag.handleProps}/>
          )}
          gap={2}
          emptyState={
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div className="t-small" style={{ color: 'var(--text-secondary)' }}>No categories yet</div>
            </div>
          }
        />
      </div>
      <div className="cat-pane-foot">
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--accent)' }} onClick={onAdd}>
          <Icon.Plus size={14}/> Add category
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Category modals
   ============================================================ */
function CategoryModal({ open, onClose, initial, onSubmit }) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState('');
  const [slugVal, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setSlug(initial?.slug || '');
      setDescription(initial?.description || '');
      setImage(initial?.image ? { id: 'cat_img', url: initial.image } : null);
      setSlugTouched(false);
    }
  }, [open, initial?.id]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  }, [name, slugTouched]);

  const valid = name.trim().length > 0;

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${initial.name}` : 'New category'}
      width={480}
      primary={{
        label: isEdit ? 'Save changes' : 'Create category',
        onClick: () => { onSubmit({ name, slug: slugVal, description, image: image?.url || null }); onClose(); },
        disabled: !valid,
      }}
      secondary={{ label: 'Cancel', onClick: onClose }}>
      <FormField id="cat-name" label="Name" required>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)}/>
      </FormField>
      <FormField id="cat-slug" label="Slug" helper={`Customers see: …/menu/${slugVal || 'category'}`}>
        <input className="form-input" value={slugVal} onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}/>
      </FormField>
      <FormField id="cat-desc" label="Description" hint={`${description.length}/200`}>
        <textarea className="form-textarea" maxLength={200} rows={3}
                  value={description} onChange={e => setDescription(e.target.value)}/>
      </FormField>
      <FormField id="cat-image" label="Image">
        <ImageUploader
          images={image ? [image] : []}
          max={1}
          aspect={4/3}
          onAdd={async (files) => {
            const url = URL.createObjectURL(files[0]);
            const next = { id: 'cat_img_' + Date.now(), url };
            setImage(next);
            return [next];
          }}
          onRemove={() => setImage(null)}
          onReorder={() => {}}
        />
      </FormField>
    </ActionModal>
  );
}

function CategoryDeleteModal({ open, onClose, category, otherCategories, onConfirm }) {
  const [moveTo, setMoveTo] = useState(otherCategories?.[0]?.id || '');
  useEffect(() => { if (open && otherCategories?.length) setMoveTo(otherCategories[0].id); }, [open, category?.id]);
  if (!category) return null;
  const hasItems = (category.itemCount || 0) > 0;
  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title={`Delete category ${category.name}?`}
      subtitle={hasItems ? null : "This category has no items. This can't be undone."}
      primary={{
        label: 'Delete category',
        tone: 'destructive',
        onClick: () => { onConfirm({ moveTo: hasItems ? moveTo : null }); onClose(); },
        disabled: hasItems && !moveTo,
      }}
      secondary={{ label: 'Cancel', onClick: onClose }}>
      {hasItems && (
        <FormField id="cat-move" label={`Move ${category.itemCount} item${category.itemCount === 1 ? '' : 's'} to`}
                   helper="Items can't be left without a category." required>
          <select className="form-select" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
            {otherCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
      )}
    </ActionModal>
  );
}

/* ============================================================
   Item columns
   ============================================================ */
function buildItemColumns({ showCategory, onToggleAvailable, onOpenActions, sortByPosition, getCategoryName }) {
  return [
    sortByPosition && {
      id: 'drag', header: '', width: 32,
      render: o => (
        <span className="cell-drag" {...o.__dragHandleProps} title="Drag to reorder">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2" cy="3" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="11" r="1"/>
            <circle cx="8" cy="3" r="1"/><circle cx="8" cy="7" r="1"/><circle cx="8" cy="11" r="1"/>
          </svg>
        </span>
      ),
    },
    {
      id: 'item', header: 'Item',
      render: o => (
        <div className="item-cell-stack">
          <div className="thumb">
            {o.images?.[0]
              ? <img src={o.images[0].url} alt="" loading="lazy"/>
              : o.name[0]}
          </div>
          <div className="meta">
            <div className="name">{o.name}</div>
            <div className="slug">{o.slug}</div>
          </div>
        </div>
      ),
    },
    showCategory && {
      id: 'category', header: 'Category', width: 130,
      render: o => <TypeBadge label={getCategoryName(o.categoryId)}/>,
    },
    {
      id: 'price', header: 'Price', width: 110, align: 'right',
      render: o => (
        <div className="price-stack">
          {o.compareAt && <span className="strike">{formatMoney(o.compareAt)}</span>}
          <span className="price">{formatMoney(o.basePrice)}</span>
        </div>
      ),
    },
    {
      id: 'prep', header: 'Prep', width: 70, align: 'right',
      render: o => o.prepMinutes ? <span className="tnum">{o.prepMinutes}m</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>,
    },
    {
      id: 'flags', header: 'Flags', width: 150,
      render: o => (
        <span className="flags">
          {o.featured && <span className="flag-chip featured">★</span>}
          {o.dietary.includes('V') && <span className="flag-chip">V</span>}
          {o.dietary.includes('Ve') && <span className="flag-chip">Ve</span>}
          {o.dietary.includes('GF') && <span className="flag-chip">GF</span>}
          {o.spiceLevel > 0 && <span className="flag-chip spice">🌶×{o.spiceLevel}</span>}
        </span>
      ),
    },
    {
      id: 'modifiers', header: 'Modifiers', width: 100,
      render: o => o.modifierGroups.length > 0
        ? <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{o.modifierGroups.length} group{o.modifierGroups.length === 1 ? '' : 's'}</span>
        : <span style={{ color: 'var(--text-tertiary)' }}>—</span>,
    },
    {
      id: 'available', header: 'Available', width: 110,
      render: o => (
        <span onClick={e => e.stopPropagation()}>
          <Switch checked={o.available} onChange={v => onToggleAvailable(o, v)}
                  ariaLabel={`${o.name} availability`}/>
        </span>
      ),
    },
    {
      id: 'actions', header: '', width: 48,
      render: o => (
        <span className="row-actions" onClick={e => e.stopPropagation()}>
          <button className="icon-btn sm" onClick={(e) => onOpenActions(o, e.currentTarget)} aria-label="Item actions">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </span>
      ),
    },
  ].filter(Boolean);
}

/* ============================================================
   Delete-item confirmation (type to confirm)
   ============================================================ */
function ItemDeleteModal({ open, onClose, item, onConfirm }) {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);
  if (!item) return null;
  const valid = typed.trim().toLowerCase() === item.name.toLowerCase();
  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title={`Delete ${item.name}?`}
      subtitle={`This can't be undone. Type the item name to confirm.`}
      primary={{ label: 'Delete item', tone: 'destructive', disabled: !valid, onClick: () => { onConfirm(item); onClose(); } }}
      secondary={{ label: 'Cancel', onClick: onClose }}>
      <FormField id="del-confirm" label="Item name" required>
        <input className="form-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder={item.name}/>
      </FormField>
    </ActionModal>
  );
}

Object.assign(window, {
  formatMoney,
  CategoryPane,
  CategoryModal, CategoryDeleteModal,
  ItemDeleteModal,
  buildItemColumns,
});
