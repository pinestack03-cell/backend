require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const sql = require("mssql");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const fs = require("fs");
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

const app = express();
app.use(cors({
  origin: ["https://my-app.vercel.app", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

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

app.use("/uploads", express.static(uploadsDir));

/* ================= GEMINI SETUP ================= */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

/* ================= SQL SERVER CONFIG ================= */

const dbConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "EMTserver@",
  server: process.env.DB_SERVER || "192.168.29.140",
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || "GLOBE1",
  options: {  
    trustServerCertificate: true,
    encrypt: false
  }
};

/* ================= SQL CONNECTION ================= */

sql.connect(dbConfig)
  .then(() => {
    console.log("✅ SQL Server Connected to", dbConfig.database);
  })
  .catch(err => {
    console.error("❌ SQL Connection Error:", err);
  });

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend API is running",
    endpoints: {
      GET: [
        "/api - API info",
        "/api/resources - Get all resources",
        "/api/resources/latest - Get latest resource",
        "/api/resources/next-entry - Get next entry number",
        "/api/resources/:id - Get resource by ID",
        "/api/resources/search - Search resources with filters",
        "/api/check-phone - Check phone duplicate",
        "/api/departments - Get all departments",
        "/api/test - Database test"
      ],
      POST: [
        "/api/resources - Create new resource",
        "/api/resources/upload - Upload file",
        "/parse-cv - Parse CV PDF",
        "/insert-candidate - Insert candidate"
      ],
      PUT: [
        "/api/resources/:id - Update resource"
      ]
    }
  });
});

/* ================= API: GET LATEST RECORD ================= */

app.get("/api/resources/latest", async (req, res) => {
  try {
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
        ASSIGN_TO as assignTo
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

app.get("/api/resources/next-entry", async (req, res) => {
  try {
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

app.post("/api/resources", async (req, res) => {
  try {
    const raw = req.body;
    const data = sanitizeFields(raw);
    const { name, phone1, phone2, post, department, location, docPath, experience, currentSalary, expectedSalary, remark, status, assignTo, entryDate } = data;

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
      .input("DOC_PATH", sql.VarChar(500), docPath || null)
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
        ASSIGN_TO as assignTo
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

app.get("/api/resources", async (req, res) => {
  try {
    const { name, phone, department, search } = req.query;
    
    console.log("🔍 Search request:", { name, phone, department, search });
    
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

app.get("/api/check-phone", async (req, res) => {
  try {
    const { phone, slNo } = req.query;
    
    if (!phone || phone.length !== 10) {
      return res.json({ exists: false, valid: false });
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

app.get("/api/resources/search", async (req, res) => {
  try {
    const { name, phone1, phone2, post, department, location, status, assignTo, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    
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
        ASSIGN_TO as assignTo
      FROM RESOURCE_MT
      WHERE ${whereClause}
      ORDER BY ENTRY_NO DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
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

app.get("/api/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Fetching resource by ID:", id);
    
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
        ASSIGN_TO as assignTo
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

app.post("/api/resources/upload", upload.single("file"), async (req, res) => {
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

app.put("/api/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const raw = req.body;
    const data = sanitizeFields(raw);
    const { name, phone1, phone2, post, department, location, docPath, experience, currentSalary, expectedSalary, remark, status, assignTo } = data;
    
    console.log("🔄 Updating resource ID:", id, { name, post, department, docPath, experience, currentSalary, expectedSalary, remark, status, assignTo });
    
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
        ASSIGN_TO = @ASSIGN_TO
    `;
    
    if (docPath !== undefined) {
      query += `, DOC_PATH = @DOC_PATH`;
      request.input("DOC_PATH", sql.VarChar(500), docPath || null);
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
      .query(query);
    
    console.log("✅ Resource updated successfully");
    res.json({ success: true, message: "Resource updated" });
  } catch (error) {
    console.error("❌ Update Error:", error);
    res.status(500).json({ success: false, error: "Failed to update resource", details: error.message });
  }
});

/* ================= API: TEST DB CONNECTION ================= */

app.get("/api/test", async (req, res) => {
  try {
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

app.get("/api/departments", async (req, res) => {
  try {
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

app.post("/parse-cv", upload.single("cv"), async (req, res) => {
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

app.post("/insert-candidate", async (req, res) => {

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
      .input("DOC_PATH", sql.VarChar(500), docPath || null)
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

app.get("/get-candidates", async (req, res) => {
  try {
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

app.get("/search-candidates", async (req, res) => {
  try {
    const { q, department, status } = req.query;
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on https://backend-onbf.onrender.com`);
});
