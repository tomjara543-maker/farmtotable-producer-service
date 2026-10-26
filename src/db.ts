import { PrismaPg } from "@prisma/adapter-pg";
import { EventEnvelope } from "./events";
import { PrismaClient } from "./generated/prisma/client";

if (!process.env.DATABASE_URL) throw new Error("Falta la variable DATABASE_URL (ver .env.example)");

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

export function idempotent(handler: (event: EventEnvelope) => Promise<void>) {
  return async (event: EventEnvelope) => {
    const seen = await prisma.processedEvent.findUnique({ where: { eventId: event.eventId } });
    if (seen) return;
    await handler(event);
    await prisma.processedEvent.create({ data: { eventId: event.eventId, eventType: event.eventType } });
  };
}
