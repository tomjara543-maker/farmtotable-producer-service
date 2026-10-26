import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AuthUser } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} no encontrado`);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

export async function callService<T>(
  baseUrl: string | undefined,
  path: string,
  options: { method?: string; body?: unknown; user?: AuthUser } = {},
): Promise<T> {
  if (!baseUrl) throw new HttpError(503, `Falta la URL del servicio para ${path}`);
  const user = options.user ?? { id: "system", role: "ADMIN" };
  const headers: Record<string, string> = { "x-user-id": user.id, "x-user-role": user.role };
  if (process.env.INTERNAL_TOKEN) headers["x-internal-token"] = process.env.INTERNAL_TOKEN;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  let res: globalThis.Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(503, `Servicio no disponible (${baseUrl})`);
  }
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) throw new HttpError(res.status, (data as { error?: string })?.error ?? `Error ${res.status} en ${path}`);
  return data as T;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const toDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => toDate(new Date());
export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000);
export const shortId = (id: string) => id.slice(0, 8);
