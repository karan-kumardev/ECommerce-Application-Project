// product.js - fills product.html for the product named in the URL (product.html?id=5).
// Needs products-data.js and main.js (for makeStars and addToCart) loaded first.

const detail = document.getElementById("product-detail");
const reviewsSection = document.getElementById("reviews");
const missing = document.getElementById("product-missing");
const breadcrumbName = document.getElementById("breadcrumb-name");

// read ?id=5 from the address bar
const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));
// filled in after the server answers
let product = null;

// quantity chosen with the - / + picker
let quantity = 1;

async function loadPage() {
    try {
        const res = await fetch("/api/products/" + productId);
        if (!res.ok) throw new Error("not found");
        product = await res.json();
    } catch (err) {
        document.title = "Product not found";
        missing.hidden = false;
        detail.hidden = true;
        reviewsSection.hidden = true;
        return;
    }

    // we need to know who is looking (for the review form)
    await authReady;

    document.title = product.name;
    breadcrumbName.textContent = product.name;
    renderDetail();
    renderReviews();
}

loadPage();

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
            <button type="button" class="gallery__thumb ${i === 0 ? "gallery__thumb--active" : ""}" data-src="${escapeHTML(src)}" aria-label="Show image ${i + 1}">
                <img src="${escapeHTML(src)}" alt="${escapeHTML(product.name)} view ${i + 1}">
            </button>`;
    });

    detail.innerHTML = `
        <div class="gallery">
            <img src="${escapeHTML(images[0])}" alt="${escapeHTML(product.name)}" class="gallery__main" id="gallery-main">
            <div class="gallery__thumbs">${thumbs}
            </div>
        </div>

        <div class="product-info">
            <span class="product-info__category">${escapeHTML(product.category)}</span>
            <h1 class="product-info__title">${escapeHTML(product.name)}</h1>
            <div class="product-info__rating">
                <span class="product-info__stars">${makeStars(product.rating)}</span>
                <span class="product-info__reviews">${product.rating.toFixed(1)} (${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"})</span>
            </div>
            <p class="product-info__price">$${product.price.toFixed(2)}</p>
            <p class="product-info__stock ${stockClass(product.stock)}">${stockText(product.stock)}</p>
            <p class="product-info__description">${escapeHTML(product.description)}</p>

            <div class="product-info__actions">
                <div class="qty-picker">
                    <button type="button" class="qty-picker__btn" id="qty-minus" aria-label="Decrease quantity">&minus;</button>
                    <span class="qty-picker__value" id="qty-value">1</span>
                    <button type="button" class="qty-picker__btn" id="qty-plus" aria-label="Increase quantity">+</button>
                </div>
                <button type="button" class="btn btn--primary" id="add-to-cart-btn" ${outOfStock ? "disabled" : ""}>Add to cart</button>
                <button type="button" class="product-info__wishlist${isInWishlist(product.id) ? " product-info__wishlist--active" : ""}" id="wishlist-btn" data-id="${product.id}" aria-label="Add to wishlist">${isInWishlist(product.id) ? "&#9829;" : "&#9825;"}</button>
            </div>
        </div>`;
}

// ----- the review form (shown above the list of reviews) -----
let chosenRating = 0;

function starPickerHTML() {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<button type="button" class="star-picker__star" data-value="${i}" aria-label="${i} star${i === 1 ? "" : "s"}">&#9733;</button>`;
    }
    return html;
}

function reviewFormHTML() {
    // guests must log in first, then they come back to this product
    if (!currentUser) {
        const next = encodeURIComponent("product.html?id=" + product.id);
        return `<p class="review-note"><a href="login.html?next=${next}">Log in</a> to write a review.</p>`;
    }

    // one review per user per product
    if (product.reviews.some(review => review.mine)) {
        return '<p class="review-note">You have already reviewed this product. Thank you!</p>';
    }

    return `
        <form class="review-form" id="review-form" novalidate>
            <h3 class="review-form__title">Write a review</h3>

            <div class="star-picker" id="star-picker">${starPickerHTML()}</div>
            <p class="review-form__error" id="review-err-rating" hidden></p>

            <textarea class="review-form__textarea" id="review-comment" rows="4" maxlength="1000" placeholder="What did you think of this product?"></textarea>
            <p class="review-form__error" id="review-err-comment" hidden></p>

            <p class="review-form__error" id="review-err-server" hidden></p>
            <button type="submit" class="btn btn--primary review-form__submit" id="review-submit">Submit review</button>
        </form>`;
}

