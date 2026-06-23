/* ============================================================
   Nilla Orina — site interactions
   1. Emergent node/edge network (hero canvas)
   2. Scroll reveal + active nav + sticky header
   3. Mobile menu
   4. Photography gallery + lightbox
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------
     PHOTOGRAPHY — single source of truth.
     To use real photos: set `src` to a file in /images, e.g.
       { src: "images/golden-hour.jpg", caption: "Golden hour", size: "tall" }
     With no `src`, an on-theme gradient placeholder is drawn.
     size: "" | "tall" | "wide"  (controls grid span)
     ----------------------------------------------------------- */
  var PHOTOS = [
    { src: "", caption: "Light & shadow",   grad: "linear-gradient(145deg,#1d2b4d,#0c1426 60%,#36223f)", size: "tall" },
    { src: "", caption: "Portrait",         grad: "linear-gradient(145deg,#3a2330,#160f1f 65%,#0f1b2e)", size: "" },
    { src: "", caption: "City, after rain", grad: "linear-gradient(145deg,#13314a,#0a141f 60%,#1c2c3a)", size: "wide" },
    { src: "", caption: "Texture study",    grad: "linear-gradient(145deg,#2e2740,#10131f 60%,#243a44)", size: "" },
    { src: "", caption: "Golden hour",      grad: "linear-gradient(145deg,#4a3420,#1a1410 55%,#2a2438)", size: "" },
    { src: "", caption: "Long exposure",    grad: "linear-gradient(145deg,#102a3a,#0a1018 60%,#202a45)", size: "tall" },
    { src: "", caption: "Street",           grad: "linear-gradient(145deg,#2a3450,#0d1320 65%,#3a2a34)", size: "" },
    { src: "", caption: "Quiet geometry",   grad: "linear-gradient(145deg,#1a3340,#0b121d 60%,#312842)", size: "wide" }
  ];

  /* ===========================================================
     1. NETWORK CANVAS
     =========================================================== */
  function initNetwork() {
    var canvas = document.getElementById("network");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, dpr = 1;
    var nodes = [];
    var raf = null, running = false;
    var pointer = { x: 0, y: 0, active: false };

    var WARM = "244,184,96";
    var COOL = "90,209,227";
    var MIX  = "150,170,220";

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var target = Math.round((w * h) / 15500);
      var count = Math.max(26, Math.min(86, target));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.6,
          warm: Math.random() < 0.42,
          tw: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var maxD = Math.min(185, Math.max(125, w * 0.12));
      var maxD2 = maxD * maxD;
      var i, j, a, b;

      // edges
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;

        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            var d = Math.sqrt(d2);
            var alpha = (1 - d / maxD) * 0.45;
            var col = a.warm === b.warm ? (a.warm ? WARM : COOL) : MIX;
            ctx.strokeStyle = "rgba(" + col + "," + alpha + ")";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // pointer links — meaning forming around the cursor
        if (pointer.active) {
          var px = a.x - pointer.x, py = a.y - pointer.y;
          var pd2 = px * px + py * py;
          var pr = 210;
          if (pd2 < pr * pr) {
            var pd = Math.sqrt(pd2);
            var pa = (1 - pd / pr) * 0.55;
            ctx.strokeStyle = "rgba(" + (a.warm ? WARM : COOL) + "," + pa + ")";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        var tw = 0.6 + 0.4 * Math.sin(t * 0.001 + a.tw);
        ctx.fillStyle = "rgba(" + (a.warm ? WARM : COOL) + "," + (0.45 * tw + 0.2) + ")";
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(t) {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || reduceMotion) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    size();
    if (reduceMotion) { draw(0); }

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); if (reduceMotion) draw(0); }, 180);
    });

    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    });
    canvas.addEventListener("pointerleave", function () { pointer.active = false; });

    var hero = document.getElementById("hero");
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? start() : stop(); });
      }, { threshold: 0 }).observe(hero);
    } else {
      start();
    }
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }

  /* ===========================================================
     2. STICKY HEADER + SCROLL REVEAL + ACTIVE NAV
     =========================================================== */
  function initScroll() {
    var header = document.querySelector(".site-header");
    function onScroll() {
      if (window.scrollY > 24) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var reveals = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }

    // active nav link
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute("href").replace("#", "");
      if (id) map[id] = l;
    });
    var sections = document.querySelectorAll("main section[id]");
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && map[e.target.id]) {
            links.forEach(function (l) { l.classList.remove("is-active"); });
            map[e.target.id].classList.add("is-active");
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ===========================================================
     3. MOBILE MENU
     =========================================================== */
  function initMenu() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    if (!nav || !toggle) return;
    function close() { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav__link").forEach(function (l) {
      l.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ===========================================================
     4. GALLERY + LIGHTBOX
     =========================================================== */
  function initGallery() {
    var grid = document.getElementById("gallery");
    if (!grid) return;

    PHOTOS.forEach(function (p, idx) {
      var btn = document.createElement("button");
      btn.className = "shot" + (p.size === "wide" ? " shot--wide" : "");
      btn.setAttribute("aria-label", "View photograph: " + p.caption);
      btn.dataset.index = idx;

      var imgWrap = document.createElement("span");
      imgWrap.className = "shot__img";
      if (p.src) {
        var img = document.createElement("img");
        img.src = p.src;
        img.alt = p.caption;
        img.loading = "lazy";
        imgWrap.appendChild(img);
      } else {
        var ph = document.createElement("span");
        ph.style.background = p.grad;
        imgWrap.appendChild(ph);
      }
      btn.appendChild(imgWrap);

      var cap = document.createElement("span");
      cap.className = "shot__cap";
      cap.textContent = p.caption;
      btn.appendChild(cap);

      btn.addEventListener("click", function () { openLightbox(idx); });
      grid.appendChild(btn);
    });

    var lb = document.getElementById("lightbox");
    var frame = document.getElementById("lb-frame");
    var capEl = document.getElementById("lb-cap");
    var countEl = document.getElementById("lb-count");
    var current = 0;
    var lastFocus = null;

    function render() {
      var p = PHOTOS[current];
      frame.innerHTML = "";
      if (p.src) {
        var img = document.createElement("img");
        img.src = p.src; img.alt = p.caption;
        frame.appendChild(img);
      } else {
        var span = document.createElement("span");
        span.style.background = p.grad;
        frame.appendChild(span);
      }
      capEl.textContent = p.caption;
      countEl.textContent = (current + 1) + " / " + PHOTOS.length;
    }
    function openLightbox(i) {
      current = i;
      lastFocus = document.activeElement;
      render();
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add("open"); });
      document.body.style.overflow = "hidden";
      document.getElementById("lb-close").focus();
    }
    function close() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { lb.hidden = true; }, 350);
      if (lastFocus) lastFocus.focus();
    }
    function step(dir) {
      current = (current + dir + PHOTOS.length) % PHOTOS.length;
      render();
    }

    document.getElementById("lb-close").addEventListener("click", close);
    document.getElementById("lb-prev").addEventListener("click", function () { step(-1); });
    document.getElementById("lb-next").addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });
  }

  /* ===========================================================
     INIT
     =========================================================== */
  function init() {
    initNetwork();
    initScroll();
    initMenu();
    initGallery();
    // stamp the live year in the footer
    var y = document.querySelector(".foot__year");
    if (y) y.textContent = "© " + new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
