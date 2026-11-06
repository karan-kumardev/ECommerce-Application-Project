// ----- products come from the server (the database) -----
let products = [];

async function loadProducts() {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Could not load products");
    products = await res.json();
    return products;
}

// the database stores pending / successful / cancelled; the screens say "Successful" for successful
function statusLabel(status) {
    return status === "successful" ? "Successful" : status;
}

// makes text safe to put inside HTML (use it for anything a user typed)
function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ----- who owns the cart and wishlist? -----
// Guest:      keys "cart" and "wishlist".
// Logged in:  keys "cart_5" and "wishlist_5" (5 = the user id), so every user has their own.
function userSuffix() {
    const id = localStorage.getItem("userId");
    return id ? "_" + id : "";
}
function cartKey() { return "cart" + userSuffix(); }
function wishlistKey() { return "wishlist" + userSuffix(); }

// called when the logged-in user changes (login, logout, signup).
// id = the new user's id, or null for a guest.
function switchUser(id) {
    if (id === null || id === undefined) {
        localStorage.removeItem("userId");
        return;
    }
    id = String(id);

    // whatever the guest put in the cart / wishlist is moved into this user's lists
    const guestCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const userCart = JSON.parse(localStorage.getItem("cart_" + id) || "[]");
    guestCart.forEach(item => {
        const same = userCart.find(entry => entry.id === item.id);
        if (same) same.qty += item.qty;
        else userCart.push(item);
    });
    localStorage.setItem("cart_" + id, JSON.stringify(userCart));

    const guestWishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const userWishlist = JSON.parse(localStorage.getItem("wishlist_" + id) || "[]");
    guestWishlist.forEach(productId => {
        if (!userWishlist.includes(productId)) userWishlist.push(productId);
    });
    localStorage.setItem("wishlist_" + id, JSON.stringify(userWishlist));

    localStorage.removeItem("cart");
    localStorage.removeItem("wishlist");
    localStorage.setItem("userId", id);
}

function getCart() {
    const text = localStorage.getItem(cartKey());
    if (text === null) {
        return [];
    }
    return JSON.parse(text);
}

function saveCart(cart) {
    localStorage.setItem(cartKey(), JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(productId, qty = 1) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === productId);

    if (item !== undefined) {
        item.qty += qty;
    } else {
        cart.push({ id: productId, qty: qty });
    }

    saveCart(cart);
}

function updateCartBadge() {
    const total = getCart().reduce((sum, entry) => sum + entry.qty, 0);
    const badge = document.getElementById("cart-count");
    if (badge) {
        badge.textContent = total;
        // hide the badge completely when the cart is empty
        badge.style.display = total === 0 ? "none" : "";
    }
}

updateCartBadge();

function changeQty(productId, change) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === productId);

    if (item === undefined) {
        return;
    }

    item.qty += change;

    if (item.qty <= 0) {
        // quantity hit zero: drop the entry, keep the others
        saveCart(cart.filter(entry => entry.id !== productId));
    } else {
        saveCart(cart);
    }
}

function removeFromCart(productId) {
    const cart = getCart().filter(entry => entry.id !== productId);
    saveCart(cart);
}

// 4.3 -> "★★★★☆"
function makeStars(rating) {
    const n = Math.round(rating);
    return "★".repeat(n) + "☆".repeat(5 - n);
}

// ----- wishlist (list of product ids, saved in localStorage) -----

function getWishlist() {
    const text = localStorage.getItem(wishlistKey());
    if (text === null) {
        return [];
    }
    return JSON.parse(text);
}

function isInWishlist(productId) {
    return getWishlist().includes(productId);
}

// adds the product if it is not saved, removes it if it is.
// returns true when the product is saved after the call.
function toggleWishlist(productId) {
    let list = getWishlist();
    let saved;

    if (list.includes(productId)) {
        list = list.filter(id => id !== productId);
        saved = false;
    } else {
        list.push(productId);
        saved = true;
    }

    localStorage.setItem(wishlistKey(), JSON.stringify(list));
    return saved;
}

