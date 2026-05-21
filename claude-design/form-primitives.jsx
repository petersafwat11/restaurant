/* global React, window */
const { useState, useEffect, useRef, useCallback, useId } = React;
const Icon = window.Icon;

/* ============================================================
   FORM PRIMITIVES — page 3
   ============================================================ */

/* ---------------- 1. FormField ---------------- */
/** @example
 *   <FormField id="name" label="Name" required helper="1-80 chars" error={errors.name}>
 *     <input className="form-input" id="name" .../>
 *   </FormField>
 */
function FormField({ id, label, required, helper, error, hint, layout = 'stacked', children }) {
  const autoId = useId();
  const fid = id || autoId;
  const helperId = `${fid}-helper`;
  // Inject id + aria-describedby into the child control
  const child = React.Children.only(children);
  const enhanced = React.cloneElement(child, {
    id: child.props.id || fid,
    'aria-describedby': (helper || error) ? helperId : child.props['aria-describedby'],
    'aria-invalid': error ? true : child.props['aria-invalid'],
  });

  return (
    <div className={'ff ff-' + layout + (error ? ' has-error' : '')}>
      <div className="ff-label-row">
        <label htmlFor={fid} className="ff-label">
          {label}
          {required && <span className="ff-required" aria-hidden="true">*</span>}
        </label>
        {hint && <span className="ff-hint">{hint}</span>}
      </div>
      <div className="ff-control">{enhanced}</div>
      {(error || helper) && (
        <div id={helperId} className={'ff-helper' + (error ? ' is-error' : '')}>
          {error || helper}
        </div>
      )}
    </div>
  );
}

/* ---------------- 2. CurrencyInput ---------------- */
/** @example
 *   <CurrencyInput value={price} onChange={setPrice} min={0}/>
 *   <CurrencyInput value={delta} onChange={setDelta} allowSign/>
 */
function CurrencyInput({ value, onChange, currency = 'USD', min, max, step = 0.01, allowSign, id, placeholder, disabled }) {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
  const sign = allowSign && (value || 0) > 0 ? '+' : '';
  const [text, setText] = useState(value == null ? '' : sign + String(value));

  useEffect(() => {
    if (document.activeElement?.id !== (id || 'ci')) {
      setText(value == null ? '' : sign + String(value));
    }
  }, [value]);

  function onBlur() {
    if (text.trim() === '' || text === '-' || text === '+') { onChange(null); return; }
    let n = Number(text.replace(/[+]/g, ''));
    if (Number.isNaN(n)) { setText(value == null ? '' : String(value)); return; }
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    n = Math.round(n * 100) / 100;
    onChange(n);
    setText((allowSign && n > 0 ? '+' : '') + String(n));
  }

  return (
    <div className={'cur-input' + (disabled ? ' disabled' : '')}>
      <span className="cur-sym">{symbol}</span>
      <input
        id={id || 'ci'}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={e => setText(e.target.value.replace(/[^-+0-9.]/g, ''))}
        onBlur={onBlur}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        placeholder={placeholder || '0.00'}
        disabled={disabled}
      />
    </div>
  );
}

/* ---------------- 3. InlineEdit ---------------- */
/** @example
 *   <InlineEdit value={name} onCommit={setName} variant="h2" ariaLabel="Item name"/>
 */
function InlineEdit({ value, onCommit, placeholder, variant = 'body', maxLength, validate, asInput = 'input', ariaLabel }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      if (asInput === 'input') inputRef.current?.select();
    }
  }, [editing, asInput]);

  function commit() {
    const v = (draft || '').trim();
    if (validate) {
      const err = validate(v);
      if (err) { setError(err); return; }
    }
    if (v !== value) onCommit(v);
    setEditing(false);
    setError(null);
  }
  function cancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    const Tag = asInput === 'textarea' ? 'textarea' : 'input';
    return (
      <Tag
        ref={inputRef}
        className={'inline-edit-input v-' + variant + (error ? ' has-error' : '')}
        value={draft || ''}
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter' && asInput === 'input') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={'inline-edit v-' + variant + (!value ? ' is-placeholder' : '')}
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
    >
      {value || placeholder || 'Untitled'}
      <span className="inline-edit-pencil" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/>
        </svg>
      </span>
    </button>
  );
}

/* ---------------- Switch (helper, used in forms) ---------------- */
function Switch({ checked, onChange, id, ariaLabel, size = 'md', disabled }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={'sw sw-' + size + (checked ? ' on' : '')}
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
    >
      <span className="sw-knob"/>
    </button>
  );
}

Object.assign(window, { FormField, CurrencyInput, InlineEdit, Switch });
