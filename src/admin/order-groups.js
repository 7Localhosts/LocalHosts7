(function exposeOrderGroups(root, factory) {
  const helpers = factory();
  if (typeof module === "object" && module.exports) module.exports = helpers;
  if (root) root.KaysHavenOrderGroups = helpers;
})(typeof window !== "undefined" ? window : globalThis, function createOrderGroups() {
  function firstValue(order, names) {
    for (const name of names) {
      const value = order && order[name];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return "";
  }

  function customerGroupKey(order, fallbackIndex = 0) {
    const accountId = firstValue(order, ["customer_id", "customerId", "account_id", "user_id", "userId"]) || firstValue(order?.customer, ["id"]);
    if (accountId) return `account:${accountId.toLowerCase()}`;

    const email = (firstValue(order, ["customer_email", "email"]) || firstValue(order?.customer, ["email"])).toLowerCase();
    if (email) return `email:${email}`;

    const phone = (firstValue(order, ["customer_phone", "phone"]) || firstValue(order?.customer, ["phone"])).replace(/\D/g, "");
    if (phone) return `phone:${phone}`;

    const uniqueOrderId = firstValue(order, ["id", "order_id", "order_number"]);
    return uniqueOrderId ? `order:${uniqueOrderId}` : `order-row:${fallbackIndex}`;
  }

  function groupOrdersByCustomer(orders) {
    const groups = new Map();
    orders.forEach((order, index) => {
      const key = customerGroupKey(order, index);
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          customerName: firstValue(order, ["customer_name", "name"]) || firstValue(order?.customer, ["full_name", "name"]) || "Unknown customer",
          phone: firstValue(order, ["customer_phone", "phone"]) || firstValue(order?.customer, ["phone"]),
          email: firstValue(order, ["customer_email", "email"]) || firstValue(order?.customer, ["email"]),
          orders: [],
          totalSpent: 0
        };
        groups.set(key, group);
      }
      group.orders.push(order);
      group.totalSpent += Number(order.total_amount || 0);
      if (group.customerName === "Unknown customer") {
        group.customerName = firstValue(order, ["customer_name", "name"]) || group.customerName;
      }
      if (!group.phone) group.phone = firstValue(order, ["customer_phone", "phone"]);
      if (!group.email) group.email = firstValue(order, ["customer_email", "email"]);
    });
    return [...groups.values()];
  }

  return { customerGroupKey, groupOrdersByCustomer };
});
