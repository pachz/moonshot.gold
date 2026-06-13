import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleTelegramWebhook } from "./telegram/webhook";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: handleTelegramWebhook,
});

export default http;
