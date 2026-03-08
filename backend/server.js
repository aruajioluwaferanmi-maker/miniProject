import app from "./src/app.js";
import { loadEnvironment, resolveAppEnv } from "./src/config/loadEnv.js";

const appEnv = resolveAppEnv(process.argv[2]);
loadEnvironment(appEnv);

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port} (${appEnv})`);
});
