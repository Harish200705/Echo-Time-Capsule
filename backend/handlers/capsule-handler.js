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
        scheduledOpenDate: data.scheduledOpenDate,
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
        password: capsule.password ? true : false,
        collaborators: capsule.collaborators || [],
      };
    } catch (error) {
      console.error('[ERROR] Error creating capsule:', error.message);
      throw new Error(`Failed to create capsule: ${error.message}`);
    }
  }

  async getCapsules(userId) {
    try {
      const capsules = await Capsule.find({
        $or: [
          { userId: userId }, // Owned by the user
          { isPublic: true }, // Public capsules
          { collaborators: userId } // Capsules where user is a collaborator
        ]
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
        password: capsule.password ? true : false,
        textContent: capsule.textContent,
        collaborators: capsule.collaborators || [],
      }));
    } catch (error) {
      console.error('[ERROR] Error fetching capsules:', error.message);
      throw new Error(`Failed to fetch capsules: ${error.message}`);
    }
  }

  async getCapsuleById(capsuleId, userId, password, operation = 'read') {
    try {
      console.log('[INFO] Fetching capsule:', { capsuleId, userId, hasPassword: !!password, operation });
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
      const isCollaborator = capsule.collaborators && capsule.collaborators.includes(userId);

      // Allow access for owners and collaborators (even if locked for delete operation)
      if (isOwner || (isCollaborator && operation === 'delete')) {
        console.log('[INFO] Capsule access granted to owner or collaborator:', { capsuleId, userId, isOwner, isCollaborator });
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
          password: capsule.password ? true : false,
          collaborators: capsule.collaborators || [],
        };
      }

      // Lock check for non-delete operations
      if (operation !== 'delete' && !isScheduledOpen) {
        console.warn('[WARN] Capsule is not yet open:', {
          capsuleId,
          scheduledOpenDate: capsule.scheduledOpenDate,
        });
        return { error: 'Capsule is not yet open' };
      }

      if (!isPublic && !isCollaborator) {
        console.warn('[WARN] Capsule is private and user is not a collaborator:', { capsuleId });
        return { error: 'Capsule is private' };
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
        password: capsule.password ? true : false,
        collaborators: capsule.collaborators || [],
      };
    } catch (error) {
      console.error('[ERROR] Error fetching capsule by ID:', error.message);
      throw new Error(`Failed to fetch capsule: ${error.message}`);
    }
  }
}

module.exports = new CapsuleHandler();