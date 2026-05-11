import { createClient } from 'redis';
import envVar from './env.config';
import { createClient } from "redis";



export const redisClient = createClient({
    username: envVars.REDIS_USERNAME,
    password: envVars.REDIS_PASSWORD,
    socket: {
        host: envVars.REDIS_HOST,
        port: Number(envVars.REDIS_PORT)
    }
});



export const connectRedis = async()=>{

    if (client.isReady) {
    console.log("Redis is connected");
    retrun ;
}

    if (!redisClient.isOpen) {
        client.on('connect', ()=>console.log("Redis clinet is connecting"))
        await redisClient.connect();
        client.on('ready', ()=>console.log("Redis clinet is Ready now"))
    } else {
    client.on('error', (error)=>console.error("Redis clinet is Ready now", error))
}

}