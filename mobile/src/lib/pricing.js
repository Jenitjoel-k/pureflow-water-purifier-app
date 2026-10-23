export const FREE_SHIPPING_ABOVE = 999;
export const SHIPPING_FEE = 79;

// Extra slab discount on dealer bulk orders, on top of wholesale prices.
export const BULK_SLABS = [
  { min: 100000, rate: 0.05 },
  { min: 50000, rate: 0.03 },
];

export const unitPrice = (product, isDealer) => (isDealer ? product.dealerPrice : product.price);

export const minQty = (product, isDealer) => (isDealer ? product.moq || 1 : 1);

export function bulkRate(subtotal) {
  return BULK_SLABS.find((s) => subtotal >= s.min)?.rate || 0;
}

// lines: [{ product, qty }]
export function computeTotals(lines, isDealer) {
  const subtotal = lines.reduce((s, l) => s + unitPrice(l.product, isDealer) * l.qty, 0);
  const rate = isDealer ? bulkRate(subtotal) : 0;
  const discount = Math.round(subtotal * rate);
  const shipping = isDealer || subtotal === 0 || subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
  const total = subtotal - discount + shipping;
  // Prices are GST-inclusive (18%); show the tax component for the invoice.
  const gst = Math.round(total - total / 1.18);
  return { subtotal, discount, discountRate: rate, shipping, gst, total };
}

export function nextSlab(subtotal) {
  const upcoming = [...BULK_SLABS].reverse().find((s) => subtotal < s.min);
  return upcoming ? { ...upcoming, remaining: upcoming.min - subtotal } : null;
}
