(() => {
  "use strict";

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
    };

    toggle.addEventListener("click", () => {
      setOpen(!nav.classList.contains("open"));
    });

    // Most nav targets are same-page anchors, which leave the panel covering
    // the content unless we close it ourselves.
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

    // Leaving the mobile breakpoint must not strand the panel open.
    const desktop = window.matchMedia("(min-width: 901px)");
    desktop.addEventListener("change", (event) => {
      if (event.matches) {
        setOpen(false);
      }
    });
  };

  // The Elfsight bundle is heavy third-party JS, so it stays off the critical
  // path. Whichever trigger fires first wins: the section nearing the
  // viewport, the first scroll, or the browser going idle after load. The
  // belt-and-braces triggers matter because an embed that never appears is a
  // worse failure than one that loads a moment early.
  const initSocialEmbed = () => {
    const host = document.querySelector("[data-elfsight-embed]");
    if (!host) {
      return;
    }

    let loaded = false;
    const load = () => {
      if (loaded) {
        return;
      }
      loaded = true;

      host.insertAdjacentHTML(
        "afterbegin",
        `<div class="elfsight-app-${host.dataset.elfsightEmbed}" data-elfsight-app-lazy></div>`
      );

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
      observer.observe(host);
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

  // Preselects the catering inquiry form's service from whichever option's
  // button was clicked. The select is the source of truth, so with JS off the
  // form still submits a valid choice.
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

  // Polaroids rest at --tilt. JS adds is-waiting so they start lower and more
  // rotated, then is-in settles them. Without JS, or with reduced motion, they
  // render in the rest pose from the first paint.
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

    /* One trigger for the four-up row so the CSS delays run as a wave
       instead of each frame racing the observer on its own. */
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

  const initHoursDialog = () => {
    const trigger = document.querySelector("[data-hours-open]");
    const dialog = document.getElementById("hours-dialog");
    const dataEl = dialog.getAttribute("data-hours");
    if (!trigger || !dialog || !dataEl) {
      return;
    }

    let data;
    try {
      data = JSON.parse(dataEl);
    } catch {
      return;
    }

    const statusEl = dialog.querySelector(".hours-status");
    const todayEl = dialog.querySelector(".hours-today");
    const mapsEl = dialog.querySelector("[data-hours-maps]");
    const closeBtn = dialog.querySelector("[data-hours-close]");

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

    const paint = () => {
      const now = minutesNow();
      const row = (data.days || []).find((item) => item.day === now.day);
      const opens = toMinutes(row && row.opens);
      const closes = toMinutes(row && row.closes);
      const windowMin = Number(data.soonMinutes) || 30;
      let state = "closed";
      let title = "Closed";

      if (opens !== null && closes !== null) {
        if (now.minutes >= opens && now.minutes < closes) {
          if (closes - now.minutes <= windowMin) {
            state = "soon";
            title = "Closing Soon";
          } else {
            state = "open";
            title = "We Are Open";
          }
        } else if (now.minutes < opens && opens - now.minutes <= windowMin) {
          state = "opening";
          title = "Opening Soon";
        }
      }

      dialog.dataset.state = state;
      statusEl.textContent = title;
      todayEl.textContent = row ? `Today · ${row.label}` : "Today · Closed";

      if (state === "closed") {
        mapsEl.hidden = true;
        mapsEl.removeAttribute("href");
      } else {
        mapsEl.hidden = false;
        mapsEl.href = data.maps;
      }
    };

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      paint();
      dialog.showModal();
    });

    closeBtn.addEventListener("click", () => {
      dialog.close();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  };

  initNav();
  initHoursDialog();
  initCateringPicker();
  initPolaroids();
  initSocialEmbed();
})();
