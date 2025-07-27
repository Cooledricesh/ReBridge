import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

function getRedisClient() {
  if (!redis) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    });

    redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }
  
  return redis;
}

export { getRedisClient as redis };

// Helper functions for common operations
export const redisHelpers = {
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting JSON from Redis for key ${key}:`, error);
      return null;
    }
  },

  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const json = JSON.stringify(value);
      if (ttl) {
        await client.setex(key, ttl, json);
      } else {
        await client.set(key, json);
      }
    } catch (error) {
      console.error(`Error setting JSON in Redis for key ${key}:`, error);
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.error(`Error invalidating pattern ${pattern}:`, error);
    }
  }
};