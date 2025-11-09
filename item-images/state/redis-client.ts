import { createClient } from 'redis';
import { REDIS_CONFIG } from '../config';

let redisClient: any = null;

// Only connect to Redis if configured (for production)
// In local development, Redis is optional - images will be generated fresh each time
if (REDIS_CONFIG.host && REDIS_CONFIG.host !== 'localhost') {
  console.log(`Connecting to redis://${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`)
  
  redisClient = createClient({
      url: `redis://${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`
  });

  redisClient.on('error', err => console.error('Redis Client Error', err));

  // Connect to redis
  await redisClient.connect();
  console.log('Redis connected successfully');
} else {
  console.log('Redis not configured - running in local mode without vector matching');
}

export default redisClient;