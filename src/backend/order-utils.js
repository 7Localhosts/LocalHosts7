function buildPricedItems(requested, products, deliveryFee) {
  if (!Array.isArray(requested) || requested.length === 0) throw new Error("Order items are required");
  const byId = new Map((products || []).map(product => [String(product.id), product]));
  const quantitiesByProduct = new Map();
  const items = requested.map(item => {
    const id = String(item.product_id ?? item.id ?? "").trim();
    const quantity = Number(item.quantity ?? item.qty);
    const size = String(item.size || "").trim();
    if (!id || !Number.isInteger(quantity) || quantity < 1) throw new Error("Each item needs a product and a positive whole-number quantity");
    const product = byId.get(id);
    if (!product) throw new Error("A product in your cart is no longer available");
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    if (sizes.length && (!size || !sizes.includes(size))) throw new Error(`Choose an available size for ${product.name}`);
    if (!sizes.length && size) throw new Error(`${product.name} does not have size options`);
    quantitiesByProduct.set(id, (quantitiesByProduct.get(id) || 0) + quantity);
    return { product_id: product.id, product_name: product.name, quantity, price: Number(product.price), size: size || null };
  });
  for (const [id, quantity] of quantitiesByProduct) {
    const product = byId.get(id);
    if (!Number.isFinite(Number(product.stock)) || Number(product.stock) < quantity) throw new Error(`${product.name} does not have enough stock`);
    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) throw new Error(`${product.name} has an invalid price`);
  }
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = Math.round((subtotal + Number(deliveryFee)) * 100) / 100;
  if (!Number.isFinite(total) || total <= 0) throw new Error("Order total is invalid");
  return { items, total };
}

module.exports = { buildPricedItems };
