const multer = require("multer");
const path = require("path");
const fs = require("fs");

const crypto = require("crypto");

// Ensure uploads directories exist
const uploadDir = path.join(__dirname, "../public/uploads");
const docDir = path.join(__dirname, "../public/uploads/docs");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(docDir)) {
    fs.mkdirSync(docDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images (jpeg, jpg, png, gif, webp) are allowed!"));
    }
});

// Document upload for vendor licenses/certificates (PDF, JPG, PNG up to 5MB)
const docStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, docDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + "-" + crypto.randomUUID();
        cb(null, "doc-" + uniqueSuffix + ext);
    }
});

const uploadDoc = multer({
    storage: docStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedExts = /jpeg|jpg|png|pdf/;
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const allowedMime = /image\/(jpeg|png)|application\/pdf/;
        if (allowedExts.test(ext) && allowedMime.test(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error("Only PDF, JPG, and PNG documents up to 5MB are allowed!"));
    }
});

upload.uploadDoc = uploadDoc;

module.exports = upload;
