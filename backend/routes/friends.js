const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../db/user');
const FriendRequest = require('../db/friendRequest');
const Notification = require('../db/notification');
const { verifyToken } = require('../middleware/auth-middleware');

router.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl} User ID: ${req.user?.id || 'N/A'}`);
  next();
});

router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('[DEBUG] Fetching friends for user:', req.user.id);
    const user = await User.findById(req.user.id).select('friends');
    if (!user) {
      console.log('[ERROR] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('[DEBUG] User friends:', user.friends);
    const friendIds = user.friends.filter(id => mongoose.isValidObjectId(id));
    if (friendIds.length !== user.friends.length) {
      console.log('[WARN] Invalid ObjectIds in friends:', user.friends);
    }
    const friends = await User.find(
      { _id: { $in: friendIds } },
      { _id: 1, name: 1, email: 1, profilePhotoUrl: 1 }
    );
    console.log('[DEBUG] Fetched friends:', friends.length);
    res.json(friends.map(friend => ({
      id: friend._id.toString(),
      name: friend.name,
      email: friend.email,
      profilePhotoUrl: friend.profilePhotoUrl
    })));
  } catch (error) {
    console.error('[ERROR] Get friends error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/request', verifyToken, async (req, res) => {
  try {
    const { recipientId } = req.body;
    console.log('[DEBUG] Sending friend request from:', req.user.id, 'to:', recipientId);
    if (!recipientId) {
      console.log('[ERROR] Recipient ID missing');
      return res.status(400).json({ message: 'Recipient ID is required' });
    }
    if (!mongoose.isValidObjectId(recipientId)) {
      console.log('[ERROR] Invalid recipient ID:', recipientId);
      return res.status(400).json({ message: 'Invalid recipient ID format' });
    }
    if (recipientId === req.user.id) {
      console.log('[ERROR] Cannot send request to self:', req.user.id);
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.log('[ERROR] Recipient not found:', recipientId);
      return res.status(404).json({ message: 'Recipient not found' });
    }
    const requester = await User.findById(req.user.id);
    if (!requester) {
      console.log('[ERROR] Requester not found:', req.user.id);
      return res.status(404).json({ message: 'Requester not found' });
    }
    const existingRequest = await FriendRequest.findOne({
      requesterId: req.user.id,
      recipientId,
      status: 'pending'
    });
    if (existingRequest) {
      console.log('[INFO] Friend request already pending:', existingRequest._id);
      return res.status(400).json({ message: 'Friend request already pending' });
    }
    const existingFriend = await User.findOne({
      _id: req.user.id,
      friends: recipientId
    });
    if (existingFriend) {
      console.log('[INFO] Already friends with:', recipientId);
      return res.status(400).json({ message: 'Already friends' });
    }
    const friendRequest = new FriendRequest({
      requesterId: req.user.id,
      recipientId,
      requesterName: requester.name,
      requesterProfilePhotoUrl: requester.profilePhotoUrl,
      status: 'pending',
      createdAt: new Date()
    });
    await friendRequest.save();
    console.log('[DEBUG] Friend request saved:', {
      id: friendRequest._id.toString(),
      requesterId: friendRequest.requesterId.toString(),
      recipientId: friendRequest.recipientId.toString(),
      requesterName: friendRequest.requesterName,
      status: friendRequest.status
    });
    const notification = new Notification({
      userId: recipientId,
      type: 'friend_request',
      message: `${requester.name} sent you a friend request.`,
      relatedId: friendRequest._id,
      senderProfilePhotoUrl: requester.profilePhotoUrl
    });
    await notification.save();
    console.log('[DEBUG] Notification created for recipient:', recipientId);
    res.status(201).json({ message: 'Friend request sent', requestId: friendRequest._id.toString() });
  } catch (error) {
    console.error('[ERROR] Send friend request error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/requests', verifyToken, async (req, res) => {
  try {
    console.log('[DEBUG] Fetching friend requests for user:', req.user.id);
    const requests = await FriendRequest.find({
      recipientId: req.user.id,
      status: 'pending'
    });
    console.log('[DEBUG] Fetched requests:', {
      count: requests.length,
      requests: requests.map(r => ({
        id: r._id.toString(),
        requesterId: r.requesterId.toString(),
        recipientId: r.recipientId.toString(),
        requesterName: r.requesterName,
        status: r.status
      }))
    });
    res.json(requests.map(request => ({
      id: request._id.toString(),
      requesterId: request.requesterId.toString(),
      requesterName: request.requesterName,
      requesterProfilePhotoUrl: request.requesterProfilePhotoUrl,
      createdAt: request.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('[ERROR] Get friend requests error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/sent-requests', verifyToken, async (req, res) => {
  try {
    console.log('[DEBUG] Fetching sent friend requests for user:', req.user.id);
    const sentRequests = await FriendRequest.find({
      requesterId: req.user.id,
      status: 'pending'
    });
    console.log('[DEBUG] Fetched sent requests:', {
      count: sentRequests.length,
      requests: sentRequests.map(r => ({
        id: r._id.toString(),
        recipientId: r.recipientId.toString(),
        requesterName: r.requesterName,
        status: r.status
      }))
    });
    res.json(sentRequests.map(request => ({
      id: request._id.toString(),
      requesterId: request.recipientId.toString(),
      requesterName: request.recipientName || 'Unknown',
      requesterProfilePhotoUrl: request.recipientProfilePhotoUrl,
      createdAt: request.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('[ERROR] Get sent friend requests error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/revoke/:requestId', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('[DEBUG] Revoking friend request:', requestId, 'by user:', req.user.id);
    if (!mongoose.isValidObjectId(requestId)) {
      console.log('[ERROR] Invalid request ID:', requestId);
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      requesterId: req.user.id,
      status: 'pending'
    });
    if (!friendRequest) {
      console.log('[ERROR] Friend request not found or not pending:', requestId);
      return res.status(404).json({ message: 'Friend request not found or not pending' });
    }
    await FriendRequest.deleteOne({ _id: requestId });
    await Notification.deleteOne({
      userId: friendRequest.recipientId,
      type: 'friend_request',
      relatedId: requestId
    });
    console.log('[DEBUG] Friend request revoked:', requestId);
    res.json({ message: 'Friend request revoked' });
  } catch (error) {
    console.error('[ERROR] Revoke friend request error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/accept', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    console.log('[DEBUG] Accepting friend request:', requestId, 'by user:', req.user.id);
    if (!mongoose.isValidObjectId(requestId)) {
      console.log('[ERROR] Invalid request ID:', requestId);
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      recipientId: req.user.id,
      status: 'pending'
    });
    if (!friendRequest) {
      console.log('[ERROR] Friend request not found or not pending:', requestId);
      return res.status(404).json({ message: 'Friend request not found or not pending' });
    }
    await User.findByIdAndUpdate(friendRequest.requesterId, {
      $addToSet: { friends: friendRequest.recipientId }
    });
    await User.findByIdAndUpdate(friendRequest.recipientId, {
      $addToSet: { friends: friendRequest.requesterId }
    });
    friendRequest.status = 'accepted';
    await friendRequest.save();
    const requester = await User.findById(friendRequest.requesterId);
    const notification = new Notification({
      userId: friendRequest.requesterId,
      type: 'friend_request_accepted',
      message: `${req.user.name} accepted your friend request.`,
      relatedId: friendRequest._id,
      senderProfilePhotoUrl: req.user.profilePhotoUrl
    });
    await notification.save();
    console.log('[DEBUG] Friend request accepted:', requestId);
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('[ERROR] Accept friend request error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/decline', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    console.log('[DEBUG] Declining friend request:', requestId, 'by user:', req.user.id);
    if (!mongoose.isValidObjectId(requestId)) {
      console.log('[ERROR] Invalid request ID:', requestId);
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      recipientId: req.user.id,
      status: 'pending'
    });
    if (!friendRequest) {
      console.log('[ERROR] Friend request not found or not pending:', requestId);
      return res.status(404).json({ message: 'Friend request not found or not pending' });
    }
    friendRequest.status = 'declined';
    await friendRequest.save();
    console.log('[DEBUG] Friend request declined:', requestId);
    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('[ERROR] Decline friend request error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/remove', verifyToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    console.log('[DEBUG] Removing friend:', friendId, 'for user:', req.user.id);
    if (!mongoose.isValidObjectId(friendId)) {
      console.log('[ERROR] Invalid friend ID:', friendId);
      return res.status(400).json({ message: 'Invalid friend ID format' });
    }
    const user = await User.findById(req.user.id);
    const friend = await User.findById(friendId);
    if (!user || !friend) {
      console.log('[ERROR] User or friend not found:', { userId: req.user.id, friendId });
      return res.status(404).json({ message: 'User or friend not found' });
    }
    user.friends = Array.isArray(user.friends) ? user.friends : [];
    friend.friends = Array.isArray(friend.friends) ? friend.friends : [];
    console.log('[DEBUG] User friends before:', user.friends.map(id => id.toString()));
    console.log('[DEBUG] Friend friends before:', friend.friends.map(id => id.toString()));
    if (!user.friends.some(id => id.toString() === friendId)) {
      console.log('[ERROR] Not friends with:', friendId);
      return res.status(400).json({ message: 'User is not friends with the specified friend' });
    }
    user.friends = user.friends.filter(f => f.toString() !== friendId);
    friend.friends = friend.friends.filter(f => f.toString() !== req.user.id);
    console.log('[DEBUG] User friends after:', user.friends.map(id => id.toString()));
    console.log('[DEBUG] Friend friends after:', friend.friends.map(id => id.toString()));
    await user.save();
    await friend.save();
    console.log('[DEBUG] Friend removed successfully:', friendId);
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('[ERROR] Remove friend error:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      friendId: req.body.friendId
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;