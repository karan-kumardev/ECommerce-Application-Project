# Mini E-Commerce Website

Web Engineering project (Semester 5, IBA Sukkur) by **Karan Kumar**

A small online shop built with plain **HTML, CSS and JavaScript** on the front end and **Node.js + Express + MySQL** on the back end.

## Features

**Customers**
- Browse products, live search, category filter
- Product page with image gallery and reviews (one review per user, 1-5 stars)
- Cart and wishlist (kept separately for each user; guest items merge on login)
- Wishlist PDF download
- Sign up / log in (passwords hashed, login kept in an httpOnly cookie)
- Checkout with saved addresses, stock check, and order receipt (PDF download)
- Account page: profile, saved addresses, order history

**Admin**
- Dashboard: orders, products, customers, revenue, pending orders
- Add, edit and delete products
- View all orders; mark a pending order **Successful** or **Cancelled** (cancelling restores stock)
- Customers see the updated status in their account

**Security and safety**
- Prices and stock always come from the database, never from the browser
- Orders are saved in one transaction (all or nothing)
- All user text is escaped before it is shown (no script injection)
- Admin API is blocked for normal users

## Tech stack

| Part | Technology |
|---|---|
| Front end | HTML, CSS, vanilla JavaScript, jsPDF |
| Back end | Node.js, Express |
| Database | MySQL (mysql8) |
| Auth | bcryptjs, JWT in httpOnly cookie |

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- MySQL 8 running on your computer

## How to run

1. **Install packages**
   ```
   npm install
   ```
2. **Create your `.env` file**: copy `.env.example` to `.env` and fill in:
   - `DB_PASSWORD`: your MySQL password
   - `JWT_SECRET`: any long random text
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the admin login you want
3. **Create the database and sample data**
   ```
   npm run setup
   ```
   This creates the tables, loads the sample products and creates the admin account.
   **Warning:** it wipes any existing shop data, if done again and again.
4. **Start the server**
   ```
   npm start
   ```
5. Open **http://localhost:3000**

Admin panel: log in with the admin email and password from your `.env`, then open the **Admin** link in the header (`/html/admin-dashboard.html`).

## Project structure

```
/ html/    pages (index(home), product, cart, wishlist, login, checkout, receipt, account, admin)
css/                  stylesheets
js/                   front-end scripts (main.js is shared by every page)
images/               product and site images
server/               Express app: server.js, db.js, routes/, middleware/
database/             schema.sql and setup.js
docs/                 proposal and project documents
```

## API overview

| Route | Purpose |
|---|---|
| `GET /api/products`, `GET /api/products/:id` | Product list and details |
| `POST /api/products/:id/reviews` | Add a review (login required) |
| `POST /api/auth/signup`, `/login`, `/logout`, `GET /api/auth/me` | Accounts |
| `GET/POST /api/addresses` | Saved addresses |
| `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id` | Checkout and order history |
| `/api/admin/*` | Admin only: stats, products, orders, order status |

## Database

Tables: `users`, `products`, `product_images`, `reviews`, `addresses`, `orders`, `order_items`.
Order status is one of `pending`, `successful`, `cancelled`.
Deleting a product only hides it (soft delete), so old orders stay intact.

## Notes

- `.env` holds secrets and is not committed to Git.
- Run `npm run setup` again at any time to reset the shop to a clean state.
