import cors from "cors";
import express from "express";
import { connectEvents } from "./events";
import { errorHandler } from "./http";
import { producerRoutes } from "./routes";

const PORT = Number(process.env.PORT ?? 4001);

async function main() {
  await connectEvents();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ service: "producer-service", status: "ok" }));
  app.use("/producers", producerRoutes());
  app.use(errorHandler);

  app.listen(PORT, () => console.log(`producer-service escuchando en http://localhost:${PORT}`));
}

main();
