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

  initNav();
  initCateringPicker();
  initSocialEmbed();
})();
