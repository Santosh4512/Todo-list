# 📝 Todo App

A full-stack Todo application with user authentication, built with React frontend and Express.js backend.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)

## ✨ Features

- **User Authentication**
  - User registration with username, email, and password
  - Secure login with JWT tokens
  - Password hashing with bcrypt

- **Todo Management**
  - Create, read, update, and delete todos
  - Mark todos as complete/incomplete
  - User-specific todo lists (each user only sees their own todos)
  - Task statistics (total, completed, pending)

- **Modern UI**
  - Clean, responsive design
  - Gradient backgrounds and smooth animations
  - Real-time task updates

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **CSS3** - Styling with modern features (gradients, flexbox)
- **Fetch API** - HTTP requests

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
todo/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Authentication routes (login/register)
│   │   └── todos.js         # Todo CRUD routes
│   ├── database.js          # SQLite database setup
│   ├── server.js            # Express server entry point
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── index.js         # React entry point
│   │   └── index.css        # Application styles
│   └── package.json
│
├── package.json             # Root package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd todo
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (backend + frontend)
   npm install
   
   # Or install separately
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```
   The server will start on `http://localhost:5001`

4. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   The app will open at `http://localhost:3000`

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Todos (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | Get all todos for the logged-in user |
| POST | `/api/todos` | Create a new todo |
| PUT | `/api/todos/:id` | Update a todo |
| PATCH | `/api/todos/:id/toggle` | Toggle todo completion status |
| DELETE | `/api/todos/:id` | Delete a todo |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if server is running |

## 🔐 Authentication

The app uses JWT (JSON Web Tokens) for authentication:

1. Register or login to receive a JWT token
2. The token is stored in `localStorage`
3. All todo API requests include the token in the `Authorization` header:
   ```
   Authorization: Bearer <token>
   ```

## 🗄️ Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| username | TEXT | Unique username |
| email | TEXT | Unique email address |
| password | TEXT | Hashed password |
| created_at | DATETIME | Account creation timestamp |

### Todos Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| user_id | INTEGER | Foreign key to users table |
| title | TEXT | Todo title |
| description | TEXT | Optional description |
| completed | INTEGER | 0 = incomplete, 1 = complete |
| created_at | DATETIME | Todo creation timestamp |

## 🎨 Screenshots

The application features:
- A beautiful gradient login/register page
- A clean task dashboard with task statistics
- Smooth hover animations and transitions

## 📦 Deployment

The project includes configuration files for various deployment platforms:

- **`Procfile`** - For Heroku deployment
- **`railway.json`** - For Railway deployment
- **`render.yaml`** - For Render deployment
- **`vercel.json`** (frontend) - For Vercel deployment

## 🔧 Environment Variables

For production, set the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5001 |
| `JWT_SECRET` | JWT signing secret | (change in production!) |

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

Made with ❤️ using React and Express.js
