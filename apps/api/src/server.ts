import { buildApp } from "./app";

async function main() {
  const app = await buildApp();
  const port = app.services.env.PORT;
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
