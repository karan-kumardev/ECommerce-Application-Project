// ----- products come from the server (the database) -----
let products = [];

async function loadProducts() {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Could not load products");
    products = await res.json();
    return products;
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

const CART_KEY="cart";

function getCart(){

   const text=localStorage.getItem(CART_KEY);
    if (text === null)
        return [];

    return JSON.parse(text);
}

function saveCart(cart){

    localStorage.setItem(CART_KEY,JSON.stringify(cart));
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

function updateCartBadge(){
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

function makeStars(rating) { //used by homepage and productpage
    const n = Math.round(rating);
    return "★".repeat(n) + "☆".repeat(5 - n);
}
// ----- wishlist (list of product ids, saved in localStorage) -----
const WISHLIST_KEY = "wishlist";

function getWishlist() {
    const text = localStorage.getItem(WISHLIST_KEY);
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

    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
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
                <img src="${product.image}" alt="${product.name}" class="product-card__image">
            </a>
            <button type="button" class="product-card__wishlist${saved ? " product-card__wishlist--active" : ""}" data-id="${product.id}" aria-label="${saved ? "Remove from wishlist" : "Add to wishlist"}">${saved ? "&#9829;" : "&#9825;"}</button>
            <div class="product-card__body">
                <span class="product-card__category">${product.category}</span>
                <h3 class="product-card__title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                <div class="product-card__rating">
                    <span class="product-card__stars">${makeStars(product.rating)}</span>
                    <span class="product-card__reviews">(${product.reviewCount})</span>
                </div>
                <p class="product-card__price">$${product.price.toFixed(2)}</p>
                <button type="button" class="btn btn--primary product-card__add" data-id="${product.id}">Add to cart</button>
            </div>
        </article>`;
}
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