// makes a heart button look filled (saved) or empty (not saved)
function setHeart(button, saved) {
    button.classList.toggle("product-card__wishlist--active", saved);
    button.innerHTML = saved ? "&#9829;" : "&#9825;";
    button.setAttribute("aria-label", saved ? "Remove from wishlist" : "Add to wishlist");
}

// the HTML of one product card - used by the home page and the wishlist page
function makeCardHTML(product) {
    const saved = isInWishlist(product.id);

    return `
        <article class="product-card">
            <a href="product.html?id=${product.id}" class="product-card__image-link">
                <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" class="product-card__image">
            </a>
            <button type="button" class="product-card__wishlist${saved ? " product-card__wishlist--active" : ""}" data-id="${product.id}" aria-label="${saved ? "Remove from wishlist" : "Add to wishlist"}">${saved ? "&#9829;" : "&#9825;"}</button>
            <div class="product-card__body">
                <span class="product-card__category">${escapeHTML(product.category)}</span>
                <h3 class="product-card__title"><a href="product.html?id=${product.id}">${escapeHTML(product.name)}</a></h3>
                <div class="product-card__rating">
                    <span class="product-card__stars">${makeStars(product.rating)}</span>
                    <span class="product-card__reviews">(${product.reviewCount})</span>
                </div>
                <p class="product-card__price">$${product.price.toFixed(2)}</p>
                <button type="button" class="btn btn--primary product-card__add" data-id="${product.id}">Add to cart</button>
            </div>
        </article>`;
}

// Pressing the browser's Back button can show an old copy of the page from memory
// (the scripts do not run again), so the badge, hearts and lists would be out of date.
// When that happens, reload the page so everything is read fresh from localStorage.
window.addEventListener("pageshow", event => {
    if (event.persisted) {
        location.reload();
    }
});

// ----- search box in the header -----
// On every page except the home page, a search is sent to the home page, which shows the results.
const headerSearchForm = document.querySelector(".search-form");
if (headerSearchForm && !document.getElementById("product-grid")) {
    headerSearchForm.addEventListener("submit", event => {
        event.preventDefault();
        const text = document.getElementById("search-input").value.trim();
        window.location.href = "index.html" + (text ? "?q=" + encodeURIComponent(text) : "");
    });
}

// ----- header login link (runs on every page) -----
// Logged out: link says "LogIn" and goes to login.html.
// Logged in: link says "Log out (Name)" and logs the user out when clicked.
let currentUser = null;

const authReady = fetch("/api/auth/me")
    .then(res => res.json())
    .then(data => {
        currentUser = data.user;

        // the server is the truth: if the saved owner is different, fix it and reload once
        const savedId = localStorage.getItem("userId");
        const realId = currentUser ? String(currentUser.id) : null;
        if (realId !== savedId) {
            switchUser(realId);
            location.reload();
            return;
        }

        const link = document.getElementById("auth-link");
        if (!link || !currentUser) return;

        // admins also get an "Admin" link
        if (currentUser.role === "admin") {
            const adminLink = document.createElement("a");
            adminLink.href = "admin-dashboard.html";
            adminLink.className = "nav-link";
            adminLink.textContent = "Admin";
            link.before(adminLink);
        }

        // an "Account" link appears just before "Log out"
        const accountLink = document.createElement("a");
        accountLink.href = "account.html";
        accountLink.className = "nav-link";
        accountLink.textContent = "Account";
        link.before(accountLink);

        link.textContent = "Log out (" + currentUser.name.split(" ")[0] + ")";
        link.href = "#";
        link.addEventListener("click", async event => {
            event.preventDefault();
            await fetch("/api/auth/logout", { method: "POST" });
            switchUser(null);
            window.location.href = "index.html";
        });
    })
    .catch(() => {});
