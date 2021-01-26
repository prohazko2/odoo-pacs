const log = require("./log");
module.exports = class Queue {
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
};
