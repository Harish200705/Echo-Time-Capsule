const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const capsuleHandler = require('../handlers/capsule-handler');
const upload = require('../middleware/capsule-upload.middleware');
const path = require('path');
const fs = require('fs');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.warn('[WARN] Access token missing');
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, 'secret', (err, user) => {
    if (err) {
      console.warn('[WARN] Invalid token', { error: err.message });
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Utility function to determine file type
const getFileType = (mimetype, fileName) => {
  switch (mimetype) {
    case 'image/jpeg':
    case 'image/png':
      return 'image';
    case 'video/mp4':
      return 'video';
    case 'application/pdf':
      return 'pdf';
    case 'application/msword':
      return 'doc';
    case 'audio/mpeg':
      return 'mp3';
    case 'text/plain':
      return 'text';
    default:
      return null;
  }
};

// POST /api/capsules/upload
router.post('/upload', authenticateToken, upload, async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    const { capsuleName, scheduledOpenDate, isPublic, password, textContent } = req.body;

    console.log('[INFO] POST /api/capsules/upload request', {
      userId,
      capsuleName,
      file: file
        ? { name: file.originalname, size: file.size, mimetype: file.mimetype, path: file.path }
        : 'none',
      scheduledOpenDate,
      isPublic,
      hasPassword: !!password,
      textContent: textContent ? `${textContent.substring(0, 50)}...` : 'none',
    });

    if (!capsuleName || !capsuleName.trim()) {
      console.warn('[WARN] Capsule name is required');
      return res.status(400).json({ message: 'Capsule name is required' });
    }

    const trimmedTextContent = textContent ? textContent.trim() : '';
    if (!file && !trimmedTextContent) {
      console.warn('[WARN] No file or text content provided');
      return res.status(400).json({ message: 'At least one of file or non-empty text content is required' });
    }

    let fileType, fileName, fileSize, filePath;
    if (!file && trimmedTextContent) {
      fileName = `text-${Date.now()}.txt`;
      fileType = 'text';
      fileSize = Buffer.from(trimmedTextContent, 'utf-8').length;
      filePath = path.join(__dirname, '../Uploads', fileName);
      console.log('[INFO] Creating synthetic text file', { fileName, fileSize, filePath });
      fs.writeFileSync(filePath, trimmedTextContent);
      if (!fs.existsSync(filePath)) {
        console.error('[ERROR] Text file not created:', filePath);
        return res.status(500).json({ message: 'Failed to create text file' });
      }
    } else if (file) {
      fileName = file.originalname;
      fileSize = file.size;
      fileType = getFileType(file.mimetype, fileName);
      filePath = file.path;
      if (!fileType) {
        console.warn('[WARN] Unsupported file type', { mimetype: file.mimetype });
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      console.log('[INFO] File uploaded', { fileName, fileSize, fileType, filePath });
      if (!fs.existsSync(filePath)) {
        console.error('[ERROR] Uploaded file not found:', filePath);
        return res.status(500).json({ message: 'Uploaded file not found on server' });
      }
    }

    let parsedScheduledOpenDate = null;
    if (scheduledOpenDate) {
      parsedScheduledOpenDate = new Date(scheduledOpenDate);
      if (isNaN(parsedScheduledOpenDate.getTime())) {
        console.warn('[WARN] Invalid scheduledOpenDate', { scheduledOpenDate });
        return res.status(400).json({ message: 'Invalid scheduledOpenDate format' });
      }
      if (parsedScheduledOpenDate <= new Date()) {
        console.warn('[WARN] scheduledOpenDate is not in the future', { scheduledOpenDate });
        return res.status(400).json({ message: 'scheduledOpenDate must be in the future' });
      }
    }

    const isPublicBool = isPublic === 'true' || isPublic === true;

    const capsuleData = {
      userId,
      capsuleName: capsuleName.trim(),
      filePath,
      fileType,
      fileName,
      fileSize,
      scheduledOpenDate: parsedScheduledOpenDate,
      isPublic: isPublicBool,
      password: password || undefined,
      textContent: fileType === 'text' && trimmedTextContent ? trimmedTextContent : undefined,
    };

    console.log('[INFO] Saving capsule data', {
      userId,
      capsuleName: capsuleData.capsuleName,
      fileName,
      fileType,
      fileSize,
      filePath,
      scheduledOpenDate: parsedScheduledOpenDate,
      isPublic: isPublicBool,
    });

    const capsule = await capsuleHandler.createCapsule(capsuleData);
    console.log('[INFO] Capsule created', { capsuleId: capsule.id });

    const Capsule = require('../db/capsule');
    const savedCapsule = await Capsule.findById(capsule.id);
    if (!savedCapsule) {
      console.error('[ERROR] Capsule not found in database', { capsuleId: capsule.id });
      return res.status(500).json({ message: 'Failed to save capsule to database' });
    }
    console.log('[INFO] Verified capsule in database', {
      capsuleId: savedCapsule.id,
      filePath: savedCapsule.filePath,
    });

    return res.status(201).json({
      message: 'Capsule created successfully',
      capsule: {
        id: capsule.id,
        capsuleName: capsule.capsuleName,
        fileType: capsule.fileType,
        fileSize: capsule.fileSize,
        fileUrl: `/api/capsules/${capsule.id}/file`,
        uploadDate: capsule.uploadDate,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isPublic: capsule.isPublic,
        userId: capsule.userId,
        textContent: capsule.textContent,
      },
    });
  } catch (error) {
    console.error('[ERROR] Error in POST /api/capsules/upload', {
      error: error.message,
      stack: error.stack,
    });
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 16MB limit' });
    }
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// GET /api/capsules/:capsuleId/file
router.get('/:capsuleId/file', authenticateToken, async (req, res) => {
  try {
    const { capsuleId } = req.params;
    const userId = req.user.id;
    const password = req.query.password;

    console.log('[INFO] GET /api/capsules/:capsuleId/file', {
      capsuleId,
      userId,
      hasPassword: !!password,
    });

    const capsule = await capsuleHandler.getCapsuleById(capsuleId, userId, password);
    if (capsule.error) {
      console.warn('[WARN] File access denied', { capsuleId, error: capsule.error });
      return res.status(403).json({ message: capsule.error });
    }

    if (!capsule.filePath) {
      console.warn('[WARN] No file path', { capsuleId, capsuleName: capsule.capsuleName });
      return res.status(404).json({ message: 'No file content available' });
    }

    if (!fs.existsSync(capsule.filePath)) {
      console.error('[ERROR] File not found on server:', capsule.filePath);
      return res.status(404).json({ message: 'File not found on server' });
    }

    const contentType = {
      image: capsule.fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
      video: 'video/mp4',
      pdf: 'application/pdf',
      doc: 'application/msword',
      mp3: 'audio/mpeg',
      text: 'text/plain',
    }[capsule.fileType] || 'application/octet-stream';

    console.log('[INFO] Serving file:', {
      capsuleId,
      capsuleName: capsule.capsuleName,
      fileType: capsule.fileType,
      filePath: capsule.filePath,
      contentType,
    });

    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `inline; filename="${capsule.fileName || capsule.capsuleName}"`);
    res.sendFile(capsule.filePath, (err) => {
      if (err) {
        console.error('[ERROR] Error sending file', {
          capsuleId,
          filePath: capsule.filePath,
          error: err.message,
        });
        res.status(500).json({ message: 'Failed to serve file' });
      } else {
        console.log('[INFO] Served file', {
          capsuleId,
          capsuleName: capsule.capsuleName,
          fileType: capsule.fileType,
          filePath: capsule.filePath,
        });
      }
    });
  } catch (error) {
    console.error('[ERROR] Error in GET /api/capsules/:capsuleId/file', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: 'Failed to fetch file', error: error.message });
  }
});

// GET /api/capsules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const capsules = await capsuleHandler.getCapsules(userId);
    console.log('[INFO] GET /api/capsules', { userId, capsuleCount: capsules.length });
    return res.status(200).json(
      capsules.map((capsule) => ({
        id: capsule.id,
        capsuleName: capsule.capsuleName,
        fileType: capsule.fileType,
        fileSize: capsule.fileSize,
        fileUrl: `/api/capsules/${capsule.id}/file`,
        uploadDate: capsule.uploadDate,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isPublic: capsule.isPublic,
        userId: capsule.userId,
        password: capsule.password ? true : false,
        textContent: capsule.textContent,
      }))
    );
  } catch (error) {
    console.error('[ERROR] Error in GET /api/capsules', { error: error.message, stack: error.stack });
    return res.status(500).json({ message: 'Failed to fetch capsules', error: error.message });
  }
});

