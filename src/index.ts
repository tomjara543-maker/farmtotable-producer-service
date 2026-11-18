import { createApp } from "./app";
import { connectEvents } from "./events";

const PORT = Number(process.env.PORT ?? 4001);

async function main() {
  await connectEvents();

  createApp().listen(PORT, () => console.log(`producer-service escuchando en http://localhost:${PORT}`));
}

main();
