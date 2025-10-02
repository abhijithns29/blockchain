const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create GridFS bucket
let gridfsBucket;

const initGridFS = () => {
  try {
    // Create GridFS bucket
    gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    console.log("✅ GridFS initialized successfully");
    return { gridfsBucket };
  } catch (error) {
    console.error("❌ GridFS initialization failed:", error);
    throw error;
  }
};

// Create uploads directory if it doesn't exist
const uploadPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("✅ Created uploads directory:", uploadPath);
}

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "image/svg+xml",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, JPG, PNG, GIF, WebP, BMP, TIFF, and SVG files are allowed."
        )
      );
    }
  },
});

// Helper function to upload file to GridFS
const uploadToGridFS = async (filePath, filename) => {
  try {
    const uploadStream = gridfsBucket.openUploadStream(filename);
    const fileStream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
      fileStream.pipe(uploadStream);
      uploadStream.on("error", reject);
      uploadStream.on("finish", () => {
        console.log(`✅ File uploaded to GridFS: ${filename}`);
        resolve(filename);
      });
    });
  } catch (error) {
    console.error("Error uploading to GridFS:", error);
    throw error;
  }
};

// Helper function to get file stream
const getFileStream = (filename) => {
  try {
    return gridfsBucket.openDownloadStreamByName(filename);
  } catch (error) {
    console.error("Error creating file stream:", error);
    return null;
  }
};

// Helper function to delete file
const deleteFile = async (filename) => {
  try {
    const files = await gridfsBucket.find({ filename: filename }).toArray();
    if (files.length > 0) {
      await gridfsBucket.delete(files[0]._id);
      console.log("✅ File deleted:", filename);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

module.exports = {
  initGridFS,
  upload,
  uploadToGridFS,
  getFileStream,
  deleteFile,
  gridfsBucket: () => gridfsBucket,
};
