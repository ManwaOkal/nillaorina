/* ============================================================
   Nilla Orina — site interactions
   1. Butterfly field (hero canvas — soft emergent silhouettes)
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
    { src: "", caption: "Light & shadow",   grad: "linear-gradient(145deg,#4c1d95,#0c0c0f 55%,#1e3a5f)", size: "tall" },
    { src: "", caption: "Portrait",         grad: "linear-gradient(145deg,#6b21a8,#0c0c0f 60%,#312e81)", size: "" },
    { src: "", caption: "City, after rain", grad: "linear-gradient(145deg,#3730a3,#0c0c0f 55%,#0e7490)", size: "wide" },
    { src: "", caption: "Texture study",    grad: "linear-gradient(145deg,#581c87,#0c0c0f 60%,#1e1b4b)", size: "" },
    { src: "", caption: "Golden hour",      grad: "linear-gradient(145deg,#7c3aed,#0c0c0f 50%,#a855f7)", size: "" },
    { src: "", caption: "Long exposure",    grad: "linear-gradient(145deg,#1d4ed8,#0c0c0f 55%,#6d28d9)", size: "tall" },
    { src: "", caption: "Street",           grad: "linear-gradient(145deg,#5b21b6,#0c0c0f 60%,#164e63)", size: "" },
    { src: "", caption: "Quiet geometry",   grad: "linear-gradient(145deg,#4338ca,#0c0c0f 55%,#7e22ce)", size: "wide" }
  ];

  /* ===========================================================
     1. BUTTERFLIES — spawn off-screen, glide across hero, recycle
     =========================================================== */
  function initButterflies() {
    var canvas = document.getElementById("hero-field");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, dpr = 1;
    var butterflies = [];
    var raf = null;
    var running = false;
    var lastT = 0;
    var spawnTimer = 0;

    var RGB = "255,255,255";
    var MAX = 14;
    var EDGES = ["bottom-left", "bottom-right", "left", "right", "top-left", "top-right"];

    function wing(ctx, side, flap, alpha) {
      var s = side;
      var f = Math.max(0.35, flap);
      ctx.fillStyle = "rgba(" + RGB + "," + alpha + ")";
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.bezierCurveTo(s * 16 * f, -14 * f, s * 26 * f, -7 * f, s * 20 * f, 5);
      ctx.bezierCurveTo(s * 13 * f, 11, s * 5, 6, 0, -1);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.bezierCurveTo(s * 11 * f, 5, s * 18 * f, 16, s * 11 * f, 18);
      ctx.bezierCurveTo(s * 5, 15, s * 2, 9, 0, 2);
      ctx.fill();
    }

    function drawOne(b, t) {
      var flap = reduceMotion
        ? 0.7
        : 0.45 + 0.55 * Math.abs(Math.sin(t * 0.003 * b.flapSpeed + b.flapPhase));
      var bob = reduceMotion ? 0 : Math.sin(t * 0.0011 + b.pitchPhase) * 1.4;

      ctx.save();
      ctx.translate(b.x, b.y + bob);
      ctx.rotate(b.heading + Math.PI / 2);
      ctx.scale(b.scale, b.scale);

      var a = b.alpha;
      ctx.strokeStyle = "rgba(" + RGB + "," + (a * 0.9) + ")";
      ctx.lineWidth = 0.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(-1.4, -13, -2.5, -14);
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(1.4, -13, 2.5, -14);
      ctx.stroke();

      wing(ctx, -1, flap, a * 0.82);
      wing(ctx, 1, flap, a * 0.82);
      ctx.restore();
    }

    function makeButterfly(x, y, heading) {
      var speed = 0.5 + Math.random() * 0.45;
      var alpha = 0.14 + Math.random() * 0.14;
      return {
        x: x,
        y: y,
        heading: heading,
        speed: speed,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        scale: 0.75 + Math.random() * 0.95,
        alpha: alpha,
        flapSpeed: 1 + Math.random() * 0.7,
        flapPhase: Math.random() * Math.PI * 2,
        pitchPhase: Math.random() * Math.PI * 2,
        wanderPhase: Math.random() * Math.PI * 2,
        wanderAmp: 0.05 + Math.random() * 0.07,
        turnEase: 0.01 + Math.random() * 0.008,
        lift: -0.01 - Math.random() * 0.012
      };
    }

    function spawnInView() {
      var heading = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      return makeButterfly(
        w * (0.08 + Math.random() * 0.84),
        h * (0.1 + Math.random() * 0.78),
        heading
      );
    }

    function spawn(edge) {
      var e = edge || EDGES[Math.floor(Math.random() * EDGES.length)];
      var heading;
      var x;
      var y;

      if (e === "bottom-left") {
        x = w * (0.05 + Math.random() * 0.38);
        y = h + 24 + Math.random() * 55;
        heading = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
      } else if (e === "bottom-right") {
        x = w * (0.57 + Math.random() * 0.38);
        y = h + 24 + Math.random() * 55;
        heading = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
      } else if (e === "left") {
        x = -24 - Math.random() * 28;
        y = h * (0.2 + Math.random() * 0.65);
        heading = 0.12 + (Math.random() - 0.5) * 0.28;
      } else if (e === "right") {
        x = w + 24 + Math.random() * 28;
        y = h * (0.2 + Math.random() * 0.65);
        heading = Math.PI - 0.12 + (Math.random() - 0.5) * 0.28;
      } else if (e === "top-left") {
        x = w * (0.08 + Math.random() * 0.32);
        y = -20 - Math.random() * 28;
        heading = Math.PI / 2 - 0.15 + (Math.random() - 0.5) * 0.22;
      } else {
        x = w * (0.6 + Math.random() * 0.32);
        y = -20 - Math.random() * 28;
        heading = Math.PI / 2 + 0.15 + (Math.random() - 0.5) * 0.22;
      }

      return makeButterfly(x, y, heading);
    }

    var emergeQueue = [];
    var EMERGE_EDGES = [
      "bottom-left", "bottom-right", "bottom-left", "bottom-right",
      "left", "right", "bottom-left", "bottom-right"
    ];

    function queueEmergence() {
      emergeQueue = EMERGE_EDGES.slice();
    }

    function stepEmergence() {
      if (!emergeQueue.length) return;
      butterflies.push(spawn(emergeQueue.shift()));
    }

    function offscreen(b) {
      var pad = 80;
      return b.x < -pad || b.x > w + pad || b.y < -pad || b.y > h + pad;
    }

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawnTimer = 0;
      emergeQueue = [];
      butterflies = [];
      if (reduceMotion) {
        var count = Math.max(5, Math.min(8, Math.round(w / 140)));
        var i;
        for (i = 0; i < count; i++) {
          var b = spawnInView();
          b.x = w * (0.52 + (i / Math.max(count - 1, 1)) * 0.35);
          b.y = h * (0.2 + (i % 3) * 0.24);
          butterflies.push(b);
        }
      }
    }

    function tick(t, dt) {
      var i, b, targetHeading, turn;

      if (!reduceMotion) {
        spawnTimer += dt;
        if (emergeQueue.length && spawnTimer > 320) {
          stepEmergence();
          spawnTimer = 0;
        } else if (!emergeQueue.length && butterflies.length < MAX && spawnTimer > 750) {
          butterflies.push(spawn());
          spawnTimer = 0;
        }

        for (i = butterflies.length - 1; i >= 0; i--) {
          b = butterflies[i];
          b.wanderPhase += dt * 0.0004;
          targetHeading = b.heading +
            Math.sin(b.wanderPhase) * b.wanderAmp +
            Math.sin(b.wanderPhase * 0.5 + 1.2) * (b.wanderAmp * 0.4);

          turn = targetHeading - b.heading;
          while (turn > Math.PI) turn -= Math.PI * 2;
          while (turn < -Math.PI) turn += Math.PI * 2;
          b.heading += turn * b.turnEase;

          b.vx = Math.cos(b.heading) * b.speed;
          b.vy = Math.sin(b.heading) * b.speed + b.lift;

          b.x += b.vx * dt * 0.06;
          b.y += b.vy * dt * 0.06;

          if (offscreen(b)) {
            butterflies.splice(i, 1);
          }
        }
      }

      ctx.clearRect(0, 0, w, h);
      for (i = 0; i < butterflies.length; i++) {
        drawOne(butterflies[i], t);
      }
    }

    function frame(t) {
      if (!running) return;
      var dt = lastT ? Math.min(t - lastT, 48) : 16;
      lastT = t;
      tick(t, dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      lastT = 0;
      spawnTimer = 0;
      if (!reduceMotion && butterflies.length === 0) {
        queueEmergence();
      }
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      lastT = 0;
    }

    size();
    tick(0, 16);

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); tick(performance.now(), 16); }, 180);
    });

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

  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;

    var showRatio = 0.65;
    var hideNearTop = 120;

    function onScroll() {
      var scrollTop = window.scrollY;
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
      var show = scrollTop > hideNearTop && ratio >= showRatio;

      btn.classList.toggle("is-visible", show);
      btn.setAttribute("tabindex", show ? "0" : "-1");
    }

    btn.addEventListener("click", function () {
      var top = document.getElementById("top");
      if (top) {
        top.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ===========================================================
     2. STICKY HEADER + SCROLL REVEAL + ACTIVE NAV
     =========================================================== */
  function initScroll() {
    var header = document.querySelector(".site-header");
    var cue = document.querySelector(".scroll-cue");

    function onScroll() {
      if (window.scrollY > 24) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
      if (cue) cue.classList.toggle("is-hidden", window.scrollY > 48);
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
      }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
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
    var header = document.getElementById("site-header");
    var panel = document.getElementById("nav-panel");
    var toggle = document.querySelector(".nav__toggle");
    var backdrop = document.getElementById("nav-backdrop");
    if (!header || !toggle) return;

    var scrollY = 0;

    function isMobile() {
      return window.matchMedia("(max-width: 880px)").matches;
    }

    function setOpen(open) {
      if (open && !isMobile()) return;

      header.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

      if (panel) panel.setAttribute("aria-hidden", open ? "false" : "true");
      if (backdrop) backdrop.setAttribute("aria-hidden", open ? "false" : "true");

      if (open) {
        scrollY = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = "-" + scrollY + "px";
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        if (scrollY) window.scrollTo(0, scrollY);
      }
    }

    function close() { setOpen(false); }

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("menu-open"));
    });

    if (backdrop) {
      backdrop.addEventListener("click", close);
    }

    header.querySelectorAll(".nav__link").forEach(function (l) {
      l.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (!isMobile()) {
        close();
        if (panel) panel.removeAttribute("aria-hidden");
      } else if (!header.classList.contains("menu-open") && panel) {
        panel.setAttribute("aria-hidden", "true");
      }
    });

    if (isMobile() && panel) {
      panel.setAttribute("aria-hidden", "true");
    }
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
    initButterflies();
    initBackToTop();
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
