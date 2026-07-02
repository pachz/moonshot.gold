import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "synapse session maintenance",
  { hours: 1 },
  internal.synapse.auth.maintainSession,
);

export default crons;
