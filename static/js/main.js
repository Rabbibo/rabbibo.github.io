(() => {
  "use strict";

  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const body = document.body;
  let restoreTarget = null;

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  const showToast = (message) => {
    const toast = document.querySelector("[data-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  };

  // Short, first-visit-only loader. It never blocks interaction when motion is reduced.
  const loader = document.querySelector("[data-loader]");
  let hasLoaded = true;
  try { hasLoaded = sessionStorage.getItem("rabs-loader-seen") === "1"; } catch (_) { hasLoaded = true; }
  if (loader) {
    if (hasLoaded || reducedMotion.matches) {
      loader.remove();
    } else {
      try { sessionStorage.setItem("rabs-loader-seen", "1"); } catch (_) { /* no storage required */ }
      window.setTimeout(() => {
        loader.classList.add("is-done");
        window.setTimeout(() => loader.remove(), 950);
      }, 620);
    }
  }

  // Content is visible without JavaScript; reveals are enhancement-only.
  const revealItems = [...document.querySelectorAll(".reveal")];
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Header returns as soon as the visitor reverses direction.
  const header = document.querySelector("[data-header]");
  let previousY = window.scrollY;
  window.addEventListener("scroll", () => {
    if (!header || body.classList.contains("is-locked")) return;
    const currentY = window.scrollY;
    header.classList.toggle("is-hidden", currentY > previousY && currentY > 140);
    previousY = currentY;
  }, { passive: true });

  // Full-screen mobile menu with background lock, Escape, backdrop, trap, and restoration.
  const menu = document.querySelector("[data-menu]");
  const menuOpen = document.querySelector("[data-menu-open]");
  const menuClose = document.querySelector("[data-menu-close]");
  const menuBackdrop = document.querySelector("[data-menu-backdrop]");

  const closeMenu = () => {
    if (!menu || menu.hidden) return;
    menu.classList.remove("is-open");
    menuOpen?.setAttribute("aria-expanded", "false");
    body.classList.remove("is-locked");
    window.setTimeout(() => { menu.hidden = true; }, reducedMotion.matches ? 0 : 500);
    menuOpen?.focus();
  };

  const openMenu = () => {
    if (!menu) return;
    menu.hidden = false;
    body.classList.add("is-locked");
    menuOpen?.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      menu.classList.add("is-open");
      menuClose?.focus();
    });
  };

  menuOpen?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  menu?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = [...menu.querySelectorAll(focusableSelector)].filter((node) => !node.hidden);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Reusable native-dialog controls and focus restoration.
  const openDialog = (dialog, trigger) => {
    if (!dialog) return;
    restoreTarget = trigger;
    dialog.showModal();
    body.classList.add("is-locked");
    dialog.querySelector(focusableSelector)?.focus();
  };
  const closeDialog = (dialog) => {
    if (!dialog?.open) return;
    dialog.close();
  };
  const contactDialog = document.getElementById("contact-dialog");
  document.querySelectorAll("[data-contact-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (menu && !menu.hidden) closeMenu();
      openDialog(contactDialog, trigger);
    });
  });
  contactDialog?.querySelector("[data-dialog-close]")?.addEventListener("click", () => closeDialog(contactDialog));
  contactDialog?.addEventListener("click", (event) => { if (event.target === contactDialog) closeDialog(contactDialog); });
  contactDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(contactDialog);
  });
  contactDialog?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDialog(contactDialog);
  });
  contactDialog?.addEventListener("close", () => {
    body.classList.remove("is-locked");
    restoreTarget?.focus();
    showToast("Contact card closed");
  });

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = lightbox?.querySelector("[data-lightbox-image]");
  const lightboxCaption = lightbox?.querySelector("[data-lightbox-caption]");
  document.querySelectorAll("[data-lightbox-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (!lightbox || !lightboxImage || !lightboxCaption) return;
      lightboxImage.src = trigger.dataset.src;
      lightboxImage.alt = trigger.dataset.alt;
      lightboxCaption.textContent = trigger.dataset.alt;
      openDialog(lightbox, trigger);
    });
  });
  lightbox?.querySelector("[data-lightbox-close]")?.addEventListener("click", () => closeDialog(lightbox));
  lightbox?.addEventListener("click", (event) => { if (event.target === lightbox) closeDialog(lightbox); });
  lightbox?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(lightbox);
  });
  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDialog(lightbox);
  });
  lightbox?.addEventListener("close", () => {
    body.classList.remove("is-locked");
    if (lightboxImage) lightboxImage.src = "";
    restoreTarget?.focus();
  });

  document.querySelector("[data-print]")?.addEventListener("click", () => window.print());

  const cube = document.querySelector("[data-cube]");
  const cubeToggle = document.querySelector("[data-cube-toggle]");
  cubeToggle?.addEventListener("click", () => {
    const paused = cube?.classList.toggle("is-paused") ?? false;
    cubeToggle.setAttribute("aria-pressed", String(paused));
    cubeToggle.textContent = paused ? "Resume rotation" : "Pause rotation";
  });

  // Context cursor remains a purely optional pointer-device enhancement.
  const cursor = document.querySelector("[data-cursor]");
  if (cursor && window.matchMedia("(pointer: fine)").matches && !reducedMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) scale(${cursor.classList.contains("is-active") ? 1 : .22})`;
    }, { passive: true });
    document.querySelectorAll("[data-cursor-label]").forEach((target) => {
      target.addEventListener("pointerenter", () => {
        cursor.classList.add("is-active");
        cursor.querySelector("span").textContent = target.dataset.cursorLabel || "View";
      });
      target.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
    });
  }

  // Magnetic movement is deliberately limited to selected CTAs.
  if (!reducedMotion.matches && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .13;
        const y = (event.clientY - rect.top - rect.height / 2) * .13;
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      element.addEventListener("pointerleave", () => { element.style.transform = ""; });
    });
  }

  // The homepage's single signature interaction: a light, cursor-reactive signal field.
  const canvas = document.querySelector("[data-hero-field]");
  if (canvas && !reducedMotion.matches) {
    const context = canvas.getContext("2d", { alpha: true });
    let width = 0;
    let height = 0;
    let dpr = 1;
    const pointer = { x: .64, y: .32 };
    const points = Array.from({ length: 24 }, (_, index) => ({
      x: ((index * 47) % 101) / 101,
      y: ((index * 83) % 97) / 97,
      phase: index * .47
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const render = (time) => {
      context.clearRect(0, 0, width, height);
      const px = pointer.x * width;
      const py = pointer.y * height;
      points.forEach((point, index) => {
        const driftX = Math.sin(time * .00032 + point.phase) * 18;
        const driftY = Math.cos(time * .00026 + point.phase) * 14;
        const x = point.x * width + driftX;
        const y = point.y * height + driftY;
        const dx = px - x;
        const dy = py - y;
        const distance = Math.hypot(dx, dy);
        if (distance < Math.min(width, height) * .42) {
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(px, py);
          context.strokeStyle = `rgba(198,255,57,${Math.max(0, .2 - distance / 2400)})`;
          context.lineWidth = 1;
          context.stroke();
        }
        context.beginPath();
        context.arc(x, y, index % 5 === 0 ? 4 : 2, 0, Math.PI * 2);
        context.fillStyle = index % 5 === 0 ? "#ff6b4a" : "rgba(238,234,225,.65)";
        context.fill();
      });
      window.requestAnimationFrame(render);
    };
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
    });
    window.addEventListener("resize", resize, { passive: true });
    resize();
    window.requestAnimationFrame(render);
  }

  // A restrained same-origin exit fade connects pages without hijacking scroll.
  if (!reducedMotion.matches) {
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href || destination.hash) return;
      event.preventDefault();
      body.classList.add("is-leaving");
      window.setTimeout(() => { window.location.href = destination.href; }, 160);
    });
  }
})();
