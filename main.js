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
    var waveSpawned = 0;
    var waveSize = 0;
    var waveIndex = 0;
    var waveTailTimer = 0;
    var waveOverlapTarget = 2000;
    var nextSpawnGap = 300;
    var avoidZone = null;
    var FIELD_PAD = 80;
    var fieldH = 0;
    var mobileLayout = window.matchMedia("(max-width: 880px)");
    var RGB = "255,255,255";

    function isMobileLayout() {
      return mobileLayout.matches;
    }

    function maxButterflies() {
      return isMobileLayout() ? 7 : 12;
    }

    function trimToCap() {
      var cap = maxButterflies();
      while (butterflies.length > cap) {
        butterflies.pop();
      }
    }

    function lerpAngle(a, b, t) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return a + d * t;
    }

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
      var emerge = b.emerge != null ? b.emerge : 1;
      var flap = reduceMotion
        ? 0.7
        : (0.45 + 0.55 * Math.abs(Math.sin(t * 0.003 * b.flapSpeed + b.flapPhase))) *
          (0.62 + 0.38 * emerge);
      var bob = reduceMotion ? 0 : Math.sin(t * 0.00085 + b.pitchPhase) * 0.9 * emerge;

      ctx.save();
      ctx.translate(b.x, b.y + bob);
      ctx.rotate(b.renderAngle);
      ctx.scale(b.scale, b.scale);

      var a = b.alpha;
      if (emerge < 0.98) {
        ctx.shadowColor = "rgba(255,255,255," + (0.28 * (1 - emerge)) + ")";
        ctx.shadowBlur = 16 * (1 - emerge);
      }
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
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    function updateEmergence(b, dt) {
      b.age += dt;
      var t = Math.min(1, b.age / b.emergeMs);
      var eased = 1 - Math.pow(1 - t, 3);
      b.emerge = eased;
      b.alpha = b.targetAlpha * eased;
      b.scale = b.baseScale * (0.38 + 0.62 * eased);
      b.speed = b.targetSpeed * (0.42 + 0.58 * eased);
    }

    function makeButterfly(x, y, heading, emergeMs) {
      var targetAlpha = 0.14 + Math.random() * 0.1;
      var baseScale = 0.82 + Math.random() * 0.55;
      var targetSpeed = 0.4 + Math.random() * 0.12;
      return {
        x: x,
        y: y,
        heading: heading,
        baseHeading: heading,
        targetSpeed: targetSpeed,
        speed: targetSpeed * 0.58,
        vx: Math.cos(heading) * targetSpeed * 0.32,
        vy: Math.sin(heading) * targetSpeed * 0.32,
        baseScale: baseScale,
        scale: baseScale * 0.45,
        targetAlpha: targetAlpha,
        alpha: 0,
        emerge: 0,
        age: 0,
        emergeMs: emergeMs || 950 + Math.random() * 280,
        flapSpeed: 0.85 + Math.random() * 0.35,
        flapPhase: Math.random() * Math.PI * 2,
        pitchPhase: Math.random() * Math.PI * 2,
        wanderPhase: Math.random() * Math.PI * 2,
        renderAngle: heading + Math.PI / 2
      };
    }

    function randomSpawnY() {
      var margin = Math.max(28, fieldH * 0.08);
      var min = FIELD_PAD + margin;
      var max = FIELD_PAD + fieldH - margin;
      var y;
      var tries;
      var i;
      var other;
      var ok;
      var zoneTop;
      var zoneBottom;
      var aboveHi;
      var belowLo;

      if (isMobileLayout() && avoidZone) {
        zoneTop = avoidZone.top + FIELD_PAD;
        zoneBottom = avoidZone.bottom + FIELD_PAD;
        aboveHi = zoneTop - 20;
        belowLo = zoneBottom + 20;

        for (tries = 0; tries < 12; tries++) {
          if (aboveHi > min + 32 && (belowLo >= max - 32 || Math.random() < 0.52)) {
            y = min + Math.random() * (aboveHi - min);
          } else if (belowLo < max - 32) {
            y = belowLo + Math.random() * (max - belowLo);
          } else {
            y = min + Math.random() * (max - min);
          }

          ok = true;
          for (i = butterflies.length - 1; i >= Math.max(0, butterflies.length - 7); i--) {
            other = butterflies[i];
            if (Math.abs(other.y - y) < 38) {
              ok = false;
              break;
            }
          }
          if (ok) return y;
        }
        return min + Math.random() * (max - min);
      }

      for (tries = 0; tries < 10; tries++) {
        y = min + Math.random() * (max - min);
        ok = true;
        for (i = butterflies.length - 1; i >= Math.max(0, butterflies.length - 7); i--) {
          other = butterflies[i];
          if (Math.abs(other.y - y) < 38) {
            ok = false;
            break;
          }
        }
        if (ok) return y;
      }
      return min + Math.random() * (max - min);
    }

    function spawnFromRight() {
      var y = randomSpawnY();
      var x = w + 8 + Math.random() * 42;
      var hy = y - FIELD_PAD;
      var t = Math.max(0, Math.min(1, hy / Math.max(fieldH, 1)));
      var heading = Math.PI + (0.06 - t * 0.12) + (Math.random() - 0.5) * 0.16;
      return makeButterfly(x, y, heading, 820 + Math.random() * 520);
    }

    function updateAvoidZone() {
      var hero = document.getElementById("hero");
      var inner = document.querySelector(".hero__inner");
      if (!hero || !inner || !w) return;
      var hr = hero.getBoundingClientRect();
      var ir = inner.getBoundingClientRect();
      var pad = 10;

      if (isMobileLayout()) {
        var blocks = hero.querySelectorAll(".hero__name, .hero__prose, .hero__actions");
        var left = Infinity;
        var top = Infinity;
        var right = -Infinity;
        var bottom = -Infinity;
        var j;
        var br;

        pad = 30;
        for (j = 0; j < blocks.length; j++) {
          br = blocks[j].getBoundingClientRect();
          left = Math.min(left, br.left);
          top = Math.min(top, br.top);
          right = Math.max(right, br.right);
          bottom = Math.max(bottom, br.bottom);
        }

        avoidZone = {
          left: left - hr.left - pad,
          top: top - hr.top - pad,
          right: right - hr.left + pad,
          bottom: bottom - hr.top + pad,
          cx: (left + right) * 0.5 - hr.left,
          cy: (top + bottom) * 0.5 - hr.top
        };
        return;
      }

      avoidZone = {
        left: ir.left - hr.left - pad,
        top: ir.top - hr.top - pad,
        right: ir.right - hr.left + pad,
        bottom: ir.bottom - hr.top + pad,
        cx: (ir.left + ir.right) * 0.5 - hr.left,
        cy: (ir.top + ir.bottom) * 0.5 - hr.top
      };
    }

    function applyMobileContentAvoid(b, h) {
      var hy = b.y - FIELD_PAD;
      var buf = 46;
      var approach = 80;
      var inBand = hy > avoidZone.top - buf && hy < avoidZone.bottom + buf;
      var inApproach = b.x > avoidZone.left - approach && b.x < avoidZone.right + 36;

      if (!inBand || !inApproach) return h;

      var above = hy < avoidZone.cy;
      var steerY = above ? avoidZone.top - buf - 30 : avoidZone.bottom + buf + 30;
      var steerX = avoidZone.left - 28;
      var push = Math.atan2(steerY - hy, steerX - b.x);
      var dx = b.x - avoidZone.cx;
      var dy = hy - avoidZone.cy;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var blend = b.emerge < 0.88
        ? 0.6
        : Math.min(0.74, 0.44 + 170 / dist);

      return lerpAngle(h, push, blend);
    }

    function inTextZone(x, y, buffer) {
      if (!avoidZone) return false;
      var buf = buffer || 0;
      return (
        x > avoidZone.left - buf &&
        x < avoidZone.right + buf &&
        y > avoidZone.top - buf &&
        y < avoidZone.bottom + buf
      );
    }

    function clampTurn(current, goal, maxStep) {
      var d = goal - current;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (d > maxStep) return current + maxStep;
      if (d < -maxStep) return current - maxStep;
      return goal;
    }

    function desiredHeading(b, idx, list) {
      var h;

      if (b.emerge < 0.88) {
        b.wanderPhase += 0.0012;
        h = b.baseHeading + Math.sin(b.wanderPhase) * 0.022 * (1 - b.emerge);
      } else {
        b.wanderPhase += 0.0018;
        h = b.baseHeading + Math.sin(b.wanderPhase) * 0.028 +
          Math.sin(b.wanderPhase * 0.43 + 0.8) * 0.014;
      }

      if (isMobileLayout() && avoidZone) {
        h = applyMobileContentAvoid(b, h);
      } else if (avoidZone && inTextZone(b.x, b.y - FIELD_PAD, 10)) {
        var dx = b.x - avoidZone.cx;
        var dy = b.y - avoidZone.cy;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var push = Math.atan2(dy / dist, dx / dist);
        var blend = Math.min(0.32, 110 / dist);
        h = lerpAngle(h, push, blend);
      }

      var sepX = 0;
      var sepY = 0;
      var neighbors = 0;
      var minDist = 88;
      var i, other, sdx, sdy, sdist, force;

      for (i = 0; i < list.length; i++) {
        if (i === idx) continue;
        other = list[i];
        sdx = b.x - other.x;
        sdy = b.y - other.y;
        sdist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sdist > 0 && sdist < minDist) {
          force = (minDist - sdist) / minDist;
          sepX += (sdx / sdist) * force * force;
          sepY += (sdy / sdist) * force * force;
          neighbors++;
        }
      }

      if (neighbors > 0 && b.emerge >= 0.95 && b.y > FIELD_PAD + 32) {
        var skipSep = false;
        if (isMobileLayout() && avoidZone) {
          var mhy = b.y - FIELD_PAD;
          skipSep = (
            b.x > avoidZone.left - 64 &&
            b.x < avoidZone.right + 44 &&
            mhy > avoidZone.top - 52 &&
            mhy < avoidZone.bottom + 52
          );
        }
        if (!skipSep) {
          var sepAngle = Math.atan2(sepY, sepX);
          var sepBlend = Math.min(0.28, 0.08 + neighbors * 0.06);
          h = lerpAngle(h, sepAngle, sepBlend);
        }
      }

      return h;
    }

    function beginWave() {
      waveSpawned = 0;
      waveTailTimer = 0;
      if (isMobileLayout()) {
        if (waveIndex === 0) {
          waveSize = 1 + Math.floor(Math.random() * 2);
        } else if (waveIndex === 1) {
          waveSize = 2 + Math.floor(Math.random() * 2);
        } else {
          waveSize = 2 + Math.floor(Math.random() * 2);
        }
      } else if (waveIndex === 0) {
        waveSize = 2 + Math.floor(Math.random() * 2);
      } else if (waveIndex === 1) {
        waveSize = 2 + Math.floor(Math.random() * 2);
      } else {
        waveSize = 3 + Math.floor(Math.random() * 3);
      }
      waveOverlapTarget = waveIndex < 2
        ? 2600 + Math.random() * 500
        : 1500 + Math.random() * 450;
      nextSpawnGap = 360 + Math.random() * 280;
      waveIndex++;
    }

    function pushSpawn() {
      if (waveSpawned >= waveSize || butterflies.length >= maxButterflies()) return false;
      butterflies.push(spawnFromRight());
      waveSpawned++;
      nextSpawnGap = 260 + Math.random() * 380;
      if (waveSpawned >= waveSize) waveTailTimer = 0;
      return true;
    }

    function offscreen(b) {
      return b.x < -50 || b.y < -24 || b.y > h + 24;
    }

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      fieldH = Math.max(h - FIELD_PAD * 2, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawnTimer = 0;
      waveSpawned = 0;
      waveSize = 0;
      waveIndex = 0;
      waveTailTimer = 0;
      butterflies = [];
      updateAvoidZone();
      if (reduceMotion) {
        var count = isMobileLayout()
          ? Math.max(3, Math.min(5, Math.round(w / 180)))
          : Math.max(4, Math.min(6, Math.round(w / 160)));
        var i;
        var b;
        for (i = 0; i < count; i++) {
          b = spawnFromRight();
          b.x = w - 18 - Math.random() * 30;
          b.vx = 0;
          b.vy = 0;
          b.age = b.emergeMs;
          b.emerge = 1;
          b.alpha = b.targetAlpha;
          b.scale = b.baseScale;
          b.speed = b.targetSpeed;
          butterflies.push(b);
        }
      }
    }

    function tick(t, dt) {
      var i, b, goal, targetVx, targetVy;

      if (!reduceMotion) {
        spawnTimer += dt;

        if (!waveSize) beginWave();

        if (waveSpawned === 0) {
          pushSpawn();
        } else if (waveSpawned < waveSize && spawnTimer >= nextSpawnGap) {
          pushSpawn();
          spawnTimer = 0;
        } else if (waveSpawned >= waveSize) {
          waveTailTimer += dt;
          if (waveTailTimer >= waveOverlapTarget) {
            beginWave();
            pushSpawn();
          }
        }

        for (i = butterflies.length - 1; i >= 0; i--) {
          b = butterflies[i];
          updateEmergence(b, dt);
          goal = desiredHeading(b, i, butterflies);
          b.heading = clampTurn(b.heading, goal, 0.028);

          targetVx = Math.cos(b.heading) * b.speed;
          targetVy = Math.sin(b.heading) * b.speed;
          b.vx += (targetVx - b.vx) * 0.06;
          b.vy += (targetVy - b.vy) * 0.06;

          b.x += b.vx * dt * 0.065;
          b.y += b.vy * dt * 0.065;

          if (Math.abs(b.vx) + Math.abs(b.vy) > 0.012) {
            b.renderAngle = lerpAngle(
              b.renderAngle,
              Math.atan2(b.vy, b.vx) + Math.PI / 2,
              0.07
            );
          }

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
      spawnTimer = nextSpawnGap;
      if (!reduceMotion && butterflies.length === 0) {
        waveIndex = 0;
        beginWave();
        pushSpawn();
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
      rt = setTimeout(function () {
        size();
        updateAvoidZone();
        tick(performance.now(), 16);
      }, 180);
    });

    var heroInner = document.querySelector(".hero__inner");
    if (heroInner && "ResizeObserver" in window) {
      new ResizeObserver(function () { updateAvoidZone(); }).observe(heroInner);
    }

    if (mobileLayout.addEventListener) {
      mobileLayout.addEventListener("change", function () {
        updateAvoidZone();
        trimToCap();
      });
    } else if (mobileLayout.addListener) {
      mobileLayout.addListener(function () {
        updateAvoidZone();
        trimToCap();
      });
    }

    var hero = document.getElementById("hero");
    start();
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
