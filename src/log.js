module.exports = function log(msg, payload = "") {
  if (typeof payload !== "string") {
    payload = JSON.stringify(payload);
  }
  console.log(new Date().toISOString(), msg, payload);
};
