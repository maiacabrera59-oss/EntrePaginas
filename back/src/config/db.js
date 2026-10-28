const sql = require("mssql");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    instanceName: process.env.DB_INSTANCE, // SQLEXPRESS
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

let poolPromise = null;

function getConnection() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig).catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

module.exports = { sql, getConnection };