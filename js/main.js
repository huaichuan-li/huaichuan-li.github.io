// ============ SIGNAL DEEP · 交互脚本 ============
(function () {
  "use strict";

  // ---- 导航滚动状态 ----
  var nav = document.getElementById("nav");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- 语言切换 ----
  var langToggle = document.getElementById("langToggle");
  function afterLangChange() {
    // 中英文字数差异会改变页面高度，通知深海引擎重算分段坐标
    setTimeout(function () {
      if (typeof window.SEA_RELAYOUT === "function") window.SEA_RELAYOUT();
    }, 120);
  }
  langToggle.addEventListener("click", function () {
    var toEn = !document.body.classList.contains("en");
    document.body.classList.toggle("en", toEn);
    document.documentElement.lang = toEn ? "en" : "zh-CN";
    langToggle.textContent = toEn ? "中" : "EN";
    try { localStorage.setItem("lemon-lang", toEn ? "en" : "zh"); } catch (e) {}
    afterLangChange();
  });
  try {
    if (localStorage.getItem("lemon-lang") === "en") {
      document.body.classList.add("en");
      document.documentElement.lang = "en";
      langToggle.textContent = "中";
    }
  } catch (e) {}

  // ---- 浅海 / 深空星图切换 ----
  var skyToggle = document.getElementById("skyToggle");
  function paintSkyBtn() {
    if (!skyToggle) return;
    var abyss = document.body.classList.contains("abyss");
    skyToggle.textContent = abyss ? "☀" : "☾";
    var tip = abyss ? "切回浅海" : "切换深空星图";
    skyToggle.title = tip;
    skyToggle.setAttribute("aria-label", tip);
  }
  if (skyToggle) {
    skyToggle.addEventListener("click", function () {
      var toAbyss = !document.body.classList.contains("abyss");
      document.body.classList.toggle("abyss", toAbyss);
      try { localStorage.setItem("lemon-sky", toAbyss ? "abyss" : "day"); } catch (e) {}
      paintSkyBtn();
      if (typeof window.COSMOS_RETHEME === "function") window.COSMOS_RETHEME();
      if (typeof window.SEA_RETHEME === "function") window.SEA_RETHEME();
      afterLangChange();
    });
    paintSkyBtn();
  }

  // ---- 移动端菜单 ----
  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  burger.addEventListener("click", function () {
    burger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      burger.classList.remove("open");
    }
  });

  // ---- Scrollspy：高亮当前章节 ----
  var sections = document.querySelectorAll("section[id], header[id]");
  var linkMap = {};
  navLinks.querySelectorAll("a[href^='#']").forEach(function (a) {
    linkMap[a.getAttribute("href").slice(1)] = a;
  });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.querySelectorAll("a").forEach(function (a) { a.classList.remove("active"); });
        if (linkMap[id]) linkMap[id].classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(function (s) { spy.observe(s); });

  // ---- 入场动画 ----
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  // ---- 奖项筛选 ----
  var filterBtns = document.querySelectorAll(".filter-btn");
  var awards = document.querySelectorAll("#awardsGrid > div");
  function applyFilter(cat) {
    awards.forEach(function (a) {
      var match = cat === "all" || a.classList.contains("award-" + cat);
      a.classList.toggle("hidden", !match);
    });
  }
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      applyFilter(btn.getAttribute("data-filter"));
    });
  });
  applyFilter("all");
})();
