const express = require('express');
const router = express.Router();
const Query = require('../db/query');
const { verifyToken } = require('../middleware/auth-middleware');

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Ensure the user can only access their own query
    if (query.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('[DEBUG] Query fetched:', query);
    res.json({
      id: query._id.toString(),
      message: query.message,
      response: query.response,
    });
  } catch (error) {
    console.error('[ERROR] Get query error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;