// receipt.js - shows one saved order (receipt.html?id=12). Needs main.js loaded first.

const receiptBox = document.getElementById("receipt");
const receiptMessage = document.getElementById("receipt-message");

let shownOrder = null;   // the order on screen, used by the PDF button

const orderId = Number(new URLSearchParams(window.location.search).get("id"));

function showError(text) {
    receiptMessage.textContent = text;
    receiptMessage.hidden = false;
    receiptBox.hidden = true;
}

function money(value) {
    return "$" + value.toFixed(2);
}

function renderReceipt(order) {
    const date = new Date(order.createdAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    let rows = "";
    order.items.forEach(item => {
        rows += `
            <tr>
                <td>${escapeHTML(item.name)}</td>
                <td class="receipt__num">${item.quantity}</td>
                <td class="receipt__num">${money(item.price)}</td>
                <td class="receipt__num">${money(item.lineTotal)}</td>
            </tr>`;
    });

    const a = order.address;

    receiptBox.innerHTML = `
        <div class="receipt__head">
            <div>
                <h1 class="receipt__title">Order #${order.orderNumber}</h1>
                <p class="receipt__date">${date}</p>
                ${currentUser && currentUser.role === "admin" ? '<p class="receipt__date">Database order ID: ' + order.id + "</p>" : ""}
            </div>
            <span class="receipt__status receipt__status--${order.status}">${statusLabel(order.status)}</span>
        </div>

        <div class="receipt__cols">
            <div>
                <h2 class="receipt__subtitle">Customer</h2>
                <dl class="receipt__list">
                    <dt>Name</dt><dd>${escapeHTML(order.customer.name)}</dd>
                    <dt>Email</dt><dd>${escapeHTML(order.customer.email)}</dd>
                </dl>
            </div>
            <div>
                <h2 class="receipt__subtitle">Delivery address</h2>
                <dl class="receipt__list">
                    <dt>Name</dt><dd>${escapeHTML(a.fullName)}</dd>
                    <dt>Phone</dt><dd>${escapeHTML(a.phone)}</dd>
                    <dt>Address</dt><dd>${escapeHTML(a.addressLine)}</dd>
                    <dt>City</dt><dd>${escapeHTML(a.city)}</dd>
                    ${a.postalCode ? "<dt>Postal code</dt><dd>" + escapeHTML(a.postalCode) + "</dd>" : ""}
                </dl>
            </div>
        </div>

        <div class="receipt__table-wrap">
            <table class="receipt__table">
                <thead>
                    <tr><th>Product</th><th class="receipt__num">Qty</th><th class="receipt__num">Price</th><th class="receipt__num">Total</th></tr>
                </thead>
                <tbody>${rows}
                </tbody>
            </table>
        </div>

        <p class="receipt__total">Total <span>${money(order.total)}</span></p>

        <div class="receipt__actions">
            <button type="button" class="btn btn--primary" id="pdf-btn">Download PDF</button>
            <a href="index.html" class="btn btn--outline">Continue shopping</a>
        </div>`;

    receiptBox.hidden = false;
    document.title = "Order #" + order.orderNumber;
    shownOrder = order;
    document.getElementById("pdf-btn").addEventListener("click", downloadPdf);
}

// builds the receipt as a PDF file and downloads it (same jsPDF as the wishlist)
function downloadPdf() {
    const order = shownOrder;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const date = new Date(order.createdAt).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    // ----- heading -----
    doc.setFontSize(20);
    doc.text("Order #" + order.orderNumber, 20, 22);
    doc.setFontSize(11);
    doc.text(date + "   |   Status: " + statusLabel(order.status), 20, 30);

    // ----- customer (left) and delivery address (right), each line has a label -----
    const a = order.address;
    doc.setFontSize(9);
    doc.text("CUSTOMER", 20, 44);
    doc.text("DELIVERY ADDRESS", 110, 44);

    const customerLines = [
        "Name: " + order.customer.name,
        "Email: " + order.customer.email
    ];
    const addressLines = [
        "Name: " + a.fullName,
        "Phone: " + a.phone,
        "Address: " + a.addressLine,
        "City: " + a.city
    ];
    if (a.postalCode) addressLines.push("Postal code: " + a.postalCode);

    doc.setFontSize(11);
    const left = customerLines.flatMap(line => doc.splitTextToSize(line, 80));
    const right = addressLines.flatMap(line => doc.splitTextToSize(line, 80));
    doc.text(left, 20, 51);
    doc.text(right, 110, 51);

    // ----- table header: starts under the longer of the two blocks -----
    const lineHeight = doc.getLineHeightFactor() * doc.getFontSize() / doc.internal.scaleFactor;
    let y = 51 + Math.max(left.length, right.length) * lineHeight + 8;
    doc.setFontSize(10);
    doc.text("PRODUCT", 20, y);
    doc.text("QTY", 135, y, { align: "right" });
    doc.text("PRICE", 162, y, { align: "right" });
    doc.text("TOTAL", 190, y, { align: "right" });
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    // ----- one row per item -----
    doc.setFontSize(11);
    order.items.forEach(item => {
        const nameLines = doc.splitTextToSize(item.name, 95);

        // new page when the table reaches the bottom
        if (y + nameLines.length * 6 > 270) {
            doc.addPage();
            y = 22;
        }

        doc.text(nameLines, 20, y);
        doc.text(String(item.quantity), 135, y, { align: "right" });
        doc.text(money(item.price), 162, y, { align: "right" });
        doc.text(money(item.lineTotal), 190, y, { align: "right" });
        y += nameLines.length * 6 + 3;
    });

    // ----- total -----
    if (y > 260) {
        doc.addPage();
        y = 22;
    }
    doc.line(20, y, 190, y);
    y += 9;
    doc.setFontSize(14);
    doc.text("Total", 20, y);
    doc.text(money(order.total), 190, y, { align: "right" });

    doc.setFontSize(10);
    doc.text("Thank you for shopping with us.", 20, y + 16);

    doc.save("order-" + order.orderNumber + ".pdf");
}

async function start() {
    if (!Number.isInteger(orderId) || orderId < 1) {
        showError("Order not found");
        return;
    }

    await authReady;

    if (!currentUser) {
        window.location.href = "login.html?next=" + encodeURIComponent("receipt.html?id=" + orderId);
        return;
    }

    try {
        const res = await fetch("/api/orders/" + orderId);
        const data = await res.json();
        if (!res.ok) {
            showError(data.error || "Order not found");
            return;
        }
        renderReceipt(data);
    } catch (err) {
        showError("Could not reach the server. Is it running?");
    }
}

start();
