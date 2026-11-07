// checkout.js - delivery address + place the order. Needs main.js loaded first.

const checkoutForm = document.getElementById("checkout-form");
const itemsBox = document.getElementById("checkout-items");
const countBox = document.getElementById("checkout-count");
const totalBox = document.getElementById("checkout-total");
const addressList = document.getElementById("address-list");
const newFields = document.getElementById("new-address-fields");
const checkoutMessage = document.getElementById("checkout-message");
const placeBtn = document.getElementById("place-order-btn");

// the cart lines that still exist in the shop: [{ product, qty }]
let lines = [];

function showMessage(text) {
    checkoutMessage.textContent = text;
    checkoutMessage.hidden = false;
}

function renderSummary() {
    let html = "";
    let total = 0;
    let count = 0;

    lines.forEach(line => {
        const lineTotal = line.product.price * line.qty;
        total += lineTotal;
        count += line.qty;

        html += `
        <div class="checkout-item">
            <img class="checkout-item__image" src="${line.product.image}" alt="">
            <div class="checkout-item__info">
                <p class="checkout-item__name">${escapeHTML(line.product.name)}</p>
                <p class="checkout-item__qty">Qty ${line.qty} x $${line.product.price.toFixed(2)}</p>
            </div>
            <p class="checkout-item__total">$${lineTotal.toFixed(2)}</p>
        </div>`;
    });

    itemsBox.innerHTML = html;
    countBox.textContent = count;
    totalBox.textContent = "$" + total.toFixed(2);
}

// saved addresses: one radio per address + "use a new address"
async function loadAddresses() {
    const res = await fetch("/api/addresses");
    const saved = res.ok ? await res.json() : [];

    if (saved.length === 0) {
        newFields.hidden = false;
        return;
    }

    let html = "";
    saved.forEach((a, i) => {
        html += `
        <label class="address-card">
            <input type="radio" name="address" value="${a.id}" ${i === 0 ? "checked" : ""}>
            <span class="address-card__text">
                <strong>${escapeHTML(a.fullName)}</strong> &middot; ${escapeHTML(a.phone)}<br>
                ${escapeHTML(a.addressLine)}, ${escapeHTML(a.city)}${a.postalCode ? " " + escapeHTML(a.postalCode) : ""}
            </span>
        </label>`;
    });
    html += `
        <label class="address-card">
            <input type="radio" name="address" value="new">
            <span class="address-card__text"><strong>Use a new address</strong></span>
        </label>`;

    addressList.innerHTML = html;
    newFields.hidden = true;   // first saved address is selected
}

// show the new-address form only when "new address" is chosen
addressList.addEventListener("change", () => {
    const chosen = checkoutForm.querySelector('input[name="address"]:checked');
    newFields.hidden = !chosen || chosen.value !== "new";
});

// the address fields: input id, error line id, label used in the messages
const addressFields = [
    { input: "addr-name",   error: "err-name" },
    { input: "addr-phone",  error: "err-phone" },
    { input: "addr-line",   error: "err-line" },
    { input: "addr-city",   error: "err-city" },
    { input: "addr-postal", error: "err-postal" }
];

function setFieldError(field, text) {
    const input = document.getElementById(field.input);
    const error = document.getElementById(field.error);
    error.textContent = text;
    error.hidden = text === "";
    input.classList.toggle("address-form__input--error", text !== "");
}

// checks the new-address form; returns true when everything is fine.
// every problem is shown under its own field.
function validateAddress() {
    const name = document.getElementById("addr-name").value.trim();
    const phone = document.getElementById("addr-phone").value.trim();
    const line = document.getElementById("addr-line").value.trim();
    const city = document.getElementById("addr-city").value.trim();
    const postal = document.getElementById("addr-postal").value.trim();

    const problems = [
        name === "" ? "Please enter your full name"
            : name.length < 2 ? "Name is too short"
            : name.length > 100 ? "Name is too long (100 characters max)" : "",

        phone === "" ? "Please enter your phone number"
            : !/^[0-9+\-\s()]+$/.test(phone) ? "Phone can only contain digits, spaces, + - ( )"
            : phone.length < 7 ? "Phone number is too short"
            : phone.length > 20 ? "Phone number is too long" : "",

        line === "" ? "Please enter your address"
            : line.length < 5 ? "Please enter a complete address"
            : line.length > 255 ? "Address is too long (255 characters max)" : "",

        city === "" ? "Please enter your city"
            : city.length < 2 ? "City name is too short"
            : city.length > 100 ? "City name is too long" : "",

        postal !== "" && (postal.length < 3 || postal.length > 12) ? "Postal code must be 3 to 12 characters"
            : postal !== "" && !/^[A-Za-z0-9][A-Za-z0-9 \-]*$/.test(postal) ? "Postal code can only have letters, digits, spaces and -" : ""
    ];

    let firstBad = null;
    addressFields.forEach((field, i) => {
        setFieldError(field, problems[i]);
        if (problems[i] !== "" && firstBad === null) firstBad = field;
    });

    if (firstBad) document.getElementById(firstBad.input).focus();
    return firstBad === null;
}

// the red message goes away as soon as the user starts fixing that field
addressFields.forEach(field => {
    document.getElementById(field.input).addEventListener("input", () => setFieldError(field, ""));
});

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();
    checkoutMessage.hidden = true;

    // a new address must be filled in correctly before anything is sent
    const picked = checkoutForm.querySelector('input[name="address"]:checked');
    const usingNewAddress = !picked || picked.value === "new";
    if (usingNewAddress && !validateAddress()) return;

    // the browser only sends WHICH products and HOW MANY - the server takes the prices from the database
    const body = { items: lines.map(line => ({ id: line.product.id, qty: line.qty })) };

    const chosen = checkoutForm.querySelector('input[name="address"]:checked');
    if (chosen && chosen.value !== "new") {
        body.addressId = Number(chosen.value);
    } else {
        body.address = {
            fullName: document.getElementById("addr-name").value,
            phone: document.getElementById("addr-phone").value,
            addressLine: document.getElementById("addr-line").value,
            city: document.getElementById("addr-city").value,
            postalCode: document.getElementById("addr-postal").value
        };
    }

    placeBtn.disabled = true;
    placeBtn.textContent = "Placing order...";

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || "Something went wrong");
            return;
        }

        saveCart([]);   // order placed: empty the cart
        window.location.href = "receipt.html?id=" + data.orderId;
    } catch (err) {
        showMessage("Could not reach the server. Is it running?");
    } finally {
        placeBtn.disabled = false;
        placeBtn.textContent = "Place order";
    }
});

async function start() {
    await authReady;

    // guests must log in first, then they come straight back here
    if (!currentUser) {
        window.location.href = "login.html?next=checkout.html";
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        window.location.href = "cart.html";
        return;
    }

    try {
        await loadProducts();
    } catch (err) {
        showMessage("Could not load the products. Is the server running?");
        return;
    }

    lines = [];
    cart.forEach(entry => {
        const product = products.find(p => p.id === entry.id);
        if (product) lines.push({ product: product, qty: entry.qty });
    });

    if (lines.length === 0) {
        window.location.href = "cart.html";
        return;
    }

    renderSummary();
    await loadAddresses();
}

start();
