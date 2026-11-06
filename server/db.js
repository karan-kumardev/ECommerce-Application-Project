// One shared connection pool for the whole server.
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "shop_db",
    waitForConnections: true,
    connectionLimit: 10
});

// TIME ZONE FIX
// MySQL stamps every new row (created_at) with ITS OWN clock, and this server reads the
// stamp back using THIS computer's clock. If MySQL is set to another time zone (for example
// UTC) the times come out hours wrong. So every new connection is told to use this
// computer's time zone. Then created_at in the database is the real local time.
function localOffset() {
    const minutes = -new Date().getTimezoneOffset();      // Pakistan: +300
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return sign + hh + ":" + mm;                           // "+05:00"
}

pool.pool.on("connection", connection => {
    connection.query("SET time_zone = '" + localOffset() + "'");
});

module.exports = pool;
