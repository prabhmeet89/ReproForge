const request = require("supertest");
const app = require("../src/app");
const { resetOrders } = require("../src/orders");

beforeEach(() => {
  resetOrders();
});

describe("Order API", () => {
  test("creates an order successfully", async () => {
    const res = await request(app)
      .post("/orders")
      .send({ items: [{ name: "Widget", price: 10.0, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.total).toBe(20.0);
    expect(res.body.status).toBe("pending");
  });

  test("rejects empty items", async () => {
    const res = await request(app).post("/orders").send({ items: [] });
    expect(res.status).toBe(400);
  });

  test("pays for an order with simple total", async () => {
    const createRes = await request(app)
      .post("/orders")
      .send({ items: [{ name: "Gadget", price: 25.0, quantity: 1 }] });
    const orderId = createRes.body.id;

    const payRes = await request(app)
      .post(`/orders/${orderId}/pay`)
      .send({ amount: 25.0 });
    expect(payRes.status).toBe(200);
    expect(payRes.body.status).toBe("paid");

    const getRes = await request(app).get(`/orders/${orderId}`);
    expect(getRes.body.status).toBe("paid");
  });

  test("retrieves an order", async () => {
    const createRes = await request(app)
      .post("/orders")
      .send({ items: [{ name: "Thing", price: 5.99, quantity: 1 }] });
    const getRes = await request(app).get(`/orders/${createRes.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.total).toBe(5.99);
  });

  test("returns 404 for non-existent order", async () => {
    const res = await request(app).get("/orders/999");
    expect(res.status).toBe(404);
  });
});
