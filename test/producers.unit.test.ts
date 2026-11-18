import assert from "node:assert/strict";
import { test } from "node:test";
import { certificationSchema, createSchema, toJson } from "../src/routes";

test("createSchema normaliza el nombre, convierte coordenadas y valida sus rangos", () => {
  const ok = createSchema.parse({ farmName: "  Finca La Esperanza ", locationLat: "6.25", locationLng: "-75.56" });
  assert.deepEqual(ok, { farmName: "Finca La Esperanza", locationLat: 6.25, locationLng: -75.56 });

  const outOfRange = createSchema.safeParse({ farmName: "Finca", locationLat: 91, locationLng: -181 });
  assert.equal(outOfRange.success, false);
  assert.deepEqual(outOfRange.error!.issues.map((i) => i.path[0]), ["locationLat", "locationLng"]);

  const cert = certificationSchema.safeParse({ type: "GMO_FREE", validUntil: "2027-01-01" });
  assert.equal(cert.success, false);
  assert.match(cert.error!.issues[0].message, /Tipo de certificación inválido/);
});

test("toJson oculta la fecha interna de creación y conserva las certificaciones", () => {
  const json = toJson({
    id: "pr-1",
    ownerId: "u-1",
    farmName: "Finca",
    createdAt: new Date(),
    certifications: [{ type: "ORGANIC", validUntil: "2027-01-01" }],
  });

  assert.equal("createdAt" in json, false);
  assert.deepEqual(json.certifications, [{ type: "ORGANIC", validUntil: "2027-01-01" }]);
});
