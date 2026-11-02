// Sign up, log in, log out, and "who am I".
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { setLoginCookie, clearLoginCookie, readUser } = require("../middleware/auth");
const { HttpError, wrap, isEmail, text } = require("../utils");

const router = express.Router();

function publicUser(row) {
    return { id: row.id, name: row.name, email: row.email, role: row.role };
}

// POST /api/auth/signup  { name, email, password }
router.post("/signup", wrap(async (req, res) => {
    const name = text(req.body.name, 2, 100, "Name");

    const email = String(req.body.email || "").trim().toLowerCase();
    if (!isEmail(email)) throw new HttpError(400, "Enter a valid email address");

    const password = req.body.password;
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
        throw new HttpError(400, "Password must be between 8 and 72 characters");
    }

    const hash = await bcrypt.hash(password, 10);

    let userId;
    try {
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            [name, email, hash]
        );
        userId = result.insertId;
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") throw new HttpError(409, "An account with this email already exists");
        throw err;
    }

    const user = { id: userId, name, email, role: "customer" };
    setLoginCookie(res, user);
    res.status(201).json({ user });
}));

// POST /api/auth/login  { email, password }
router.post("/login", wrap(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== "string" || password === "") {
        throw new HttpError(400, "Enter your email and password");
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const row = rows[0];

    // same message for "no such user" and "wrong password", so nobody can probe which emails exist
    const ok = row && row.password_hash && await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new HttpError(401, "Wrong email or password");

    const user = publicUser(row);
    setLoginCookie(res, user);
    res.json({ user });
}));

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    clearLoginCookie(res);
    res.json({ ok: true });
});

// GET /api/auth/me  -> { user: {...} } or { user: null }
router.get("/me", wrap(async (req, res) => {
    const tokenUser = readUser(req);
    if (!tokenUser) return res.json({ user: null });

    const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [tokenUser.id]);
    res.json({ user: rows[0] ? publicUser(rows[0]) : null });
}));

module.exports = router;
