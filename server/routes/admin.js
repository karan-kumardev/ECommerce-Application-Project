// Admin-only routes: dashboard numbers, product management, all orders.
const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { listProducts } = require("../queries");
const { HttpError, wrap, readProduct } = require("../utils");

const router = express.Router();

// every route in this file needs an admin login
router.use(requireAdmin);

// GET /api/admin/stats
router.get("/stats", wrap(async (req, res) => {
    const [[counts]] = await pool.query(
        `SELECT
            (SELECT COUNT(*) FROM orders) AS orders,
            (SELECT COUNT(*) FROM products WHERE is_active = 1) AS products,
            (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status <> 'cancelled') AS revenue,
            (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders`
    );

    res.json({
        orders: Number(counts.orders),
        products: Number(counts.products),
        customers: Number(counts.customers),
        pendingOrders: Number(counts.pending_orders),
        revenue: Number(counts.revenue)
    });
}));

// GET /api/admin/products
router.get("/products", wrap(async (req, res) => {
    res.json(await listProducts());
}));

// POST /api/admin/products  { name, description, category, price, stock, image }
router.post("/products", wrap(async (req, res) => {
    const p = readProduct(req.body);

    const [result] = await pool.query(
        "INSERT INTO products (name, description, category, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)",
        [p.name, p.description, p.category, p.price, p.stock, p.image]
    );
    await pool.query("INSERT INTO product_images (product_id, url, position) VALUES (?, ?, 0)", [result.insertId, p.image]);

    res.status(201).json({ id: result.insertId });
}));

// PUT /api/admin/products/5
router.put("/products/:id", wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Product not found");
    const p = readProduct(req.body);

    const [rows] = await pool.query("SELECT image FROM products WHERE id = ? AND is_active = 1", [id]);
    if (rows.length === 0) throw new HttpError(404, "Product not found");

    await pool.query(
        "UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, image = ? WHERE id = ?",
        [p.name, p.description, p.category, p.price, p.stock, p.image, id]
    );

    // a new main image replaces the gallery; otherwise the existing gallery stays
    if (rows[0].image !== p.image) {
        await pool.query("DELETE FROM product_images WHERE product_id = ?", [id]);
        await pool.query("INSERT INTO product_images (product_id, url, position) VALUES (?, ?, 0)", [id, p.image]);
    }

    res.json({ ok: true });
}));

// DELETE /api/admin/products/5   (hides it from the shop, keeps old orders intact)
router.delete("/products/:id", wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Product not found");

    const [result] = await pool.query("UPDATE products SET is_active = 0 WHERE id = ? AND is_active = 1", [id]);
    if (result.affectedRows === 0) throw new HttpError(404, "Product not found");

    res.json({ ok: true });
}));

// GET /api/admin/orders  -> every order with the customer's name
router.get("/orders", wrap(async (req, res) => {
    const [rows] = await pool.query(
        `SELECT o.id, o.total_amount, o.status, o.created_at, u.name AS customer_name, u.email AS customer_email,
                (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count
         FROM orders o
         JOIN users u ON u.id = o.user_id
         ORDER BY o.id DESC`
    );

    res.json(rows.map(r => ({
        id: r.id,
        total: Number(r.total_amount),
        status: r.status,
        createdAt: r.created_at,
        itemCount: Number(r.item_count),
        customer: { name: r.customer_name, email: r.customer_email }
    })));
}));

// PATCH /api/admin/orders/12/status  { status: "successful" | "cancelled" | "pending" }
router.patch("/orders/:id/status", wrap(async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body.status;
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Order not found");
    if (!["pending", "successful", "cancelled"].includes(status)) {
        throw new HttpError(400, "Status must be pending, successful or cancelled");
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query("SELECT status FROM orders WHERE id = ? FOR UPDATE", [id]);
        if (rows.length === 0) throw new HttpError(404, "Order not found");
        const current = rows[0].status;

        if (current === "cancelled" && status !== "cancelled") {
            throw new HttpError(400, "A cancelled order cannot be reopened");
        }

        // cancelling puts the stock back
        if (status === "cancelled" && current !== "cancelled") {
            await conn.query(
                `UPDATE products p
                 JOIN order_items oi ON oi.product_id = p.id
                 SET p.stock = p.stock + oi.quantity
                 WHERE oi.order_id = ?`,
                [id]
            );
        }

        await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
        await conn.commit();
        res.json({ ok: true });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

module.exports = router;
