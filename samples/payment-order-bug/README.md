# Payment Order Bug (Sample)

A tiny Express microservice for creating orders and processing payments.
This sample is used by ReproForge to demonstrate the context-preview
pipeline.

## The Bug

When a customer orders items whose prices cause floating-point drift
(e.g. 3 × $19.99), the `processPayment()` function rejects the
payment because it uses strict equality (`===`) to compare the
incoming amount with the stored total:

```
total = 19.99 * 3  →  59.970000000000006
amount = 59.97     →  59.97
amount !== total    →  true  (bug!)
```

The error is thrown but **swallowed** by the `catch` block in
`app.js` (POST `/orders/:id/pay`), which still returns HTTP 200.
So the client thinks the payment succeeded while the order stays
`"pending"`.

## Reproduce

```bash
npm test                # all 5 existing tests pass
```

A ONE-test reproducer:
```js
// Create order with 3 × $19.99
// Pay with amount = 59.97 (correctly rounded)
// Expect order.status === "paid"
// Actual: order.status === "pending"
```

## Fix

Replace the strict-equality check in `src/orders.js` with a
tolerance-based or pre-rounded comparison:

```diff
- if (amount !== order.total) {
+ if (Math.abs(amount - order.total) > 0.005) {
```

Or round the total at creation time:
```diff
- total += item.price * item.quantity;
+ total += Math.round(item.price * item.quantity * 100) / 100;
```
