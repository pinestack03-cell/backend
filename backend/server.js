require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const sql = require("mssql");
const pg = require("pg");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pdfParse = require("pdf-parse");

/* ================= TRIM FIELD HELPER ================= */
const FIELD_LIMITS = {
  phone1: 10,
  phone2: 10,
  name: 30,
  post: 50,
  department: 30,
  location: 30,
  assignTo: 30,
  remark: 30,
  status: 30,
  email: 100,
};

function trimField(value, maxLength) {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  return str.slice(0, maxLength);
}

function sanitizeFields(data, limits = FIELD_LIMITS) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const maxLen = limits[key] || limits[key.toLowerCase()] || 255;
    sanitized[key] = trimField(value, maxLen);
  }
  return sanitized;
}

/* ================= GEMINI RESPONSE SANITIZER ================= */
function sanitizeGeminiResponse(data) {
  if (!data || typeof data !== "object") {
    return {
      name: "",
      phone: "",
      post: "",
      department: "",
      location: "",
      skills: [],
      remarks: "",
    };
  }

  return {
    name: trimField(data.name, 30),
    phone: trimField(data.phone, 10),
    post: trimField(data.post, 50),
    department: trimField(data.department, 30),
    location: trimField(data.location, 30),
    experience_years: Number(data.experience_years) || 0,
    skills: Array.isArray(data.skills) ? data.skills.slice(0, 10) : [],
    remarks: "",
  };
}

/* ================= AUTH CONFIG ================= */

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = process.env.TOKEN_TTL || "12h";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set. Token issuance will be rejected. Set JWT_SECRET in the environment.");
}
if (!ADMIN_PASSWORD) {
  console.warn("⚠️ ADMIN_PASSWORD is not set. Admin login is disabled. Set ADMIN_PASSWORD in the environment.");
}

function signToken(payload) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function requireAuth(roles, options = {}) {
  return (req, res, next) => {
    let token = null;
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      token = header.slice(7);
    } else if (options.allowQueryToken && req.query.token) {
      token = String(req.query.token);
    }
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

/* ================= GOOGLE OAUTH CONFIG (candidate login) ================= */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn("⚠️ Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI). Candidate Google login will be disabled.");
}

const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const oauthStates = new Map();

function clearExpiredOauthStates() {
  const now = Date.now();
  for (const [key, exp] of oauthStates.entries()) {
    if (exp < now) oauthStates.delete(key);
  }
}

const app = express();

app.use(cors({
  origin: [
    "https://backend-teal-eta-16kjnjoktg.vercel.app",
    "https://globe1.online",
    "https://www.globe1.online",
    "http://localhost:5174",
    "http://103.119.56.74:5174"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

// Your routes come after this

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, and DOCX files are allowed"), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* ================= PROTECTED CV/DOCUMENT SERVING ================= */

async function getDocPathForCandidate(slNo) {
  try {
    if (usePostgres) {
      const result = await pgPool.query(`SELECT doc_path FROM resource_mt WHERE sl_no = $1`, [slNo]);
      return result.rows[0]?.doc_path || null;
    }
    const request = new sql.Request();
    request.input("slNo", sql.Int, slNo);
    const result = await request.query(`SELECT DOC_PATH FROM RESOURCE_MT WHERE SL_NO = @slNo`);
    return result.recordset[0]?.DOC_PATH || null;
  } catch (err) {
    console.error("❌ Doc path lookup error:", err.message);
    return null;
  }
}

app.get("/uploads/:filename", requireAuth(["admin", "candidate"], { allowQueryToken: true }), async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    if (req.user.role === "candidate") {
      const docPath = await getDocPathForCandidate(parseInt(req.user.sub));
      const owned = docPath && path.basename(docPath) === filename;
      if (!owned) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error("❌ File serve error:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

/* ================= GEMINI SETUP ================= */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

/* ================= DATABASE CONFIG ================= */

const dbConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "EMTserver@",
  server: process.env.DB_SERVER || "WIN-29FNP6Q95S6",
  port: 54930,
  database: process.env.DB_NAME || "globe1",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 60000,
    requestTimeout: 60000
  }
};

console.log("🔌 Connecting to SQL Server:", dbConfig.server + ":" + dbConfig.port, "Database:", dbConfig.database);
console.log("🔑 User:", dbConfig.user, "Password length:", dbConfig.password ? dbConfig.password.length : 0);

/* ================= POSTGRESQL CONFIG ================= */

const pgConfig = {
  connectionString: process.env.DATABASE_URL || 
    `postgres://${process.env.PG_USER || 'globe1_db_user'}:${process.env.PG_PASSWORD || '70hwjlSFxAZueUnhZ7bY1GVecImVm1lE'}@${process.env.PG_HOST || 'dpg-d7s9gb0g4nts73d72nhg-a.oregon-postgres.render.com'}:${process.env.PG_PORT || 5432}/${process.env.PG_DATABASE || 'globe1_db'}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const { Pool } = pg;
const pgPool = new Pool({
  connectionString: pgConfig.connectionString,
  ssl: pgConfig.ssl
});

/* ================= INIT POSTGRESQL TABLE ================= */

async function initPostgresTable() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS resource_mt (
        sl_no SERIAL PRIMARY KEY,
        entry_no INTEGER,
        datez TIMESTAMP DEFAULT NOW(),
        phone1 VARCHAR(10),
        phone2 VARCHAR(10),
        name VARCHAR(30),
        post VARCHAR(50),
        department VARCHAR(30),
        location VARCHAR(30),
        cur_status CHAR(30),
        assign_to CHAR(30),
        experience NUMERIC(4,1),
        cur_salary NUMERIC(12,3),
        exp_salary NUMERIC(12,3),
        remarks1 VARCHAR(30),
        remarks2 CHAR(50),
        remarks3 CHAR(50),
        fr BOOLEAN DEFAULT false,
        add_user CHAR(40),
        add_dt TIMESTAMP DEFAULT NOW(),
        edit_user CHAR(40),
        edit_dt TIMESTAMP,
        doc_path VARCHAR(500),
        email VARCHAR(100)
      )
    `);
    console.log("✅ PostgreSQL table 'resource_mt' ready");
  } catch (err) {
    console.error("❌ Table init error:", err.message);
  }
}

/* ================= SCHEMA MIGRATION (idempotent) ================= */

async function ensureSchema() {
  try {
    if (usePostgres) {
      await pgPool.query(`
        ALTER TABLE resource_mt ADD COLUMN IF NOT EXISTS email VARCHAR(100)
      `);
      await pgPool.query(`
        ALTER TABLE resource_mt DROP COLUMN IF EXISTS candidate_pin_hash
      `);
      console.log("✅ Schema ready: email column (PostgreSQL)");
    } else {
      const emailCheck = await new sql.Request().query(`
        SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'RESOURCE_MT' AND COLUMN_NAME = 'email'
      `);
      if (parseInt(emailCheck.recordset[0].cnt) === 0) {
        await new sql.Request().query(`
          ALTER TABLE RESOURCE_MT ADD email VARCHAR(100) NULL
        `);
        console.log("✅ Schema migrated: email column added (SQL Server)");
      } else {
        console.log("✅ Schema ready: email column (SQL Server)");
      }

      const pinCheck = await new sql.Request().query(`
        SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'RESOURCE_MT' AND COLUMN_NAME = 'candidate_pin_hash'
      `);
      if (parseInt(pinCheck.recordset[0].cnt) > 0) {
        await new sql.Request().query(`
          ALTER TABLE RESOURCE_MT DROP COLUMN candidate_pin_hash
        `);
        console.log("✅ Schema cleanup: dropped candidate_pin_hash (SQL Server)");
      }
    }
  } catch (err) {
    console.error("❌ Schema ensure error:", err.message);
  }
}

/* ================= DATABASE CONNECTION ================= */

const usePostgres = !!process.env.DATABASE_URL;

if (usePostgres) {
  pgPool.connect()
    .then(() => {
      console.log("✅ PostgreSQL Connected");
      initPostgresTable();
      ensureSchema();
    })
    .catch(err => {
      console.error("❌ PostgreSQL Connection Error:", err.message);
    });
} else {
  sql.connect(dbConfig)
    .then(() => {
      console.log("✅ SQL Server Connected to", dbConfig.database);
      ensureSchema();
    })
    .catch(err => {
      console.error("❌ SQL Connection Error:", err.message);
    });
}

/* ================= DB REQUEST HELPER ================= */

async function createDbRequest() {
  if (usePostgres) {
    return { type: 'postgres', pool: pgPool };
  } else {
    return { type: 'mssql', request: new sql.Request() };
  }
}

async function executeQuery(reqObj, query) {
  if (reqObj.type === 'postgres') {
    const result = await reqObj.pool.query(query);
    return { recordset: result.rows };
  } else {
    return await reqObj.request.query(query);
  }
}

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("Backend is running || CHETAN  🚀");
});

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend API is running",
    endpoints: {
      GET: [
        "/api - API info",
        "/api/auth/google - Start Google OAuth login (candidate)",
        "/api/auth/google/callback - Google OAuth callback (candidate)",
        "/api/candidate/me - Get own record (candidate)",
        "/api/resources - Get all resources (admin)",
        "/api/resources/latest - Get latest resource (admin)",
        "/api/resources/next-entry - Get next entry number (admin)",
        "/api/resources/:id - Get resource by ID (admin)",
        "/api/resources/search - Search resources with filters (admin)",
        "/api/check-phone - Check phone duplicate (admin)",
        "/api/departments - Get all departments (admin)",
        "/api/test - Database test (admin)",
        "/uploads/:filename - Protected CV/document access (admin or owner)"
      ],
      POST: [
        "/api/auth/admin/login - Admin login",
        "/api/resources - Create new resource (admin)",
        "/api/resources/upload - Upload file (admin)",
        "/api/candidate/cv - Upload own CV (candidate)",
        "/parse-cv - Parse CV PDF (admin)",
        "/insert-candidate - Insert candidate (admin)"
      ],
      PUT: [
        "/api/resources/:id - Update resource (admin)",
        "/api/candidate/me - Update own profile (candidate)"
      ]
    }
  });
});

