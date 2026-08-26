import "./db/index.js"; // ensure schema is created before anything else touches the DB
import express from "express";
import cors from "cors";
import { router } from "./api/routes.js";
import { registerCronJobs } from "./cron/index.js";

const PORT = Number(process.env.PORT ?? 4000);
// In dev, Vite may bump to a different port if 5173 is taken (e.g. by another local
// project) — allow any localhost origin unless CORS_ORIGIN is explicitly set, so the
// dashboard doesn't silently fail with a CORS error over a port number mismatch.
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const app = express();
app.use(
  cors({
    origin: CORS_ORIGIN ?? /^http:\/\/localhost:\d+$/,
  })
);
app.use(express.json());
app.use("/api", router);

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  registerCronJobs();
});
