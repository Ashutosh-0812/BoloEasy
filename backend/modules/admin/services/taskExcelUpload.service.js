const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

const excelUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isExcelFile = extension === ".xlsx" || extension === ".xls";
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (isExcelFile && isAllowedMime) {
      cb(null, true);
      return;
    }

    cb(new Error("Only Excel files (.xlsx or .xls) are accepted."), false);
  },
});

module.exports = excelUpload;
