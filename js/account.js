// account.js - profile, saved addresses and order history. Needs main.js loaded first.

const orderList = document.getElementById("order-list");
const addressItems = document.getElementById("address-items");
const addressForm = document.getElementById("address-form");
const showFormBtn = document.getElementById("show-address-form");
const cancelBtn = document.getElementById("cancel-address-btn");
const saveBtn = document.getElementById("save-address-btn");
const addressMessage = document.getElementById("address-message");

// ----- orders -----
async function loadOrders() {
    const res = await fetch("/api/orders");
    if (!res.ok) {
        orderList.innerHTML = '<p class="account-empty">Could not load your orders.</p>';
        return;
    }
    const orders = await res.json();

    if (orders.length === 0) {
        orderList.innerHTML = `
            <div class="account-empty">
                <p>You have not placed any orders yet.</p>
                <a href="index.html" class="btn btn--primary">Start shopping</a>
            </div>`;
        return;
    }

    let html = "";
    orders.forEach(order => {
        const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        });

        html += `
        <a class="order-row${order.status === "successful" ? " order-row--success" : ""}" href="receipt.html?id=${order.id}">
            <div class="order-row__main">
                <p class="order-row__title">Order #${order.orderNumber}</p>
                <p class="order-row__meta">${date} &middot; ${order.itemCount} item${order.itemCount === 1 ? "" : "s"}</p>
            </div>
            <span class="order-row__status order-row__status--${order.status}">${statusLabel(order.status)}</span>
            <p class="order-row__total">$${order.total.toFixed(2)}</p>
        </a>`;
    });
    orderList.innerHTML = html;
}

// ----- saved addresses -----
async function loadAddresses() {
    const res = await fetch("/api/addresses");
    const saved = res.ok ? await res.json() : [];

    if (saved.length === 0) {
        addressItems.innerHTML = '<p class="account-empty">No saved addresses yet.</p>';
        return;
    }

    let html = "";
    saved.forEach(a => {
        html += `
        <div class="address-item">
            <strong>${escapeHTML(a.fullName)}</strong><br>
            ${escapeHTML(a.addressLine)}<br>
            ${escapeHTML(a.city)}${a.postalCode ? " " + escapeHTML(a.postalCode) : ""}<br>
            ${escapeHTML(a.phone)}
        </div>`;
    });
    addressItems.innerHTML = html;
}

// ----- add a new address -----
const addressFields = [
    { input: "acc-name",   error: "acc-err-name" },
    { input: "acc-phone",  error: "acc-err-phone" },
    { input: "acc-line",   error: "acc-err-line" },
    { input: "acc-city",   error: "acc-err-city" },
    { input: "acc-postal", error: "acc-err-postal" }
];

function setFieldError(field, text) {
    const error = document.getElementById(field.error);
    error.textContent = text;
    error.hidden = text === "";
    document.getElementById(field.input).classList.toggle("account-form__input--error", text !== "");
}

function validateAddress() {
    const name = document.getElementById("acc-name").value.trim();
    const phone = document.getElementById("acc-phone").value.trim();
    const line = document.getElementById("acc-line").value.trim();
    const city = document.getElementById("acc-city").value.trim();
    const postal = document.getElementById("acc-postal").value.trim();

    const problems = [
        name === "" ? "Please enter your full name"
            : name.length < 2 ? "Name is too short" : "",

        phone === "" ? "Please enter your phone number"
            : !/^[0-9+\-\s()]+$/.test(phone) ? "Phone can only contain digits, spaces, + - ( )"
            : phone.length < 7 ? "Phone number is too short"
            : phone.length > 20 ? "Phone number is too long" : "",

        line === "" ? "Please enter your address"
            : line.length < 5 ? "Please enter a complete address" : "",

        city === "" ? "Please enter your city"
            : city.length < 2 ? "City name is too short" : "",

        postal !== "" && (postal.length < 3 || postal.length > 12) ? "Postal code must be 3 to 12 characters" : ""
    ];

    let firstBad = null;
    addressFields.forEach((field, i) => {
        setFieldError(field, problems[i]);
        if (problems[i] !== "" && firstBad === null) firstBad = field;
    });

    if (firstBad) document.getElementById(firstBad.input).focus();
    return firstBad === null;
}

addressFields.forEach(field => {
    document.getElementById(field.input).addEventListener("input", () => setFieldError(field, ""));
});

function closeForm() {
    addressForm.reset();
    addressFields.forEach(field => setFieldError(field, ""));
    addressMessage.hidden = true;
    addressForm.hidden = true;
    showFormBtn.hidden = false;
}

showFormBtn.addEventListener("click", () => {
    addressForm.hidden = false;
    showFormBtn.hidden = true;
    document.getElementById("acc-name").focus();
});

cancelBtn.addEventListener("click", closeForm);

addressForm.addEventListener("submit", async event => {
    event.preventDefault();
    addressMessage.hidden = true;
    if (!validateAddress()) return;

    saveBtn.disabled = true;
    try {
        const res = await fetch("/api/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: document.getElementById("acc-name").value,
                phone: document.getElementById("acc-phone").value,
                addressLine: document.getElementById("acc-line").value,
                city: document.getElementById("acc-city").value,
                postalCode: document.getElementById("acc-postal").value
            })
        });
        const data = await res.json();

        if (!res.ok) {
            addressMessage.textContent = data.error || "Something went wrong";
            addressMessage.hidden = false;
            return;
        }

        closeForm();
        loadAddresses();
    } catch (err) {
        addressMessage.textContent = "Could not reach the server. Is it running?";
        addressMessage.hidden = false;
    } finally {
        saveBtn.disabled = false;
    }
});

// when the user comes back to this tab (the admin may have changed an order), load the orders again
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && currentUser) loadOrders();
});

async function start() {
    await authReady;

    if (!currentUser) {
        window.location.href = "login.html?next=account.html";
        return;
    }

    document.getElementById("profile-name").textContent = currentUser.name;
    document.getElementById("profile-email").textContent = currentUser.email;

    loadOrders();
    loadAddresses();
}

start();