/* ================= API: AUTH - ADMIN LOGIN ================= */

app.post("/api/auth/admin/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!ADMIN_PASSWORD || !safeEqual(username, ADMIN_USERNAME) || !safeEqual(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({ role: "admin", sub: "admin", name: ADMIN_USERNAME });
    res.json({ success: true, token, role: "admin", name: ADMIN_USERNAME });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= API: AUTH - GOOGLE OAUTH (candidate login) ================= */

app.get("/api/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.status(503).json({ error: "Google login is not configured" });
  }
  clearExpiredOauthStates();
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  const authUrl = googleOAuthClient.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  });
  res.redirect(authUrl);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const redirectToFrontend = (params) => res.redirect(`${FRONTEND_URL}?${params}`);

  const { code, state, error } = req.query;

  if (error) {
    return redirectToFrontend(`auth=error&message=${encodeURIComponent("Google sign-in was cancelled or failed.")}`);
  }
  if (!code || !state) {
    return redirectToFrontend(`auth=error&message=${encodeURIComponent("Google sign-in failed. Please try again.")}`);
  }

  const stateExp = oauthStates.get(state);
  oauthStates.delete(state);
  if (!stateExp || stateExp < Date.now()) {
    return redirectToFrontend(`auth=error&message=${encodeURIComponent("Google sign-in session expired. Please try again.")}`);
  }

  try {
    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const email = String(payload.email || "").trim().toLowerCase();
    const emailVerified = payload.email_verified === true;
    if (!email || !emailVerified) {
      return redirectToFrontend(`auth=error&message=${encodeURIComponent("Google account email could not be verified.")}`);
    }

    let row = null;
    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT sl_no, name FROM resource_mt
        WHERE LOWER(email) = $1
      `, [email]);
      row = result.rows[0] || null;
    } else {
      const request = new sql.Request();
      request.input("email", sql.VarChar(100), email);
      const result = await request.query(`
        SELECT TOP 1 SL_NO AS sl_no, NAME AS name FROM RESOURCE_MT
        WHERE LOWER(email) = LOWER(@email)
      `);
      row = result.recordset[0] || null;
    }

    if (!row) {
      // Automatically create a candidate profile for a new Google account
      const candidateName = String(payload.name || "").trim().slice(0, 30);

      try {
        if (usePostgres) {
          const entryResult = await pgPool.query(`
            SELECT COALESCE(MAX(entry_no), 0) + 1 AS next_entry_no
            FROM resource_mt
          `);

          const nextEntryNo = entryResult.rows[0].next_entry_no;

          const insertResult = await pgPool.query(`
            INSERT INTO resource_mt
              (entry_no, datez, phone1, phone2, name, post, department,
               location, cur_status, assign_to, experience,
               cur_salary, exp_salary,
               remarks1, remarks2, remarks3,
               fr, add_user, add_dt, edit_user, edit_dt, doc_path, email)
            VALUES
              ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
               $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21)
            RETURNING sl_no, name
          `, [
            nextEntryNo,
            "0000000000",
            "0000000000",
            candidateName,
            "",
            "",
            "",
            "",
            "",
            0,
            0,
            0,
            "",
            "",
            "",
            false,
            "CANDIDATE",
            "CANDIDATE",
            null,
            null,
            email
          ]);

          row = insertResult.rows[0];

        } else {
          const entryRequest = new sql.Request();

          const entryResult = await entryRequest.query(`
            SELECT ISNULL(MAX(ENTRY_NO), 0) + 1 AS next_entry_no
            FROM RESOURCE_MT
          `);

          const nextEntryNo = entryResult.recordset[0].next_entry_no;

          const insertRequest = new sql.Request();

          insertRequest.input("entryNo", sql.Numeric(18,0), nextEntryNo);
          insertRequest.input("phone1", sql.VarChar(10), "0000000000");
          insertRequest.input("phone2", sql.VarChar(10), "0000000000");
          insertRequest.input("name", sql.VarChar(30), candidateName);
          insertRequest.input("post", sql.VarChar(50), "");
          insertRequest.input("department", sql.VarChar(30), "");
          insertRequest.input("location", sql.VarChar(30), "");
          insertRequest.input("curStatus", sql.Char(30), "");
          insertRequest.input("assignTo", sql.Char(30), "");
          insertRequest.input("experience", sql.Numeric(4,1), 0);
          insertRequest.input("curSalary", sql.Numeric(12,3), 0);
          insertRequest.input("expSalary", sql.Numeric(12,3), 0);
          insertRequest.input("remarks1", sql.VarChar(30), "");
          insertRequest.input("remarks2", sql.Char(50), "");
          insertRequest.input("remarks3", sql.Char(50), "");
          insertRequest.input("fr", sql.Bit, 0);
          insertRequest.input("editDt", sql.DateTime, null);
          insertRequest.input("docPath", sql.VarChar(500), "");
          insertRequest.input("email", sql.VarChar(100), email);

          const insertResult = await insertRequest.query(`
            INSERT INTO RESOURCE_MT
              (ENTRY_NO, DATEZ, PHONE1, PHONE2, NAME, POST, DEPARTMENT,
               LOCATION, CUR_STATUS, ASSIGN_TO, EXPERIENCE,
               CUR_SALARY, EXP_SALARY,
               REMARKS1, REMARKS2, REMARKS3,
               FR, ADD_USER, ADD_DT, EDIT_USER, EDIT_DT, DOC_PATH, EMAIL)
            OUTPUT INSERTED.SL_NO AS sl_no, INSERTED.NAME AS name
            VALUES
              (@entryNo, GETDATE(), @phone1, @phone2, @name, @post, @department,
               @location, @curStatus, @assignTo, @experience,
               @curSalary, @expSalary,
               @remarks1, @remarks2, @remarks3,
               @fr, 'CANDIDATE', GETDATE(), 'CANDIDATE', @editDt, @docPath, @email)
          `);

          row = insertResult.recordset[0];
        }
      } catch (createErr) {
        console.error("❌ Auto-create candidate INSERT failed for", email, ":", createErr.message);
        throw createErr;
      }

      console.log("New candidate created:", email);
    }

    const token = signToken({
      role: "candidate",
      sub: String(row.sl_no),
      name: row.name || ""
    });

    res.redirect(`${FRONTEND_URL}?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("❌ Google OAuth callback error:", err.message);
    redirectToFrontend(`auth=error&message=${encodeURIComponent("Google sign-in failed. Please try again.")}`);
  }
});

