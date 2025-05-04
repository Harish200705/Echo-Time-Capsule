const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const capsuleHandler = require('../handlers/capsule-handler');
const upload = require('../middleware/capsule-upload.middleware');
const path = require('path');
const fs = require('fs');
const Capsule = require('../db/capsule');
const Notification = require('../db/notification');

const JWT_SECRET = process.env.JWT_SECRET || 'mySecureJwtSecret1234567890';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('[DEBUG] Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.warn('[WARN] Access token missing');
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('[WARN] Invalid token', { error: err.message });
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    console.log('[DEBUG] Token decoded:', { id: user.id, email: user.email });
    next();
  });
};

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
        return res.status(400).json({ message: 'Invalid scheduledOpenDate format. Expected format: YYYY-MM-DDTHH:mm' });
      }
      const now = new Date();
      if (parsedScheduledOpenDate <= now) {
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
      collaborators: [],
      collaborationRequests: [],
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

    const savedCapsule = await Capsule.findById(capsule.id);
    if (!savedCapsule) {
      console.error('[ERROR] Capsule not found in database', { capsuleId: capsule.id });
      return res.status(500).json({ message: 'Failed to save Capsule to database' });
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
        collaborators: capsule.collaborators,
        collaborationRequests: capsule.collaborationRequests,
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

// Other routes remain unchanged
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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[DEBUG] Fetching capsules for user:', userId);

    // Fetch capsules where the user is either the owner, a collaborator, or has a collaboration request
    const capsules = await Capsule.find({
      $or: [
        { userId: userId }, // Capsules owned by the user
        { collaborators: userId }, // Capsules where the user is a collaborator
        { 'collaborationRequests.userId': userId }, // Capsules where the user has a collaboration request
      ],
    }).lean(); // Use lean() to return plain JavaScript objects

    console.log('[INFO] GET /api/capsules', { userId, capsuleCount: capsules.length });

    const now = new Date();
    for (const capsule of capsules) {
      if (capsule.scheduledOpenDate && capsule.scheduledOpenDate <= now) {
        const existingNotification = await Notification.findOne({
          userId,
          type: 'capsule_opened',
          relatedId: capsule._id,
        });
        if (!existingNotification) {
          const notification = new Notification({
            userId,
            type: 'capsule_opened',
            message: `Your capsule '${capsule.capsuleName}' is now open`,
            relatedId: capsule._id,
            senderProfilePhotoUrl: 'http://localhost:3000/assets/profile-2.png',
            createdAt: new Date(),
          });
          await notification.save();
          console.log('[INFO] Created capsule_opened notification', { capsuleId: capsule._id });
        }
      }
    }

    return res.status(200).json(
      capsules.map((capsule) => ({
        id: capsule._id,
        capsuleName: capsule.capsuleName,
        fileType: capsule.fileType,
        fileSize: capsule.fileSize,
        fileUrl: `/api/capsules/${capsule._id}/file`,
        uploadDate: capsule.uploadDate,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isPublic: capsule.isPublic,
        userId: capsule.userId,
        password: capsule.password ? true : false,
        textContent: capsule.textContent,
        collaborators: capsule.collaborators || [],
        collaborationRequests: capsule.collaborationRequests || [],
      }))
    );
  } catch (error) {
    console.error('[ERROR] Error in GET /api/capsules', { error: error.message, stack: error.stack });
    return res.status(500).json({ message: 'Failed to fetch capsules', error: error.message });
  }
});

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
      password: capsule.password ? true : false,
      textContent: capsule.textContent,
      collaborators: capsule.collaborators || [],
      collaborationRequests: capsule.collaborationRequests || [],
    });
  } catch (error) {
    console.error('[ERROR] Error in GET /api/capsules/:capsuleId', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: 'Failed to fetch capsule', error: error.message });
  }
});

