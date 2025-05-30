import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { tvAPI, getImageUrl, userAPI } from "../services/api";
import MovieCard from "../components/MovieCard";
import LoadingSpinner from "../components/LoadingSpinner";
import Alert from "../components/Alert";
import "./MovieDetails.css"; // Reuse the same CSS

// Helper function to check if token is valid (not expired)
const isTokenValid = (token) => {
  if (!token) return false;

  try {
    // Get the payload part of the JWT
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentTime;
  } catch (error) {
    console.error("Error checking token validity:", error);
    return false;
  }
};

// Helper to force logout and clear corrupted token
const forceLogout = () => {
  localStorage.removeItem("user");
  // Add a message to inform the user what happened
  localStorage.setItem(
    "auth_error",
    "Your session was invalid. Please log in again."
  );
  window.location.href = "/login";
};

const TVShowDetails = () => {
  const { id } = useParams();
  const [tvShow, setTVShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState(null);
  const [displayedReviews, setDisplayedReviews] = useState(3);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    hasValidToken: false,
  });

  // Get user from localStorage
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (user && user.token) {
        // First check token format
        const tokenValid = isTokenValid(user.token);

        if (!tokenValid) {
          console.warn("Invalid token format detected on component mount");
          forceLogout();
          return;
        }

        // Then verify with server
        try {
          // Make a test API call
          await userAPI.getProfile();

          // If successful, update state
          setAuthStatus({
            isAuthenticated: true,
            hasValidToken: true,
          });
        } catch (err) {
          console.error("Auth verification failed:", err);

          // If it's an invalid signature error, force logout immediately
          if (
            err.response &&
            err.response.status === 401 &&
            (err.response.data?.error === "invalid signature" ||
              err.response.data?.message?.includes("token failed"))
          ) {
            console.warn(
              "Invalid signature detected from server, forcing logout"
            );
            forceLogout();
          } else {
            setAuthStatus({
              isAuthenticated: !!user,
              hasValidToken: false,
            });
          }
        }
      } else {
        setAuthStatus({
          isAuthenticated: false,
          hasValidToken: false,
        });
      }
    };

    checkAuth();
  }, [user]);

  // Fetch TV show details
  useEffect(() => {
    const fetchTVShowDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await tvAPI.getDetails(id);
        setTVShow(response.data);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching TV show details:", err);
        setError("Failed to load TV show details. Please try again later.");
        setLoading(false);
      }
    };

    fetchTVShowDetails();

    // Reset state when id changes
    return () => {
      setTVShow(null);
      setInWatchlist(false);
      setWatchlistMessage(null);
    };
  }, [id]);

  // Check if TV show is in user's watchlist
  useEffect(() => {
    const checkWatchlist = async () => {
      if (user && tvShow) {
        try {
          const response = await userAPI.getWatchlist();
          const isInWatchlist = response.data.some(
            (item) => item.mediaType === "tv" && item.mediaId === parseInt(id)
          );
          setInWatchlist(isInWatchlist);
        } catch (err) {
          console.error("Error checking watchlist:", err);
        }
      }
    };

    checkWatchlist();
  }, [user, tvShow, id]);

  // Check if user has reviewed this TV show
  useEffect(() => {
    const checkUserReview = async () => {
      if (user && user.token) {
        try {
          const response = await userAPI.getUserReviews();
          const foundReview = response.data.find(
            (review) =>
              review.mediaId === id.toString() && review.mediaType === "tv"
          );

          if (foundReview) {
            setUserReview(foundReview);
          }
        } catch (err) {
          console.error("Error checking user review:", err);
        }
      }
    };

    checkUserReview();
  }, [user, id]);

  // Handle add/remove from watchlist
  const handleWatchlistToggle = async () => {
    if (!user) {
      // Redirect to login if not logged in
      window.location.href = "/login";
      return;
    }

    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        // Remove from watchlist
        await userAPI.removeFromWatchlist(id);
        setInWatchlist(false);
        setWatchlistMessage("Removed from watchlist");
      } else {
        // Add to watchlist - match API signature
        await userAPI.addToWatchlist(
          parseInt(id),
          "tv",
          tvShow.name,
          tvShow.poster_path
        );
        setInWatchlist(true);
        setWatchlistMessage("Added to watchlist");
      }
    } catch (err) {
      console.error("Error updating watchlist:", err);
      setWatchlistMessage("Failed to update watchlist");
    }
    setWatchlistLoading(false);

    // Clear message after 3 seconds
    setTimeout(() => {
      setWatchlistMessage(null);
    }, 3000);
  };

  // Show more reviews handler
  const handleShowMoreReviews = () => {
    setDisplayedReviews(tvShow.reviews.results.length);
  };

  // Show review form handler
  const toggleReviewForm = () => {
    if (userReview && !isEditingReview) {
      // Load existing review content for editing
      setReviewContent(userReview.content);
      setReviewRating(userReview.rating);
      setIsEditingReview(true);
    } else if (isEditingReview) {
      // Cancel editing
      setReviewContent("");
      setReviewRating(0);
      setIsEditingReview(false);
    }
    setShowReviewForm(!showReviewForm);
  };

  // Handle review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    // Check authentication first
    if (!user || !user.token || !authStatus.hasValidToken) {
      setReviewError(
        "You must be logged in with a valid session to submit a review. Please log in again."
      );
      console.error("Authentication issue:", {
        userExists: !!user,
        tokenExists: !!(user && user.token),
        tokenValid: authStatus.hasValidToken,
      });
      return;
    }

    if (reviewRating === 0) {
      setReviewError("Please select a rating");
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError(null);

      if (isEditingReview && userReview) {
        // Delete the old review first
        await userAPI.deleteReview(userReview._id);
      }

      // Submit the review with proper parameters
      const reviewData = {
        content: reviewContent,
        rating: reviewRating,
      };

      console.log("Submitting review with data:", {
        mediaId: id.toString(),
        mediaType: "tv",
        content: reviewContent,
        rating: reviewRating,
      });

      const response = await userAPI.submitReview(
        id.toString(),
        "tv",
        reviewData
      );
      console.log("Review submission response:", response);

      // Update userReview state with the new review
      setUserReview(response.data);
      setIsEditingReview(false);

      // Refresh TV show details to show the new review
      const tvShowResponse = await tvAPI.getDetails(id);
      setTVShow(tvShowResponse.data);

      // Reset form
      setReviewContent("");
      setReviewRating(0);
      setShowReviewForm(false);
      setReviewSubmitting(false);
    } catch (err) {
      console.error("Error submitting review:", err);
      let errorMessage = "Failed to submit your review. Please try again.";

      // Check specifically for invalid signature errors
      if (err.response && err.response.data) {
        if (
          err.response.data.error === "invalid signature" ||
          (err.response.data.message &&
            err.response.data.message.includes("token failed"))
        ) {
          errorMessage =
            "Invalid authentication signature. Your session may have expired.";

          // Auto logout on next render
          setTimeout(() => {
            handleInvalidToken();
          }, 5000);
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }

      setReviewError(errorMessage);
      setReviewSubmitting(false);
    }
  };

  // Logout helper
  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login"; // Redirect to login page
  };

  // Fix invalid token helper
  const handleInvalidToken = () => {
    localStorage.removeItem("user");
    localStorage.setItem(
      "auth_error",
      "Your session has an invalid signature. Please log in again."
    );
    window.location.href = "/login";
  };

  // Reviews section rendering with debug info
  const renderReviewsSection = () => {
    // Special case for invalid signature errors
    if (reviewError && reviewError.includes("invalid signature")) {
      return (
        <div className="movie-section">
          <div className="section-header">
            <h2 className="section-title">Authentication Error</h2>
          </div>
          <div className="auth-error-container">
            <Alert
              type="danger"
              message="Your login token has an invalid signature and cannot be used. This typically happens when server secrets have changed."
            />
            <div className="auth-debug-info">
              <p>You need to log in again to continue.</p>
              <button onClick={handleInvalidToken} className="btn">
                Log Out & Log In Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show authentication debugging for other review errors
    if (reviewError && (!user || !authStatus.hasValidToken)) {
      return (
        <div className="movie-section">
          <div className="section-header">
            <h2 className="section-title">Authentication Error</h2>
          </div>
          <div className="auth-error-container">
            <Alert type="danger" message={reviewError} />
            <div className="auth-debug-info">
              <p>Authentication Status:</p>
              <ul>
                <li>User logged in: {user ? "Yes" : "No"}</li>
                <li>Has token: {user && user.token ? "Yes" : "No"}</li>
                <li>Token valid: {authStatus.hasValidToken ? "Yes" : "No"}</li>
              </ul>
              <button onClick={handleLogout} className="btn">
                Log Out & Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Normal reviews section
    return (
      <div className="movie-section">
        <div className="section-header">
          <h2 className="section-title">Reviews</h2>
          {user && (
            <button className="btn btn-secondary" onClick={toggleReviewForm}>
              {userReview
                ? showReviewForm
                  ? "Cancel"
                  : "Edit Review"
                : "Write a Review"}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="review-form-container">
            <form onSubmit={handleReviewSubmit} className="review-form">
              {reviewError && <Alert type="danger" message={reviewError} />}

              <div className="rating-select">
                <label>Your Rating:</label>
                <div className="star-rating">
                  {[...Array(10)].map((_, i) => (
                    <span
                      key={i}
                      className={`star ${i < reviewRating ? "selected" : ""}`}
                      onClick={() => setReviewRating(i + 1)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reviewContent">Your Review:</label>
                <textarea
                  id="reviewContent"
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  rows="5"
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn" disabled={reviewSubmitting}>
                {reviewSubmitting
                  ? "Submitting..."
                  : isEditingReview
                  ? "Update Review"
                  : "Submit Review"}
              </button>
            </form>
          </div>
        )}

        {/* User's Review (if exists and not currently editing) */}
        {userReview && !showReviewForm && (
          <div className="user-review">
            <h3 className="user-review-title">Your Review</h3>
            <div className="review-card user-review-card">
              <div className="review-header">
                <div className="reviewer-name">You ({user.username})</div>
                <div className="reviewer-rating">★ {userReview.rating}/10</div>
              </div>
              <div className="review-content">{userReview.content}</div>
              <div className="review-date">
                {new Date(userReview.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Other Reviews List */}
        {tvShow.reviews &&
        tvShow.reviews.results &&
        tvShow.reviews.results.length > 0 ? (
          <>
            {(userReview || tvShow.reviews.results.length > 0) && (
              <h3 className="other-reviews-title">
                {userReview ? "Other Reviews" : "Reviews"}
              </h3>
            )}
            <div className="reviews-list">
              {tvShow.reviews.results
                .slice(0, displayedReviews)
                .map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="reviewer-name">
                        {review.author_details.username || review.author}
                      </div>
                      {review.author_details.rating && (
                        <div className="reviewer-rating">
                          ★ {review.author_details.rating}/10
                        </div>
                      )}
                    </div>
                    <div className="review-content">
                      {review.content.length > 300 && displayedReviews <= 3
                        ? `${review.content.substring(0, 300)}...`
                        : review.content}
                    </div>
                    <div className="review-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
            </div>

            {/* Show More button */}
            {tvShow.reviews.results.length > 3 && displayedReviews <= 3 && (
              <div className="show-more-container">
                <button onClick={handleShowMoreReviews} className="btn-text">
                  Show More Reviews (
                  {tvShow.reviews.results.length - displayedReviews} more)
                </button>
              </div>
            )}
          </>
        ) : userReview ? null : (
          <p className="no-reviews">No reviews yet. Be the first to review!</p>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <Alert type="danger" message={error} />;
  }

  if (!tvShow) {
    return <div className="container">TV Show not found</div>;
  }

  return (
    <div className="movie-details">
      {/* Backdrop */}
      <div
        className="movie-backdrop"
        style={{
          backgroundImage: `url(${getImageUrl.backdrop(tvShow.backdrop_path)})`,
        }}
      >
        <div className="backdrop-overlay"></div>
      </div>

      <div className="container">
        <div className="movie-details-content">
          {/* TV Show Poster and Info */}
          <div className="movie-details-main">
            <div className="movie-poster-container">
              <img
                src={getImageUrl.poster(tvShow.poster_path)}
                alt={tvShow.name}
                className="movie-poster"
              />
            </div>

            <div className="movie-info">
              <h1 className="movie-title">
                {tvShow.name}
                <span className="movie-year">
                  {tvShow.first_air_date &&
                    `(${new Date(tvShow.first_air_date).getFullYear()})`}
                </span>
              </h1>

              <div className="movie-meta">
                {tvShow.first_air_date && (
                  <span className="movie-date">
                    {new Date(tvShow.first_air_date).toLocaleDateString()}
                  </span>
                )}

                {tvShow.genres && tvShow.genres.length > 0 && (
                  <span className="movie-genres">
                    {tvShow.genres.map((genre) => genre.name).join(", ")}
                  </span>
                )}

                {tvShow.number_of_seasons && (
                  <span className="movie-runtime">
                    {tvShow.number_of_seasons}{" "}
                    {tvShow.number_of_seasons === 1 ? "Season" : "Seasons"}
                  </span>
                )}
              </div>

              {tvShow.tagline && (
                <div className="movie-tagline">"{tvShow.tagline}"</div>
              )}

              <div className="movie-rating">
                <div className="rating-score">
                  <span className="score-value">
                    {tvShow.vote_average.toFixed(1)}
                  </span>
                  <span className="score-total">/10</span>
                </div>
                <div className="rating-count">{tvShow.vote_count} votes</div>
              </div>

              <div className="movie-actions">
                <button
                  className={`btn ${inWatchlist ? "btn-secondary" : ""}`}
                  onClick={handleWatchlistToggle}
                  disabled={watchlistLoading}
                >
                  {watchlistLoading
                    ? "Processing..."
                    : inWatchlist
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"}
                </button>

                {tvShow.homepage && (
                  <a
                    href={tvShow.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Official Website
                  </a>
                )}
              </div>

              {watchlistMessage && (
                <div className="watchlist-message">{watchlistMessage}</div>
              )}

              <div className="movie-overview">
                <h3>Overview</h3>
                <p>{tvShow.overview}</p>
              </div>
            </div>
          </div>

          {/* TV Show Cast */}
          {tvShow.credits &&
            tvShow.credits.cast &&
            tvShow.credits.cast.length > 0 && (
              <div className="movie-section">
                <h2 className="section-title">Cast</h2>
                <div className="cast-list">
                  {tvShow.credits.cast.slice(0, 8).map((person) => (
                    <div key={person.id} className="cast-member">
                      <div className="cast-image-container">
                        <img
                          src={getImageUrl.profile(person.profile_path)}
                          alt={person.name}
                          className="cast-image"
                        />
                      </div>
                      <div className="cast-details">
                        <div className="cast-name">{person.name}</div>
                        <div className="cast-character">{person.character}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Similar TV Shows */}
          {tvShow.recommendations &&
            tvShow.recommendations.results &&
            tvShow.recommendations.results.length > 0 && (
              <div className="movie-section">
                <h2 className="section-title">You Might Also Like</h2>
                <div className="similar-movies">
                  {tvShow.recommendations.results.slice(0, 8).map((show) => (
                    <MovieCard
                      key={show.id}
                      media={{ ...show, media_type: "tv" }}
                    />
                  ))}
                </div>
              </div>
            )}

          {renderReviewsSection()}

          {/* Seasons */}
          {tvShow.seasons && tvShow.seasons.length > 0 && (
            <div className="movie-section">
              <h2 className="section-title">Seasons</h2>
              <div className="seasons-list">
                {tvShow.seasons.map((season) => (
                  <div key={season.id} className="season-card">
                    <div className="season-poster-container">
                      <img
                        src={getImageUrl.poster(season.poster_path)}
                        alt={season.name}
                        className="season-poster"
                      />
                    </div>
                    <div className="season-details">
                      <h3 className="season-name">{season.name}</h3>
                      <div className="season-info">
                        <div className="season-date">
                          {season.air_date &&
                            new Date(season.air_date).getFullYear()}
                        </div>
                        <div className="season-episodes">
                          {season.episode_count} episodes
                        </div>
                      </div>
                      {season.overview && (
                        <div className="season-overview">
                          {season.overview.length > 150
                            ? `${season.overview.substring(0, 150)}...`
                            : season.overview}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TVShowDetails;