// colours the first `value` stars
function paintStars(value) {
    reviewsSection.querySelectorAll(".star-picker__star").forEach(star => {
        star.classList.toggle("star-picker__star--on", Number(star.dataset.value) <= value);
    });
}

function setReviewError(id, text) {
    const box = document.getElementById(id);
    if (!box) return;
    box.textContent = text;
    box.hidden = text === "";
}

function renderReviews() {
    chosenRating = 0;
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
                    <span class="review__author">${escapeHTML(review.author)}${review.mine ? ' <span class="review__you">(You)</span>' : ""}</span>
                    <span class="review__stars">${makeStars(review.rating)}</span>
                    <span class="review__date">${date}</span>
                </div>
                <p class="review__text">${escapeHTML(review.comment)}</p>
            </article>`;
        });
    }

    reviewsSection.innerHTML = `
        <h2 class="reviews__title">Customer reviews</h2>
        <div class="reviews__summary">
            <span class="reviews__average">${product.rating.toFixed(1)}</span>
            <div>
                <span class="reviews__stars">${makeStars(product.rating)}</span>
                <p class="reviews__count">Based on ${product.reviews.length} review${product.reviews.length === 1 ? "" : "s"}</p>
            </div>
        </div>
        ${reviewFormHTML()}
        <div class="reviews__list">${listHtml}
        </div>`;
}

// star picker: hover previews, click chooses (one listener, survives re-renders)
reviewsSection.addEventListener("mouseover", event => {
    const star = event.target.closest(".star-picker__star");
    if (star) paintStars(Number(star.dataset.value));
});
reviewsSection.addEventListener("mouseout", event => {
    if (event.target.closest(".star-picker__star")) paintStars(chosenRating);
});
reviewsSection.addEventListener("click", event => {
    const star = event.target.closest(".star-picker__star");
    if (!star) return;
    chosenRating = Number(star.dataset.value);
    paintStars(chosenRating);
    setReviewError("review-err-rating", "");
});
reviewsSection.addEventListener("input", event => {
    if (event.target.id === "review-comment") setReviewError("review-err-comment", "");
});

reviewsSection.addEventListener("submit", async event => {
    if (event.target.id !== "review-form") return;
    event.preventDefault();

    const comment = document.getElementById("review-comment").value.trim();
    setReviewError("review-err-server", "");

    // check here first, so the messages are friendly and appear under the right field
    setReviewError("review-err-rating", chosenRating === 0 ? "Please choose a star rating" : "");
    setReviewError("review-err-comment",
        comment === "" ? "Please write your review"
            : comment.length < 3 ? "Your review is too short" : "");
    if (chosenRating === 0 || comment.length < 3) return;

    const button = document.getElementById("review-submit");
    button.disabled = true;

    try {
        const res = await fetch("/api/products/" + product.id + "/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: chosenRating, comment: comment })
        });
        const data = await res.json();

        if (!res.ok) {
            setReviewError("review-err-server", data.error || "Something went wrong");
            button.disabled = false;
            return;
        }

        // reload the product so the average, the count and the list are all up to date
        const fresh = await fetch("/api/products/" + product.id);
        product = await fresh.json();
        quantity = 1;
        renderDetail();
        renderReviews();
    } catch (err) {
        setReviewError("review-err-server", "Could not reach the server. Is it running?");
        button.disabled = false;
    }
});

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
        addBtn.textContent = "Added ✓";
        setTimeout(() => { addBtn.textContent = "Add to cart"; }, 1200);
        return;
    }

    // wishlist heart
    const wishBtn = event.target.closest("#wishlist-btn");
    if (wishBtn) {
        const saved = toggleWishlist(product.id);
        wishBtn.classList.toggle("product-info__wishlist--active", saved);
        wishBtn.innerHTML = saved ? "&#9829;" : "&#9825;";
    }
});
