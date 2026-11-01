import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createTokenVerifier } from "./lib/supabase.js";

const env = loadEnv();

const app = createApp({
  // Local portal dev server + deployed portal.
  corsOrigins: [env.ORIGIN, env.ADMIN_PORTAL_ORIGIN].filter((o): o is string =>
    Boolean(o),
  ),
  adminEmailDomains: env.ADMIN_EMAIL_DOMAINS,
  verifyToken: createTokenVerifier(env),
});

app.listen(env.PORT, () => {
  console.log(`Admin API listening on http://localhost:${env.PORT}`);
});
