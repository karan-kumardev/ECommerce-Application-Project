// product.js - fills product.html for the product named in the URL (product.html?id=5).
// Needs products-data.js and main.js (for makeStars and addToCart) loaded first.

const detail = document.getElementById("product-detail");
const reviewsSection = document.getElementById("reviews");
const missing = document.getElementById("product-missing");
const breadcrumbName = document.getElementById("breadcrumb-name");

// read ?id=5 from the address bar
const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));
const product = products.find(p => p.id === productId);

// quantity chosen with the - / + picker
let quantity = 1;

if (product === undefined) {
    document.title = "Product not found";
    missing.hidden = false;
    detail.hidden = true;
    reviewsSection.hidden = true;
} else {
    document.title = product.name;
    breadcrumbName.textContent = product.name;
    renderDetail();
    renderReviews();
}

function stockText(stock) {
    if (stock === 0) return "Out of stock";
    if (stock <= 5) return "Only " + stock + " left";
    return "In stock";
}

function stockClass(stock) {
    if (stock === 0) return "product-info__stock--out";
    if (stock <= 5) return "product-info__stock--low";
    return "";
}

function renderDetail() {
    const images = product.images && product.images.length ? product.images : [product.image];
    const outOfStock = product.stock === 0;

    let thumbs = "";
    images.forEach((src, i) => {
        thumbs += `
            <button type="button" class="gallery__thumb ${i === 0 ? "gallery__thumb--active" : ""}" data-src="${src}" aria-label="Show image ${i + 1}">
                <img src="${src}" alt="${product.name} view ${i + 1}">
            </button>`;
    });

    detail.innerHTML = `
        <div class="gallery">
            <img src="${images[0]}" alt="${product.name}" class="gallery__main" id="gallery-main">
            <div class="gallery__thumbs">${thumbs}
            </div>
        </div>

        <div class="product-info">
            <span class="product-info__category">${product.category}</span>
            <h1 class="product-info__title">${product.name}</h1>
            <div class="product-info__rating">
                <span class="product-info__stars">${makeStars(product.rating)}</span>
                <span class="product-info__reviews">${product.rating.toFixed(1)} (${product.reviewCount} reviews)</span>
            </div>
            <p class="product-info__price">$${product.price.toFixed(2)}</p>
            <p class="product-info__stock ${stockClass(product.stock)}">${stockText(product.stock)}</p>
            <p class="product-info__description">${product.description}</p>

            <div class="product-info__actions">
                <div class="qty-picker">
                    <button type="button" class="qty-picker__btn" id="qty-minus" aria-label="Decrease quantity">&minus;</button>
                    <span class="qty-picker__value" id="qty-value">1</span>
                    <button type="button" class="qty-picker__btn" id="qty-plus" aria-label="Increase quantity">+</button>
                </div>
                <button type="button" class="btn btn--primary" id="add-to-cart-btn" ${outOfStock ? "disabled" : ""}>Add to cart</button>
                <button type="button" class="product-info__wishlist" id="wishlist-btn" data-id="${product.id}" aria-label="Add to wishlist">&#9825;</button>
            </div>
        </div>`;
}

function renderReviews() {
    let listHtml = "";

    if (product.reviews.length === 0) {
        listHtml = '<p class="reviews__empty">No reviews yet</p>';
    } else {
        product.reviews.forEach(review => {
            const date = new Date(review.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });

            listHtml += `
            <article class="review">
                <div class="review__head">
                    <span class="review__author">${review.author}</span>
                    <span class="review__stars">${makeStars(review.rating)}</span>
                    <span class="review__date">${date}</span>
                </div>
                <p class="review__text">${review.comment}</p>
            </article>`;
        });
    }

    reviewsSection.innerHTML = `
        <h2 class="reviews__title">Customer reviews</h2>
        <div class="reviews__summary">
            <span class="reviews__average">${product.rating.toFixed(1)}</span>
            <div>
                <span class="reviews__stars">${makeStars(product.rating)}</span>
                <p class="reviews__count">Based on ${product.reviews.length} reviews</p>
            </div>
        </div>
        <div class="reviews__list">${listHtml}
        </div>`;
}

// one listener for everything inside the detail section
detail.addEventListener("click", event => {

    // thumbnail -> swap the big image
    const thumb = event.target.closest(".gallery__thumb");
    if (thumb) {
        document.getElementById("gallery-main").src = thumb.dataset.src;
        detail.querySelectorAll(".gallery__thumb").forEach(t => t.classList.remove("gallery__thumb--active"));
        thumb.classList.add("gallery__thumb--active");
        return;
    }

    const qtyValue = document.getElementById("qty-value");

    // quantity picker: never below 1, never above the stock
    if (event.target.closest("#qty-minus")) {
        if (quantity > 1) quantity -= 1;
        qtyValue.textContent = quantity;
        return;
    }
    if (event.target.closest("#qty-plus")) {
        if (quantity < product.stock) quantity += 1;
        qtyValue.textContent = quantity;
        return;
    }

    // add to cart
    const addBtn = event.target.closest("#add-to-cart-btn");
    if (addBtn) {
        addToCart(product.id, quantity);
        addBtn.textContent = "Added \u2713";
        setTimeout(() => { addBtn.textContent = "Add to cart"; }, 1200);
        return;
    }

    // wishlist button: wired up later, when we build the wishlist
});