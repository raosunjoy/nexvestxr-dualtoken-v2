const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

router.post('/send', authenticateToken, async (req, res) => {
  const { userId, message } = req.body;
  // Fetch user's push token from MongoDB (not implemented here)
  const pushToken = 'user-push-token';
  const notification = {
    notification: {
      title: 'NexVestXR Notification',
      body: message,
    },
    token: pushToken,
  };
  await admin.messaging().send(notification);
  res.json({ success: true });
});

module.exports = router;