// The logged-in user's saved delivery addresses.
const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");
const { wrap, readAddress } = require("../utils");

const router = express.Router();

function shapeAddress(row) {
    return {
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        addressLine: row.address_line,
        city: row.city,
        postalCode: row.postal_code
    };
}

// GET /api/addresses
router.get("/", requireAuth, wrap(async (req, res) => {
    const [rows] = await pool.query(
        "SELECT id, full_name, phone, address_line, city, postal_code FROM addresses WHERE user_id = ? ORDER BY id DESC",
        [req.user.id]
    );
    res.json(rows.map(shapeAddress));
}));

// POST /api/addresses  { fullName, phone, addressLine, city, postalCode }
router.post("/", requireAuth, wrap(async (req, res) => {
    const a = readAddress(req.body);
    const [result] = await pool.query(
        "INSERT INTO addresses (user_id, full_name, phone, address_line, city, postal_code) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, a.fullName, a.phone, a.addressLine, a.city, a.postalCode]
    );
    res.status(201).json({ id: result.insertId });
}));

module.exports = router;
