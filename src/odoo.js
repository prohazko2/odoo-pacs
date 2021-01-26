const Odoo = require("odoo-xmlrpc");
const { parse } = require("url");

const { log, slack } = require("./util");

const DAY_TIME = 24 * 60 * 60 * 1000;
const TOO_LONG_TIME = 3 * DAY_TIME;

const OFFICE_TZ_OFFSET = 3;

function startOfDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(7 - OFFICE_TZ_OFFSET, 0, 0, 0);
  return end;
}

function endOfDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23 - OFFICE_TZ_OFFSET, 59, 59, 999);
  return end;
}

function isWeekend(date = new Date()) {
  date = new Date(date);
  const day = date.getDay();
  return day === 6 || day === 0;
}

class BetterOdoo {
  constructor() {
    const url = parse(process.env["ODOO_URL"]);
    const [username, password] = url.auth.split(":");

    this.odoo = new Odoo({
      url: `${url.protocol}//${url.hostname}`,
      port: url.port,
      db: url.pathname.replace("/", ""),
      username,
      password,
    });

    this.odoo.connect((err) => {
      if (err) {
        throw err;
      }
      log(`[odoo] connected`);
    });
  }

  exec(op, model, params) {
    return new Promise((resolve, reject) => {
      this.odoo.execute_kw(model, op, params, (err, value) => {
        if (err) {
          return reject(err);
        }
        resolve(value);
      });
    });
  }

  async findEmployee(id) {
    const [record] = await this.exec("read", "hr.employee", [
      [[id], ["name", "gender"]],
    ]);
    if (record && record.name) {
      record.name = record.name
        .trim()
        .split(" ")
        .map((x) => x.trim())
        .filter((x) => !!x)
        .slice(0, 2)
        .reverse()
        .join(" ");
    }
    return record;
  }

  async findFirstTodayAttendance(time) {
    const [id] = await this.exec("search", "hr.attendance", [
      [
        [
          ["check_in", ">=", startOfDay(time).toISOString()],
          ["check_in", "<=", time.toISOString()],
        ],
        0,
        1,
      ],
    ]);
    return id;
  }

  async findLastAttendance(id) {
    const ids = await this.exec("search", "hr.attendance", [
      [[["employee_id", "=", id]], 0, 1],
    ]);

    const [record] = await this.exec("read", "hr.attendance", [[ids]]);

    if (record && record.check_in) {
      record.checkIn = new Date(`${record.check_in}Z`);
    }

    if (record && record.check_out) {
      record.checkOut = new Date(`${record.check_out}Z`);
    }

    return record;
  }

  createCheckIn(employeeId, time) {
    return this.exec("create", "hr.attendance", [
      [
        {
          employee_id: employeeId,
          check_in: time.toISOString(),
        },
      ],
    ]);
  }

  updateCheckOut(checkInId, time) {
    return this.exec("write", "hr.attendance", [
      [[checkInId], { check_out: time.toISOString() }],
    ]);
  }

  async sendEarlyBirdNotify(event) {
    const employee = await this.findEmployee(event.employeeId);
    slack(
      `${employee ? employee.name : "???"} ${
        employee && employee.gender === "male" ? "открыл" : "открыла"
      } офис`
    );
  }

  async checkIn(event) {
    const last = await this.findLastAttendance(event.employeeId);

    if (!last || last.checkOut) {
      const anyToday = await this.findFirstTodayAttendance(event.time);
      const checkin = await this.createCheckIn(event.employeeId, event.time);

      if (!anyToday && !isWeekend()) {
        this.sendEarlyBirdNotify(event);
      }

      return { event, checkin, last };
    } else {
      log(`[odoo] repeated checkin skipping`, last);
    }
  }

  async checkOut(event) {
    const last = await this.findLastAttendance(event.employeeId);
    let time = event.time;

    if (last.checkIn && Date.now() - +last.checkIn > TOO_LONG_TIME) {
      log(`[odoo] last checkin was too long ago, update to end of day`, last);
      time = endOfDay(last.checkIn);
    }

    await this.updateCheckOut(last.id, time);
    return { event, last, time };
  }
}

module.exports = new BetterOdoo();
