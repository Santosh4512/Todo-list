require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const { connectRedis } = require('./redisClient');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Root check
app.get('/', (req, res) => {
    res.send('Todo API is up and running! Access /api/health for status.');
});

app.listen(PORT, async () => {
    // Initiate redis connection in the background
    await connectRedis();
    console.log(`Server running on port ${PORT}`);
});
