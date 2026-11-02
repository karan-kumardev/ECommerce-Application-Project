// Product queries used by both the public and the admin routes.
const pool = require("./db");

// rating and review count are calculated from the reviews table
const BASE_SELECT = `
    SELECT p.id, p.name, p.description, p.category, p.price, p.stock, p.image, p.created_at,
           COALESCE(ROUND(AVG(r.rating), 1), 0) AS rating,
           COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id`;

function shapeProduct(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        price: Number(row.price),
        stock: row.stock,
        image: row.image,
        createdAt: row.created_at,
        rating: Number(row.rating),
        reviewCount: Number(row.review_count)
    };
}

async function listProducts() {
    const [rows] = await pool.query(`${BASE_SELECT} WHERE p.is_active = 1 GROUP BY p.id ORDER BY p.id`);
    return rows.map(shapeProduct);
}

// one product with its images and reviews, or null
async function getProduct(id) {
    const [rows] = await pool.query(`${BASE_SELECT} WHERE p.id = ? AND p.is_active = 1 GROUP BY p.id`, [id]);
    if (rows.length === 0) return null;

    const product = shapeProduct(rows[0]);

    const [images] = await pool.query("SELECT url FROM product_images WHERE product_id = ? ORDER BY position, id", [id]);
    product.images = images.length ? images.map(i => i.url) : [product.image];

    const [reviews] = await pool.query(
        "SELECT rating, comment, author_name, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC, id DESC",
        [id]
    );
    product.reviews = reviews.map(r => ({
        rating: r.rating,
        comment: r.comment,
        author: r.author_name,
        date: r.created_at
    }));

    return product;
}

module.exports = { listProducts, getProduct };
