import createClient from "ioredis"

const client = new createClient({
  url: 'redis://localhost:6379' // Default local connection
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await client.connect();
  console.log('Connected to Redis!');
}

connectRedis();