/* ================= API: CANDIDATE - GET OWN RECORD ================= */

app.get("/api/candidate/me", requireAuth(["candidate"]), async (req, res) => {
  try {
    const slNo = parseInt(req.user.sub);
    if (!Number.isFinite(slNo)) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          cur_status as status,
          email
        FROM resource_mt
        WHERE sl_no = $1
      `, [slNo]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Record not found" });
      }
      return res.json(result.rows[0]);
    }

    const request = new sql.Request();
    request.input("slNo", sql.Int, slNo);
    const result = await request.query(`
      SELECT
        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        CUR_STATUS as status,
        EMAIL as email
      FROM RESOURCE_MT
      WHERE SL_NO = @slNo
    `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error("❌ Candidate me error:", error.message);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

/* ================= API: CANDIDATE - UPDATE OWN RECORD (whitelisted fields only) ================= */

app.put("/api/candidate/me", requireAuth(["candidate"]), async (req, res) => {
  try {
    const slNo = parseInt(req.user.sub);
    if (!Number.isFinite(slNo)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const raw = req.body || {};

    const allowed = {};
    const pick = (key, max) => {
      if (raw[key] !== undefined) allowed[key] = trimField(raw[key], max);
    };
    pick("name", 30);
    pick("phone1", 10);
    pick("phone2", 10);
    pick("post", 50);
    pick("department", 30);
    pick("location", 30);

    const experience = Number(raw.experience);
    const currentSalary = Number(raw.currentSalary);
    const expectedSalary = Number(raw.expectedSalary);
    allowed.experience = Number.isFinite(experience) ? experience : 0;
    allowed.currentSalary = Number.isFinite(currentSalary) ? currentSalary : 0;
    allowed.expectedSalary = Number.isFinite(expectedSalary) ? expectedSalary : 0;

    const phone1 = (allowed.phone1 || "").replace(/\D/g, "");
    const phone2 = (allowed.phone2 || "").replace(/\D/g, "");
    allowed.phone1 = phone1;
    allowed.phone2 = phone2;

    if (!phone1 || phone1.length !== 10) {
      return res.status(400).json({ success: false, error: "Phone 1 must be exactly 10 digits" });
    }
    if (phone2 && phone2.length !== 10) {
      return res.status(400).json({ success: false, error: "Phone 2 must be exactly 10 digits" });
    }

    if (usePostgres) {
      const dup = await pgPool.query(`
        SELECT name FROM resource_mt
        WHERE (phone1 = $1 OR phone2 = $1) AND sl_no != $2
      `, [phone1, slNo]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ success: false, error: `Phone already exists (Name: ${dup.rows[0].name})` });
      }
      if (phone2 && phone2 !== phone1) {
        const dup2 = await pgPool.query(`
          SELECT name FROM resource_mt
          WHERE (phone1 = $1 OR phone2 = $1) AND sl_no != $2
        `, [phone2, slNo]);
        if (dup2.rows.length > 0) {
          return res.status(400).json({ success: false, error: `Phone 2 already exists (Name: ${dup2.rows[0].name})` });
        }
      }

      await pgPool.query(`
        UPDATE resource_mt SET
          name = $1,
          phone1 = $2,
          phone2 = $3,
          post = $4,
          department = $5,
          location = $6,
          experience = $7,
          cur_salary = $8,
          exp_salary = $9
        WHERE sl_no = $10
      `, [
        allowed.name,
        phone1,
        phone2,
        allowed.post,
        allowed.department,
        allowed.location,
        allowed.experience,
        allowed.currentSalary,
        allowed.expectedSalary,
        slNo
      ]);

      return res.json({ success: true, message: "Profile updated" });
    }

    const dupReq = new sql.Request();
    dupReq.input("phoneCheck", sql.VarChar(10), phone1);
    dupReq.input("slNoCheck", sql.Int, slNo);
    const dupResult = await dupReq.query(`
      SELECT NAME FROM RESOURCE_MT
      WHERE (PHONE1 = @phoneCheck OR PHONE2 = @phoneCheck) AND SL_NO != @slNoCheck
    `);
    if (dupResult.recordset.length > 0) {
      return res.status(400).json({ success: false, error: `Phone already exists (Name: ${dupResult.recordset[0].NAME})` });
    }
    if (phone2 && phone2 !== phone1) {
      const dupReq2 = new sql.Request();
      dupReq2.input("phoneCheck", sql.VarChar(10), phone2);
      dupReq2.input("slNoCheck", sql.Int, slNo);
      const dupResult2 = await dupReq2.query(`
        SELECT NAME FROM RESOURCE_MT
        WHERE (PHONE1 = @phoneCheck OR PHONE2 = @phoneCheck) AND SL_NO != @slNoCheck
      `);
      if (dupResult2.recordset.length > 0) {
        return res.status(400).json({ success: false, error: `Phone 2 already exists (Name: ${dupResult2.recordset[0].NAME})` });
      }
    }

    const request = new sql.Request();
    await request
      .input("SL_NO", sql.Int, slNo)
      .input("NAME", sql.VarChar(30), allowed.name)
      .input("PHONE1", sql.VarChar(10), phone1)
      .input("PHONE2", sql.VarChar(10), phone2)
      .input("POST", sql.VarChar(50), allowed.post)
      .input("DEPARTMENT", sql.VarChar(30), allowed.department)
      .input("LOCATION", sql.VarChar(30), allowed.location)
      .input("EXPERIENCE", sql.Numeric(4,1), allowed.experience)
      .input("CUR_SALARY", sql.Numeric(12,3), allowed.currentSalary)
      .input("EXP_SALARY", sql.Numeric(12,3), allowed.expectedSalary)
      .query(`
        UPDATE RESOURCE_MT SET
          NAME = @NAME,
          PHONE1 = @PHONE1,
          PHONE2 = @PHONE2,
          POST = @POST,
          DEPARTMENT = @DEPARTMENT,
          LOCATION = @LOCATION,
          EXPERIENCE = @EXPERIENCE,
          CUR_SALARY = @CUR_SALARY,
          EXP_SALARY = @EXP_SALARY
        WHERE SL_NO = @SL_NO
      `);

    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("❌ Candidate update error:", error.message);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

/* ================= API: CANDIDATE - UPLOAD OWN CV ================= */

app.post("/api/candidate/cv", requireAuth(["candidate"]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const slNo = parseInt(req.user.sub);
    if (!Number.isFinite(slNo)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const filePath = `/uploads/${req.file.filename}`;

    if (usePostgres) {
      await pgPool.query(`UPDATE resource_mt SET doc_path = $1 WHERE sl_no = $2`, [filePath, slNo]);
    } else {
      const request = new sql.Request();
      request.input("DOC_PATH", sql.VarChar(500), filePath);
      request.input("SL_NO", sql.Int, slNo);
      await request.query(`UPDATE RESOURCE_MT SET DOC_PATH = @DOC_PATH WHERE SL_NO = @SL_NO`);
    }

    res.json({ success: true, docPath: filePath, fileName: req.file.originalname, message: "CV uploaded successfully" });
  } catch (error) {
    console.error("❌ Candidate CV upload error:", error.message);
    res.status(500).json({ error: "Failed to upload CV" });
  }
});

/* ================= API: GET LATEST RECORD ================= */

app.get("/api/resources/latest", requireAuth(["admin"]), async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          remarks1 as remark,
          cur_status as status,
          assign_to as "assignTo",
          email
        FROM resource_mt
        ORDER BY entry_no DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({ empty: true });
      }

      return res.json(result.rows[0]);
    }

    const request = new sql.Request();
    const result = await request.query(`
      SELECT TOP 1
        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        REMARKS1 as remark,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo,
        EMAIL as email
      FROM RESOURCE_MT
      ORDER BY ENTRY_NO DESC
    `);

    if (result.recordset.length === 0) {
      return res.json({ empty: true });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("❌ Get Latest Error:", error);
    res.status(500).json({ error: "Failed to fetch latest record" });
  }
});

/* ================= API: GET NEXT ENTRY NUMBER ================= */

app.get("/api/resources/next-entry", requireAuth(["admin"]), async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT COALESCE(MAX(entry_no), 0) + 1 AS "nextEntryNo" FROM resource_mt
      `);
      return res.json({ nextEntryNo: result.rows[0].nextEntryNo });
    }

    const request = new sql.Request();
    const result = await request.query(`
      SELECT ISNULL(MAX(ENTRY_NO), 0) + 1 AS nextEntryNo FROM RESOURCE_MT
    `);
    res.json({ nextEntryNo: result.recordset[0].nextEntryNo });
  } catch (error) {
    console.error("❌ Get Next Entry Error:", error);
    res.status(500).json({ error: "Failed to get next entry number" });
  }
});

