# CineConnect - MERN Stack Movie Website

A movie website built with the MERN stack and the TMDB API. The application allows users to browse movies and TV shows, view details, post and read reviews, get recommendations, create a personal watchlist, search and follow other users/friends.

## Features

- User authentication and authorization (login/register)
- Browse trending and popular movies and TV shows
- Search for specific titles
- View detailed information about movies and TV shows
- Get personalized recommendations
- Post your reviews/ratings and also read reviews from other users
- Personal watchlist management
- Search and follow other users/friends and view their activity

## Technologies Used

- **Frontend:**

  - React (with Vite)
  - React Router for navigation
  - Axios for API requests
  - Pure CSS for styling 

- **Backend:**

  - Node.js
  - Express.js
  - MongoDB & Mongoose
  - JWT for authentication
  - bcrypt for password hashing

- **External API:**
  - TMDB (The Movie Database) API


## Live Site!

### Access the hosted application on: https://cineconnect-app.onrender.com/

## Project Structure

```
├── client/                # React frontend
│   ├── public/            # Public assets
│   ├── src/               # Source files
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── App.jsx        # Main App component
│   │   └── main.jsx       # Entry point
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
│
├── server/                # Node.js backend
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # External services
│   ├── utils/             # Utility functions
│   ├── .env               # Environment variables
│   ├── package.json
│   └── server.js          # Entry point
│
└── README.md
```

## License

This project is licensed under the MIT License.
