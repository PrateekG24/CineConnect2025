const User = require('../models/User');
const Review = require('../models/Review');
const mongoose = require('mongoose');

// @desc    Search for users by username
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: 'Username search term is required' });
    }

    // Find users with usernames that contain the search term (case insensitive)
    // Exclude the current user from results
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user.id }
    })
      .select('username createdAt')
      .limit(20);

    // Get the current user's following list to check if users are followed
    const currentUser = await User.findById(req.user.id);

    // Map to add isFollowing field
    const results = users.map(user => {
      const isFollowing = currentUser.following.some(
        followedUser => followedUser.userId.toString() === user._id.toString()
      );

      return {
        _id: user._id,
        username: user.username,
        createdAt: user.createdAt,
        isFollowing
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
};

// @desc    Follow a user
// @route   POST /api/users/follow
// @access  Private
const followUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Validate if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't follow yourself
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Get current user
    const currentUser = await User.findById(req.user.id);

    // Check if already following
    const alreadyFollowing = currentUser.following.some(
      follow => follow.userId.toString() === userId
    );

    if (alreadyFollowing) {
      return res.status(400).json({ message: 'You are already following this user' });
    }

    // Add to following
    currentUser.following.push({
      userId,
      username: targetUser.username,
      followedAt: new Date()
    });

    await currentUser.save();

    res.status(200).json({
      message: 'Successfully followed user',
      following: {
        userId,
        username: targetUser.username,
        followedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error while following user' });
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/users/follow/:userId
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current user
    const currentUser = await User.findById(req.user.id);

    // Check if actually following
    const followIndex = currentUser.following.findIndex(
      follow => follow.userId.toString() === userId
    );

    if (followIndex === -1) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    // Remove from following
    currentUser.following.splice(followIndex, 1);
    await currentUser.save();

    res.status(200).json({
      message: 'Successfully unfollowed user'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error while unfollowing user' });
  }
};

// @desc    Get list of users the current user is following
// @route   GET /api/users/following
// @access  Private
const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('following');

    res.status(200).json(user.following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error while getting following list' });
  }
};

// @desc    Get reviews from users that the current user is following
// @route   GET /api/users/following/reviews
// @access  Private
const getFollowingReviews = async (req, res) => {
  try {
    // Get current user's following list
    const user = await User.findById(req.user.id)
      .select('following');

    if (user.following.length === 0) {
      return res.status(200).json([]);
    }

    // Extract user IDs from following list
    const followingIds = user.following.map(f => f.userId);

    // Find reviews from followed users
    const reviews = await Review.find({
      user: { $in: followingIds }
    })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to prevent excessive data transfer

    // Enrich with usernames (more efficient than populating for this specific use case)
    const followingMap = user.following.reduce((map, f) => {
      map[f.userId.toString()] = f.username;
      return map;
    }, {});

    const enrichedReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      reviewObj.username = followingMap[review.user.toString()];
      return reviewObj;
    });

    res.status(200).json(enrichedReviews);
  } catch (error) {
    console.error('Get following reviews error:', error);
    res.status(500).json({ message: 'Server error while getting following reviews' });
  }
};

// @desc    Get reviews from a specific user
// @route   GET /api/users/reviews/:userId
// @access  Private
const getUserReviewsById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate that the user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the current user is following this user
    const currentUser = await User.findById(req.user.id);
    const isFollowing = currentUser.following.some(
      follow => follow.userId.toString() === userId
    );

    if (!isFollowing) {
      return res.status(403).json({ message: 'You must follow this user to see their reviews' });
    }

    // Find reviews from the specified user
    const reviews = await Review.find({
      user: userId
    }).sort({ createdAt: -1 });

    // Add the username to each review
    const username = currentUser.following.find(
      follow => follow.userId.toString() === userId
    ).username;

    const enrichedReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      reviewObj.username = username;
      return reviewObj;
    });

    res.status(200).json(enrichedReviews);
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error while getting user reviews' });
  }
};

module.exports = {
  searchUsers,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowingReviews,
  getUserReviewsById
}; 