/* ================= API: INSERT NEW RESOURCE ================= */

app.post("/api/resources", requireAuth(["admin"]), async (req, res) => {
  try {
    const raw = req.body;
    const data = sanitizeFields(raw);
    const { name, phone1, phone2, post, department, location, docPath, experience, currentSalary, expectedSalary, remark, status, assignTo, entryDate, email } = data;
    const emailNormalized = email ? String(email).trim().toLowerCase() : "";

    if (usePostgres) {
      const genResult = await pgPool.query(`
        SELECT COALESCE(MAX(entry_no), 0) + 1 AS "nextEntryNo" FROM resource_mt
      `);
      const nextEntryNo = genResult.rows[0].nextEntryNo;

      await pgPool.query(`
        INSERT INTO resource_mt
        (
          entry_no, datez, phone1, phone2, name, post, department,
          location, cur_status, assign_to, experience,
          cur_salary, exp_salary,
          remarks1, remarks2, remarks3,
          fr, add_user, add_dt, edit_user, edit_dt, doc_path, email
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13,
          $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23
        )
      `, [
        nextEntryNo,
        entryDate ? new Date(entryDate) : new Date(),
        trimField(phone1, 10),
        trimField(phone2, 10),
        trimField(name, 30),
        trimField(post, 50),
        trimField(department, 30),
        trimField(location, 30),
        trimField(status, 30),
        trimField(assignTo, 30),
        experience || 0,
        currentSalary || 0,
        expectedSalary || 0,
        trimField(remark, 30),
        "",
        "",
        false,
        "ADMIN",
        new Date(),
        "ADMIN",
        null,
        docPath || null,
        emailNormalized || null
      ]);

      const fetchResult = await pgPool.query(`
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          remarks1 as remark,
          cur_status as status,
          assign_to as "assignTo",
          email
        FROM resource_mt
        WHERE entry_no = $1
        LIMIT 1
      `, [nextEntryNo]);

      return res.json({
        success: true,
        record: fetchResult.rows[0]
      });
    }

    const genRequest = new sql.Request();
    const genResult = await genRequest.query(`
      SELECT ISNULL(MAX(ENTRY_NO), 0) + 1 AS nextEntryNo FROM RESOURCE_MT
    `);
    const nextEntryNo = genResult.recordset[0].nextEntryNo;

    const request = new sql.Request();

    await request
      .input("ENTRY_NO", sql.Numeric(18,0), nextEntryNo)
      .input("DATEZ", sql.DateTime, entryDate ? new Date(entryDate) : new Date())
      .input("PHONE1", sql.VarChar(10), trimField(phone1, 10))
      .input("PHONE2", sql.VarChar(10), trimField(phone2, 10))
      .input("NAME", sql.VarChar(30), trimField(name, 30))
      .input("POST", sql.VarChar(50), trimField(post, 50))
      .input("DEPARTMENT", sql.VarChar(30), trimField(department, 30))
      .input("LOCATION", sql.VarChar(30), trimField(location, 30))
      .input("CUR_STATUS", sql.Char(30), trimField(status, 30))
      .input("ASSIGN_TO", sql.Char(30), trimField(assignTo, 30))
      .input("EXPERIENCE", sql.Numeric(4,1), experience || 0)
      .input("CUR_SALARY", sql.Numeric(12,3), currentSalary || 0)
      .input("EXP_SALARY", sql.Numeric(12,3), expectedSalary || 0)
      .input("REMARKS1", sql.VarChar(30), trimField(remark, 30))
      .input("REMARKS2", sql.Char(50), "")
      .input("REMARKS3", sql.Char(50), "")
      .input("FR", sql.Bit, 0)
      .input("ADD_USER", sql.Char(40), "ADMIN")
      .input("ADD_DT", sql.DateTime, new Date())
      .input("EDIT_USER", sql.Char(40), "ADMIN")
      .input("EDIT_DT", sql.DateTime, null)
      .input("DOC_PATH", sql.VarChar(500), docPath || "")
      .input("EMAIL", sql.VarChar(100), emailNormalized || null)
      .query(`
        INSERT INTO RESOURCE_MT
        (
          ENTRY_NO, DATEZ, PHONE1, PHONE2, NAME, POST, DEPARTMENT,
          LOCATION, CUR_STATUS, ASSIGN_TO, EXPERIENCE,
          CUR_SALARY, EXP_SALARY,
          REMARKS1, REMARKS2, REMARKS3,
          FR, ADD_USER, ADD_DT, EDIT_USER, EDIT_DT, DOC_PATH, EMAIL
        )
        VALUES
        (
          @ENTRY_NO, @DATEZ, @PHONE1, @PHONE2, @NAME, @POST, @DEPARTMENT,
          @LOCATION, @CUR_STATUS, @ASSIGN_TO, @EXPERIENCE,
          @CUR_SALARY, @EXP_SALARY,
          @REMARKS1, @REMARKS2, @REMARKS3,
          @FR, @ADD_USER, @ADD_DT, @EDIT_USER, @EDIT_DT, @DOC_PATH, @EMAIL
        )
      `);

    const fetchRequest = new sql.Request();
    fetchRequest.input("entryNo", sql.Numeric(18,0), nextEntryNo);
    const fetchResult = await fetchRequest.query(`
      SELECT TOP 1
        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        REMARKS1 as remark,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo,
        EMAIL as email
      FROM RESOURCE_MT
      WHERE ENTRY_NO = @entryNo
    `);

    res.json({
      success: true,
      record: fetchResult.recordset[0]
    });
  } catch (error) {
    console.error("❌ Insert Error:", error.message, error.stack);
    res.status(500).json({ success: false, error: "Failed to insert record: " + error.message });
  }
});

/* ================= API: GET ALL RESOURCES ================= */

