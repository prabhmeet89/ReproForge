const express = require("express");
const { createOrder, getOrder, processPayment } = require("./orders");

const app = express();
app.use(express.json());

// POST /orders — create a new order
app.post("/orders", (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array is required" });
    }
    const order = createOrder(items);
    return res.status(201).json(order);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /orders/:id/pay — payment webhook
app.post("/orders/:id/pay", (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: "amount is required" });
    }
    const result = processPayment(id, amount);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Payment processing error:", err.message);
    // BUG: returns 200 even on error — swallows the failure
    return res.status(200).json({ status: "received" });
  }
});

// GET /orders/:id — get order status
app.get("/orders/:id", (req, res) => {
  try {
    const order = getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.status(200).json(order);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;
