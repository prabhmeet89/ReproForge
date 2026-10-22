import app from "./app";
import { env } from "./config/env";
import { db } from "./config/db";

async function bootstrap() {
  // Fail fast if the database is unreachable or the schema is out of date.
  await db.$queryRaw`SELECT 1`;

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 ReproForge server running on http://localhost:${env.PORT}`);
    console.log(`📦 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 Client URL: ${env.CLIENT_URL}`);
    console.log(`🗄️  Database: ${env.DATABASE_URL}`);
  });

  // Shut down cleanly so Prisma can close the SQLite connection.
  const shutdown = (signal: string) => {
    console.log(`\n🛑 ${signal} received, shutting down...`);
    server.close(async () => {
      await db.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
