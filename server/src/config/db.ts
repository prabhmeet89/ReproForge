import { PrismaClient } from "@prisma/client";
const g = globalThis as any;
export const db = g.prisma || new PrismaClient();
if (process.env.NODE_ENV!="production") g.prisma=db;
process.on("SIGTERM",()=>db.$disconnect().then(()=>process.exit(0)));
process.on("SIGINT",()=>db.$disconnect().then(()=>process.exit(0)));
