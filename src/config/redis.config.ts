import { createClient } from 'redis';
import envVar from './env.config';
const client = createClient({ url: envVar.REDIS_URL as string});


if (client.isReady) {
    console.log("Redis is connected");
    
} else {
    client.on('connect', ()=>console.log("Redis clinet is connecting"))
    client.on('ready', ()=>console.log("Redis clinet is Ready now"))
    client.on('error', (error)=>console.error("Redis clinet is Ready now", error))
}
// import { createClient } from "redis";

// const port: number = 3210;

// // Create a Redis client
// const client = createClient();

// client.on("error", (err) => {
//   console.log("Redis error =>", err);
// });

// // Connect to the Redis server
// client.connect();