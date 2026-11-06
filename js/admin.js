// admin.js - shared by the three admin pages. Needs main.js loaded first.

// Only admins may stay on an admin page.
//   guest        -> login page, then back here
//   normal user  -> home page
// Returns true when the page may be shown.
async function adminGuard() {
    await authReady;

    if (!currentUser) {
        const page = window.location.pathname.split("/").pop();
        window.location.href = "login.html?next=" + encodeURIComponent(page);
        return false;
    }
    if (currentUser.role !== "admin") {
        window.location.href = "index.html";
        return false;
    }

    document.getElementById("admin-main").hidden = false;
    return true;
}

// fetch + JSON. Throws an Error with the server's message when something is wrong.
async function api(url, options = {}) {
    const init = { method: options.method || "GET", headers: {} };
    if (options.body !== undefined) {
        init.headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.body);
    }

    let res;
    try {
        res = await fetch(url, init);
    } catch (err) {
        throw new Error("Could not reach the server. Is it running?");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
}

function money(value) {
    return "$" + Number(value).toFixed(2);
}

function formatDate(value) {
    return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// small message at the bottom of the screen
let toastTimer;
function showToast(text, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.classList.toggle("toast--error", isError);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
}
