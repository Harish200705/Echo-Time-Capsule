const express = require('express');
const router = express.Router();
const User = require('../db/user');
const Query = require('../db/query');
const Capsule = require('../db/capsule');
const Notification = require('../db/notification'); // Add Notification model
const { verifyToken } = require('../middleware/auth-middleware');

console.log('[INFO] Admin routes loaded');

router.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  next();
});

const ensureAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    console.log('[ERROR] Access denied: Admin role required for:', req.user?.id);
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.get('/queries', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const queries = await Query.find({ resolved: false });
    console.log('[DEBUG] Queries fetched:', queries);

    const transformedQueries = queries.map(query => ({
      id: query._id.toString(),
      message: query.message,
      timestamp: query.timestamp,
      userId: query.userId.toString(),
      resolved: query.resolved,
    }));

    console.log('[DEBUG] Sending transformed queries:', transformedQueries);
    res.json(transformedQueries);
  } catch (error) {
    console.error('[ERROR] Fetch queries error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/queries/:id/resolve', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, userId } = req.body;

    if (!response || !userId) {
      return res.status(400).json({ message: 'Response and userId are required' });
    }

    const query = await Query.findByIdAndUpdate(
      id,
      { resolved: true, response },
      { new: true }
    );
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Create a notification for the user
    const notification = new Notification({
      userId: userId,
      type: 'query_response',
      message: `Admin responded to your query: ${response}`,
      relatedId: query._id.toString(),
      createdAt: new Date(),
    });
    await notification.save();
    console.log('[DEBUG] Notification created:', notification);

    res.json({
      message: 'Query resolved successfully',
      query: {
        id: query._id.toString(),
        message: query.message,
        timestamp: query.timestamp,
        userId: query.userId.toString(),
        resolved: query.resolved,
        response: query.response,
      },
    });
  } catch (error) {
    console.error('[ERROR] Resolve query error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/analytics', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCapsules = await Capsule.countDocuments();
    console.log('[DEBUG] Total counts:', { totalUsers, totalCapsules });

    const sampleUsers = await User.find({}, { createdAt: 1 }).limit(5);
    const sampleCapsules = await Capsule.find({}, { createdAt: 1 }).limit(5);
    console.log('[DEBUG] Sample users:', sampleUsers.map(u => ({ id: u._id, createdAt: u.createdAt })));
    console.log('[DEBUG] Sample capsules:', sampleCapsules.map(c => ({ id: c._id, createdAt: c.createdAt })));

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    console.log('[DEBUG] Query range:', { startDate: startDate.toISOString(), today: today.toISOString() });

    const newUsersData = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: today } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).exec();

    const capsulesData = await Capsule.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: today } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).exec();

    const months = Array(12).fill(0).map((_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    }).reverse();

    const newUsers = months.map(({ year, month }) => {
      const data = newUsersData.find(d => d._id.year === year && d._id.month === month);
      return data ? data.count : 0;
    });

    const capsules = months.map(({ year, month }) => {
      const data = capsulesData.find(d => d._id.year === year && d._id.month === month);
      return data ? data.count : 0;
    });

    console.log('[DEBUG] Analytics data:', { newUsersData, capsulesData, months, newUsers, capsules });

    if (!newUsersData.length && totalUsers > 0) {
      console.warn('[WARN] No users found in the specified date range. Check createdAt values.');
    }
    if (!capsulesData.length && totalCapsules > 0) {
      console.warn('[WARN] No capsules found in the specified date range. Check createdAt values.');
    }

    res.json({ newUsers, capsules, totalUsers, totalCapsules });
  } catch (error) {
    console.error('[ERROR] Fetch analytics error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;