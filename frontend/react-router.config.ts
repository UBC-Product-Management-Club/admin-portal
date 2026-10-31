import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: static output served from Cloud Run, no Node server at runtime.
  ssr: false,
} satisfies Config;
