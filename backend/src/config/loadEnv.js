import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const allowedEnvironments = new Set(["development", "staging", "production"]);

export function resolveAppEnv(cliEnv) {
  const env = cliEnv || process.env.APP_ENV || process.env.NODE_ENV || "development";
  return allowedEnvironments.has(env) ? env : "development";
}

export function loadEnvironment(appEnv) {
  const cwd = process.cwd();
  const stageFile = path.join(cwd, `.env.${appEnv}`);
  const fallbackFile = path.join(cwd, ".env");

  if (fs.existsSync(stageFile)) {
    dotenv.config({ path: stageFile });
  } else if (fs.existsSync(fallbackFile)) {
    dotenv.config({ path: fallbackFile });
  }

  process.env.APP_ENV = appEnv;
}
