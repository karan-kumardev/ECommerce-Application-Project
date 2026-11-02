// Checkout and order history (logged-in users only).
const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");
const { HttpError, wrap, readAddress } = require("../utils");

const router = express.Router();

// POST /api/orders  { items: [{ id, qty }], address: {...}  OR  addressId }
// The browser only says WHICH products and HOW MANY. Prices and stock always come from the database.
router.post("/", requireAuth, wrap(async (req, res) => {
    const { items, address, addressId } = req.body;

    // ----- check the input before touching the database -----
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        throw new HttpError(400, "Your cart is empty");
    }

    const wanted = new Map();                       // product id -> quantity
    for (const item of items) {
        const id = Number(item && item.id);
        const qty = Number(item && item.qty);
        if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1) {
            throw new HttpError(400, "Invalid item in your cart");
        }
        wanted.set(id, (wanted.get(id) || 0) + qty);
    }
    for (const qty of wanted.values()) {
        if (qty > 20) throw new HttpError(400, "You can order at most 20 of one product");
    }

    const newAddress = addressId ? null : readAddress(address);

    // ----- everything below happens in ONE transaction: all of it succeeds, or none of it -----
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let totalCents = 0;
        const lines = [];

        // lock rows in id order, so two orders at the same time cannot deadlock
        for (const id of [...wanted.keys()].sort((a, b) => a - b)) {
            const [rows] = await conn.query(
                "SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE",
                [id]
            );
            if (rows.length === 0) throw new HttpError(400, "A product in your cart is no longer available");

            const product = rows[0];
            const qty = wanted.get(id);

            if (product.stock < qty) {
                throw new HttpError(409, `Not enough stock for "${product.name}" (only ${product.stock} left)`);
            }

            const cents = Math.round(Number(product.price) * 100);
            totalCents += cents * qty;
            lines.push({ product, qty, cents });
        }

        // the address: an existing one of this user, or a new one
        let useAddressId;
        if (addressId) {
            const [rows] = await conn.query(
                "SELECT id FROM addresses WHERE id = ? AND user_id = ?",
                [Number(addressId), req.user.id]
            );
            if (rows.length === 0) throw new HttpError(400, "That address was not found");
            useAddressId = rows[0].id;
        } else {
            const [result] = await conn.query(
                "INSERT INTO addresses (user_id, full_name, phone, address_line, city, postal_code) VALUES (?, ?, ?, ?, ?, ?)",
                [req.user.id, newAddress.fullName, newAddress.phone, newAddress.addressLine, newAddress.city, newAddress.postalCode]
            );
            useAddressId = result.insertId;
        }

        const [orderResult] = await conn.query(
            "INSERT INTO orders (user_id, address_id, total_amount, status) VALUES (?, ?, ?, 'pending')",
            [req.user.id, useAddressId, (totalCents / 100).toFixed(2)]
        );
        const orderId = orderResult.insertId;

        for (const line of lines) {
            await conn.query(
                "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)",
                [orderId, line.product.id, line.product.name, line.qty, (line.cents / 100).toFixed(2)]
            );
            await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [line.qty, line.product.id]);
        }

        await conn.commit();
        res.status(201).json({ orderId });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

// GET /api/orders  -> this user's orders, newest first
router.get("/", requireAuth, wrap(async (req, res) => {
    const [rows] = await pool.query(
        `SELECT o.id, o.total_amount, o.status, o.created_at,
                (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count
         FROM orders o
         WHERE o.user_id = ?
         ORDER BY o.id DESC`,
        [req.user.id]
    );

    res.json(rows.map(r => ({
        id: r.id,
        total: Number(r.total_amount),
        status: r.status,
        createdAt: r.created_at,
        itemCount: Number(r.item_count)
    })));
}));

// GET /api/orders/12  -> the full bill (owner or admin only)
router.get("/:id", requireAuth, wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Order not found");

    const [rows] = await pool.query(
        `SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at,
                a.full_name, a.phone, a.address_line, a.city, a.postal_code,
                u.name AS customer_name, u.email AS customer_email
         FROM orders o
         JOIN addresses a ON a.id = o.address_id
         JOIN users u ON u.id = o.user_id
         WHERE o.id = ?`,
        [id]
    );

    // someone else's order looks exactly like a missing one
    if (rows.length === 0 || (rows[0].user_id !== req.user.id && req.user.role !== "admin")) {
        throw new HttpError(404, "Order not found");
    }
    const o = rows[0];

    const [items] = await pool.query(
        `SELECT oi.product_id, oi.product_name, oi.quantity, oi.price_at_purchase, p.image
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?
         ORDER BY oi.id`,
        [id]
    );

    res.json({
        id: o.id,
        status: o.status,
        total: Number(o.total_amount),
        createdAt: o.created_at,
        customer: { name: o.customer_name, email: o.customer_email },
        address: {
            fullName: o.full_name,
            phone: o.phone,
            addressLine: o.address_line,
            city: o.city,
            postalCode: o.postal_code
        },
        items: items.map(i => ({
            productId: i.product_id,
            name: i.product_name,
            quantity: i.quantity,
            price: Number(i.price_at_purchase),
            lineTotal: Math.round(Number(i.price_at_purchase) * 100) * i.quantity / 100,
            image: i.image
        }))
    });
}));

module.exports = router;
