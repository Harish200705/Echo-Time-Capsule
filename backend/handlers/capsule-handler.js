const Capsule = require('../db/capsule');
const bcrypt = require('bcrypt');

class CapsuleHandler {
  async createCapsule(data) {
    try {
      console.log('[INFO] Creating capsule with data:', {
        userId: data.userId,
        capsuleName: data.capsuleName,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        filePath: data.filePath,
        isPublic: data.isPublic,
        hasPassword: !!data.password,
      });

      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
        console.log('[INFO] Password hashed for capsule');
      }

      const capsule = new Capsule(data);
      await capsule.save();
      console.log('[INFO] Capsule saved to database:', { capsuleId: capsule._id });

      return {
        id: capsule._id,
        capsuleName: capsule.capsuleName,
        fileName: capsule.fileName,
        fileType: capsule.fileType,
        fileSize: capsule.fileSize,
        filePath: capsule.filePath,
        uploadDate: capsule.uploadDate,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isPublic: capsule.isPublic,
        userId: capsule.userId,
        textContent: capsule.textContent,
      };
    } catch (error) {
      console.error('[ERROR] Error creating capsule:', error.message);
      throw error;
    }
  }

  async getCapsules(userId) {
    try {
      const capsules = await Capsule.find({
        $or: [{ userId }, { isPublic: true }],
      });
      console.log('[INFO] Retrieved capsules:', { userId, count: capsules.length });
      return capsules.map((capsule) => ({
        id: capsule._id,
        capsuleName: capsule.capsuleName,
        fileName: capsule.fileName,
        fileType: capsule.fileType,
        fileSize: capsule.fileSize,
        filePath: capsule.filePath,
        uploadDate: capsule.uploadDate,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isPublic: capsule.isPublic,
        userId: capsule.userId,
        password: capsule.password,
        textContent: capsule.textContent,
      }));
    } catch (error) {
      console.error('[ERROR] Error fetching capsules:', error.message);
      throw error;
    }
  }

  async getCapsuleById(capsuleId, userId, password) {
    try {
      console.log('[INFO] Fetching capsule:', { capsuleId, userId, hasPassword: !!password });
      const capsule = await Capsule.findById(capsuleId);
      if (!capsule) {
        console.warn('[WARN] Capsule not found:', { capsuleId });
        return { error: 'Capsule not found' };
      }

      const isOwner = capsule.userId.toString() === userId;
      const isPublic = capsule.isPublic;
      const hasPassword = !!capsule.password;
      const now = new Date();
      const isScheduledOpen =
        !capsule.scheduledOpenDate || now >= new Date(capsule.scheduledOpenDate);

      if (isOwner && isScheduledOpen) {
        console.log('[INFO] Capsule access granted to owner:', { capsuleId });
        return {
          id: capsule._id,
          capsuleName: capsule.capsuleName,
          fileName: capsule.fileName,
          fileType: capsule.fileType,
          fileSize: capsule.fileSize,
          filePath: capsule.filePath,
          uploadDate: capsule.uploadDate,
          scheduledOpenDate: capsule.scheduledOpenDate,
          isPublic: capsule.isPublic,
          userId: capsule.userId,
          textContent: capsule.textContent,
        };
      }

      if (!isPublic) {
        console.warn('[WARN] Capsule is private:', { capsuleId });
        return { error: 'Capsule is private' };
      }

      if (!isScheduledOpen) {
        console.warn('[WARN] Capsule is not yet open:', {
          capsuleId,
          scheduledOpenDate: capsule.scheduledOpenDate,
        });
        return { error: 'Capsule is not yet open' };
      }

      if (hasPassword && !password) {
        console.warn('[WARN] Password required:', { capsuleId });
        return { error: 'Password required' };
      }

      if (hasPassword && password) {
        const isPasswordValid = await bcrypt.compare(password, capsule.password);
        if (!isPasswordValid) {
          console.warn('[WARN] Invalid password:', { capsuleId });
          return { error: 'Invalid password' };
        }
        console.log('[INFO] Password verified:', { capsuleId });
      }

      console.log('[INFO] Capsule access granted:', { capsuleId });
      return {
        id: capsule._id,
        capsuleName: capsule.capsuleName,
        fileName: capsule.fileName,
        fileType: capsule.fileType,
        fileSize: capsule.fileSize,
        filePath: capsule.filePath,
        uploadDate: capsule.uploadDate,
        scheduledOpenDate: capsule.scheduledOpenDate,
        isPublic: capsule.isPublic,
        userId: capsule.userId,
        textContent: capsule.textContent,
      };
    } catch (error) {
      console.error('[ERROR] Error fetching capsule by ID:', error.message);
      throw error;
    }
  }
}

module.exports = new CapsuleHandler();