const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  updateUserProfile,
  getUserProfile,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword
} = require('../controllers/userController');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/resend-verification', protect, resendVerificationEmail);

// Watchlist routes
const {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist
} = require('../controllers/watchlistController');

router.get('/watchlist', protect, getWatchlist);
router.post('/watchlist', protect, addToWatchlist);
router.delete('/watchlist/:mediaId', protect, removeFromWatchlist);

// Friend-related routes
const {
  searchUsers,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowingReviews,
  getUserReviewsById
} = require('../controllers/friendController');

router.get('/search', protect, searchUsers);
router.post('/follow', protect, followUser);
router.delete('/follow/:userId', protect, unfollowUser);
router.get('/following', protect, getFollowing);
router.get('/following/reviews', protect, getFollowingReviews);
router.get('/reviews/:userId', protect, getUserReviewsById);

module.exports = router; 