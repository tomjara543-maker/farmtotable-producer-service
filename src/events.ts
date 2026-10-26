import amqp from "amqplib";
import { randomUUID } from "crypto";

const EXCHANGE = "farmtotable.events";
const SOURCE = process.env.SERVICE_NAME ?? "unknown-service";
const RECONNECT_MS = 5_000;

export interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  source: string;
  occurredAt: string;
  data: T;
}

type Handler = (event: EventEnvelope) => Promise<void> | void;
interface Subscription {
  queue: string;
  routingKeys: string[];
  handler: Handler;
}

let channel: amqp.Channel | null = null;
const subscriptions: Subscription[] = [];

export async function connectEvents(url = process.env.RABBITMQ_URL) {
  if (!url) {
    console.warn("[events] RABBITMQ_URL no definido: los eventos solo se registran en consola");
    return;
  }
  try {
    const conn = await amqp.connect(url);
    conn.on("error", (err) => console.error("[events] error de conexión:", err.message));
    conn.on("close", () => {
      channel = null;
      console.warn(`[events] conexión cerrada, reintentando en ${RECONNECT_MS / 1000}s`);
      setTimeout(() => connectEvents(url), RECONNECT_MS);
    });
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    await ch.prefetch(10);
    channel = ch;
    for (const sub of subscriptions) await consume(ch, sub);
    console.log("[events] conectado a RabbitMQ");
  } catch (err) {
    console.error(
      `[events] no se pudo conectar a RabbitMQ (${(err as NodeJS.ErrnoException).code ?? err}), reintentando en ${RECONNECT_MS / 1000}s`,
    );
    setTimeout(() => connectEvents(url), RECONNECT_MS);
  }
}

export function publish<T>(eventType: string, data: T) {
  const event: EventEnvelope<T> = {
    eventId: randomUUID(),
    eventType,
    source: SOURCE,
    occurredAt: new Date().toISOString(),
    data,
  };
  if (!channel) {
    console.log(`[events] (sin broker) ${eventType}`, JSON.stringify(data));
    return event;
  }
  channel.publish(EXCHANGE, eventType, Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: "application/json",
    messageId: event.eventId,
    type: eventType,
  });
  return event;
}

export async function subscribe(queue: string, routingKeys: string[], handler: Handler) {
  const sub = { queue, routingKeys, handler };
  subscriptions.push(sub);
  if (channel) await consume(channel, sub);
}

async function consume(ch: amqp.Channel, { queue, routingKeys, handler }: Subscription) {
  await ch.assertQueue(queue, { durable: true });
  for (const key of routingKeys) await ch.bindQueue(queue, EXCHANGE, key);
  let queueTail = Promise.resolve();
  await ch.consume(queue, (msg) => {
    if (!msg) return;
    queueTail = queueTail.then(async () => {
      try {
        await handler(JSON.parse(msg.content.toString()) as EventEnvelope);
        ch.ack(msg);
      } catch (err) {
        console.error(`[events] error procesando ${msg.fields.routingKey}:`, err);
        ch.nack(msg, false, !msg.fields.redelivered);
      }
    });
  });
}
