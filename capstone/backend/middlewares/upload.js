const multer = require("multer");

// Keep the file in memory (req.file.buffer), no temp files on disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") return cb(new Error("File must be a PDF"));
        cb(null, true);
    },
})

module.exports = upload;
