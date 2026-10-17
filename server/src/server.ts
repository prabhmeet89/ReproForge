import app from "./app";
import { env } from "./config/env";
import { seedDemoData } from "./data/seed";

async function bootstrap() {
  // If SEED_DEMO_DATA=true, pre-populate in-memory store
  if (env.SEED_DEMO_DATA) {
    await seedDemoData();
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 ReproForge server running on http://localhost:${env.PORT}`);
    console.log(`📦 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 Client URL: ${env.CLIENT_URL}`);
    console.log(`🌱 Demo Data Seeded: ${env.SEED_DEMO_DATA}`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
