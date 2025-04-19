const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../Uploads');
if (!fs.existsSync(uploadDir)) {
  console.log('[INFO] Creating Uploads directory:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
} else {
  console.log('[INFO] Uploads directory exists:', uploadDir);
}

// Verify directory permissions
try {
  fs.accessSync(uploadDir, fs.constants.W_OK);
  console.log('[INFO] Uploads directory is writable');
} catch (error) {
  console.error('[ERROR] Uploads directory is not writable:', error.message);
}

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/pdf',
  'application/msword',
  'audio/mpeg',
  'text/plain',
];

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[INFO] Setting upload destination:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileName = `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('[INFO] Generating filename:', fileName);
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file) {
      console.log('[INFO] No file provided, allowing for text content');
      return cb(null, true);
    }
    if (allowedTypes.includes(file.mimetype)) {
      console.log('[INFO] Accepted file:', {
        name: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      cb(null, true);
    } else {
      console.warn('[WARN] Rejected file:', {
        name: file.originalname,
        mimetype: file.mimetype,
      });
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB limit
}).single('file');

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('[ERROR] Multer error:', err.message);
      return res.status(400).json({ message: err.message });
    }
    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        console.log('[INFO] File saved successfully:', {
          filePath,
          size: req.file.size,
          originalName: req.file.originalname,
        });
      } else {
        console.error('[ERROR] File not found after upload:', filePath);
        return res.status(500).json({ message: 'Failed to save file to server' });
      }
    } else {
      console.log('[INFO] No file uploaded, proceeding with text content if provided');
    }
    next();
  });
};