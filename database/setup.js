// database/setup.js  -  run with:  npm run setup
// Creates the database and tables, loads the sample products from js/products-data.js,
// and creates the admin account. WARNING: it wipes existing shop data.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const ROOT = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env") });

const DB_NAME = process.env.DB_NAME || "shop_db";

if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    console.error("DB_NAME in .env may only contain letters, numbers and underscores.");
    process.exit(1);
}

// "2025-04-30T09:41:02.053Z" -> "2025-04-30 15:41:02" (this computer's local time, like the rest of the database)
function toMysqlDate(value) {
    let d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// reads `const products = [...]` out of js/products-data.js
function loadSampleProducts() {
    const file = path.join(ROOT, "js", "products-data.js");
    if (!fs.existsSync(file)) return null;
    const context = {};
    vm.runInNewContext(fs.readFileSync(file, "utf8") + "\n;this.__products = products;", context);
    return context.__products;
}

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        multipleStatements: true
    });

    console.log("Creating database and tables...");
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${DB_NAME}\``);
    await conn.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

    // ----- sample products (same ids as in products-data.js, so saved carts keep working) -----
    const sample = loadSampleProducts();
    if (!sample) {
        console.warn("js/products-data.js not found - skipping sample products.");
    } else {
        let reviewCount = 0;
        for (const p of sample) {
            await conn.query(
                `INSERT INTO products (id, name, description, category, price, stock, image, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                [p.id, p.name, p.description, p.category, p.price, p.stock, p.image, toMysqlDate(p.createdAt)]
            );

            const images = p.images && p.images.length ? p.images : [p.image];
            for (let i = 0; i < images.length; i++) {
                await conn.query(
                    "INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)",
                    [p.id, images[i], i]
                );
            }

            for (const r of p.reviews || []) {
                await conn.query(
                    `INSERT INTO reviews (product_id, user_id, author_name, rating, comment, created_at)
                     VALUES (?, NULL, ?, ?, ?, ?)`,
                    [p.id, r.author, r.rating, r.comment, toMysqlDate(r.date)]
                );
                reviewCount++;
            }
        }
        console.log(`Loaded ${sample.length} products and ${reviewCount} sample reviews.`);
    }

    // ----- admin account -----
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@shop.com").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";
    const hash = await bcrypt.hash(adminPassword, 10);
    await conn.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', ?, ?, 'admin')",
        [adminEmail, hash]
    );
    console.log(`Admin account created:  ${adminEmail}  /  ${adminPassword}`);

    await conn.end();
    console.log("Done. Start the server with:  npm start");
}

main().catch(err => {
    console.error("\nSetup failed:", err.message);
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
        console.error("-> Check DB_USER and DB_PASSWORD in your .env file.");
    } else if (err.code === "ECONNREFUSED") {
        console.error("-> MySQL is not running (or DB_HOST / DB_PORT is wrong).");
    }
    process.exit(1);
});
