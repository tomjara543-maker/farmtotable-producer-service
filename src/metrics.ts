import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

const SERVICE = "producer-service";

export const register = new client.Registry();
register.setDefaultLabels({ service: SERVICE });
client.collectDefaultMetrics({ register });

const requests = new client.Counter({
  name: "http_requests_total",
  help: "Total de peticiones HTTP recibidas",
  labelNames: ["method", "route", "status"] as const,
  registers: [register],
});

const duration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de las peticiones HTTP en segundos",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/metrics") return next();
  const end = duration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || "unmatched";
    const labels = { method: req.method, route, status: String(res.statusCode) };
    requests.inc(labels);
    end(labels);
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}
