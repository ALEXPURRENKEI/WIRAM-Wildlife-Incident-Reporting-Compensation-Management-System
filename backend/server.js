const { config } = require("./src/config");
const { createPool, initializeSchema } = require("./src/db");
const { seedDatabase } = require("./src/services/seed");
const { createApp } = require("./src/app");

async function start() {
  const pool = createPool(config.databaseUrl);

  await initializeSchema(pool);
  await seedDatabase(pool, config);

  const app = createApp({ pool: pool, config: config });

  const server = app.listen(config.port, function () {
    console.log("WIRAM backend listening on port " + config.port);
  });

  function shutdown(signal) {
    console.log("Received " + signal + ". Shutting down gracefully.");
    server.close(function () {
      pool.end().then(function () {
        process.exit(0);
      });
    });
  }

  process.on("SIGINT", shutdown.bind(null, "SIGINT"));
  process.on("SIGTERM", shutdown.bind(null, "SIGTERM"));
}

start().catch(function (error) {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