app.get("/api/resources", requireAuth(["admin"]), async (req, res) => {
  try {
    const { name, phone, department, search } = req.query;
    
    console.log("🔍 Search request:", { name, phone, department, search });
    
    if (usePostgres) {
      let pgQuery = `
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          remarks1 as remark,
          cur_status as status,
          assign_to as "assignTo"
        FROM resource_mt
        WHERE 1=1
      `;
      const params = [];
      let paramIdx = 1;

      if (search) {
        pgQuery += ` AND (
          LOWER(name) LIKE LOWER($${paramIdx}) OR 
          LOWER(phone1) LIKE LOWER($${paramIdx}) OR
          LOWER(phone2) LIKE LOWER($${paramIdx}) OR
          LOWER(CAST(entry_no AS VARCHAR(50))) LIKE LOWER($${paramIdx})
        )`;
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (name) {
        pgQuery += ` AND LOWER(name) LIKE LOWER($${paramIdx})`;
        params.push(`%${name}%`);
        paramIdx++;
      }

      if (phone) {
        pgQuery += ` AND (LOWER(phone1) LIKE LOWER($${paramIdx}) OR LOWER(phone2) LIKE LOWER($${paramIdx}))`;
        params.push(`%${phone}%`);
        paramIdx++;
      }

      if (department) {
        pgQuery += ` AND LOWER(department) = LOWER($${paramIdx})`;
        params.push(department);
        paramIdx++;
      }

      pgQuery += ` ORDER BY datez DESC LIMIT 100`;

      console.log("📝 Executing pg query:", pgQuery);
      const result = await pgPool.query(pgQuery, params);
      console.log("✅ Found records:", result.rows.length);
      return res.json(result.rows);
    }

    let query = `
      SELECT TOP 100
        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        REMARKS1 as remark,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo
      FROM RESOURCE_MT
      WHERE 1=1
    `;
    
    const request = new sql.Request();
    
    if (search) {
      query += ` AND (
        LOWER(NAME) LIKE LOWER(@search) OR 
        LOWER(PHONE1) LIKE LOWER(@search) OR
        LOWER(PHONE2) LIKE LOWER(@search) OR
        LOWER(CAST(ENTRY_NO AS VARCHAR(50))) LIKE LOWER(@search)
      )`;
      request.input("search", sql.VarChar(100), `%${search}%`);
    }
    
    if (name) {
      query += ` AND LOWER(NAME) LIKE LOWER(@name)`;
      request.input("name", sql.VarChar(100), `%${name}%`);
    }
    
    if (phone) {
      query += ` AND (LOWER(PHONE1) LIKE LOWER(@phone) OR LOWER(PHONE2) LIKE LOWER(@phone))`;
      request.input("phone", sql.VarChar(20), `%${phone}%`);
    }
    
    if (department) {
      query += ` AND LOWER(DEPARTMENT) = LOWER(@department)`;
      request.input("department", sql.VarChar(100), department);
    }
    
    query += ` ORDER BY DATEZ DESC`;
    
    console.log("📝 Executing query:", query);
    
    const result = await request.query(query);
    console.log("✅ Found records:", result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error("❌ Resources Error:", error);
    res.status(500).json({ error: "Failed to fetch resources", details: error.message });
  }
});

/* ================= API: CHECK PHONE DUPLICATE ================= */

app.get("/api/check-phone", requireAuth(["admin"]), async (req, res) => {
  try {
    const { phone, slNo } = req.query;
    
    if (!phone || phone.length !== 10) {
      return res.json({ exists: false, valid: false });
    }
    
    if (usePostgres) {
      let pgQuery = `
        SELECT phone1 AS phone, name, sl_no
        FROM resource_mt
        WHERE (phone1 = $1 OR phone2 = $1)
      `;
      const params = [phone];

      if (slNo) {
        pgQuery += ` AND sl_no != $2`;
        params.push(parseInt(slNo));
      }

      const result = await pgPool.query(pgQuery, params);

      if (result.rows.length > 0) {
        return res.json({
          exists: true,
          valid: true,
          record: result.rows[0]
        });
      } else {
        return res.json({
          exists: false,
          valid: true,
          record: null
        });
      }
    }
    
    const request = new sql.Request();
    
    let query = `
      SELECT PHONE1 AS phone, NAME, SL_NO 
      FROM RESOURCE_MT 
      WHERE (PHONE1 = @phone OR PHONE2 = @phone)
    `;
    
    // If slNo provided (edit mode), exclude that record
    if (slNo) {
      query += ` AND SL_NO != @slNo`;
      request.input("slNo", sql.Int, parseInt(slNo));
    }
    
    request.input("phone", sql.VarChar(10), phone);
    
    const result = await request.query(query);
    
    if (result.recordset.length > 0) {
      res.json({
        exists: true,
        valid: true,
        record: result.recordset[0]
      });
    } else {
      res.json({
        exists: false,
        valid: true,
        record: null
      });
    }
  } catch (error) {
    console.error("Phone check error:", error);
    res.status(500).json({ error: "Failed to check phone" });
  }
});

/* ================= API: SEARCH RESOURCES WITH FILTERS & PAGINATION ================= */

app.get("/api/resources/search", requireAuth(["admin"]), async (req, res) => {
  try {
    const { name, phone1, phone2, post, department, location, status, assignTo, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    if (usePostgres) {
      let pgWhereConditions = [];
      const pgParams = [];
      let pgIdx = 1;

      if (name) {
        pgWhereConditions.push(`(name LIKE $${pgIdx} OR name LIKE $${pgIdx + 1})`);
        pgParams.push(name, `%${name}%`);
        pgIdx += 2;
      }

      if (phone1) {
        pgWhereConditions.push(`phone1 LIKE $${pgIdx}`);
        pgParams.push(`%${phone1}%`);
        pgIdx++;
      }

      if (phone2) {
        pgWhereConditions.push(`phone2 LIKE $${pgIdx}`);
        pgParams.push(`%${phone2}%`);
        pgIdx++;
      }

      if (post) {
        pgWhereConditions.push(`(post LIKE $${pgIdx} OR post LIKE $${pgIdx + 1})`);
        pgParams.push(post, `%${post}%`);
        pgIdx += 2;
      }

      if (department) {
        pgWhereConditions.push(`(department LIKE $${pgIdx} OR department LIKE $${pgIdx + 1})`);
        pgParams.push(department, `%${department}%`);
        pgIdx += 2;
      }

      if (location) {
        pgWhereConditions.push(`(location LIKE $${pgIdx} OR location LIKE $${pgIdx + 1})`);
        pgParams.push(location, `%${location}%`);
        pgIdx += 2;
      }

      if (status) {
        pgWhereConditions.push(`cur_status LIKE $${pgIdx}`);
        pgParams.push(`%${status}%`);
        pgIdx++;
      }

      if (assignTo) {
        pgWhereConditions.push(`assign_to LIKE $${pgIdx}`);
        pgParams.push(`%${assignTo}%`);
        pgIdx++;
      }

      const pgWhereClause = pgWhereConditions.length > 0 ? pgWhereConditions.join(" AND ") : "1=1";

      // Count query for postgres
      const countParams = [...pgParams];
      const countResult = await pgPool.query(
        `SELECT COUNT(*) as total FROM resource_mt WHERE ${pgWhereClause}`,
        countParams
      );
      const totalRecords = parseInt(countResult.rows[0].total);

      // Data query for postgres
      const dataResult = await pgPool.query(`
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          remarks1 as remark,
          cur_status as status,
          assign_to as "assignTo"
        FROM resource_mt
        WHERE ${pgWhereClause}
        ORDER BY entry_no DESC
        LIMIT $${pgIdx} OFFSET $${pgIdx + 1}
      `, [...pgParams, limitNum, offset]);

      return res.json({
        records: dataResult.rows,
        total: totalRecords,
        page: pageNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        limit: limitNum
      });
    }
    
    const request = new sql.Request();
    
    let whereConditions = [];
    
    if (name) {
      whereConditions.push("(NAME LIKE @name OR NAME LIKE @nameWildcard)");
      request.input("name", sql.VarChar(100), name);
      request.input("nameWildcard", sql.VarChar(100), `%${name}%`);
    }
    
    if (phone1) {
      whereConditions.push("PHONE1 LIKE @phone1");
      request.input("phone1", sql.VarChar(20), `%${phone1}%`);
    }
    
    if (phone2) {
      whereConditions.push("PHONE2 LIKE @phone2");
      request.input("phone2", sql.VarChar(20), `%${phone2}%`);
    }
    
    if (post) {
      whereConditions.push("(POST LIKE @post OR POST LIKE @postWildcard)");
      request.input("post", sql.VarChar(100), post);
      request.input("postWildcard", sql.VarChar(100), `%${post}%`);
    }
    
    if (department) {
      whereConditions.push("(DEPARTMENT LIKE @department OR DEPARTMENT LIKE @deptWildcard)");
      request.input("department", sql.VarChar(100), department);
      request.input("deptWildcard", sql.VarChar(100), `%${department}%`);
    }
    
    if (location) {
      whereConditions.push("(LOCATION LIKE @location OR LOCATION LIKE @locWildcard)");
      request.input("location", sql.VarChar(200), location);
      request.input("locWildcard", sql.VarChar(200), `%${location}%`);
    }
    
    if (status) {
      whereConditions.push("CUR_STATUS LIKE @status");
      request.input("status", sql.VarChar(30), `%${status}%`);
    }
    
    if (assignTo) {
      whereConditions.push("ASSIGN_TO LIKE @assignTo");
      request.input("assignTo", sql.VarChar(30), `%${assignTo}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? whereConditions.join(" AND ") : "1=1";
    
    const countRequest = new sql.Request();
    if (name) { countRequest.input("name", sql.VarChar(100), name); countRequest.input("nameWildcard", sql.VarChar(100), `%${name}%`); }
    if (phone1) countRequest.input("phone1", sql.VarChar(20), `%${phone1}%`);
    if (phone2) countRequest.input("phone2", sql.VarChar(20), `%${phone2}%`);
    if (post) { countRequest.input("post", sql.VarChar(100), post); countRequest.input("postWildcard", sql.VarChar(100), `%${post}%`); }
    if (department) { countRequest.input("department", sql.VarChar(100), department); countRequest.input("deptWildcard", sql.VarChar(100), `%${department}%`); }
    if (location) { countRequest.input("location", sql.VarChar(200), location); countRequest.input("locWildcard", sql.VarChar(200), `%${location}%`); }
    if (status) countRequest.input("status", sql.VarChar(30), `%${status}%`);
    if (assignTo) countRequest.input("assignTo", sql.VarChar(30), `%${assignTo}%`);
    
    const countQuery = `SELECT COUNT(*) as total FROM RESOURCE_MT WHERE ${whereClause}`;
    const countResult = await countRequest.query(countQuery);
    const totalRecords = countResult.recordset[0].total;



const dataQuery = `
WITH Result AS (
    SELECT
        ROW_NUMBER() OVER (ORDER BY ENTRY_NO DESC) AS RowNum,

        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        REMARKS1 as remark,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo

    FROM RESOURCE_MT
    WHERE ${whereClause}
)

SELECT *
FROM Result
WHERE RowNum BETWEEN ${offset + 1} AND ${offset + limitNum}
ORDER BY RowNum;
`;
    
    const dataResult = await request.query(dataQuery);
    
    res.json({
      records: dataResult.recordset,
      total: totalRecords,
      page: pageNum,
      totalPages: Math.ceil(totalRecords / limitNum),
      limit: limitNum
    });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Failed to search resources" });
  }
});

/* ================= API: GET SINGLE RESOURCE ================= */

app.get("/api/resources/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Fetching resource by ID:", id);
    
    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          remarks1 as remark,
          cur_status as status,
          assign_to as "assignTo",
          email
        FROM resource_mt
        WHERE sl_no = $1
      `, [parseInt(id)]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Record not found" });
      }

      console.log("✅ Found resource:", result.rows[0]);
      return res.json(result.rows[0]);
    }
    
    const request = new sql.Request();
    request.input("id", sql.Int, parseInt(id));
    
    const result = await request.query(`
      SELECT 
        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        REMARKS1 as remark,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo,
        EMAIL as email
      FROM RESOURCE_MT
      WHERE SL_NO = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }
    
    console.log("✅ Found resource:", result.recordset[0]);
    res.json(result.recordset[0]);
  } catch (error) {
    console.error("❌ Get Resource Error:", error);
    res.status(500).json({ error: "Failed to fetch resource", details: error.message });
  }
});

/* ================= API: UPLOAD CV/DOCUMENT ================= */

app.post("/api/resources/upload", requireAuth(["admin"]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    console.log("📄 File uploaded:", filePath);
    
    res.json({ 
      success: true, 
      docPath: filePath,
      fileName: req.file.originalname,
      message: "File uploaded successfully"
    });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: "Failed to upload file", details: error.message });
  }
});

/* ================= API: UPDATE RESOURCE ================= */

app.put("/api/resources/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const raw = req.body;
    const data = sanitizeFields(raw);
    const { name, phone1, phone2, post, department, location, docPath, experience, currentSalary, expectedSalary, remark, status, assignTo, email } = data;
    const emailNormalized = email ? String(email).trim().toLowerCase() : "";
    
    console.log("🔄 Updating resource ID:", id, { name, post, department, docPath, experience, currentSalary, expectedSalary, remark, status, assignTo, email });
    
    if (usePostgres) {
      let pgQuery = `
        UPDATE resource_mt
        SET
          name = $1,
          phone1 = $2,
          phone2 = $3,
          post = $4,
          department = $5,
          location = $6,
          experience = $7,
          cur_salary = $8,
          exp_salary = $9,
          remarks1 = $10,
          cur_status = $11,
          assign_to = $12,
          email = $13
      `;
      const pgParams = [
        trimField(name, 30),
        trimField(phone1, 10),
        trimField(phone2, 10),
        trimField(post, 50),
        trimField(department, 30),
        trimField(location, 30),
        experience || 0,
        currentSalary || 0,
        expectedSalary || 0,
        trimField(remark, 30),
        trimField(status, 30),
        trimField(assignTo, 30),
        emailNormalized || null
      ];

      if (docPath !== undefined) {
        pgQuery += `, doc_path = $14`;
        pgParams.push(docPath || null);
      }

      pgQuery += ` WHERE sl_no = $${pgParams.length + 1}`;
      pgParams.push(parseInt(id));

      await pgPool.query(pgQuery, pgParams);

      console.log("✅ Resource updated successfully");
      return res.json({ success: true, message: "Resource updated" });
    }
    
    const request = new sql.Request();
    
    let query = `
      UPDATE RESOURCE_MT 
      SET 
        NAME = @NAME,
        PHONE1 = @PHONE1,
        PHONE2 = @PHONE2,
        POST = @POST,
        DEPARTMENT = @DEPARTMENT,
        LOCATION = @LOCATION,
        EXPERIENCE = @EXPERIENCE,
        CUR_SALARY = @CUR_SALARY,
        EXP_SALARY = @EXP_SALARY,
        REMARKS1 = @REMARKS1,
        CUR_STATUS = @CUR_STATUS,
        ASSIGN_TO = @ASSIGN_TO,
        EMAIL = @EMAIL
    `;
    
    if (docPath !== undefined) {
      query += `, DOC_PATH = @DOC_PATH`;
      request.input("DOC_PATH", sql.VarChar(500), docPath || "");
    }
    
    query += ` WHERE SL_NO = @SL_NO`;
    
    await request
      .input("SL_NO", sql.Int, parseInt(id))
      .input("NAME", sql.VarChar(30), trimField(name, 30))
      .input("PHONE1", sql.VarChar(10), trimField(phone1, 10))
      .input("PHONE2", sql.VarChar(10), trimField(phone2, 10))
      .input("POST", sql.VarChar(50), trimField(post, 50))
      .input("DEPARTMENT", sql.VarChar(30), trimField(department, 30))
      .input("LOCATION", sql.VarChar(30), trimField(location, 30))
      .input("EXPERIENCE", sql.Numeric(4,1), experience || 0)
      .input("CUR_SALARY", sql.Numeric(12,3), currentSalary || 0)
      .input("EXP_SALARY", sql.Numeric(12,3), expectedSalary || 0)
      .input("REMARKS1", sql.VarChar(30), trimField(remark, 30))
      .input("CUR_STATUS", sql.Char(30), trimField(status, 30))
      .input("ASSIGN_TO", sql.Char(30), trimField(assignTo, 30))
      .input("EMAIL", sql.VarChar(100), emailNormalized || null)
      .query(query);
    
    console.log("✅ Resource updated successfully");
    res.json({ success: true, message: "Resource updated" });
  } catch (error) {
    console.error("❌ Update Error:", error);
    res.status(500).json({ success: false, error: "Failed to update resource", details: error.message });
  }
});

/* ================= API: TEST DB CONNECTION ================= */

app.get("/api/test", requireAuth(["admin"]), async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pgPool.query(`SELECT * FROM resource_mt LIMIT 5`);
      console.log("✅ Test query successful, rows:", result.rows.length);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    const request = new sql.Request();
    const result = await request.query(`SELECT TOP 5 * FROM RESOURCE_MT`);
    console.log("✅ Test query successful, rows:", result.recordset.length);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (error) {
    console.error("❌ Test query failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ================= API: GET DEPARTMENTS ================= */

app.get("/api/departments", requireAuth(["admin"]), async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT DISTINCT department AS name
        FROM resource_mt
        WHERE department IS NOT NULL AND department != ''
        ORDER BY department
      `);
      return res.json(result.rows);
    }

    const request = new sql.Request();
    const result = await request.query(`
      SELECT DISTINCT DEPARTMENT as name 
      FROM resource_mt 
      WHERE DEPARTMENT IS NOT NULL AND DEPARTMENT != ''
      ORDER BY DEPARTMENT
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Departments Error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

/* ================= CV PARSE ROUTE ================= */

async function extractTextFromPDF(fileBuffer) {
  try {
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const data = await pdfParse(buffer);
    return data?.text || "";
  } catch (error) {
    console.error("PDF parsing error:", error.message);
    return null;
  }
}

async function extractTextWithOCR(fileBuffer) {
  try {
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid file buffer");
    }
    
    const Tesseract = require("tesseract.js");
    const { fromBuffer } = require("pdf2pic");
    
    console.log("Converting PDF to image for OCR...");
    
    const convert = fromBuffer(buffer, {
      density: 150,
      saveFilename: `ocr-${Date.now()}`,
      savePath: path.join(__dirname, "uploads"),
      format: "png",
      width: 1200,
      height: 1600
    });
    
    const page = await convert(1, { responseType: "image" });
    
    if (!page || !page.path) {
      throw new Error("PDF to image conversion failed");
    }
    
    console.log("Running OCR on image:", page.path);
    const { data } = await Tesseract.recognize(page.path, "eng");
    
    if (fs.existsSync(page.path)) {
      fs.unlinkSync(page.path);
    }
    
    return data?.text || "";
  } catch (error) {
    console.error("OCR error:", error.message);
    return null;
  }
}

app.post("/parse-cv", requireAuth(["admin"]), upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", req.file.originalname, req.file.mimetype, "Size:", req.file.size);

    const fileBuffer = fs.readFileSync(req.file.path);
    const ext = path.extname(req.file.originalname).toLowerCase();
    let extractedText = "";

    if (ext === ".pdf") {
      extractedText = await extractTextFromPDF(fileBuffer);
      console.log("PDF-parse extracted text length:", extractedText?.length || 0);
      
      if (!extractedText || !extractedText.trim()) {
        console.log("PDF returned empty text, trying OCR fallback...");
        extractedText = await extractTextWithOCR(fileBuffer);
        
        if (!extractedText || !extractedText.trim()) {
          return res.status(400).json({ error: "Scanned PDF detected - no readable text found. Please upload a text-based PDF or a scanned PDF with clear text." });
        }
        console.log("OCR extracted text length:", extractedText.length);
      }
    } else if (ext === ".doc" || ext === ".docx") {
      extractedText = fileBuffer.toString("utf-8");
    }

    console.log("Extracted text length:", extractedText.length);

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "No readable text found in PDF" });
    }

    const promptText = `
You are a resume data extraction system.

Extract and return STRICT JSON only in this exact format:

{
  "name": "",
  "email": "",
  "phone": "",
  "post": "",
  "department": "",
  "location": "",
  "experience_years": 0,
  "skills": [],
  "remarks": ""
}

Rules:
- post = most recent job title
- department = field of work (Merchandising, IT, HR, etc.)
- location = full address
- experience_years = total years as NUMBER
- skills = professional skills array
- If missing return empty string or 0
- DO NOT return markdown
- ONLY return JSON
- make the remarks column empty do not fill anything in it
- remarks column should only have 50 characters not more than 
- only last 10 characters of the phone number should be there and without any space,special characters or alphabets not +91 should be there start from the actual number.
-dont make any field more than the specific length  that is :
  NAME	char(30)	Unchecked
  POST	char(50)	Unchecked
  DEPARTMENT	char(30)	Unchecked
  LOCATION	char(30)	Unchecked
  remarks1   char(50) 
`;

    const result = await model.generateContent([
      { text: extractedText },
      { text: promptText }
    ]);

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    console.log("Raw Gemini response length:", text.length);

    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return res.status(400).json({ error: "Failed to parse CV data. Response was not valid JSON.", raw: text });
    }

    const sanitized = sanitizeGeminiResponse(parsed);
    res.json(sanitized);

  } catch (error) {
    console.error("CV Parse Error:", error.message);
    if (error.message && error.message.includes("400")) {
      res.status(400).json({ error: "Invalid file format or file too large for Gemini API" });
    } else if (error.message && error.message.includes("403")) {
      res.status(403).json({ error: "Gemini API key invalid or quota exceeded" });
    } else {
      res.status(500).json({ error: "Failed to parse CV: " + error.message });
    }
  }
});

/* ================= INSERT INTO SQL ================= */

app.post("/insert-candidate", requireAuth(["admin"]), async (req, res) => {

  try {

    const raw = req.body;
    const data = sanitizeFields(raw);
    const {
      entryDate,
      mobile,
      altMobile,
      name,
      post,
      department,
      location,
      status,
      assignTo,
      experience,
      currentSalary,
      expectedSalary,
      remark,
      docPath
    } = data;

    if (usePostgres) {
      const genResult = await pgPool.query(`
        SELECT COALESCE(MAX(entry_no), 0) + 1 AS "nextEntryNo" FROM resource_mt
      `);
      const nextEntryNo = genResult.rows[0].nextEntryNo;

      await pgPool.query(`
        INSERT INTO resource_mt
        (
          entry_no, datez, phone1, phone2, name, post, department,
          location, cur_status, assign_to, experience,
          cur_salary, exp_salary,
          remarks1, remarks2, remarks3,
          fr, add_user, add_dt, edit_user, edit_dt, doc_path
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13,
          $14, $15, $16,
          $17, $18, $19, $20, $21, $22
        )
      `, [
        nextEntryNo,
        entryDate ? new Date(entryDate) : new Date(),
        trimField(mobile, 10),
        trimField(altMobile || mobile, 10),
        trimField(name, 30),
        trimField(post, 50),
        trimField(department, 30),
        trimField(location, 30),
        trimField(status, 30),
        trimField(assignTo, 30),
        experience || 0,
        currentSalary || 0,
        expectedSalary || 0,
        trimField(remark, 30),
        "",
        "",
        false,
        "NAVEEN",
        new Date(),
        "ADMIN",
        null,
        docPath || null
      ]);

      const fetchResult = await pgPool.query(`
        SELECT
          sl_no as "slNo",
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as datez,
          phone1,
          phone2,
          name,
          post,
          department,
          location,
          doc_path as "docPath",
          experience,
          cur_salary as "currentSalary",
          exp_salary as "expectedSalary",
          remarks1 as remark,
          cur_status as status,
          assign_to as "assignTo"
        FROM resource_mt
        WHERE entry_no = $1
        LIMIT 1
      `, [nextEntryNo]);

      return res.json({
        success: true,
        message: "Candidate inserted successfully",
        entryNo: nextEntryNo,
        record: fetchResult.rows[0]
      });
    }

    // Auto-generate ENTRY_NO
    const genRequest = new sql.Request();
    const genResult = await genRequest.query(`
      SELECT ISNULL(MAX(ENTRY_NO), 0) + 1 AS nextEntryNo FROM RESOURCE_MT
    `);
    const nextEntryNo = genResult.recordset[0].nextEntryNo;

    const request = new sql.Request();

    await request
      .input("ENTRY_NO", sql.Numeric(18,0), nextEntryNo)
      .input("DATEZ", sql.DateTime, entryDate ? new Date(entryDate) : new Date())
      .input("PHONE1", sql.VarChar(10), trimField(mobile, 10))
      .input("PHONE2", sql.VarChar(10), trimField(altMobile || mobile, 10))
      .input("NAME", sql.VarChar(30), trimField(name, 30))
      .input("POST", sql.VarChar(50), trimField(post, 50))
      .input("DEPARTMENT", sql.VarChar(30), trimField(department, 30))
      .input("LOCATION", sql.VarChar(30), trimField(location, 30))
      .input("CUR_STATUS", sql.Char(30), trimField(status, 30))
      .input("ASSIGN_TO", sql.Char(30), trimField(assignTo, 30))
      .input("EXPERIENCE", sql.Numeric(4,1), experience || 0)
      .input("CUR_SALARY", sql.Numeric(12,3), currentSalary || 0)
      .input("EXP_SALARY", sql.Numeric(12,3), expectedSalary || 0)
      .input("REMARKS1", sql.VarChar(30), trimField(remark, 30))
      .input("REMARKS2", sql.Char(50), "")
      .input("REMARKS3", sql.Char(50), "")
      .input("FR", sql.Bit, 0)
      .input("ADD_USER", sql.Char(40), "NAVEEN")
      .input("ADD_DT", sql.DateTime, new Date())
      .input("EDIT_USER", sql.Char(40), "ADMIN")
      .input("EDIT_DT", sql.DateTime, null)
      .input("DOC_PATH", sql.VarChar(500), docPath || "")
      .query(`
        INSERT INTO RESOURCE_MT
        (
          ENTRY_NO, DATEZ, PHONE1, PHONE2, NAME, POST, DEPARTMENT,
          LOCATION, CUR_STATUS, ASSIGN_TO, EXPERIENCE,
          CUR_SALARY, EXP_SALARY,
          REMARKS1, REMARKS2, REMARKS3,
          FR, ADD_USER, ADD_DT, EDIT_USER, EDIT_DT, DOC_PATH
        )
        VALUES
        (
          @ENTRY_NO, @DATEZ, @PHONE1, @PHONE2, @NAME, @POST, @DEPARTMENT,
          @LOCATION, @CUR_STATUS, @ASSIGN_TO, @EXPERIENCE,
          @CUR_SALARY, @EXP_SALARY,
          @REMARKS1, @REMARKS2, @REMARKS3,
          @FR, @ADD_USER, @ADD_DT, @EDIT_USER, @EDIT_DT, @DOC_PATH
        )
      `);

    // Fetch the inserted record
    const fetchRequest = new sql.Request();
    fetchRequest.input("slNo", sql.Int, nextEntryNo);
    const fetchResult = await fetchRequest.query(`
      SELECT TOP 1 
        SL_NO as slNo,
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as datez,
        PHONE1 as phone1,
        PHONE2 as phone2,
        NAME as name,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        DOC_PATH as docPath,
        EXPERIENCE as experience,
        CUR_SALARY as currentSalary,
        EXP_SALARY as expectedSalary,
        REMARKS1 as remark,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo
      FROM RESOURCE_MT
      WHERE ENTRY_NO = @slNo
    `);

    res.json({
      success: true,
      message: "Candidate inserted successfully",
      entryNo: nextEntryNo,
      record: fetchResult.recordset[0]
    });

  } catch (error) {

    console.error("Insert Error:", error);

    res.status(500).json({
      success: false,
      error: "Insert failed: " + error.message
    });

  }

});

/* ================= GET ALL CANDIDATES (Legacy) ================= */

app.get("/get-candidates", requireAuth(["admin"]), async (req, res) => {
  try {
    if (usePostgres) {
      const result = await pgPool.query(`
        SELECT
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as "entryDate",
          name,
          phone1 as mobile,
          post,
          department,
          location,
          cur_status as status,
          assign_to as "assignTo",
          remarks1 as remark
        FROM resource_mt
        ORDER BY datez DESC
        LIMIT 100
      `);
      return res.json(result.rows);
    }

    const request = new sql.Request();
    const result = await request.query(`
      SELECT TOP 100 
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as entryDate,
        NAME as name,
        PHONE1 as mobile,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo,
        REMARKS1 as remark
      FROM RESOURCE_MT
      ORDER BY DATEZ DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Get Candidates Error:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

/* ================= SEARCH CANDIDATES (Legacy) ================= */

app.get("/search-candidates", requireAuth(["admin"]), async (req, res) => {
  try {
    const { q, department, status } = req.query;

    if (usePostgres) {
      let pgQuery = `
        SELECT
          entry_no as "entryNo",
          to_char(datez, 'YYYY-MM-DD') as "entryDate",
          name,
          phone1 as mobile,
          post,
          department,
          location,
          cur_status as status,
          assign_to as "assignTo",
          remarks1 as remark
        FROM resource_mt
        WHERE 1=1
      `;
      const pgParams = [];
      let pgIdx = 1;

      if (q) {
        pgQuery += ` AND (
          name LIKE $${pgIdx} OR
          CAST(entry_no AS VARCHAR) LIKE $${pgIdx}
        )`;
        pgParams.push(`%${q}%`);
        pgIdx++;
      }

      if (department) {
        pgQuery += ` AND department = $${pgIdx}`;
        pgParams.push(department);
        pgIdx++;
      }

      if (status) {
        pgQuery += ` AND cur_status = $${pgIdx}`;
        pgParams.push(status);
        pgIdx++;
      }

      pgQuery += ` ORDER BY datez DESC LIMIT 100`;

      const result = await pgPool.query(pgQuery, pgParams);
      return res.json(result.rows);
    }

    let query = `
      SELECT TOP 100 
        ENTRY_NO as entryNo,
        CONVERT(varchar, DATEZ, 23) as entryDate,
        NAME as name,
        PHONE1 as mobile,
        POST as post,
        DEPARTMENT as department,
        LOCATION as location,
        CUR_STATUS as status,
        ASSIGN_TO as assignTo,
        REMARKS1 as remark
      FROM RESOURCE_MT
      WHERE 1=1
    `;
    
    const request = new sql.Request();
    
    if (q) {
      query += ` AND (
        NAME LIKE @search OR 
        ENTRY_NO LIKE @search OR
        CAST(ENTRY_NO AS VARCHAR) LIKE @search
      )`;
      request.input("search", sql.VarChar(100), `%${q}%`);
    }
    
    if (department) {
      query += ` AND DEPARTMENT = @department`;
      request.input("department", sql.VarChar(100), department);
    }
    
    if (status) {
      query += ` AND CUR_STATUS = @status`;
      request.input("status", sql.Char(30), status);
    }
    
    query += ` ORDER BY DATEZ DESC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Failed to search candidates" });
  }
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 90;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running at http://0.0.0.0:${PORT}`);
});
