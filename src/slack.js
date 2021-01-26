const { IncomingWebhook } = require("@slack/webhook");

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

function send(text, opts = {}) {
  opts.text = text;
  opts.icon_emoji = ":old_key:";
  opts.username = "odoo-pacs";

  return webhook.send(opts);
}

module.exports = {
  send,
};
