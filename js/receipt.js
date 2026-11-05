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
            </div>
            <span class="receipt__status receipt__status--${order.status}">${order.status}</span>
        </div>

        <div class="receipt__cols">
            <div>
                <h2 class="receipt__subtitle">Customer</h2>
                <p>${escapeHTML(order.customer.name)}<br>${escapeHTML(order.customer.email)}</p>
            </div>
            <div>
                <h2 class="receipt__subtitle">Delivery address</h2>
                <p>
                    ${escapeHTML(a.fullName)}<br>
                    ${escapeHTML(a.addressLine)}<br>
                    ${escapeHTML(a.city)}${a.postalCode ? " " + escapeHTML(a.postalCode) : ""}<br>
                    ${escapeHTML(a.phone)}
                </p>
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
            <button type="button" class="btn btn--primary" id="pdf-btn">Download Bill</button>
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
    doc.text(date + "   |   Status: " + order.status, 20, 30);

    // ----- customer (left) and delivery address (right) -----
    const a = order.address;
    doc.setFontSize(9);
    doc.text("CUSTOMER", 20, 44);
    doc.text("DELIVERY ADDRESS", 110, 44);

    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(order.customer.name, 80).concat(doc.splitTextToSize(order.customer.email, 80)), 20, 51);
    const addressLines = [a.fullName, a.addressLine, a.city + (a.postalCode ? " " + a.postalCode : ""), a.phone];
    doc.text(addressLines.flatMap(line => doc.splitTextToSize(line, 80)), 110, 51);

    // ----- table header -----
    let y = 82;
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
