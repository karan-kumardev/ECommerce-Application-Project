// Public product routes + posting a review.
const express = require("express");
const pool = require("../db");
const { listProducts, getProduct } = require("../queries");
const { requireAuth, readUser } = require("../middleware/auth");
const { HttpError, wrap, text } = require("../utils");

const router = express.Router();

// GET /api/products  -> every active product (without reviews)
router.get("/", wrap(async (req, res) => {
    res.json(await listProducts());
}));

// GET /api/products/5  -> one product with images and reviews
router.get("/:id", wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Product not found");

    const viewer = readUser(req);   // null for guests; used to mark the viewer's own review
    const product = await getProduct(id, viewer ? viewer.id : null);
    if (!product) throw new HttpError(404, "Product not found");

    res.json(product);
}));

// POST /api/products/5/reviews  { rating, comment }   (logged-in users only)
router.post("/:id/reviews", requireAuth, wrap(async (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId < 1) throw new HttpError(404, "Product not found");

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Rating must be from 1 to 5");
    const comment = text(req.body.comment, 3, 1000, "Review");

    const [found] = await pool.query("SELECT id FROM products WHERE id = ? AND is_active = 1", [productId]);
    if (found.length === 0) throw new HttpError(404, "Product not found");

    try {
        await pool.query(
            "INSERT INTO reviews (product_id, user_id, author_name, rating, comment) VALUES (?, ?, ?, ?, ?)",
            [productId, req.user.id, req.user.name, rating, comment]
        );
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") throw new HttpError(409, "You have already reviewed this product");
        throw err;
    }

    res.status(201).json({ ok: true });
}));

module.exports = router;
