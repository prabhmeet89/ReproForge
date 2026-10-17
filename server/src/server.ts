import app from "./app";
import { env } from "./config/env";

// Server start — yeh file sirf server ko listen karwati hai
// app.ts se alag rakhne ka reason: testing mein hum app import kar sakte hain
// bina server start kiye (supertest aise hi kaam karta hai)

app.listen(env.PORT, () => {
  console.log(`🚀 ReproForge server running on http://localhost:${env.PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Client URL: ${env.CLIENT_URL}`);
});
