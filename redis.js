const Redis = require('ioredis');

const redisUrl = new Redis("rediss://default:AcupAAIjcDEyZTBjYmVhYmI2ZWE0OGRmYTQwNWQ2ZjdjNWNiZDQxYnAxMA@full-asp-52137.upstash.io:6379");

const client = new Redis(redisUrl, {
    tls: { rejectUnauthorized: false },  // Ensure secure connection
    retryStrategy: (times) => Math.min(times * 50, 2000), // Auto-reconnect
    keepAlive: 10000,  // Prevents frequent disconnections
    lazyConnect: false,  // Ensures connection is active
});
client.on('connect', () => console.log('🔌 Connected to Redis'));
client.on('error', (err) => console.error('❌ Redis error:', err));

module.exports = client;
