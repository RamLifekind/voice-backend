/**
 * Database Service - Azure SQL with Managed Identity
 * Uses your existing company database
 */

const sql = require("mssql");

// YOUR WORKING CONFIG (keep exactly as-is)
const isAzure = !!process.env.WEBSITE_INSTANCE_ID;

const config = isAzure
  ? {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: false
      },
      authentication: {
        type: "azure-active-directory-msi-app-service",
        options: {}
      }
    }
  : {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

let pool;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log("✅ DB Connected via " + (isAzure ? "Managed Identity" : "SQL Auth"));
    } catch (err) {
      console.error("❌ Database Connection Failed:", err);
      throw err;
    }
  }
  return pool;
}

async function execSP(spName, params = {}) {
  const db = await getPool();
  const request = db.request();

  Object.entries(params).forEach(([k, v]) => {
    request.input(k, v);
  });

  const result = await request.execute(spName);
  return result.recordset; // Return recordset for easy use
}

async function execQuery(query, params = {}) {
  const db = await getPool();
  const request = db.request();
  
  Object.entries(params).forEach(([k, v]) => {
    request.input(k, v);
  });
  
  const result = await request.query(query);
  return result.recordset;
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

module.exports = { execSP, execQuery, getPool, closePool };