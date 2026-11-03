-- Tables for the shop. The database itself is created by database/setup.js.
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS addresses;
-- DROP TABLE IF EXISTS reviews;
-- DROP TABLE IF EXISTS product_images;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS users;

-- CREATE TABLE users (
--     id            INT AUTO_INCREMENT PRIMARY KEY,
--     name          VARCHAR(100) NOT NULL,
--     email         VARCHAR(255) NOT NULL UNIQUE,
--     password_hash VARCHAR(255) NULL,              -- NULL for accounts that only use Google login
--     google_id     VARCHAR(64)  NULL UNIQUE,
--     role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
--     created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB;

-- CREATE TABLE products (
--     id          INT AUTO_INCREMENT PRIMARY KEY,
--     name        VARCHAR(200) NOT NULL,
--     description TEXT NOT NULL,
--     category    VARCHAR(50)  NOT NULL,
--     price       DECIMAL(10,2) NOT NULL,
--     stock       INT NOT NULL DEFAULT 0,
--     image       VARCHAR(255) NOT NULL,
--     is_active   TINYINT(1) NOT NULL DEFAULT 1,    -- "deleting" a product only sets this to 0, so old orders stay valid
--     created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     INDEX idx_products_category (category)
-- ) ENGINE=InnoDB;

-- CREATE TABLE product_images (
--     id         INT AUTO_INCREMENT PRIMARY KEY,
--     product_id INT NOT NULL,
--     url        VARCHAR(255) NOT NULL,
--     position   INT NOT NULL DEFAULT 0,
--     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;

-- CREATE TABLE reviews (
--     id          INT AUTO_INCREMENT PRIMARY KEY,
--     product_id  INT NOT NULL,
--     user_id     INT NULL,                          -- NULL for the sample reviews loaded by setup
--     author_name VARCHAR(100) NOT NULL,
--     rating      TINYINT NOT NULL,
--     comment     TEXT NOT NULL,
--     created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
--     UNIQUE KEY uq_review_user_product (user_id, product_id),   -- one review per user per product
--     CHECK (rating BETWEEN 1 AND 5)
-- ) ENGINE=InnoDB;

-- CREATE TABLE addresses (
--     id           INT AUTO_INCREMENT PRIMARY KEY,
--     user_id      INT NOT NULL,
--     full_name    VARCHAR(100) NOT NULL,
--     phone        VARCHAR(20)  NOT NULL,
--     address_line VARCHAR(255) NOT NULL,
--     city         VARCHAR(100) NOT NULL,
--     postal_code  VARCHAR(12)  NULL,
--     created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;

-- CREATE TABLE orders (
--     id           INT AUTO_INCREMENT PRIMARY KEY,
--     user_id      INT NOT NULL,
--     address_id   INT NOT NULL,
--     total_amount DECIMAL(10,2) NOT NULL,
--     status       ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
--     created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id),
--     FOREIGN KEY (address_id) REFERENCES addresses(id)
-- ) ENGINE=InnoDB;

-- CREATE TABLE order_items (
--     id                INT AUTO_INCREMENT PRIMARY KEY,
--     order_id          INT NOT NULL,
--     product_id        INT NOT NULL,
--     product_name      VARCHAR(200) NOT NULL,          -- name at the time of purchase
--     quantity          INT NOT NULL,
--     price_at_purchase DECIMAL(10,2) NOT NULL,         -- price at the time of purchase (prices can change later)
--     FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
--     FOREIGN KEY (product_id) REFERENCES products(id)
-- ) ENGINE=InnoDB;

use shop_db;
select * from shop_db;