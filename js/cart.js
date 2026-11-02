// cart.js - draws the cart page from localStorage + the products array.
// Needs products-data.js and main.js to be loaded first (see script order in cart.html).

const cartItems = document.getElementById("cart-items");
const cartSummary = document.getElementById("cart-summary");
const cartEmpty = document.getElementById("cart-empty");
const summaryCount = document.getElementById("summary-count");
const summaryTotal = document.getElementById("summary-total");

function renderCart() {
    const cart = getCart();

    // empty cart: show the message, hide everything else
    if (cart.length === 0) {
        cartEmpty.hidden = false;
        cartItems.hidden = true;
        cartSummary.hidden = true;
        return;
    }

    cartEmpty.hidden = true;
    cartItems.hidden = false;
    cartSummary.hidden = false;

    let html = "";
    let total = 0;
    let itemCount = 0;

    cart.forEach(entry => {
        // the cart only stores id + qty, so look the product up for its details
        const product = products.find(p => p.id === entry.id);
        if (product === undefined) return;

        const lineTotal = product.price * entry.qty;
        total += lineTotal;
        itemCount += entry.qty;

        html += `
        <article class="cart-item">
            <img src="${product.image}" alt="${product.name}" class="cart-item__image">
            <div class="cart-item__info">
                <h3 class="cart-item__title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                <p class="cart-item__price">$${product.price.toFixed(2)}</p>
            </div>
            <div class="cart-item__qty">
                <button type="button" class="cart-item__qty-btn" data-id="${product.id}" data-action="decrease" aria-label="Decrease quantity">&minus;</button>
                <span class="cart-item__qty-value">${entry.qty}</span>
                <button type="button" class="cart-item__qty-btn" data-id="${product.id}" data-action="increase" aria-label="Increase quantity">+</button>
            </div>
            <p class="cart-item__subtotal">$${lineTotal.toFixed(2)}</p>
            <button type="button" class="cart-item__remove" data-id="${product.id}" aria-label="Remove ${product.name} from cart">Remove</button>
        </article>`;
    });

    cartItems.innerHTML = html;
    summaryCount.textContent = itemCount;
    summaryTotal.textContent = "$" + total.toFixed(2);
}

// one listener for every button inside the cart list
cartItems.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.classList.contains("cart-item__remove")) {
        removeFromCart(id);
    } else if (button.dataset.action === "increase") {
        changeQty(id, 1);
    } else if (button.dataset.action === "decrease") {
        changeQty(id, -1);
    }

    renderCart();
});

loadProducts().then(renderCart);