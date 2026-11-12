const SycamoreHours = (() => {
  "use strict";

  const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const readClock = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type).value;
    const hour = Number(get("hour"));
    return {
      day: get("weekday"),
      year: Number(get("year")),
      month: Number(get("month")),
      date: Number(get("day")),
      minutes: (hour === 24 ? 0 : hour) * 60 + Number(get("minute")),
    };
  };

  const toMinutes = (stamp) => {
    if (!stamp) {
      return null;
    }
    const [h, m] = stamp.split(":").map(Number);
    return h * 60 + m;
  };

  const formatOpen = (stamp) => {
    const [h, m] = stamp.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    if (!m) {
      return `${hour} ${suffix}`;
    }
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const nthWeekdayDate = (year, month, weekday, nth) => {
    const target = WEEKDAYS.indexOf(weekday);
    const n = Number(nth);
    if (target < 0 || !n) {
      return null;
    }
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const date = 1 + ((target - firstDow + 7) % 7) + (n - 1) * 7;
    const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (date < 1 || date > dim) {
      return null;
    }
    return date;
  };

  const closureOn = (closures, year, month, date) => {
    for (const rule of closures || []) {
      if (Number(rule.month) !== month) {
        continue;
      }
      if (rule.day != null && rule.day !== "") {
        if (Number(rule.day) === date) {
          return rule;
        }
        continue;
      }
      if (rule.nth != null && rule.weekday) {
        const nthDate = nthWeekdayDate(year, month, rule.weekday, rule.nth);
        if (nthDate === date) {
          return rule;
        }
      }
    }
    return null;
  };

  const shiftDate = (year, month, date, delta) => {
    const shifted = new Date(Date.UTC(year, month - 1, date + delta));
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      date: shifted.getUTCDate(),
      day: WEEKDAYS[shifted.getUTCDay()],
    };
  };

  const dayRow = (data, weekday) =>
    (data.days || []).find((row) => row.day === weekday && row.opens) || null;

  const nextOpen = (data, now) => {
    for (let i = 0; i <= 14; i++) {
      const cursor = shiftDate(now.year, now.month, now.date, i);
      if (closureOn(data.closures, cursor.year, cursor.month, cursor.date)) {
        continue;
      }
      const item = dayRow(data, cursor.day);
      if (!item) {
        continue;
      }
      const openMin = toMinutes(item.opens);
      if (i === 0 && (openMin === null || now.minutes >= openMin)) {
        continue;
      }
      return item;
    }
    return null;
  };

  const formatNames = (names) => {
    if (names.length <= 1) {
      return names[0] || "";
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  };

  const closureNamesAhead = (data, now) => {
    const names = [];
    for (let i = 0; i <= 14; i++) {
      const cursor = shiftDate(now.year, now.month, now.date, i);
      const hit = closureOn(data.closures, cursor.year, cursor.month, cursor.date);
      if (hit) {
        names.push(hit.name);
        continue;
      }
      const item = dayRow(data, cursor.day);
      if (!item) {
        continue;
      }
      const openMin = toMinutes(item.opens);
      if (i === 0 && (openMin === null || now.minutes >= openMin)) {
        continue;
      }
      break;
    }
    return names;
  };

  const closedLine = (data, now) => {
    const next = nextOpen(data, now);
    if (!next) {
      return "Sorry we missed you.";
    }
    return `Sorry we missed you. We’ll be serving coffee again ${next.day} at ${formatOpen(next.opens)}.`;
  };

  const describe = (data, now) => {
    const todayClosure = closureOn(data.closures, now.year, now.month, now.date);
    if (todayClosure) {
      const names = closureNamesAhead(data, now);
      const label = formatNames(names.length ? names : [todayClosure.name]);
      const next = nextOpen(data, now);
      let sub = `We’re closed for ${label}.`;
      if (next) {
        sub += ` We’ll be serving coffee again ${next.day} at ${formatOpen(next.opens)}.`;
      }
      return {
        state: "closed",
        title: "We Are Closed",
        sub,
        badge: "Closed Today",
        todayLine: `Closed for ${todayClosure.name}`,
      };
    }

    const row = (data.days || []).find((item) => item.day === now.day);
    const opens = toMinutes(row && row.opens);
    const closes = toMinutes(row && row.closes);
    const windowMin = Number(data.soonMinutes) || 30;
    let state = "closed";
    let title = "We Are Closed";
    let sub = closedLine(data, now);
    let badge = "Closed Today";
    let todayLine = "Closed";

    if (opens !== null && closes !== null) {
      const openAt = formatOpen(row.opens);
      const closeAt = formatOpen(row.closes);
      todayLine = `${openAt} – ${closeAt}`;
      badge = "Closed Now";

      if (now.minutes >= opens && now.minutes < closes) {
        if (closes - now.minutes <= windowMin) {
          state = "soon";
          title = "Closing Soon";
          sub = `We’re serving coffee until ${closeAt} today.`;
          badge = "Closing Soon";
        } else {
          state = "open";
          title = "We Are Open";
          sub = `We’re serving coffee from ${openAt} – ${closeAt} today.`;
          badge = "Open";
        }
      } else if (now.minutes < opens && opens - now.minutes <= windowMin) {
        state = "opening";
        title = "Opening Soon";
        sub = `We’ll open at ${openAt}.`;
        badge = "Opening Soon";
      }
    }

    return { state, title, sub, badge, todayLine };
  };

  return { nthWeekdayDate, closureOn, readClock, describe };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SycamoreHours;
}
