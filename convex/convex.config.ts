import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import telegram from "convex-telegram/convex.config";

const app = defineApp();
app.use(rateLimiter);
app.use(telegram);

export default app;
