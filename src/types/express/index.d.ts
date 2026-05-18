import type { Role } from "../../../prisma/generated/prisma/enums"

declare namespace Express{
    export interface Request{
        user?:{
            id:string,
            email:string,
            role:Role,
            isActive:boolean
        }
    }
}