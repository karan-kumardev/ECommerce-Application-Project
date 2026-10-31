// wishlist.js - shows the saved products and builds the PDF download.
// Needs jspdf, products-data.js and main.js loaded first (see script order in wishlist.html).

const grid = document.getElementById("wishlist-grid");
const countText = document.getElementById("wishlist-count");
const emptyBox = document.getElementById("wishlist-empty");
const pdfBtn = document.getElementById("download-pdf");

// turns the saved ids into full product objects
function getSavedProducts() {
    return getWishlist()
        .map(id => products.find(p => p.id === id))
        .filter(product => product !== undefined);
}

function renderWishlist() {
    const saved = getSavedProducts();

    if (saved.length === 0) {
        emptyBox.hidden = false;
        grid.hidden = true;
        pdfBtn.hidden = true;
        countText.textContent = "";
        return;
    }

    emptyBox.hidden = true;
    grid.hidden = false;
    pdfBtn.hidden = false;

    let html = "";
    saved.forEach(product => {
        html += makeCardHTML(product);
    });

    grid.innerHTML = html;
    countText.textContent = saved.length + (saved.length === 1 ? " item saved" : " items saved");
}

// one listener for all cards: heart removes the item, button adds it to the cart
grid.addEventListener("click", event => {
    const heart = event.target.closest(".product-card__wishlist");
    if (heart) {
        toggleWishlist(Number(heart.dataset.id));
        renderWishlist();
        return;
    }

    const addBtn = event.target.closest(".product-card__add");
    if (addBtn) {
        addToCart(Number(addBtn.dataset.id));
    }
});

// PDF: a title, the date, then an unordered (bulleted) list of the saved products
pdfBtn.addEventListener("click", () => {
    const saved = getSavedProducts();
    if (saved.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("My Wishlist", 20, 22);

    doc.setFontSize(11);
    doc.text("Saved items: " + saved.length + "   |   " + new Date().toLocaleDateString("en-GB"), 20, 30);

    doc.setFontSize(13);
    let y = 44;

    saved.forEach(product => {
        const line = "\u2022  " + product.name + "  -  $" + product.price.toFixed(2);
        // wrap long names so they stay inside the page
        const lines = doc.splitTextToSize(line, 170);

        // start a new page when the list reaches the bottom
        if (y + lines.length * 7 > 280) {
            doc.addPage();
            y = 22;
        }

        doc.text(lines, 20, y);
        y += lines.length * 7 + 4;
    });

    doc.save("wishlist.pdf");
});

renderWishlist();