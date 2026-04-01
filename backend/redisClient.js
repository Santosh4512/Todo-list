const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

let errorLogged = false;
client.on('error', (err) => {
    if (!errorLogged) {
        console.warn('Redis connection error:', err.message);
        console.warn('Backend will continue to run without Redis functionality. Please ensure Redis is running to use caching features.');
        errorLogged = true;
    }
});

client.on('connect', () => {
    console.log('Connected to Redis server successfully!');
});

const connectRedis = async () => {
    try {
        await client.connect();
    } catch (err) {
        console.warn('Failed to establish initial Redis connection. Retrying in background...');
    }
};

module.exports = {
    client,
    connectRedis
};