router.delete('/:capsuleId', authenticateToken, async (req, res) => {
  try {
    const { capsuleId } = req.params;
    const userId = req.user.id;

    console.log('[INFO] DELETE /api/capsules/:capsuleId', { capsuleId, userId });

    const capsule = await capsuleHandler.getCapsuleById(capsuleId, userId, null, 'delete');
    if (capsule.error) {
      console.warn('[WARN] Capsule access denied for deletion', { capsuleId, error: capsule.error });
      return res.status(403).json({ message: capsule.error });
    }

    console.log('[DEBUG] Comparing user IDs', {
      capsuleUserId: capsule.userId.toString(),
      requestUserId: userId,
    });

    // Handle collaborator case
    const isCollaborator = capsule.collaborators && capsule.collaborators.includes(userId);
    if (capsule.userId.toString() !== userId && isCollaborator) {
      // Remove the user from the collaborators array
      capsule.collaborators = capsule.collaborators.filter(collabId => collabId !== userId);
      const updatedCapsule = await Capsule.findByIdAndUpdate(
        capsuleId,
        { collaborators: capsule.collaborators },
        { new: true }
      );
      console.log('[INFO] Collaborator removed from capsule:', { capsuleId, userId, updatedCollaborators: updatedCapsule.collaborators });

      // Notify the owner
      const notification = new Notification({
        userId: capsule.userId,
        type: 'collaborator_removed',
        message: `User ${userId} has removed themselves from your capsule "${capsule.capsuleName}"`,
        relatedId: capsuleId,
        createdAt: new Date(),
      });
      await notification.save();
      console.log('[INFO] Created collaborator_removed notification', { capsuleId, userId: capsule.userId });

      return res.status(200).json({ message: 'You have been removed from the capsule' });
    }

    // Full deletion for owner
    if (capsule.userId.toString() === userId) {
      console.log('[DEBUG] Proceeding with full deletion for owner');
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
          console.error('[ERROR] Error deleting file, capsule still removed from DB', {
            capsuleId,
            filePath: deletedCapsule.filePath,
            error: error.message,
          });
          // Optionally log to a cleanup queue or notify admins
        }
      }

      console.log('[INFO] Capsule deleted', { capsuleId, capsuleName: deletedCapsule.capsuleName });
      return res.status(200).json({ message: 'Capsule deleted successfully' });
    }

    // Unauthorized case for non-owners/non-collaborators
    console.warn('[WARN] User not authorized to delete capsule', {
      capsuleId,
      capsuleUserId: capsule.userId.toString(),
      requestUserId: userId,
    });
    return res.status(403).json({ message: 'Not authorized to delete this capsule' });
  } catch (error) {
    console.error('[ERROR] Error in DELETE /api/capsules/:capsuleId', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: 'Failed to delete capsule', error: error.message });
  }
});


router.post('/collaborate', authenticateToken, async (req, res) => {
  try {
    const { capsuleId, friendIds } = req.body;
    console.log('[DEBUG] Collaboration request:', { capsuleId, friendIds });

    if (!capsuleId || !friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      console.log('[ERROR] Invalid collaboration request');
      return res.status(400).json({ message: 'Capsule ID and friend IDs are required' });
    }

    const capsule = await Capsule.findById(capsuleId);
    if (!capsule) {
      console.log('[ERROR] Capsule not found:', capsuleId);
      return res.status(404).json({ message: 'Capsule not found' });
    }

    if (capsule.userId.toString() !== req.user.id) {
      console.log('[ERROR] Unauthorized collaboration request:', capsuleId);
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!capsule.isPublic) {
      console.log('[ERROR] Cannot collaborate on a private capsule:', capsuleId);
      return res.status(403).json({ message: 'Collaboration is not allowed on private capsules' });
    }

    const existingRequests = capsule.collaborationRequests || [];
    const newRequests = friendIds
      .map((friendId) => ({
        userId: friendId,
        status: 'pending',
      }))
      .filter(
        (req) =>
          !existingRequests.some(
            (existing) => existing.userId === req.userId && existing.status === 'pending'
          )
      );

    capsule.collaborationRequests = [...existingRequests, ...newRequests];
    await capsule.save();

    const notifications = friendIds.map((friendId) => ({
      userId: friendId,
      message: `${req.user.name} invited you to collaborate on capsule "${capsule.capsuleName}"`,
      type: 'collaboration_request',
      relatedId: capsuleId,
      isRead: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
    console.log('[DEBUG] Collaboration requests and notifications sent:', { capsuleId, friendIds });

    res.json({ message: 'Collaboration requests sent successfully' });
  } catch (error) {
    console.error('[ERROR] Collaboration request error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/collaborate/respond', authenticateToken, async (req, res) => {
  try {
    const { capsuleId, userId: recipientId, action } = req.body;
    console.log('[DEBUG] Collaboration response:', { capsuleId, recipientId, action });

    if (!capsuleId || !recipientId || !['accept', 'reject'].includes(action)) {
      console.log('[ERROR] Invalid collaboration response');
      return res.status(400).json({ message: 'Capsule ID, recipient ID, and valid action (accept/reject) are required' });
    }

    const capsule = await Capsule.findById(capsuleId);
    if (!capsule) {
      console.log('[ERROR] Capsule not found:', capsuleId);
      return res.status(404).json({ message: 'Capsule not found' });
    }

    const request = capsule.collaborationRequests.find((req) => req.userId === recipientId);
    if (!request) {
      console.log('[ERROR] No collaboration request found:', { capsuleId, recipientId });
      return res.status(404).json({ message: 'No collaboration request found' });
    }

    request.status = action === 'accept' ? 'accepted' : 'rejected';
    if (action === 'accept') {
      capsule.collaborators = capsule.collaborators || [];
      if (!capsule.collaborators.includes(recipientId)) {
        capsule.collaborators.push(recipientId);
      }
    }

    await capsule.save();

    const notification = new Notification({
      userId: capsule.userId,
      message: `${req.user.name} ${action === 'accept' ? 'accepted' : 'rejected'} your collaboration request for capsule "${capsule.capsuleName}"`,
      type: 'collaboration_response',
      relatedId: capsuleId,
      isRead: false,
      createdAt: new Date(),
    });
    await notification.save();

    console.log('[DEBUG] Collaboration response processed:', { capsuleId, recipientId, action });
    res.json({ message: `Collaboration ${action}ed successfully` });
  } catch (error) {
    console.error('[ERROR] Collaboration response error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;