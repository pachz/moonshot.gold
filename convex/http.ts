import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleZibalCallback } from "./payments/callback";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/zibal/callback",
  method: "GET",
  handler: handleZibalCallback,
});

export default http;
