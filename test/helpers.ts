import { once } from "node:events";
import http from "node:http";
import { AddressInfo } from "node:net";

export interface Running {
  url: string;
  close: () => Promise<void>;
}

export interface StubCall {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
}

type StubHandler = (call: StubCall) => { status?: number; body?: unknown };

async function listen(server: http.Server): Promise<Running> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export const startApp = (app: http.RequestListener) => listen(http.createServer(app));

export async function startStub(routes: Record<string, StubHandler>) {
  const calls: StubCall[] = [];
  const server = http.createServer((req, res) => {
    const call = { method: req.method ?? "GET", url: req.url ?? "/", headers: req.headers };
    calls.push(call);
    const handler = routes[`${call.method} ${call.url.split("?")[0]}`];
    const { status = 200, body = null } = handler ? handler(call) : { status: 404, body: { error: "Ruta no encontrada en el stub" } };
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  });
  return { ...(await listen(server)), calls };
}

export const as = (id: string, role: string) => ({ "x-user-id": id, "x-user-role": role });

export async function request(
  baseUrl: string,
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
}
