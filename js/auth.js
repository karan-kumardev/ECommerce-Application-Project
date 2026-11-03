// auth.js - login and signup on login.html. Needs main.js loaded first.

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const message = document.getElementById("auth-message");

// where to go after logging in: login.html?next=cart.html
// only plain page names are allowed, so nobody can send users to another website
function getNextPage() {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && /^[a-zA-Z0-9_\-]+\.html(\?[a-zA-Z0-9_=&\-]*)?$/.test(next)) return next;
    return "index.html";
}

function showMessage(text) {
    message.textContent = text;
    message.hidden = false;
}

function showTab(name) {
    const isLogin = name === "login";
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
    tabLogin.classList.toggle("auth-tabs__btn--active", isLogin);
    tabSignup.classList.toggle("auth-tabs__btn--active", !isLogin);
    message.hidden = true;
}

tabLogin.addEventListener("click", () => showTab("login"));
tabSignup.addEventListener("click", () => showTab("signup"));

// sends the form data to the server; on success goes to the next page
async function sendForm(form, url, body) {
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    message.hidden = true;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || "Something went wrong");
            return;
        }
        switchUser(data.user.id);
        window.location.href = getNextPage();
    } catch (err) {
        showMessage("Could not reach the server. Is it running?");
    } finally {
        button.disabled = false;
    }
}

loginForm.addEventListener("submit", event => {
    event.preventDefault();
    sendForm(loginForm, "/api/auth/login", {
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value
    });
});

signupForm.addEventListener("submit", event => {
    event.preventDefault();
    sendForm(signupForm, "/api/auth/signup", {
        name: document.getElementById("signup-name").value,
        email: document.getElementById("signup-email").value,
        password: document.getElementById("signup-password").value
    });
});

// already logged in? no reason to stay on this page
authReady.then(() => {
    if (currentUser) window.location.href = getNextPage();
});
