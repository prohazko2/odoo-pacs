const { IncomingWebhook } = require("@slack/webhook");

const slackWebhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

function slack(text, opts = {}) {
  opts.text = text;
  opts.icon_emoji = ":old_key:";
  opts.username = "odoo-pacs";

  return slackWebhook.send(opts);
}

function log(msg, payload = "") {
  if (typeof payload !== "string") {
    payload = JSON.stringify(payload);
  }
  console.log(new Date().toISOString(), msg, payload);
}

class Queue {
  constructor(maxSimultaneously = 1) {
    this.maxSimultaneously = maxSimultaneously;
    this.active = 0;
    this.queue = [];
  }

  async enqueue(func) {
    if (++this.active > this.maxSimultaneously) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    try {
      return await func();
    } catch (err) {
      log("[queue] error");
      console.log(err);

      //throw err;
    } finally {
      this.active--;
      if (this.queue.length) {
        this.queue.shift()();
      }
    }
  }
}

module.exports = {
  log,
  Queue,
  slack,
};
