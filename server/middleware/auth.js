// Login is a signed token (JWT) stored in an httpOnly cookie, so JavaScript on the page cannot read it.
const jwt = require("jsonwebtoken");

const COOKIE_NAME = "token";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function setLoginCookie(res, user) {
    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: WEEK
    });
}

function clearLoginCookie(res) {
    res.clearCookie(COOKIE_NAME);
}

// returns the user inside the cookie, or null
function readUser(req) {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
}

function requireAuth(req, res, next) {
    const user = readUser(req);
    if (!user) return res.status(401).json({ error: "Please log in first" });
    req.user = user;
    next();
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
        next();
    });
}

module.exports = { setLoginCookie, clearLoginCookie, readUser, requireAuth, requireAdmin };
