import { useEffect } from 'react';

const ICONS = {
  dashboard: 'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
  orders: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
  dealers: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6',
  service: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  products: 'M12 2.7C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-11.3z',
};

export const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={ICONS[name]} />
  </svg>
);

export const Badge = ({ status, children }) => (
  <span className={`badge badge-${status}`}>{children || String(status || '').replace('_', ' ')}</span>
);

export function Drawer({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-label={title}>
        <header className="drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-foot">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export const Stat = ({ label, value, hint, tone }) => (
  <div className={`stat ${tone || ''}`}>
    <span className="stat-label">{label}</span>
    <strong className="stat-value">{value}</strong>
    {hint ? <span className="stat-hint">{hint}</span> : null}
  </div>
);

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

export function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'tab active' : 'tab'} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null ? <span className="tab-count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return message ? <div className="toast">{message}</div> : null;
}
