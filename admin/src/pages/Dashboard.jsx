import { Link } from 'react-router-dom';
import { Badge, Stat } from '../components';
import { fmtDate, inr, toDate } from '../lib/data';

const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Dashboard({ orders, users, tickets, products }) {
  const live = orders.docs.filter((o) => o.status !== 'cancelled');
  const revenue = live.reduce((s, o) => s + (o.total || 0), 0);
  const dealerRevenue = live.filter((o) => o.channel === 'dealer').reduce((s, o) => s + (o.total || 0), 0);
  const today = new Date().toDateString();
  const todayOrders = orders.docs.filter((o) => toDate(o.createdAt)?.toDateString() === today).length;
  const customers = users.docs.filter((u) => u.role === 'customer').length;
  const dealers = users.docs.filter((u) => u.role === 'dealer');
  const pending = dealers.filter((d) => d.dealerStatus === 'pending');
  const openTickets = tickets.docs.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status));
  const lowStock = products.docs.filter((p) => p.active !== false && p.stock < 10);
  const maxCount = Math.max(1, ...STATUSES.map((s) => orders.docs.filter((o) => o.status === s).length));

  // Revenue for the last 7 days.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), value: live.filter((o) => toDate(o.createdAt)?.toDateString() === key).reduce((s, o) => s + o.total, 0) };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.value));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Overview of store activity</p>
        </div>
      </header>

      <section className="stats">
        <Stat label="Total revenue" value={inr(revenue)} hint={`${inr(dealerRevenue)} from dealers`} />
        <Stat label="Orders" value={orders.docs.length} hint={`${todayOrders} today`} />
        <Stat label="Customers / dealers" value={`${customers} / ${dealers.length}`} hint={`${pending.length} dealer approvals pending`} tone={pending.length ? 'warn' : ''} />
        <Stat label="Open service tickets" value={openTickets.length} hint={`${tickets.docs.length} total`} tone={openTickets.length ? 'info' : ''} />
      </section>

      <section className="grid-2">
        <div className="card">
          <h3>Revenue · last 7 days</h3>
          <div className="bars" role="img" aria-label="Revenue per day for the last 7 days">
            {days.map((d) => (
              <div key={d.label} className="bar-col" title={`${d.label}: ${inr(d.value)}`}>
                <span className="bar-val">{d.value ? inr(d.value) : ''}</span>
                <div className="bar" style={{ height: `${(d.value / maxDay) * 100}%` }} />
                <span className="bar-label">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Orders by status</h3>
          <div className="hbars">
            {STATUSES.map((s) => {
              const n = orders.docs.filter((o) => o.status === s).length;
              return (
                <div key={s} className="hbar-row">
                  <span className="hbar-label">{s}</span>
                  <div className="hbar-track"><div className={`hbar hbar-${s}`} style={{ width: `${(n / maxCount) * 100}%` }} /></div>
                  <span className="hbar-n">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Recent orders</h3><Link to="/orders">View all</Link></div>
          <table className="table compact">
            <tbody>
              {orders.docs.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.orderNo}</strong><div className="muted small">{o.customerName}{o.channel === 'dealer' ? ' · Dealer' : ''}</div></td>
                  <td className="muted small">{fmtDate(o.createdAt)}</td>
                  <td><Badge status={o.status} /></td>
                  <td className="right"><strong>{inr(o.total)}</strong></td>
                </tr>
              ))}
              {!orders.docs.length ? <tr><td className="muted">No orders yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-head"><h3>Needs attention</h3></div>
          <ul className="attention">
            {pending.map((d) => <li key={d.id}><Link to="/dealers">Dealer approval: <strong>{d.businessName || d.name}</strong></Link></li>)}
            {openTickets.filter((t) => t.status === 'open').slice(0, 5).map((t) => (
              <li key={t.id}><Link to="/service">Unassigned ticket #{t.ticketNo}: {t.type} · {t.address?.city}</Link></li>
            ))}
            {lowStock.slice(0, 5).map((p) => <li key={p.id}><Link to="/products">Low stock: {p.name} ({p.stock} left)</Link></li>)}
            {!pending.length && !openTickets.length && !lowStock.length ? <li className="muted">All clear.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
