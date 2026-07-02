import { TelegramBot } from "convex-telegram";
import { components } from "../_generated/api";

export const bot = new TelegramBot(components.telegram);
