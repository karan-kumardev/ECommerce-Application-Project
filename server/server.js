// The web server: serves the pages and the /api routes.  Start it with:  npm start
const path = require("path");
const ROOT = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env") });

const express = require("express");
const cookieParser = require("cookie-parser");
const { HttpError } = require("./utils");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error("JWT_SECRET is missing or too short. Set a long random value in your .env file.");
    process.exit(1);
}

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Only these folders are public. Never serve the whole project folder: it contains .env and the server code.
for (const folder of ["html", "css", "js", "images"]) {
    app.use("/" + folder, express.static(path.join(ROOT, folder)));
}
app.get("/", (req, res) => res.redirect("/html/index.html"));

app.use("/api/products", require("./routes/products"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/addresses", require("./routes/addresses"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/admin", require("./routes/admin"));

// unknown /api address -> JSON, not an HTML page
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// one place that turns errors into JSON answers
app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request is too large" });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Server running:  http://localhost:${port}`);
});
