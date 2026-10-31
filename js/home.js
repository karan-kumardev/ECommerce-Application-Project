// home.js - renders the product grid and handles search, filters and sorting.
// products-data.js loads first, so the `products` array already exists here.

const grid = document.getElementById("product-grid");
const count =document.getElementById("product-count");
const searchForm = document.querySelector(".search-form");
const searchInput = document.getElementById("search-input");
const sortSelect =document.getElementById("sort-select");
const priceMin = document.getElementById("price-min");
const priceMax = document.getElementById("price-max");
const applyBtn = document.getElementById("apply-filters");
const resetBtn = document.getElementById("reset-filters");


// draws the given list of products into the grid
function renderProducts(list) {
    if (list.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1;">No products found</p>';
        count.textContent = "Showing 0 Products";
        return;
    }

    let html = "";

    list.forEach(product => {
        html += makeCardHTML(product);
    });

    grid.innerHTML = html;
    count.textContent = "Showing " + list.length + " Products";
}

// reads search box + filters + sort, then redraws the grid
function applyAll() {
    const text = searchInput.value.trim().toLowerCase();

    const selected = Array.from(
        document.querySelectorAll('input[name="category"]:checked')
    ).map(box => box.value);

    // an empty box means "no limit", so keep it as null
    const min = priceMin.value === "" ? null : Number(priceMin.value);
    const max = priceMax.value === "" ? null : Number(priceMax.value);

    // filter() returns a new array, so the original `products` is never changed
    const result = products.filter(product => {
        if (text && !product.name.toLowerCase().includes(text)) return false;
        if (selected.length > 0 && !selected.includes(product.category)) return false;
        if (min !== null && product.price < min) return false;
        if (max !== null && product.price > max) return false;
        return true;
    });

    const sortBy = sortSelect.value;

    if (sortBy === "newest") {
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "price-asc") {
        result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
        result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
        result.sort((a, b) => b.rating - a.rating);
    }

    renderProducts(result);
}

function resetAll() {
    document.querySelectorAll('input[name="category"]').forEach(box => {
        box.checked = false;
    });
    priceMin.value = "";
    priceMax.value = "";
    searchInput.value = "";
    sortSelect.value = "newest";
    applyAll();
}

// ----- events -----
applyBtn.addEventListener("click", applyAll);
resetBtn.addEventListener("click", resetAll);
sortSelect.addEventListener("change", applyAll);

searchForm.addEventListener("submit", event => {
    event.preventDefault();   // stop the page from reloading
    applyAll();
});


grid.addEventListener("click", event => {
    const heart = event.target.closest(".product-card__wishlist");
    if (heart) {
        const saved = toggleWishlist(Number(heart.dataset.id));
        setHeart(heart, saved);
        return;
    }

    const button = event.target.closest(".product-card__add");
    if (!button) return;
    addToCart(Number(button.dataset.id));
});

// first draw
applyAll();

