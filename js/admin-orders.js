// admin-orders.js - all orders; the admin can change the status of each one.

const orderBox = document.getElementById("order-table");
const tabs = document.getElementById("order-tabs");

let allOrders = [];
let shownStatus = "all";

// the buttons of one order:
//   pending     -> "Mark successful" and "Cancel"
//   successful  -> "Cancel"
//   cancelled   -> nothing (a cancelled order can not be reopened)
function actionButtons(order) {
    if (order.status === "cancelled") return '<span class="admin-muted">-</span>';

    let html = "";
    if (order.status === "pending") {
        html += `<button type="button" class="btn-small btn-small--success" data-action="successful" data-id="${order.id}">Mark successful</button>`;
    }
    html += `<button type="button" class="admin-link admin-link--danger" data-action="cancelled" data-id="${order.id}">Cancel</button>`;
    return html;
}

function renderOrders() {
    const list = shownStatus === "all" ? allOrders : allOrders.filter(o => o.status === shownStatus);

    if (list.length === 0) {
        orderBox.innerHTML = '<p class="admin-empty">No orders here.</p>';
        return;
    }

    let rows = "";
    list.forEach(order => {
        rows += `
        <tr>
            <td>#${order.id}</td>
            <td>${escapeHTML(order.customer.name)}<br><span class="admin-muted">${escapeHTML(order.customer.email)}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td class="admin-num">${order.itemCount}</td>
            <td class="admin-num">${money(order.total)}</td>
            <td><span class="status status--${order.status}">${statusLabel(order.status)}</span></td>
            <td class="admin-actions">${actionButtons(order)} <a class="admin-link" href="receipt.html?id=${order.id}">View</a></td>
        </tr>`;
    });

    orderBox.innerHTML = `
        <table class="admin-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th class="admin-num">Items</th><th class="admin-num">Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

async function loadOrders() {
    try {
        allOrders = await api("/api/admin/orders");
        renderOrders();
    } catch (err) {
        orderBox.innerHTML = `<p class="admin-empty">${escapeHTML(err.message)}</p>`;
    }
}

// the status tabs: All / Pending / successful / Cancelled
tabs.addEventListener("click", event => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;

    shownStatus = button.dataset.status;
    tabs.querySelectorAll("button").forEach(b => {
        b.classList.toggle("admin-tabs__btn--active", b === button);
    });
    renderOrders();
});

// "Mark successful" or "Cancel" was clicked
orderBox.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const newStatus = button.dataset.action;

    if (newStatus === "cancelled" &&
        !confirm("Cancel order #" + id + "?\n\nThe items go back into stock and the order can not be reopened.")) {
        return;
    }

    button.disabled = true;
    try {
        await api("/api/admin/orders/" + id + "/status", { method: "PATCH", body: { status: newStatus } });
        showToast("Order #" + id + " is now " + statusLabel(newStatus));
        await loadOrders();
    } catch (err) {
        showToast(err.message, true);
        button.disabled = false;
    }
});

async function start() {
    if (!await adminGuard()) return;
    loadOrders();
}

start();
