function productSizeOptions(product) {
  const recorded = Array.isArray(product?.sizes)
    ? product.sizes.map(size => String(size).trim()).filter(Boolean)
    : [];
  if (recorded.length) return recorded.filter(size => !/^(none|n\/a|na)$/i.test(size));
  const category = String(product?.category || "").trim().toLowerCase();
  const name = String(product?.name || "").trim().toLowerCase();
  if (["toys", "accessories"].includes(category)) return [];
  const clothing = /\b(dress|romper|bodysuit|body suit|sleep ?suit|sleepsuit|t[ -]?shirt|tee|shirt|top|shorts?|pants|trousers|leggings|joggers|sweater|jumper|hoodie|jacket|coat|skirt|pajamas?|pyjamas?|polo|uniform|onesie|overall|cardigan|gown|tunic|baby ?grow|outfit)\b/i;
  return clothing.test(name) ? ["S", "M", "L", "XL"] : [];
}

function buildPricedItems(requested, products) {
  if (!Array.isArray(requested) || requested.length === 0) throw new Error("Order items are required");
  const byId = new Map((products || []).map(product => [String(product.id), product]));
  const items = requested.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Each item needs a product and a positive whole-number quantity");
    const id = String(item.product_id ?? item.id ?? "").trim();
    const rawQuantity = item.quantity ?? item.qty;
    const quantity = typeof rawQuantity === "number" || (typeof rawQuantity === "string" && /^\d+$/.test(rawQuantity.trim())) ? Number(rawQuantity) : NaN;
    const size = String(item.size || "").trim();
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Each item needs a product and a positive whole-number quantity");
    const product = byId.get(id);
    if (!product) throw new Error("A product in your cart is no longer available");
    if (product.is_active === false) throw new Error(`${product.name} is no longer available for sale`);
    const sizes = productSizeOptions(product);
    if (sizes.length && (!size || !sizes.includes(size))) throw new Error(`Choose an available size for ${product.name}`);
    if (!sizes.length && size) throw new Error(`${product.name} does not have size options`);
    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) throw new Error(`${product.name} has an invalid price`);
    return { product_id: product.id, product_name: product.name, quantity, price: Number(product.price), size: size || null };
  });
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = Math.round((subtotal + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(total) || total <= 0) throw new Error("Order total is invalid");
  return { items, total };
}

function canTransitionOrderStatus(currentStatus, paymentStatus, nextStatus) {
  const next = String(nextStatus || "").trim();
  if (next === "Canceled") return true;
  if (next !== "Completed") return false;
  return String(paymentStatus || "").trim().toLowerCase() === "paid";
}

module.exports = { buildPricedItems, canTransitionOrderStatus, productSizeOptions };
