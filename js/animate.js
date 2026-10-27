/* =====================================================================
   RUMANO’ · animate
   A tiny stand-in for the Motion library: the browser's own Web
   Animations API does the work, so there is nothing heavy to download.
   animate(element, { property: value or [from, ..., to] },
           { duration, delay, ease, times })   (times in seconds)
   You should not need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  var NAMED = { linear: "linear", easeIn: "ease-in", easeOut: "ease-out", easeInOut: "ease-in-out" };
  function easing(e) {
    if (Array.isArray(e)) return "cubic-bezier(" + e.join(",") + ")";
    return NAMED[e] || "ease-out";
  }

  function animate(el, props, opts) {
    if (!el) return null;
    opts = opts || {};
    var keys = Object.keys(props), n = 1;
    keys.forEach(function (k) { if (Array.isArray(props[k])) n = Math.max(n, props[k].length); });
    var last = {};
    keys.forEach(function (k) { var v = props[k]; last[k] = Array.isArray(v) ? v[v.length - 1] : v; });

    // No animation support: jump straight to the end
    if (!el.animate) {
      keys.forEach(function (k) { el.style[k] = last[k]; });
      return null;
    }

    // A single value animates from wherever the element is now
    var ease = easing(opts.ease), frames = [];
    for (var i = 0; i < n; i++) {
      var f = {};
      keys.forEach(function (k) {
        var v = props[k];
        if (Array.isArray(v) && v.length === n) f[k] = v[i];
        else if (i === n - 1) f[k] = last[k];
      });
      if (n > 1) {
        if (opts.times) f.offset = opts.times[i];
        f.easing = ease; // like Motion, the curve applies to each step
      }
      frames.push(f);
    }

    // Take these properties over from any earlier animation, from where they are now
    var own = el.__anim || (el.__anim = {});
    var cs = getComputedStyle(el);
    keys.forEach(function (k) {
      var prev = own[k];
      if (!prev) return;
      el.style[k] = cs[k];
      delete prev.__props[k];
      if (!Object.keys(prev.__props).length) prev.cancel();
    });

    var a = el.animate(frames, {
      duration: (opts.duration == null ? 0.3 : opts.duration) * 1000,
      delay: (opts.delay || 0) * 1000,
      easing: n > 1 ? "linear" : ease,
      fill: "both"
    });
    a.__props = {};
    keys.forEach(function (k) { a.__props[k] = true; own[k] = a; });

    // Keep the end state as plain styles, then let the animation go
    a.onfinish = function () {
      Object.keys(a.__props).forEach(function (k) {
        el.style[k] = last[k];
        if (own[k] === a) delete own[k];
      });
      a.cancel();
    };
    return a;
  }

  window.RumanoAnimate = { animate: animate };
})();
