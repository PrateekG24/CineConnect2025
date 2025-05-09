import { useState, useEffect } from "react";
import { userAPI } from "../services/api";
import { getImageUrl } from "../services/api";
import "./Friends.css";

const Friends = () => {
  const [following, setFollowing] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("following");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedFriendReviews, setSelectedFriendReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Fetch following users on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const followingResponse = await userAPI.getFollowing();
        setFollowing(followingResponse.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load friends data. Please try again later.");
        console.error("Error fetching friends data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle search for users
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchTerm.trim()) return;

    try {
      setIsSearching(true);
      const response = await userAPI.searchUsers(searchTerm);
      setSearchResults(response.data);
      setActiveTab("search");
      setIsSearching(false);
    } catch (err) {
      setError("Failed to search users. Please try again.");
      console.error("Error searching users:", err);
      setIsSearching(false);
    }
  };

  // Handle follow user
  const handleFollowUser = async (userId) => {
    try {
      await userAPI.followUser(userId);

      // Update the search results to reflect the follow action
      setSearchResults((prevResults) =>
        prevResults.map((user) =>
          user._id === userId ? { ...user, isFollowing: true } : user
        )
      );

      // Refresh following list
      const followingResponse = await userAPI.getFollowing();
      setFollowing(followingResponse.data);
    } catch (err) {
      setError("Failed to follow user. Please try again.");
      console.error("Error following user:", err);
    }
  };

  // Handle unfollow user
  const handleUnfollowUser = async (userId) => {
    try {
      await userAPI.unfollowUser(userId);

      // Update the search results to reflect the unfollow action
      setSearchResults((prevResults) =>
        prevResults.map((user) =>
          user._id === userId ? { ...user, isFollowing: false } : user
        )
      );

      // Update the following list
      setFollowing((prevFollowing) =>
        prevFollowing.filter((user) => user.userId !== userId)
      );

      // If this was the selected friend, clear selection
      if (selectedFriend && selectedFriend.userId === userId) {
        setSelectedFriend(null);
        setSelectedFriendReviews([]);
      }
    } catch (err) {
      setError("Failed to unfollow user. Please try again.");
      console.error("Error unfollowing user:", err);
    }
  };

  // Handle friend selection to view their reviews
  const handleSelectFriend = async (friend) => {
    try {
      if (selectedFriend && selectedFriend.userId === friend.userId) {
        // Toggle off if already selected
        setSelectedFriend(null);
        setSelectedFriendReviews([]);
        return;
      }

      setSelectedFriend(friend);
      setLoadingReviews(true);

      const response = await userAPI.getUserReviewsById(friend.userId);
      setSelectedFriendReviews(response.data);
      setLoadingReviews(false);
    } catch (err) {
      setError("Failed to load friend's reviews. Please try again.");
      console.error("Error loading friend's reviews:", err);
      setLoadingReviews(false);
    }
  };

  return (
    <div className="friends-container">
      <h1>Friends & Community</h1>

      {/* Search Form */}
      <div className="search-container">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search users by username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Tabs */}
      <div className="friends-tabs">
        <button
          className={activeTab === "following" ? "active" : ""}
          onClick={() => {
            setActiveTab("following");
            setSelectedFriend(null);
            setSelectedFriendReviews([]);
          }}
        >
          Following ({following.length})
        </button>
        {searchResults.length > 0 && (
          <button
            className={activeTab === "search" ? "active" : ""}
            onClick={() => {
              setActiveTab("search");
              setSelectedFriend(null);
              setSelectedFriendReviews([]);
            }}
          >
            Search Results ({searchResults.length})
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && <div className="loading">Loading...</div>}

      {/* Content based on active tab */}
      <div className="tab-content">
        {/* Following List */}
        {activeTab === "following" && !loading && (
          <div className="following-list-container">
            <div className="following-list">
              {following.length === 0 ? (
                <p>
                  You are not following anyone yet. Search for users to follow
                  them!
                </p>
              ) : (
                <ul>
                  {following.map((user) => (
                    <li
                      key={user.userId}
                      className={`friend-card ${
                        selectedFriend && selectedFriend.userId === user.userId
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => handleSelectFriend(user)}
                    >
                      <div className="friend-info">
                        <div className="friend-avatar">👤</div>
                        <div>
                          <h3>{user.username}</h3>
                          <p>
                            Following since{" "}
                            {new Date(user.followedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="friend-actions">
                        <button
                          className="reviews-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFriend(user);
                          }}
                        >
                          {selectedFriend &&
                          selectedFriend.userId === user.userId
                            ? "Hide Reviews"
                            : "Show Reviews"}
                        </button>
                        <button
                          className="unfollow-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnfollowUser(user.userId);
                          }}
                        >
                          Unfollow
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selected Friend Reviews */}
            {selectedFriend && (
              <div className="friend-reviews">
                <h2>{selectedFriend.username}'s Reviews</h2>
                {loadingReviews ? (
                  <div className="loading">Loading reviews...</div>
                ) : selectedFriendReviews.length === 0 ? (
                  <p>No reviews from {selectedFriend.username} yet.</p>
                ) : (
                  <ul className="reviews-list">
                    {selectedFriendReviews.map((review) => (
                      <li key={review._id} className="review-card">
                        <div className="review-header">
                          <div className="rating">⭐ {review.rating}/10</div>
                        </div>
                        <div className="review-media">
                          <img
                            src={getImageUrl.poster(review.mediaPoster, "w92")}
                            alt={review.mediaTitle}
                          />
                          <div>
                            <h4>{review.mediaTitle}</h4>
                            <p>
                              {review.mediaType === "movie"
                                ? "Movie"
                                : "TV Show"}
                            </p>
                          </div>
                        </div>
                        <p className="review-content">{review.content}</p>
                        <p className="review-date">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {activeTab === "search" && (
          <div className="search-results">
            {searchResults.length === 0 ? (
              <p>No users found. Try another search term.</p>
            ) : (
              <ul>
                {searchResults.map((user) => (
                  <li key={user._id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">👤</div>
                      <h3>{user.username}</h3>
                    </div>
                    {user.isFollowing ? (
                      <button
                        className="unfollow-btn"
                        onClick={() => handleUnfollowUser(user._id)}
                      >
                        Unfollow
                      </button>
                    ) : (
                      <button
                        className="follow-btn"
                        onClick={() => handleFollowUser(user._id)}
                      >
                        Follow
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
