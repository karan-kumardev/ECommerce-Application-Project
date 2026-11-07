// Small helpers shared by the routes.

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// lets async route functions throw errors that reach the error handler
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Strict number reader: only a real number or a plain numeric string like "12" or "12.50".
// Blank text, null, [], true, "0x10", "1e2" all become NaN (plain Number() would turn them into 0, 1 or 100).
function toNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) return Number(value);
    return NaN;
}

function isEmail(value) {
    return typeof value === "string" && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// checks that value is text of the right length; returns it trimmed
function text(value, min, max, label) {
    if (typeof value !== "string") throw new HttpError(400, `${label} is required`);
    const v = value.trim();
    if (v.length < min || v.length > max) {
        throw new HttpError(400, `${label} must be between ${min} and ${max} characters`);
    }
    return v;
}

function readAddress(a) {
    if (!a || typeof a !== "object") throw new HttpError(400, "Delivery address is required");

    const fullName = text(a.fullName, 2, 100, "Full name");
    const phone = text(a.phone, 7, 20, "Phone number");
    if (!/^[0-9+\-\s()]+$/.test(phone)) throw new HttpError(400, "Phone number can only contain digits, spaces, + - ( )");
    const addressLine = text(a.addressLine, 5, 255, "Address");
    const city = text(a.city, 2, 100, "City");

    let postalCode = null;
    if (a.postalCode !== undefined && a.postalCode !== null && String(a.postalCode).trim() !== "") {
        postalCode = text(String(a.postalCode), 3, 12, "Postal code");
        if (!/^[A-Za-z0-9][A-Za-z0-9 \-]*$/.test(postalCode)) throw new HttpError(400, "Postal code can only contain letters, digits, spaces and -");
    }

    return { fullName, phone, addressLine, city, postalCode };
}

const CATEGORIES = ["electronics", "fashion", "home", "beauty", "sports", "accessories"];

function readProduct(b) {
    if (!b || typeof b !== "object") throw new HttpError(400, "Product data is required");

    const name = text(b.name, 2, 200, "Name");
    const description = typeof b.description === "string" ? b.description.trim().slice(0, 5000) : "";

    const category = String(b.category || "").toLowerCase();
    if (!CATEGORIES.includes(category)) {
        throw new HttpError(400, "Category must be one of: " + CATEGORIES.join(", "));
    }

    const price = toNumber(b.price);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) throw new HttpError(400, "Price must be a number from 0 to 1,000,000");

    const stock = toNumber(b.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) throw new HttpError(400, "Stock must be a whole number from 0 to 1,000,000");

    const image = typeof b.image === "string" && b.image.trim() !== ""
        ? b.image.trim().slice(0, 255)
        : "../images/placeholder.svg";

    return { name, description, category, price: Math.round(price * 100) / 100, stock, image };
}

module.exports = { HttpError, wrap, toNumber, isEmail, text, readAddress, readProduct, CATEGORIES };
