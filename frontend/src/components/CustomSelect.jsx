import React, { useEffect, useId, useRef, useState } from 'react';
import '../css/CustomSelect.css';

export default function CustomSelect({
  value = '', onChange, options = [], placeholder = 'Оберіть значення',
  disabled = false, className = '', name, required = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find(option => String(option.value) === String(value));

  useEffect(() => {
    if (!open) return;

    const onPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const choose = option => {
    if (option.disabled) return;
    onChange?.(String(option.value));
    setOpen(false);
  };

  const onTriggerKeyDown = event => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className={`gm-custom-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button" className="gm-custom-select-trigger"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        aria-label={selected?.label || placeholder} disabled={disabled}
        onClick={() => setOpen(current => !current)} onKeyDown={onTriggerKeyDown}
      >
        <span className={selected ? 'gm-custom-select-value' : 'gm-custom-select-placeholder'}>
          {selected?.label || placeholder}
        </span>
        <svg className="gm-custom-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={listId} className="gm-custom-select-menu" role="listbox" tabIndex={-1} aria-label={placeholder}>
          {options.length === 0 ? (
            <div className="gm-custom-select-empty">Немає доступних варіантів</div>
          ) : options.map(option => (
            <button
              key={String(option.value)} type="button" role="option"
              aria-selected={String(option.value) === String(value)}
              className={`gm-custom-select-option ${String(option.value) === String(value) ? 'is-selected' : ''}`}
              disabled={option.disabled} onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {String(option.value) === String(value) && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}

      {required && <input className="gm-custom-select-required" tabIndex={-1} aria-hidden="true" required value={value} onChange={() => { }} />}
    </div>
  );
}