(() => {
  "use strict";

  const formatUsPhone = (raw) => {
    let digits = String(raw || "").replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("1")) {
      digits = digits.slice(1);
    }

    digits = digits.slice(0, 10);
    const area = digits.slice(0, 3);
    const mid = digits.slice(3, 6);
    const last = digits.slice(6, 10);

    if (digits.length === 0) {
      return "";
    }

    if (digits.length < 4) {
      return area;
    }

    if (digits.length < 7) {
      return `${area}-${mid}`;
    }

    return `${area}-${mid}-${last}`;
  };

  const initPhoneFields = () => {
    for (const input of document.querySelectorAll('input[type="tel"]')) {
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("maxlength", "12");
      input.setAttribute("pattern", "\\d{3}-\\d{3}-\\d{4}");
      input.setAttribute("title", "10-digit US number, like 936-520-7073");
      input.value = formatUsPhone(input.value);

      input.addEventListener("input", () => {
        input.value = formatUsPhone(input.value);
      });
    }
  };

  const initNav = () => {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");
    if (!toggle || !nav) {
      return;
    }

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("nav-open", open);
    };

    toggle.addEventListener("click", () => {
      setOpen(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (!nav.classList.contains("open")) {
        return;
      }
      if (nav.contains(event.target) || toggle.contains(event.target)) {
        return;
      }
      setOpen(false);
    });

    const desktop = window.matchMedia("(min-width: 901px)");
    desktop.addEventListener("change", (event) => {
      if (event.matches) {
        setOpen(false);
      }
    });
  };

  const initSocialEmbed = () => {
    const hosts = document.querySelectorAll("[data-elfsight-embed]");
    if (!hosts.length) {
      return;
    }

    let loaded = false;
    const load = () => {
      if (loaded) {
        return;
      }
      loaded = true;

      for (const host of hosts) {
        const id = host.dataset.elfsightEmbed;
        if (!id || host.querySelector(`[class^="elfsight-app-"]`)) {
          continue;
        }
        host.insertAdjacentHTML(
          "afterbegin",
          `<div class="elfsight-app-${id}" data-elfsight-app-lazy></div>`
        );
      }

      const script = document.createElement("script");
      script.src = "https://elfsightcdn.com/platform.js";
      script.async = true;
      document.head.append(script);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) {
            return;
          }
          observer.disconnect();
          load();
        },
        { rootMargin: "600px" }
      );
      for (const host of hosts) {
        observer.observe(host);
      }
    }

    addEventListener("scroll", load, { once: true, passive: true });

    const idle = () => {
      if (window.requestIdleCallback) {
        requestIdleCallback(load, { timeout: 4000 });
        return;
      }
      setTimeout(load, 2500);
    };

    if (document.readyState === "complete") {
      idle();
      return;
    }
    addEventListener("load", idle, { once: true });
  };

  const initCateringPicker = () => {
    const select = document.querySelector("[data-catering-select]");
    if (!select) {
      return;
    }

    for (const btn of document.querySelectorAll("[data-catering]")) {
      btn.addEventListener("click", () => {
        select.value = btn.dataset.catering;
      });
    }
  };

  const initPolaroids = () => {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      return;
    }

    const frames = document.querySelectorAll(".polaroid");
    if (!frames.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );

    const desktop = window.matchMedia("(min-width: 981px)").matches;
    const grouped = new Set();

    if (desktop) {
      for (const row of document.querySelectorAll(".photo-row")) {
        const kids = [...row.querySelectorAll(".polaroid")];
        if (!kids.length) {
          continue;
        }

        const reveal = () => {
          for (const kid of kids) {
            kid.classList.add("is-in");
          }
        };

        const rowObs = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) {
              return;
            }
            reveal();
            rowObs.disconnect();
          },
          { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
        );

        for (const kid of kids) {
          grouped.add(kid);
          kid.classList.add("is-waiting");
        }
        rowObs.observe(row);
      }
    }

    for (const frame of frames) {
      if (grouped.has(frame) || frame.classList.contains("is-hero")) {
        continue;
      }
      frame.classList.add("is-waiting");
      observer.observe(frame);
    }
  };

  const chicagoDate = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const initDateMins = () => {
    const today = chicagoDate();
    for (const input of document.querySelectorAll("[data-min-today]")) {
      input.min = today;
    }
  };

  const initHashScroll = () => {
    const scrollToId = (id) => {
      if (!id) {
        return;
      }
      const el = document.getElementById(id);
      if (!el) {
        return;
      }
      el.scrollIntoView();
    };

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) {
        return;
      }
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname) {
        return;
      }
      if (!url.hash || url.hash === "#") {
        return;
      }
      const id = decodeURIComponent(url.hash.slice(1));
      if (!document.getElementById(id)) {
        return;
      }
      event.preventDefault();
      history.pushState(null, "", url.hash);
      scrollToId(id);
    });

    const jump = () => {
      scrollToId(decodeURIComponent(location.hash.slice(1)));
    };

    jump();
    addEventListener("hashchange", jump);
    addEventListener("load", jump);
  };

  const initHoursDialog = () => {
    const dialog = document.getElementById("hours-dialog");
    if (!dialog) {
      return;
    }

    const dataEl = dialog.getAttribute("data-hours");
    if (!dataEl) {
      return;
    }

    let data;
    try {
      data = JSON.parse(dataEl);
    } catch {
      return;
    }

    const statusEl = dialog.querySelector(".hours-status");
    const subEl = dialog.querySelector(".hours-sub");
    const mapsEl = dialog.querySelector("[data-hours-maps]");
    const closeBtn = dialog.querySelector("[data-hours-close]");
    const WEEKDAYS = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const minutesNow = () => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: data.tz,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
        weekday: "long",
      }).formatToParts(new Date());
      const get = (type) => parts.find((part) => part.type === type).value;
      return {
        day: get("weekday"),
        minutes: Number(get("hour")) * 60 + Number(get("minute")),
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

    const nextOpen = (fromDay, minutes) => {
      const start = WEEKDAYS.indexOf(fromDay);
      if (start < 0) {
        return null;
      }
      for (let i = 0; i <= 7; i++) {
        const day = WEEKDAYS[(start + i) % 7];
        const item = (data.days || []).find((row) => row.day === day && row.opens);
        if (!item) {
          continue;
        }
        const openMin = toMinutes(item.opens);
        if (i === 0 && (openMin === null || minutes >= openMin)) {
          continue;
        }
        return item;
      }
      return null;
    };

    const closedLine = (fromDay, minutes) => {
      const next = nextOpen(fromDay, minutes);
      if (!next) {
        return "Sorry we missed you.";
      }
      return `Sorry we missed you. We’ll be serving coffee again ${next.day} at ${formatOpen(next.opens)}.`;
    };

    const snapshot = () => {
      const now = minutesNow();
      const row = (data.days || []).find((item) => item.day === now.day);
      const opens = toMinutes(row && row.opens);
      const closes = toMinutes(row && row.closes);
      const windowMin = Number(data.soonMinutes) || 30;
      let state = "closed";
      let title = "We Are Closed";
      let sub = closedLine(now.day, now.minutes);
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

    const paintBadges = (snap) => {
      for (const el of document.querySelectorAll("[data-hours-badge]")) {
        el.hidden = false;
        el.dataset.state = snap.state;
        el.textContent = snap.badge;
      }
      for (const el of document.querySelectorAll("[data-hours-today]")) {
        el.textContent = snap.todayLine;
      }
    };

    const paintDialog = (snap) => {
      dialog.dataset.state = snap.state;
      statusEl.textContent = snap.title;
      subEl.textContent = snap.sub;
      mapsEl.href = data.maps;
    };

    const paint = () => {
      const snap = snapshot();
      paintDialog(snap);
      paintBadges(snap);
    };

    paint();

    let lastTrigger = null;
    for (const trigger of document.querySelectorAll("[data-hours-open]")) {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        lastTrigger = trigger;
        paint();
        const y = window.scrollY;
        dialog.showModal();
        if (window.scrollY !== y) {
          window.scrollTo({ top: y, behavior: "instant" });
        }
      });
    }

    closeBtn.addEventListener("click", () => {
      dialog.close();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("close", () => {
      if (lastTrigger) {
        lastTrigger.focus({ preventScroll: true });
      }
    });
  };

  const loadTurnstileScript = () =>
    new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.append(script);
    });

  const initTurnstile = async () => {
    const hosts = document.querySelectorAll("[data-turnstile-host]");

    if (!hosts.length) {
      return;
    }

    let siteKey = hosts[0].getAttribute("data-sitekey") || "";

    if (!siteKey) {
      try {
        const res = await fetch("/api/turnstile-key");
        const data = await res.json();
        siteKey = String(data.siteKey || "").trim();
      } catch {
        return;
      }
    }

    if (!siteKey) {
      return;
    }

    try {
      await loadTurnstileScript();
    } catch {
      return;
    }

    if (!window.turnstile) {
      return;
    }

    for (const host of hosts) {
      const action = host.getAttribute("data-action") || "turnstile-spin-v1";
      const size = host.clientWidth > 0 && host.clientWidth < 300 ? "compact" : "normal";
      window.turnstile.render(host, {
        sitekey: siteKey,
        action,
        theme: "light",
        size,
      });
    }
  };

  const resetTurnstile = (form) => {
    if (!window.turnstile) {
      return;
    }

    for (const host of form.querySelectorAll("[data-turnstile-host]")) {
      try {
        window.turnstile.reset(host);
      } catch {
        /* widget not mounted */
      }
    }
  };

  const initForms = () => {
    for (const form of document.querySelectorAll(".contact-form")) {
      const status = form.querySelector("[data-form-status]");
      const submit = form.querySelector('[type="submit"]');
      if (!status || !submit) {
        continue;
      }

      const idleLabel = submit.textContent;

      const failTpl = form.querySelector("[data-form-fail]");
      const failHtml = failTpl ? failTpl.innerHTML.trim() : "";

      const setStatus = (kind, message) => {
        status.hidden = false;
        if (kind === "error" && failHtml) {
          status.innerHTML = failHtml;
        } else {
          status.textContent = message;
        }
        if (kind === "error") {
          status.setAttribute("role", "alert");
          status.removeAttribute("aria-live");
          return;
        }
        status.removeAttribute("role");
        status.setAttribute("aria-live", "polite");
      };

      form.addEventListener("submit", async (event) => {
        if (!window.fetch) {
          return;
        }

        event.preventDefault();

        if (!form.reportValidity()) {
          return;
        }

        submit.disabled = true;
        submit.textContent = "Sending…";
        setStatus("pending", "Sending your message.");

        try {
          const res = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            redirect: "follow",
          });

          const url = res.url || "";
          if (url.includes("/thank-you/")) {
            setStatus("success", "Thanks — we got it and will be in touch.");
            form.reset();
            resetTurnstile(form);
            return;
          }

          setStatus(
            "error",
            "Something went wrong and your message was not sent. Please email or call us."
          );
        } catch {
          setStatus(
            "error",
            "Something went wrong and your message was not sent. Please email or call us."
          );
        } finally {
          submit.disabled = false;
          submit.textContent = idleLabel;
        }
      });
    }
  };

  initNav();
  initPhoneFields();
  initHoursDialog();
  initCateringPicker();
  initPolaroids();
  initSocialEmbed();
  initDateMins();
  initHashScroll();
  initTurnstile().finally(() => {
    initForms();
  });
})();
