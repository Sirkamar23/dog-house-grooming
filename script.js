// Dog House Grooming — site interactions
(function () {
  "use strict";

  const header = document.querySelector(".site-header");
  const nav = document.getElementById("main-nav");
  const hamburger = document.getElementById("hamburger");

  // ---------- Mobile menu ----------
  function setMenu(open) {
    nav.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", String(open));
    hamburger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  hamburger.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target) && !hamburger.contains(e.target)) setMenu(false);
  });

  // ---------- Smooth scroll for in-page links ----------
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      const target = id === "#top" ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      const y = id === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 8;
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", id);
    });
  });

  // ---------- Header shadow, active nav link, floating CTA ----------
  const floatCta = document.getElementById("float-cta");
  const hero = document.querySelector(".hero");
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 10);
    floatCta.classList.toggle("visible", y > hero.offsetHeight * 0.6);

    let current = -1;
    sections.forEach((s, i) => {
      if (s && s.getBoundingClientRect().top - header.offsetHeight - 40 <= 0) current = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle("active", i === current));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Fade-in on scroll ----------
  const fadeEls = document.querySelectorAll(".fade-in");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    fadeEls.forEach((el) => io.observe(el));
  } else {
    fadeEls.forEach((el) => el.classList.add("visible"));
  }

  // ---------- Service filter ----------
  const filterBtns = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".service-card");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pet = btn.dataset.filter;
      filterBtns.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      cards.forEach((card) => {
        const show = pet === "all" || card.dataset.pets.split(" ").includes(pet);
        card.classList.toggle("hidden", !show);
        card.classList.remove("pop");
        if (show) {
          card.classList.add("visible");
          void card.offsetWidth; // restart animation
          card.classList.add("pop");
        }
      });
    });
  });

  // ---------- Gallery lightbox ----------
  const items = [...document.querySelectorAll(".gallery-item")];
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCaption = document.getElementById("lb-caption");
  let index = 0;
  let lastFocus = null;

  function show(i) {
    index = (i + items.length) % items.length;
    const thumb = items[index].querySelector("img");
    lbImg.src = items[index].dataset.full;
    lbImg.alt = thumb.alt;
    lbCaption.textContent = `${thumb.alt} (${index + 1} of ${items.length})`;
    // Preload neighbours for snappy navigation
    [index + 1, index - 1].forEach((n) => {
      const it = items[(n + items.length) % items.length];
      new Image().src = it.dataset.full;
    });
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("lb-close").focus();
  }
  function closeLb() {
    lb.hidden = true;
    lbImg.src = "";
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  items.forEach((item, i) => item.addEventListener("click", () => openLb(i)));
  document.getElementById("lb-close").addEventListener("click", closeLb);
  document.getElementById("lb-prev").addEventListener("click", () => show(index - 1));
  document.getElementById("lb-next").addEventListener("click", () => show(index + 1));
  // Tap outside the photo closes
  lb.addEventListener("click", (e) => {
    if (e.target === lb || e.target.classList.contains("lb-figure")) closeLb();
  });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
  });
  // Swipe on phones
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // ---------- Open now / Closed now (Los Angeles time) ----------
  const OPEN_MIN = 10 * 60;  // 10:00 AM
  const CLOSE_MIN = 17 * 60; // 5:00 PM
  const badge = document.getElementById("status-badge");
  const statusTime = document.getElementById("status-time");
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function laNow() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { day: dayIndex[get("weekday")], minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  }

  function updateStatus() {
    const { day, minutes } = laNow();
    const open = minutes >= OPEN_MIN && minutes < CLOSE_MIN;
    badge.textContent = open ? "Open now" : "Closed now";
    badge.classList.toggle("open", open);
    badge.classList.toggle("closed", !open);
    if (open) statusTime.textContent = "Closes at 5:00 PM today";
    else if (minutes < OPEN_MIN) statusTime.textContent = "Opens today at 10:00 AM";
    else statusTime.textContent = "Opens tomorrow at 10:00 AM";

    document.querySelectorAll("#hours-table tr").forEach((tr) => {
      tr.classList.toggle("today", Number(tr.dataset.day) === day);
    });
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);
})();