// GET /api/capsules/:capsuleId
router.get('/:capsuleId', authenticateToken, async (req, res) => {
  try {
    const { capsuleId } = req.params;
    const userId = req.user.id;
    const password = req.query.password;

    console.log('[INFO] GET /api/capsules/:capsuleId', {
      capsuleId,
      userId,
      hasPassword: !!password,
    });

    const capsule = await capsuleHandler.getCapsuleById(capsuleId, userId, password);
    if (capsule.error) {
      console.warn('[WARN] Capsule access denied', { capsuleId, error: capsule.error });
      return res.status(403).json({ message: capsule.error });
    }

    return res.status(200).json({
      id: capsule.id,
      capsuleName: capsule.capsuleName,
      fileType: capsule.fileType,
      fileSize: capsule.fileSize,
      fileUrl: `/api/capsules/${capsule.id}/file`,
      uploadDate: capsule.uploadDate,
      scheduledOpenDate: capsule.scheduledOpenDate,
      isPublic: capsule.isPublic,
      userId: capsule.userId,
      textContent: capsule.textContent,
    });
  } catch (error) {
    console.error('[ERROR] Error in GET /api/capsules/:capsuleId', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: 'Failed to fetch capsule', error: error.message });
  }
});

// DELETE /api/capsules/:capsuleId
router.delete('/:capsuleId', authenticateToken, async (req, res) => {
  try {
    const { capsuleId } = req.params;
    const userId = req.user.id;

    console.log('[INFO] DELETE /api/capsules/:capsuleId', { capsuleId, userId });

    const capsule = await capsuleHandler.getCapsuleById(capsuleId, userId);
    if (capsule.error) {
      console.warn('[WARN] Capsule access denied for deletion', { capsuleId, error: capsule.error });
      return res.status(403).json({ message: capsule.error });
    }

    console.log('[DEBUG] Comparing user IDs', {
      capsuleUserId: capsule.userId.toString(),
      requestUserId: userId,
    });

    if (capsule.userId.toString() !== userId) {
      console.warn('[WARN] User not authorized to delete capsule', {
        capsuleId,
        capsuleUserId: capsule.userId.toString(),
        requestUserId: userId,
      });
      return res.status(403).json({ message: 'Not authorized to delete this capsule' });
    }

    const Capsule = require('../db/capsule');
    const deletedCapsule = await Capsule.findByIdAndDelete(capsuleId);
    if (!deletedCapsule) {
      console.warn('[WARN] Capsule not found for deletion', { capsuleId });
      return res.status(404).json({ message: 'Capsule not found' });
    }

    if (deletedCapsule.filePath && fs.existsSync(deletedCapsule.filePath)) {
      try {
        fs.unlinkSync(deletedCapsule.filePath);
        console.log('[INFO] Deleted file from Uploads:', deletedCapsule.filePath);
      } catch (error) {
        console.error('[ERROR] Error deleting file', {
          capsuleId,
          filePath: deletedCapsule.filePath,
          error: error.message,
        });
      }
    }

    console.log('[INFO] Capsule deleted', { capsuleId, capsuleName: deletedCapsule.capsuleName });
    return res.status(200).json({ message: 'Capsule deleted successfully' });
  } catch (error) {
    console.error('[ERROR] Error in DELETE /api/capsules/:capsuleId', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: 'Failed to delete capsule', error: error.message });
  }
});

module.exports = router;