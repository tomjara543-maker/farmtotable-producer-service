import { Router } from "express";
import { z } from "zod";
import { requireUser, userOf } from "./auth";
import { prisma } from "./db";
import { publish } from "./events";
import { HttpError, notFound } from "./http";

const include = { certifications: { select: { type: true, validUntil: true } } } as const;

export const createSchema = z.object({
  farmName: z.string().trim().min(1, "El nombre de la granja es obligatorio"),
  locationLat: z.coerce.number().min(-90).max(90),
  locationLng: z.coerce.number().min(-180).max(180),
});

export const certificationSchema = z.object({
  type: z.enum(["ORGANIC", "FAIR_TRADE", "DESIGNATION_OF_ORIGIN"], "Tipo de certificación inválido"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validUntil debe ser una fecha YYYY-MM-DD"),
});

export const toJson = ({ createdAt: _c, ...p }: { createdAt: Date } & Record<string, unknown>) => p;

export function producerRoutes() {
  const router = Router();

  router.get("/", async (req, res) => {
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    const list = await prisma.producer.findMany({ where: { ownerId }, include, orderBy: { createdAt: "asc" } });
    res.json(list.map(toJson));
  });

  router.get("/mine", requireUser("PRODUCER"), async (_req, res) => {
    const list = await prisma.producer.findMany({ where: { ownerId: userOf(res).id }, include, orderBy: { createdAt: "asc" } });
    res.json(list.map(toJson));
  });

  router.get("/:id", async (req, res) => {
    const producer = await prisma.producer.findUnique({ where: { id: req.params.id }, include });
    if (!producer) throw notFound("Productor");
    res.json(toJson(producer));
  });

  router.post("/", requireUser("PRODUCER"), async (req, res) => {
    const data = createSchema.parse(req.body);
    const user = userOf(res);
    const producer = await prisma.producer.create({ data: { ...data, ownerId: user.id }, include });
    publish("producer.created", { producerId: producer.id, ownerId: user.id, farmName: producer.farmName });
    res.status(201).json(toJson(producer));
  });

  router.post("/:id/certifications", requireUser("PRODUCER"), async (req, res) => {
    const user = userOf(res);
    const producer = await prisma.producer.findUnique({ where: { id: String(req.params.id) } });
    if (!producer) throw notFound("Productor");
    if (user.role !== "ADMIN" && producer.ownerId !== user.id) throw new HttpError(403, "Esta granja no es tuya");
    const { type, validUntil } = certificationSchema.parse(req.body);
    await prisma.certification.upsert({
      where: { producerId_type: { producerId: producer.id, type } },
      create: { producerId: producer.id, type, validUntil },
      update: { validUntil },
    });
    res.status(201).json(toJson((await prisma.producer.findUnique({ where: { id: producer.id }, include }))!));
  });

  return router;
}
