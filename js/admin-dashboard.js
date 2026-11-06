// admin-dashboard.js - the numbers, the latest orders and the products that are almost sold out.

const statGrid = document.getElementById("stat-grid");
const recentBox = document.getElementById("recent-orders");
const lowStockBox = document.getElementById("low-stock");

function statCard(label, value, extraClass = "") {
    return `
        <div class="stat-card ${extraClass}">
            <p class="stat-card__value">${value}</p>
            <p class="stat-card__label">${label}</p>
        </div>`;
}

async function start() {
    if (!await adminGuard()) return;

    try {
        const [stats, orders, products] = await Promise.all([
            api("/api/admin/stats"),
            api("/api/admin/orders"),
            api("/api/admin/products")
        ]);

        statGrid.innerHTML =
            statCard("Orders", stats.orders) +
            statCard("Pending orders", stats.pendingOrders, stats.pendingOrders > 0 ? "stat-card--alert" : "") +
            statCard("Customers", stats.customers) +
            statCard("Products", stats.products) +
            statCard("Revenue", money(stats.revenue));

        // ----- latest 5 orders -----
        if (orders.length === 0) {
            recentBox.innerHTML = '<p class="admin-empty">No orders yet.</p>';
        } else {
            let rows = "";
            orders.slice(0, 5).forEach(order => {
                rows += `
                <tr>
                    <td>#${order.id}</td>
                    <td>${escapeHTML(order.customer.name)}<br><span class="admin-muted">${escapeHTML(order.customer.email)}</span></td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td class="admin-num">${money(order.total)}</td>
                    <td><span class="status status--${order.status}">${statusLabel(order.status)}</span></td>
                    <td><a class="admin-link" href="receipt.html?id=${order.id}">View</a></td>
                </tr>`;
            });
            recentBox.innerHTML = `
                <table class="admin-table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th class="admin-num">Total</th><th>Status</th><th></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        // ----- almost sold out -----
        const low = products.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock);
        if (low.length === 0) {
            lowStockBox.innerHTML = '<p class="admin-empty">Every product has enough stock.</p>';
        } else {
            let items = "";
            low.forEach(p => {
                items += `
                <li class="low-stock__item">
                    <span>${escapeHTML(p.name)}</span>
                    <span class="stock-badge ${p.stock === 0 ? "stock-badge--out" : "stock-badge--low"}">${p.stock === 0 ? "Out of stock" : p.stock + " left"}</span>
                </li>`;
            });
            lowStockBox.innerHTML = `<ul class="low-stock">${items}</ul>`;
        }
    } catch (err) {
        statGrid.innerHTML = "";
        recentBox.innerHTML = `<p class="admin-empty">${escapeHTML(err.message)}</p>`;
    }
}

start();
