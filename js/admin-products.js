// admin-products.js - list, add, edit and delete products.

const panel = document.getElementById("product-panel");
const panelTitle = document.getElementById("panel-title");
const form = document.getElementById("product-form");
const tableBox = document.getElementById("product-table");
const filterInput = document.getElementById("product-filter");
const saveBtn = document.getElementById("pf-save");

let allProducts = [];
let editingId = null;   // null = adding a new product

// ----- the table -----
function renderTable() {
    const text = filterInput.value.trim().toLowerCase();
    const list = allProducts.filter(p => (p.name + " " + p.category).toLowerCase().includes(text));

    if (list.length === 0) {
        tableBox.innerHTML = '<p class="admin-empty">No products found.</p>';
        return;
    }

    let rows = "";
    list.forEach(p => {
        const stockClass = p.stock === 0 ? "stock-badge--out" : p.stock <= 5 ? "stock-badge--low" : "";
        rows += `
        <tr>
            <td><img class="admin-thumb" src="${escapeHTML(p.image)}" alt=""></td>
            <td>
                <strong>${escapeHTML(p.name)}</strong><br>
                <span class="admin-muted">${escapeHTML(p.category)}</span>
            </td>
            <td class="admin-num">${money(p.price)}</td>
            <td class="admin-num"><span class="stock-badge ${stockClass}">${p.stock}</span></td>
            <td class="admin-num">${p.reviewCount > 0 ? p.rating.toFixed(1) + " (" + p.reviewCount + ")" : "-"}</td>
            <td class="admin-actions">
                <button type="button" class="admin-link" data-action="edit" data-id="${p.id}">Edit</button>
                <button type="button" class="admin-link admin-link--danger" data-action="delete" data-id="${p.id}">Delete</button>
            </td>
        </tr>`;
    });

    tableBox.innerHTML = `
        <table class="admin-table">
            <thead><tr><th></th><th>Product</th><th class="admin-num">Price</th><th class="admin-num">Stock</th><th class="admin-num">Rating</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

async function loadProducts() {
    try {
        allProducts = await api("/api/admin/products");
        renderTable();
    } catch (err) {
        tableBox.innerHTML = `<p class="admin-empty">${escapeHTML(err.message)}</p>`;
    }
}

filterInput.addEventListener("input", renderTable);

// ----- the form -----
const fields = [
    { input: "pf-name",     error: "pf-err-name" },
    { input: "pf-category", error: "pf-err-category" },
    { input: "pf-price",    error: "pf-err-price" },
    { input: "pf-stock",    error: "pf-err-stock" }
];

function setError(id, text) {
    const box = document.getElementById(id);
    box.textContent = text;
    box.hidden = text === "";
}

function markField(field, text) {
    setError(field.error, text);
    document.getElementById(field.input).classList.toggle("admin-form__input--error", text !== "");
}

function clearErrors() {
    fields.forEach(f => markField(f, ""));
    setError("pf-err-server", "");
}

function openPanel(product) {
    editingId = product ? product.id : null;
    panelTitle.textContent = product ? "Edit product" : "Add product";

    document.getElementById("pf-name").value = product ? product.name : "";
    document.getElementById("pf-category").value = product ? product.category : "";
    document.getElementById("pf-price").value = product ? product.price : "";
    document.getElementById("pf-stock").value = product ? product.stock : "";
    document.getElementById("pf-image").value = product && !product.image.endsWith("placeholder.svg") ? product.image : "";
    document.getElementById("pf-desc").value = product ? product.description : "";

    clearErrors();
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("pf-name").focus();
}

function closePanel() {
    panel.hidden = true;
    editingId = null;
    clearErrors();
}

function validateForm() {
    const name = document.getElementById("pf-name").value.trim();
    const category = document.getElementById("pf-category").value;
    const priceText = document.getElementById("pf-price").value.trim();
    const stockText = document.getElementById("pf-stock").value.trim();
    const price = Number(priceText);
    const stock = Number(stockText);

    const problems = [
        name === "" ? "Please enter the product name"
            : name.length < 2 ? "Name is too short" : "",

        category === "" ? "Please choose a category" : "",

        priceText === "" ? "Please enter the price"
            : !Number.isFinite(price) || price < 0 ? "Price must be 0 or more" : "",

        stockText === "" ? "Please enter the stock"
            : !Number.isInteger(stock) || stock < 0 ? "Stock must be a whole number, 0 or more" : ""
    ];

    let firstBad = null;
    fields.forEach((field, i) => {
        markField(field, problems[i]);
        if (problems[i] !== "" && firstBad === null) firstBad = field;
    });

    if (firstBad) document.getElementById(firstBad.input).focus();
    return firstBad === null;
}

// an error disappears when the admin starts fixing that field
fields.forEach(field => {
    document.getElementById(field.input).addEventListener("input", () => markField(field, ""));
    document.getElementById(field.input).addEventListener("change", () => markField(field, ""));
});

document.getElementById("add-product-btn").addEventListener("click", () => openPanel(null));
document.getElementById("pf-cancel").addEventListener("click", closePanel);

form.addEventListener("submit", async event => {
    event.preventDefault();
    setError("pf-err-server", "");
    if (!validateForm()) return;

    const body = {
        name: document.getElementById("pf-name").value,
        category: document.getElementById("pf-category").value,
        price: document.getElementById("pf-price").value,
        stock: document.getElementById("pf-stock").value,
        image: document.getElementById("pf-image").value,
        description: document.getElementById("pf-desc").value
    };

    saveBtn.disabled = true;
    try {
        if (editingId === null) {
            await api("/api/admin/products", { method: "POST", body: body });
            showToast("Product added");
        } else {
            await api("/api/admin/products/" + editingId, { method: "PUT", body: body });
            showToast("Product updated");
        }
        closePanel();
        await loadProducts();
    } catch (err) {
        setError("pf-err-server", err.message);
    } finally {
        saveBtn.disabled = false;
    }
});

// ----- edit / delete buttons in the table -----
tableBox.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const product = allProducts.find(p => p.id === Number(button.dataset.id));
    if (!product) return;

    if (button.dataset.action === "edit") {
        openPanel(product);
        return;
    }

    if (!confirm('Delete "' + product.name + '"?\n\nIt will disappear from the shop. Old orders keep their record.')) return;

    try {
        await api("/api/admin/products/" + product.id, { method: "DELETE" });
        showToast("Product deleted");
        await loadProducts();
    } catch (err) {
        showToast(err.message, true);
    }
});

async function start() {
    if (!await adminGuard()) return;
    loadProducts();
}

start();
