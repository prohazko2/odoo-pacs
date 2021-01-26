require("dotenv").config();

const { log, Queue } = require("./src/util");

const odoo = require("./src/odoo");
const pacs = require("./src/pacs");

const q = new Queue();

pacs.onEnter((event) => {
  log(`[pacs] <-`, event);
  q.enqueue(() => odoo.checkIn(event));
});

pacs.onLeave((event) => {
  log(`[pacs] ->`, event);
  q.enqueue(() => odoo.checkOut(event));
});

if (process.env["NODE_ENV"] === "development") {
  const repl = require("repl").start({ prompt: "> " });
  repl.context.odoo = odoo;
  repl.context.pacs = pacs;
}

process.on("unhandledRejection", (error) => {
  throw error;
});
