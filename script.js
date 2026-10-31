(function () {
  "use strict";

  /* ---------- Expand / collapse (case details, FAQ) ----------
     Content stays visible without JS; JS collapses it on load. */
  document.querySelectorAll(".toggle, .faq-q").forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (!panel) return;
    panel.hidden = btn.getAttribute("aria-expanded") !== "true";
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  });

  /* ---------- Lightbox ---------- */
  var dialog = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCap = document.getElementById("lb-cap");
  var lastTrigger = null;
  var canModal = dialog && typeof dialog.showModal === "function";

  document.querySelectorAll(".zoom").forEach(function (btn) {
    var img = btn.querySelector("img");
    var alt = img ? img.alt : "";
    btn.setAttribute("aria-label", alt + " 크게 보기");
    btn.addEventListener("click", function () {
      var src = btn.getAttribute("data-full");
      if (!canModal) { window.open(src, "_blank"); return; }
      lastTrigger = btn;
      lbImg.src = src;
      lbImg.alt = alt;
      lbCap.textContent = alt;
      dialog.showModal();
    });
  });
  if (canModal) {
    dialog.querySelector(".lb-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () {
      lbImg.removeAttribute("src");
      if (lastTrigger) lastTrigger.focus();
    });
  }

  /* ---------- Chip groups: single choice ---------- */
  function bindChips(group, onChange) {
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      group.querySelectorAll(".chip").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      onChange(btn.getAttribute("data-value"));
    });
  }

  /* ---------- Project list filters ---------- */
  var list = document.getElementById("proj-list");
  if (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll(".proj"));
    var search = document.getElementById("proj-search");
    var countEl = document.getElementById("result-count");
    var emptyEl = document.getElementById("proj-empty");
    var state = { status: "all", field: "all", q: "" };

    var counts = { all: items.length, done: 0, active: 0 };
    items.forEach(function (li) {
      counts[li.dataset.status]++;
      li._text = li.textContent.replace(/\s+/g, " ").toLowerCase();
    });
    document.querySelectorAll("[data-count]").forEach(function (el) {
      el.textContent = counts[el.getAttribute("data-count")];
    });

    var apply = function () {
      var q = state.q.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (li) {
        var ok = (state.status === "all" || li.dataset.status === state.status) &&
                 (state.field === "all" || li.dataset.field === state.field) &&
                 (!q || li._text.indexOf(q) !== -1);
        li.hidden = !ok;
        if (ok) shown++;
      });
      emptyEl.hidden = shown !== 0;
      countEl.textContent = "총 " + items.length + "건 중 " + shown + "건 (완료 " + counts.done + " · 진행 중 " + counts.active + ")";
    };

    document.querySelectorAll(".chips[data-filter]").forEach(function (group) {
      var key = group.getAttribute("data-filter");
      bindChips(group, function (v) { state[key] = v; apply(); });
    });
    search.addEventListener("input", function () { state.q = search.value; apply(); });
    apply();
  }

  /* ---------- Hyperz roster: country filter ---------- */
  var rosterChips = document.querySelector('[data-filter-target="roster"]');
  var roster = document.getElementById("roster");
  if (rosterChips && roster) {
    var rows = roster.querySelectorAll("tbody tr");
    bindChips(rosterChips, function (v) {
      rows.forEach(function (tr) { tr.hidden = v !== "all" && tr.dataset.c !== v; });
    });
  }

  /* ---------- Hyperz roster: photo on hover / focus / tap ---------- */
  var preview = document.getElementById("cr-preview");
  if (preview && roster) {
    var pvImg = preview.querySelector("img");
    var pvName = preview.querySelector("span");
    var current = null;
    var place = function (btn) {
      var r = btn.getBoundingClientRect();
      var w = preview.offsetWidth, h = preview.offsetHeight, gap = 12;
      var left = r.right + gap;
      if (left + w > window.innerWidth - 8) left = Math.max(8, r.left);
      var top = r.top + r.height / 2 - h / 2;
      if (left === Math.max(8, r.left)) top = r.top - h - gap; // no room on the right: show above
      if (top < 8) top = r.bottom + gap;
      top = Math.min(top, window.innerHeight - h - 8);
      preview.style.left = left + "px";
      preview.style.top = Math.max(8, top) + "px";
    };
    var show = function (btn) {
      if (current && current !== btn) current.setAttribute("aria-expanded", "false");
      current = btn;
      btn.setAttribute("aria-expanded", "true");
      pvImg.src = btn.getAttribute("data-photo");
      pvImg.alt = btn.textContent + " 사진";
      pvName.textContent = btn.textContent;
      preview.hidden = false;
      place(btn);
    };
    var hide = function () {
      if (current) current.setAttribute("aria-expanded", "false");
      current = null;
      preview.hidden = true;
    };
    roster.querySelectorAll(".cr-name").forEach(function (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("mouseenter", function () { show(btn); });
      btn.addEventListener("mouseleave", hide);
      btn.addEventListener("focus", function () { show(btn); });
      btn.addEventListener("blur", hide);
      btn.addEventListener("click", function () { show(btn); });
    });
    document.addEventListener("pointerdown", function (e) {
      if (!e.target.closest || !e.target.closest(".cr-name")) hide();
    });
    // Photos are small; warm them up once the list is near so the first hover is instant.
    if ("IntersectionObserver" in window) {
      var warm = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        roster.querySelectorAll(".cr-name").forEach(function (b) { new Image().src = b.getAttribute("data-photo"); });
        warm.disconnect();
      }, { rootMargin: "400px" });
      warm.observe(roster);
    }
    window.addEventListener("scroll", hide, { passive: true });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  }

  /* ---------- Current section in nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-list a"));
  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove("is-current"); a.removeAttribute("aria-current"); });
        var a = byId[en.target.id];
        if (a) { a.classList.add("is-current"); a.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navIo.observe(s);
    });
  }

  /* ---------- Entrance: staggered rise, once ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.forEach(function (en, i) {
        en.target.style.transitionDelay = Math.min(i * 70, 350) + "ms";
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }
  // A fast scroll or an anchor jump can carry an element past the viewport between frames,
  // so the observer never sees it. Anything above the bottom of the screen is shown regardless.
  var pending = false;
  function sweep() {
    pending = false;
    var limit = window.innerHeight;
    reveals.forEach(function (el) {
      if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < limit) el.classList.add("is-in");
    });
  }
  window.addEventListener("scroll", function () {
    if (!pending) { pending = true; requestAnimationFrame(sweep); }
  }, { passive: true });
  window.addEventListener("hashchange", sweep);
  sweep();
})();
