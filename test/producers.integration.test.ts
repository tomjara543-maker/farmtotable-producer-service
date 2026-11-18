import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { as, request, Running, startApp } from "./helpers";

let api: Running;

before(async () => {
  const { createApp } = await import("../src/app");
  api = await startApp(createApp());
});

after(() => api.close());

test("registrar una granja requiere sesión con rol productor", async () => {
  const farm = { farmName: "Finca", locationLat: 6.2, locationLng: -75.5 };

  const anonymous = await request(api.url, "/producers", { method: "POST", body: farm });
  assert.equal(anonymous.status, 401);

  const buyer = await request(api.url, "/producers", { method: "POST", headers: as("b-1", "BUYER"), body: farm });
  assert.equal(buyer.status, 403);
  assert.equal(buyer.body.error, "No tienes permiso para esta acción");

  const mine = await request(api.url, "/producers/mine", { headers: as("b-1", "BUYER") });
  assert.equal(mine.status, 403);
});

test("POST /producers devuelve 400 con el detalle de cada campo inválido", async () => {
  const res = await request(api.url, "/producers", {
    method: "POST",
    headers: as("p-1", "PRODUCER"),
    body: { farmName: " ", locationLat: 120, locationLng: "no-es-numero" },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /farmName: El nombre de la granja es obligatorio/);
  assert.match(res.body.error, /locationLat/);
  assert.match(res.body.error, /locationLng/);
});
