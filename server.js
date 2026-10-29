
const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const hostname = "0.0.0.0";

const app = next({
  dev: false,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer((req, res) => handle(req, res))
      .listen(port, hostname, () => {
        console.log("CNX Next.js démarré");
      });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
