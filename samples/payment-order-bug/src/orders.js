/**
 * Order management module.
 *
 * THE BUG: In processPayment(), the amount comparison uses strict
 * equality (===) between a floating-point total and the incoming
 * payment amount. For totals that involve floating-point rounding
 * (e.g. 3 items at $19.99 = $59.97 vs 59.970000000000006), the
 * comparison fails, the order stays "pending", and the error is
 * swallowed by the catch block in app.js that returns 200 anyway.
 */

const orders = new Map();
let nextId = 1;

function roundToTwo(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Creates a new order from an items array.
 * Each item: { name: string, price: number, quantity: number }
 */
function createOrder(items) {
  const id = String(nextId++);
  // BUG: total is computed by summing price * quantity without rounding
  // intermediate results, which produces floating-point drift for
  // certain combinations (e.g. 3 × $19.99).
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  // total is NOT rounded here — e.g. 59.970000000000006

  const order = {
    id,
    items: items.map((i) => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    total,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  orders.set(id, order);
  return order;
}

/**
 * Retrieves an order by ID.
 */
function getOrder(id) {
  return orders.get(id) || null;
}

/**
 * Processes a payment for an order.
 *
 * BUG: Uses === to compare the payment amount with the order total.
 * When the total has floating-point drift (e.g. 59.970000000000006),
 * a correctly-rounded payment of 59.97 will NOT match, causing a
 * thrown error. The caller (app.js) catches that error but still
 * returns HTTP 200, so the client thinks payment succeeded while the
 * order stays "pending".
 */
function processPayment(id, amount) {
  const order = orders.get(id);
  if (!order) {
    throw new Error(`Order ${id} not found`);
  }
  if (order.status === "paid") {
    return { id: order.id, status: "paid", message: "Already paid" };
  }

  // BUG: strict equality fails when total has FP drift
  if (amount !== order.total) {
    throw new Error(
      `Payment amount ${amount} does not match order total ${order.total}`
    );
  }

  order.status = "paid";
  order.paidAt = new Date().toISOString();
  return { id: order.id, status: "paid", total: order.total };
}

/**
 * Resets in-memory store (for tests).
 */
function resetOrders() {
  orders.clear();
  nextId = 1;
}

module.exports = {
  createOrder,
  getOrder,
  processPayment,
  resetOrders,
};
