const fetch = require("node-fetch");
const querystring = require("querystring");
const WebSocket = require("ws");
const { EventEmitter } = require("events");

const { log } = require("./util");

const PING_TIMEOUT = 36 * 1000;
const RELOAD_PERIOD = 10 * 60 * 1000;

class RicPacs {
  constructor() {
    this.baseUrl =  process.env["RIC_URL"] || `https://dev.rightech.io`;
    this.token = process.env["RIC_TOKEN"];
    this.objectId = process.env["RIC_OBJECT"];

    this.token = this.token.replace("Bearer", "").trim();

    this.colleagues = {};
    this.events = new EventEmitter();

    this.init();
  }

  async init() {
    this.colleagues = await this.loadColleaguesMap();
    this.connectEvents();
  }

  getHeaders() {
    return {
      authorization: `Bearer ${this.token}`,
    };
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);

    this.pingTimeout = setTimeout(() => {
      log("[pacs] ws timeout, exiting");
      this.ws.terminate();
    }, PING_TIMEOUT);
  }

  connectEvents() {
    const qs = querystring.stringify({
      "where.event": "object-packet",
      "where._oid": this.objectId,
    });

    this.ws = new WebSocket(`${this.baseUrl}/events/stream?${qs}`, {
      headers: this.getHeaders(),
    });

    this.ws.on("ping", () => {
      log("[pacs] ws ping");
      this.heartbeat();
    });

    this.ws.on("open", () => {
      log("[pacs] ws connected");
      this.heartbeat();
    });

    this.ws.on("close", () => {
      log("[pacs] ws disconnected");

      throw new Error("sockets disconnected");
    });

    this.ws.on("message", (data) => {
      const packet = JSON.parse(data.toString());
      const { evobj } = packet.data;

      if (!evobj) {
        return;
      }

      const event = { ...evobj };
      event.employeeId = this.colleagues[event.keyNumber];
      event.eventCode = +event.eventCode;
      event.time = new Date(+event.eventTime);

      if (!event.employeeId) {
        log("[pacs] unknown colleague", event);
        return;
      }

      if (event.eventCode === 16) {
        event.name = "pacs-leave";
        this.events.emit("pacs-leave", event);
      }

      if (event.eventCode === 17) {
        event.name = "pacs-enter";
        this.events.emit("pacs-enter", event);
      }
    });
  }

  onEnter(handler) {
    this.events.on("pacs-enter", handler);
  }

  onLeave(handler) {
    this.events.on("pacs-leave", handler);
  }

  async loadColleaguesMap() {
    const url = `${this.baseUrl}/objects/${this.objectId}`;
    log(`[pacs] reloading config at ${url}`);

    const resp = await fetch(url, {
      headers: this.getHeaders(),
    });

    const object = await resp.json();
    let { colleagues } = (object && object.config && object.config.odoo) || {};

    if (!colleagues) {
      throw new Error(
        "colleagues map not found at object.config.odoo.colleagues path"
      );
    }

    if (typeof colleagues === "string") {
      colleagues = JSON.parse(colleagues);
    }

    setTimeout(async () => {
      this.colleagues = await this.loadColleaguesMap();
    }, RELOAD_PERIOD);

    return colleagues;
  }
}

module.exports = new RicPacs();
