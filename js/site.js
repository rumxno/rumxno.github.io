/* =====================================================================
   RUMANO’ · builds the story from stories.js and runs the film:
   the opening, the fixed background frames, the line reveals,
   the phone conversation, the ending takeover, the rain and the lightning.
   You should not need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var M = window.RumanoAnimate;
  var STORIES = window.STORIES || [];
  var TAKEOVER = window.TAKEOVER || null;
  // Christine's phone doesn't know who is writing; the takeover at the end reveals it
  var PHONE_SENDER = window.PHONE_SENDER || window.SENDER || { en: "Unknown number", it: "Numero sconosciuto" };
  var TAKE_SENDER = window.TAKEOVER_SENDER || PHONE_SENDER;
  var motionOn = !!(M && root.classList.contains("js-motion"));
  var EASE = [0.22, 1, 0.36, 1];
  var EASE_OUT = [0.23, 1, 0.32, 1]; // strong ease-out for small interface replies
  // Reduced motion: nothing moves, but pictures still dissolve instead of cutting hard
  var calm = !!(M && !motionOn && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function pair(p, cls) {
    if (!p) return "";
    return '<p class="line ' + (cls || "") + '"><span class="band" aria-hidden="true"></span><span class="en">' + esc(p.en) + "</span>" +
      (p.it ? '<span class="it" lang="it">' + esc(p.it) + "</span>" : "") + "</p>";
  }
  // A story id that is safe in a link: "La Caduta" becomes "la-caduta"
  function slug(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "story";
  }
  function filled(ln) { return !!(ln && String(ln.en == null ? "" : ln.en).trim()); }
  function isMessage(ln) { return !!(ln && ln.type === "message"); }
  function isPlain(ln) { return !!(ln && !ln.phone && !isMessage(ln) && filled(ln)); }

  /* ------------------------------------------------------- phone screens */
  // The same plain messaging screen is used twice: the narrator's phone, and the
  // reader's at the end. The words are drawn here; the scrolling plays them.
  function bubbles(msgs) {
    return msgs.map(function (m, i) {
      return '<li class="msg ' + (m.from === "me" ? "me" : "them") + '" data-i="' + i + '"><p class="bubble">' +
        '<span class="m-en">' + esc(m.en) + "</span>" +
        (m.it ? '<span class="m-it" lang="it">' + esc(m.it) + "</span>" : "") + "</p></li>";
    }).join("");
  }
  // Screen readers get the conversation as plain text, since the screen itself only shows what has been scrolled to
  function transcript(msgs, contact) {
    return '<ol class="visually-hidden">' + msgs.map(function (m) {
      return "<li>" + esc(m.from === "me" ? "Me" : contact.en) + ": " + esc(m.en) +
        (m.it ? ' <span lang="it">' + esc(m.it) + "</span>" : "") + "</li>";
    }).join("") + "</ol>";
  }
  function screenHTML(kind, contact, msgs, button, hint) {
    var first = msgs[0] ? msgs[0].en : "";
    return '<div class="phone-view gone" data-kind="' + kind + '">' +
      '<div class="phone-bg"></div>' +
      (kind === "phone" ?
        '<div class="notif" aria-hidden="true"><span class="notif-app"></span>' +
          '<span class="notif-text"><span class="notif-top"><b>' + esc(contact.en) + "</b><span>now</span></span>" +
          '<span class="notif-msg">' + esc(first) + "</span></span></div>" : "") +
      '<div class="convo">' +
        '<div class="convo-head" aria-hidden="true"><span class="avatar' + (contact.mark ? " mark" : "") + '">' + esc(contact.mark || "?") + '</span><span class="who">' +
          '<span class="who-en">' + esc(contact.en) + "</span>" + (contact.it ? '<span class="who-it" lang="it">' + esc(contact.it) + "</span>" : "") + "</span></div>" +
        '<ol class="msgs" aria-hidden="true">' + bubbles(msgs) +
          '<li class="typing"><span></span><span></span><span></span></li>' +
          '<li class="delivered">Delivered · <span lang="it">Consegnato</span></li></ol>' +
        (button ? '<a class="follow cta" href="' + esc(button.href) + '" rel="noopener" target="_blank">' +
          '<span class="follow-en">' + esc(button.en) + '</span><span class="follow-it" lang="it">' + esc(button.it) + "</span></a>" : "") +
        // the way out of the hack: it should look like the system breaking down, not like a button
        (hint ? '<div class="exit-hint" aria-hidden="true"><span class="hint-en">' + esc(hint.en) + "</span>" +
          '<span class="hint-it" lang="it">' + esc(hint.it) + '</span><span class="hint-arrow"></span></div>' : "") +
        '<div class="convo-input' + (kind === "takeover" ? " broken" : "") + '" aria-hidden="true"><span class="field"><span class="typed"></span><span class="placeholder">Message</span></span><span class="send"></span></div>' +
      "</div></div>";
  }

  /* ------------------------------------------------------------ build */
  var FRAMES = {};
  var PHONES = [];   // { el, msgs, contact } for each phone section
  var hookText = null;

  // No screen is ever pure black while scrolling: "dim" only darkens the
  // current picture (0 = full picture, 0.8 = a faint picture under the words).
  function beat(cls, scene, rain, dim, extra, inner) {
    return '<div class="beat' + (cls ? " " + cls : "") + '" data-scene="' + esc(scene) + '" data-rain="' + esc(rain) +
      '" data-dim="' + dim + '"' + (extra || "") + ">" + (inner || "") + "</div>";
  }

  function build() {
    var html = "", lastFrame = "hero", lastDim = 0;
    STORIES.forEach(function (story) {
      (story.frames || []).forEach(function (f) { FRAMES[f.id] = f; });
      var frame = "hero", rain = "steady", dim = 0;
      // The title shrinks to fit its longest word, so a long one-word title never runs off a phone
      var longest = String(story.title || "").split(/\s+/).reduce(function (m, w) { return Math.max(m, w.length); }, 0);
      html += '<section class="story" id="' + esc(slug(story.id || story.title)) + '" aria-label="' + esc(story.title) + '">';
      html += beat("title-card", "hero", "steady", 0.7, "",
        '<div class="title-block"><h2 class="story-title r" style="--chars:' + longest + '">' + esc(story.title) + "</h2>" +
        (story.subtitle ? '<p class="story-subtitle r" lang="it">' + esc(story.subtitle) + "</p>" : "") + "</div>");

      var lines = story.lines || [];
      var last = -1;
      lines.forEach(function (ln, n) { if (isPlain(ln)) last = n; });
      var phone = null;

      function closePhone() {
        if (!phone) return;
        var id = PHONES.length;
        PHONES.push({ msgs: phone.msgs, contact: PHONE_SENDER });
        html += '<section class="phone" data-phone-id="' + id + '" aria-label="' + esc(PHONE_SENDER.en) + '">' +
          transcript(phone.msgs, PHONE_SENDER) + screenHTML("phone", PHONE_SENDER, phone.msgs) + phone.steps + "</section>";
        phone = null;
      }

      lines.forEach(function (ln, n) {
        if (!ln) return;
        if (ln.frame && ln.frame !== "hero" && !FRAMES[ln.frame]) {
          console.warn("stories.js: line " + (n + 1) + " of “" + story.title + "” asks for frame “" + ln.frame + "”, which is not in its frames list.");
        }
        if (ln.frame && (ln.frame === "hero" || FRAMES[ln.frame])) frame = ln.frame;
        if (ln.rain) rain = ln.rain;
        if (typeof ln.dim === "number") dim = ln.dim;

        if (ln.phone === "start") {
          closePhone();
          // The first step is the notification sliding down over the last picture; the rain stops
          phone = { msgs: [], steps: beat("step", frame, "none", dim, ' data-phone="0" data-phone-of="' + PHONES.length + '"') };
          return;
        }
        if (ln.phone === "end") { closePhone(); return; }
        if (isMessage(ln)) {
          if (!phone) {
            console.warn("stories.js: line " + (n + 1) + " of “" + story.title + "” is a message outside a phone section, so it is shown as a normal line.");
          } else {
            if (!filled(ln)) return;
            phone.msgs.push({ from: ln.from === "me" ? "me" : "them", en: ln.en, it: ln.it, typed: !!ln.typed });
            phone.steps += beat("step", frame, "none", dim, ' data-phone="' + phone.msgs.length + '" data-phone-of="' + PHONES.length + '"');
            return;
          }
        }
        if (!filled(ln)) return; // an empty line would leave a blank screen; its frame and rain still carry on
        closePhone();
        var hook = n === last; // the story ends on its cliffhanger
        html += beat(hook ? "hook-beat" : "", frame, rain, dim, "", pair(ln, "r passing" + (hook ? " hook" : "")));
      });
      closePhone();
      html += "</section>";
      lastFrame = frame;
      lastDim = dim;
    });

    // The ending: the page itself gets hacked and the sender writes to the reader
    if (TAKEOVER && TAKEOVER.messages && TAKEOVER.messages.length) {
      var msgs = TAKEOVER.messages.filter(filled).map(function (m) { return { from: m.from === "me" ? "me" : "them", en: m.en, it: m.it, typed: !!m.typed }; });
      var steps = "";
      // The first message arrives with the glitch, so there is no empty screen; then one per scroll.
      // The last step holds the button and the way out.
      for (var k = 1; k <= msgs.length; k++) steps += beat("step" + (k === msgs.length ? " last" : ""), lastFrame, "none", lastDim, ' data-take="' + k + '"');
      html += '<section class="takeover" aria-label="' + esc(TAKE_SENDER.en) + '">' + transcript(msgs, TAKE_SENDER) +
        screenHTML("takeover", TAKE_SENDER, msgs, TAKEOVER.button, TAKEOVER.hint) + '<div class="scanline" aria-hidden="true"></div>' + steps + "</section>";
      TAKEOVER._msgs = msgs;
    }

    $("#story").innerHTML = html;
    // The closing sits over a faint last frame, with light rain
    var closing = $(".closing");
    if (closing) closing.setAttribute("data-scene", lastFrame);
  }

  /* ------------------------------------------------------------ stage */
  var stage = $(".stage");
  var hero = $(".hero-layer", stage);
  var heroImg = $(".hero-still", stage);
  var layers = stage.querySelectorAll(".frame-layer");
  var flashEl = $(".flash", stage);
  var blackout = $(".blackout", stage);
  var rain = window.RumanoRain ? new window.RumanoRain($(".rain", stage)) : null;
  if (rain && !motionOn) rain.reduced = true;

  var front = -1;          // which frame layer is showing
  var curScene = null, curRain = null, token = 0;

  function fade(el, to, dur, ease) {
    if (!el) return;
    if (motionOn) { M.animate(el, { opacity: to }, { duration: dur, ease: ease || "easeInOut" }); return; }
    if (calm) { M.animate(el, { opacity: to }, { duration: Math.min(dur, 0.4), ease: "easeInOut" }); return; }
    el.style.opacity = to;
  }
  function pushIn(img, dur) {
    if (!motionOn) return;
    M.animate(img, { transform: ["scale(1)", "scale(1.09)"] }, { duration: dur, ease: [0.3, 0, 0.7, 1] });
  }

  function showFrame(id) {
    var f = FRAMES[id];
    if (!f) return;
    var my = ++token;
    var next = front === 0 ? 1 : 0;
    var layer = layers[next], img = layer.querySelector("img");
    layer.setAttribute("data-slot", String(f.image).split("/").pop());
    img.style.objectPosition = f.focus || "50% 50%";
    img.style.filter = "saturate(.85) contrast(1.08) brightness(" + (0.9 * (f.exposure || 1)).toFixed(2) + ")";
    var go = function () {
      if (my !== token) return;
      // Only now let the previous picture go, so the screen is never empty while a frame downloads
      fade(hero, 0, 1.8);
      if (front > -1) fade(layers[front], 0, 1.8);
      fade(layer, 1, 1.8);
      pushIn(img, 28);
      front = next;
    };
    if (img.getAttribute("data-id") === id && img.complete) { go(); return; }
    img.setAttribute("data-id", id);
    img.alt = f.alt || "";
    img.onload = go;
    img.onerror = function () {
      console.warn("stories.js: the picture for frame “" + id + "” did not load: " + f.image);
    };
    img.src = f.image;
  }

  function hideFrames() {
    token++;
    for (var i = 0; i < layers.length; i++) fade(layers[i], 0, 1.2);
    front = -1;
  }

  var curDim = 0;
  function setScene(scene, rainName, dim) {
    if (rain && rainName && rainName !== curRain) { rain.set(rainName); curRain = rainName; }
    dim = dim || 0;
    if (dim !== curDim) { fade(blackout, dim, 1.4); curDim = dim; }
    if (scene === curScene) return;
    curScene = scene;
    if (scene === "hero") {
      hideFrames();
      fade(hero, 1, 1.2);
      return;
    }
    showFrame(scene);
  }

  // The scroll cue belongs to the opening screen only
  var cue = $(".cue"), cueOn = true;
  function setCue(on) {
    if (!cue || on === cueOn) return;
    cueOn = on;
    fade(cue, on ? 1 : 0, 0.3, EASE_OUT);
    cue.style.pointerEvents = on ? "" : "none";
  }

  /* ------------------------------------------------- a conversation, played */
  // Shows the first k messages. The newest one arrives the way it would on a phone:
  // "typing…" before theirs, letters in the box before mine. Scrolling back hides them again.
  function Convo(view, msgs) {
    this.view = view;
    this.msgs = msgs;
    this.items = $$(".msg", view);
    this.state = this.items.map(function () { return 0; }); // 0 hidden, 1 arriving, 2 shown
    this.list = $(".msgs", view);
    this.typing = $(".typing", view);
    this.delivered = $(".delivered", view);
    this.typed = $(".typed", view);
    this.placeholder = $(".placeholder", view);
    this.cta = $(".cta", view);
    this.hint = $(".exit-hint", view);
    this.timers = [];
    this.tok = 0;
  }
  Convo.prototype.later = function (fn, ms) { this.timers.push(setTimeout(fn, ms)); };
  Convo.prototype.stop = function () {
    this.tok++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.typing.classList.remove("on");
    this.typed.textContent = "";
    this.placeholder.style.opacity = "";
  };
  // Like a real chat: the newest thing sits right above the message box, and when something
  // new arrives at the bottom, everything above it glides up instead of jumping
  Convo.prototype.flip = function (change) {
    var list = this.list, ref = null;
    var shown = list.querySelectorAll(".msg.on, .typing.on, .delivered.on");
    if (shown.length) ref = shown[shown.length - 1];
    var t0 = ref ? ref.getBoundingClientRect().top : 0;
    var tf = getComputedStyle(list).transform;
    var cur = tf && tf !== "none" ? new DOMMatrixReadOnly(tf).m42 : 0;
    change();
    if (!ref || !motionOn) return;
    var moved = t0 - ref.getBoundingClientRect().top;
    if (moved > 0.5) M.animate(list, { transform: ["translateY(" + (cur + moved) + "px)", "translateY(0px)"] }, { duration: 0.35, ease: EASE_OUT });
  };
  Convo.prototype.put = function (i, animate) {
    var li = this.items[i], self = this;
    var go = function () {
      self.typing.classList.remove("on");
      li.classList.add("on");
      self.state[i] = 2;
      self.delivery();
    };
    if (animate && motionOn) {
      this.flip(go);
      M.animate(li, { opacity: [0, 1], transform: ["translateY(10px) scale(.98)", "translateY(0px) scale(1)"] }, { duration: 0.26, ease: EASE_OUT });
    } else {
      go();
      if (animate && calm) M.animate(li, { opacity: [0, 1] }, { duration: 0.2, ease: "easeOut" });
    }
    this.after(!animate);
  };
  // "Delivered" sits under my newest message
  Convo.prototype.delivery = function () {
    var lastMe = -1;
    for (var i = 0; i < this.items.length; i++) if (this.state[i] === 2 && this.msgs[i].from === "me") lastMe = i;
    var d = this.delivered;
    if (lastMe < 0) d.classList.remove("on");
    else { this.items[lastMe].insertAdjacentElement("afterend", d); d.classList.add("on"); }
  };
  // Once the last message is in, the button arrives, and a little later the way out.
  // Until then they take no space at all.
  Convo.prototype.after = function (instant) {
    var done = this.state[this.items.length - 1] === 2;
    var self = this;
    var arrive = function (el) {
      if (!el || el.classList.contains("on")) return;
      self.flip(function () { el.classList.add("on"); });
      if (motionOn && !instant) M.animate(el, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] }, { duration: 0.35, ease: EASE_OUT });
    };
    if (!done) {
      if (this.cta) this.cta.classList.remove("on");
      if (this.hint) this.hint.classList.remove("on");
      return;
    }
    arrive(this.cta);
    if (this.hint && !this.hint.classList.contains("on")) {
      if (instant || !motionOn) arrive(this.hint);
      else this.later(function () { arrive(self.hint); }, 900);
    }
  };
  Convo.prototype.to = function (k, instant) {
    this.stop();
    var n = this.items.length;
    k = Math.max(0, Math.min(k, n));
    for (var i = 0; i < n; i++) {
      if (i >= k) { this.items[i].classList.remove("on"); this.state[i] = 0; }
      else if (i < k - 1 && this.state[i] !== 2) this.put(i, false);
    }
    this.delivery();
    if (k > 0 && this.state[k - 1] !== 2) {
      if (instant || !motionOn) this.put(k - 1, !instant);
      else this.play(k - 1);
    }
    this.after(true);
  };
  Convo.prototype.play = function (i) {
    var self = this, my = this.tok, m = this.msgs[i];
    this.state[i] = 1;
    if (m.from === "them") {
      this.list.appendChild(this.typing);
      this.flip(function () { self.typing.classList.add("on"); });
      this.later(function () {
        if (my !== self.tok) return;
        self.put(i, true);
      }, 750);
    } else if (m.typed) {
      var text = m.en, at = 0;
      this.placeholder.style.opacity = "0";
      var step = function () {
        if (my !== self.tok) return;
        at++;
        self.typed.textContent = text.slice(0, at);
        if (at < text.length) self.later(step, 34);
        else self.later(function () {
          if (my !== self.tok) return;
          self.typed.textContent = "";
          self.placeholder.style.opacity = "";
          self.put(i, true);
        }, 320);
      };
      this.later(step, 120);
    } else {
      this.put(i, true);
    }
  };

  /* ------------------------------------- hiding a phone screen for certain */
  // A fade can be cut short by a fast flick; this doesn't depend on any animation finishing.
  function hardHide(view) {
    if (!view) return;
    view.getAnimations().forEach(function (a) { a.cancel(); });
    view.__anim = {};
    view.style.opacity = "0";
    view.classList.add("gone");
  }
  function unhide(view) { if (view) view.classList.remove("gone"); }

  /* -------------------------------------------- the narrator's phone */
  var phones = [];
  function setupPhones() {
    $$(".phone").forEach(function (sec) {
      var id = +sec.getAttribute("data-phone-id");
      var view = $(".phone-view", sec);
      phones[id] = { view: view, bg: $(".phone-bg", view), notif: $(".notif", view), convo: $(".convo", view),
        talk: new Convo(view, PHONES[id].msgs), shown: false, step: null, reset: 0 };
    });
  }
  function slideNotif(p, show) {
    if (!p.notif) return;
    if (motionOn) {
      M.animate(p.notif, show ? { opacity: 1, transform: "translateY(0%)" } : { opacity: 0, transform: "translateY(-120%)" },
        { duration: show ? 0.5 : 0.3, ease: EASE_OUT });
    } else fade(p.notif, show ? 1 : 0, 0.3);
  }
  function setPhone(id, step) {
    phones.forEach(function (p, n) {
      if (!p) return;
      var want = n === id ? step : null;
      if (want === p.step) return;
      if (want === null) {
        // Leaving the phone: it fades away and the dark pictures come back
        fade(p.view, 0, 0.6);
        p.shown = false;
        var r = ++p.reset;
        setTimeout(function () { if (r === p.reset && !p.shown) { p.talk.to(0, true); slideNotif(p, false); } }, 650);
      } else {
        if (!p.shown) { p.shown = true; p.reset++; unhide(p.view); fade(p.view, 1, 0.4); }
        if (want === 0) {
          slideNotif(p, true);
          fade(p.bg, 0, 0.5);
          fade(p.convo, 0, 0.3);
          p.talk.to(0, true);
        } else {
          slideNotif(p, false);
          fade(p.bg, 1, 0.7);
          fade(p.convo, 1, 0.45);
          // Coming back from further down, everything is already there; going forward, the newest arrives
          p.talk.to(want, p.step === null && want > 1);
        }
      }
      p.step = want;
    });
  }

  /* ------------------------------------------- the ending: the takeover */
  var take = null;
  var GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/\\|";
  function scramble(s) {
    return s.replace(/\S/g, function () { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; });
  }
  function setupTakeover() {
    var sec = $(".takeover");
    if (!sec) return;
    var view = $(".phone-view", sec);
    take = { sec: sec, view: view, bg: $(".phone-bg", view), convo: $(".convo", view), name: $(".who-en", view),
      scan: $(".scanline", sec), talk: new Convo(view, TAKEOVER._msgs), shown: false, step: null, run: 0, slices: null, shards: null,
      placeholder: $(".broken .placeholder", view), hint: $$(".hint-en, .hint-it", view), noise: 0 };
    take.hint.forEach(function (el) { el.setAttribute("data-text", el.textContent); });
    var hook = $(".hook");
    if (hook) hookText = { en: $(".en", hook), it: $(".it", hook) };
    if (hookText) { hookText.enText = hookText.en.textContent; hookText.itText = hookText.it ? hookText.it.textContent : ""; }
  }
  function restoreHook() {
    if (!hookText) return;
    hookText.en.textContent = hookText.enText;
    if (hookText.it) hookText.it.textContent = hookText.itText;
  }
  function clearSlices() {
    if (take.slices) { take.slices.remove(); take.slices = null; }
  }
  function clearShards() {
    if (take.shards) { take.shards.remove(); take.shards = null; }
  }

  // The hacked screen's message box and the "scroll down" hint slowly fall apart:
  // a few letters turn to noise and back, about twice a second (never faster than three)
  var NOISE = "▓▒░#%&/\\|<>_01";
  function noisy(text, amount) {
    return text.replace(/\S/g, function (c) { return Math.random() < amount ? NOISE[(Math.random() * NOISE.length) | 0] : c; });
  }
  function dropOut(text) {
    var chars = text.split(""), n = 1 + ((Math.random() * 2) | 0);
    for (var k = 0; k < n; k++) {
      var at = (Math.random() * chars.length) | 0;
      if (chars[at] !== " ") chars[at] = Math.random() < 0.5 ? "_" : NOISE[(Math.random() * NOISE.length) | 0];
    }
    return chars.join("");
  }
  function corruptStart() {
    corruptStop();
    var ph = take.placeholder;
    if (!motionOn) { if (ph) ph.textContent = "M▒ss4ge"; return; } // reduced motion: broken, but still
    take.noise = setInterval(function () {
      if (ph) {
        ph.textContent = noisy("Message", 0.4);
        ph.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
      }
      take.hint.forEach(function (el) { el.textContent = Math.random() < 0.6 ? dropOut(el.getAttribute("data-text")) : el.getAttribute("data-text"); });
    }, 480);
  }
  function corruptStop() {
    clearInterval(take.noise);
    take.noise = 0;
    take.hint.forEach(function (el) { el.textContent = el.getAttribute("data-text"); });
  }

  // The way out, under a second: the bright screen breaks into slices that slide apart and fade,
  // one scanline sweeps down, and underneath the calm, dark closing is already waiting
  function exitGlitch(run) {
    var v = take.view;
    // Left before the bright screen had even appeared: nothing to break apart, just hide it
    if (+getComputedStyle(v).opacity < 0.5) { hardHide(v); return; }
    var box = document.createElement("div");
    box.className = "shards";
    box.setAttribute("aria-hidden", "true");
    box.inert = true;
    var cuts = [0, 13, 29, 44, 61, 79, 100];
    for (var s = 0; s < cuts.length - 1; s++) {
      var c = v.cloneNode(true);
      c.classList.add("shard");
      c.classList.remove("live");
      c.style.opacity = "1";
      c.style.clipPath = "inset(" + cuts[s] + "% 0 " + (100 - cuts[s + 1]) + "% 0)";
      box.appendChild(c);
      var dx = (10 + Math.random() * 26) * (s % 2 ? -1 : 1);
      M.animate(c, { transform: ["translateX(0px)", "translateX(" + dx + "px)", "translateX(" + (-dx * 0.5) + "px)", "translateX(" + (dx * 1.8) + "px)"], opacity: [1, 1, 1, 0] },
        { duration: 0.8, times: [0, 0.25, 0.55, 1], ease: "linear" });
    }
    take.sec.appendChild(box);
    take.shards = box;
    M.animate(v, { opacity: 0 }, { duration: 0 });
    M.animate(take.scan, { opacity: [0, 0.55, 0.55, 0], transform: ["translateY(-10vh)", "translateY(40vh)", "translateY(80vh)", "translateY(110vh)"] },
      { duration: 0.6, times: [0, 0.15, 0.85, 1], ease: "linear" });
    // the words come apart once, then the pieces are gone
    setTimeout(function () {
      if (run !== take.run) return;
      $$(".m-en, .m-it, .who-en, .follow-en, .follow-it, .hint-en, .hint-it", box).forEach(function (e) { e.textContent = scramble(e.textContent); });
    }, 260);
    setTimeout(function () { if (run === take.run) clearShards(); }, 850);
  }
  // One orchestrated moment, about a second long: the frame splits into slices that
  // slip sideways, one faint scanline sweeps down, the cliffhanger scrambles,
  // then the bright screen cuts in and the sender's name resolves out of the noise
  function glitch(run, then) {
    var src = front > -1 ? layers[front].querySelector("img") : heroImg;
    var box = document.createElement("div");
    box.className = "slices";
    var cuts = [0, 17, 31, 46, 63, 78, 100];
    for (var s = 0; s < cuts.length - 1; s++) {
      var sl = document.createElement("div");
      sl.className = "slice";
      sl.style.clipPath = "inset(" + cuts[s] + "% 0 " + (100 - cuts[s + 1]) + "% 0)";
      var im = src.cloneNode(false);
      im.removeAttribute("alt");
      im.style.transform = "scale(1.04)";
      sl.appendChild(im);
      box.appendChild(sl);
      var dx = (8 + Math.random() * 22) * (s % 2 ? -1 : 1);
      M.animate(sl, { transform: ["translateX(0px)", "translateX(" + dx + "px)", "translateX(" + (-dx * 0.4) + "px)", "translateX(" + (dx * 0.15) + "px)", "translateX(0px)"] },
        { duration: 0.6, times: [0, 0.2, 0.5, 0.75, 1], ease: "linear" });
    }
    // under the vignette and the darkening, so the slices match the picture they come from
    stage.insertBefore(box, $(".grade", stage));
    take.slices = box;
    M.animate(take.scan, { opacity: [0, 0.55, 0.55, 0], transform: ["translateY(-10vh)", "translateY(40vh)", "translateY(80vh)", "translateY(110vh)"] },
      { duration: 0.6, times: [0, 0.15, 0.85, 1], ease: "linear" });

    var ticks = 0;
    var noise = setInterval(function () {
      if (run !== take.run) { clearInterval(noise); return; }
      if (hookText) {
        hookText.en.textContent = scramble(hookText.enText);
        if (hookText.it) hookText.it.textContent = scramble(hookText.itText);
      }
      if (++ticks > 11) clearInterval(noise);
    }, 45);

    setTimeout(function () {
      if (run !== take.run) return;
      take.view.style.opacity = "1";
      M.animate(take.view, { opacity: [0, 1] }, { duration: 0.25, ease: EASE_OUT });
      resolveName(run, then);
    }, 550);
    setTimeout(function () {
      if (run !== take.run) return;
      clearSlices();
      restoreHook();
    }, 1150);
  }
  function resolveName(run, then) {
    var target = TAKE_SENDER.en, at = 0;
    take.name.textContent = scramble(target);
    var t = setInterval(function () {
      if (run !== take.run) { clearInterval(t); take.name.textContent = target; return; }
      at += Math.max(1, Math.ceil(target.length / 10));
      take.name.textContent = target.slice(0, at) + scramble(target.slice(at));
      if (at >= target.length) { clearInterval(t); take.name.textContent = target; if (then) then(); }
    }, 40);
  }
  function setTake(step, dir) {
    if (!take || step === take.step) return;
    take.step = step;
    if (step === null) {
      if (!take.shown) return;
      var out = ++take.run;
      take.shown = false;
      take.view.classList.remove("live");
      corruptStop();
      clearSlices();
      clearShards();
      restoreHook();
      if (dir > 0 && motionOn) exitGlitch(out);   // on to the closing: the hack breaks apart
      else fade(take.view, 0, 0.3, EASE_OUT);      // back up to the cliffhanger (or reduced motion): a quick, quiet fade
      setTimeout(function () { if (out === take.run) take.talk.to(0, true); }, 900);
      return;
    }
    if (!take.shown) {
      take.shown = true;
      var run = ++take.run;
      clearShards();
      unhide(take.view);
      take.view.classList.add("live");
      take.name.textContent = TAKE_SENDER.en;
      corruptStart();
      if (step === 1 && dir > 0 && motionOn) {
        // The glitch, the name, and straight away the first message: never an empty screen
        take.talk.to(0, true);
        glitch(run, function () { if (run === take.run && take.step === 1) take.talk.to(1); });
      } else {
        // Reduced motion, or coming back up from the closing: a plain cross-fade
        fade(take.view, 1, 0.4);
        take.talk.to(step, true);
      }
    } else {
      take.talk.to(step);
    }
  }

  /* --------------------------------------------- which beat is on screen */
  var beats = [], tops = [];
  function measure() {
    beats = $$(".beat");
    tops = beats.map(function (b) { return b.getBoundingClientRect().top + window.scrollY; });
  }
  function current() {
    var y = window.scrollY + window.innerHeight * 0.5, i = 0;
    for (var n = 0; n < tops.length; n++) if (tops[n] <= y) i = n;
    return i;
  }
  function preloadAfter(i) {
    var here = beats[i] && beats[i].getAttribute("data-scene");
    for (var n = i + 1; n < beats.length; n++) {
      var s = beats[n].getAttribute("data-scene");
      if (s !== here && FRAMES[s]) { var im = new Image(); im.src = FRAMES[s].image; return; }
    }
  }
  var ticking = false, lastIndex = -1, settleTimer = 0;
  // About a second after the scrolling stops (longer than any fade or glitch), make the end state
  // certain: if the beat on screen is not part of a phone or the takeover, every phone layer is gone.
  function settleSoon() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 1000);
  }
  function settle() {
    if (current() !== lastIndex) { update(); settleSoon(); return; }
    phones.forEach(function (p) {
      if (!p || p.step !== null) return;
      p.shown = false;
      hardHide(p.view);
      p.talk.to(0, true);
      if (p.notif) { p.notif.getAnimations().forEach(function (a) { a.cancel(); }); p.notif.style.opacity = "0"; p.notif.style.transform = "translateY(-120%)"; }
    });
    if (take && take.step === null) {
      take.run++;
      take.shown = false;
      take.view.classList.remove("live");
      hardHide(take.view);
      clearShards();
      clearSlices();
      restoreHook();
      corruptStop();
      take.talk.to(0, true);
    }
  }
  function onScroll() {
    settleSoon();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  function update() {
    ticking = false;
    var i = current();
    if (i === lastIndex) return;
    var dir = i > lastIndex ? 1 : -1;
    lastIndex = i;
    var b = beats[i];
    setScene(b.getAttribute("data-scene"), b.getAttribute("data-rain") || "steady", parseFloat(b.getAttribute("data-dim")) || 0);
    setCue(i === 0);
    var ph = b.getAttribute("data-phone");
    setPhone(ph === null ? -1 : +b.getAttribute("data-phone-of"), ph === null ? null : +ph);
    var tk = b.getAttribute("data-take");
    setTake(tk === null ? null : +tk, dir);
    preloadAfter(i);
  }

  /* --------------------------------------------------- line reveals */
  function showLine(el, wait) {
    wait = wait || 0;
    if (el.classList.contains("line")) {
      var en = $(".en", el), it = $(".it", el), band = $(".band", el);
      var hook = el.classList.contains("hook");
      var dur = hook ? 1.8 : 1.0;
      if (band) M.animate(band, { opacity: 1 }, { duration: 0.8, delay: wait, ease: "easeOut" });
      M.animate(en, { opacity: 1, transform: "translateY(0px)" }, { duration: dur, delay: wait + (hook ? 0.3 : 0), ease: EASE });
      if (it) M.animate(it, { opacity: 1, transform: "translateY(0px)" }, { duration: dur, delay: wait + (hook ? 1.1 : 0.3), ease: EASE });
    } else {
      M.animate(el, { opacity: 1, transform: "translateY(0px) scale(1)" }, { duration: 1.4, delay: wait, ease: EASE });
    }
  }
  // A passing line drifts out the way it leaves the screen (up when scrolling down,
  // down when scrolling back up), so it comes back in from the same side
  function hideLine(el, dir) {
    var words = el.querySelectorAll(".en, .it"), band = $(".band", el);
    for (var i = 0; i < words.length; i++) {
      M.animate(words[i], { opacity: 0, transform: "translateY(" + (8 * dir) + "px)" }, { duration: 0.5, ease: "easeOut" });
    }
    if (band) M.animate(band, { opacity: 0 }, { duration: 0.5, ease: "easeOut" });
  }
  function watchLines() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) { el._shown = true; showLine(el); }
        else if (el._shown && el.classList.contains("passing")) {
          el._shown = false;
          var r = e.boundingClientRect;
          hideLine(el, r.top + r.height / 2 < window.innerHeight / 2 ? -1 : 1);
        }
      });
    }, { rootMargin: "-30% 0px -30% 0px" });
    // The title card and the closing appear as soon as they are well on screen
    // (the closing sits at the very end of the page and can never scroll up to the middle of a tall phone).
    // Several arriving together come in one after another, 60ms apart
    var io2 = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (e.isIntersecting && !e.target._shown) { e.target._shown = true; showLine(e.target, 0.06 * n++); }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    document.querySelectorAll("main .r").forEach(function (el) {
      (el.classList.contains("passing") ? io : io2).observe(el);
    });
  }

  /* --------------------------------------------------------- lightning */
  var GAP = { opening: [10, 22], steady: [14, 30], storm: [5, 12], thin: [28, 50] };
  function lightning() {
    var g = GAP[curRain];
    var wait = g ? g[0] + Math.random() * (g[1] - g[0]) : 8;
    setTimeout(function () {
      if (g && curDim < 0.5 && !document.hidden) {
        var strong = curRain === "storm" ? 0.5 : 0.32;
        M.animate(flashEl, { opacity: [0, strong, 0.06, strong * 0.65, 0] },
          { duration: 1.1, times: [0, 0.06, 0.18, 0.27, 1], ease: "easeOut" });
        root.classList.add("lit");
        setTimeout(function () { root.classList.remove("lit"); }, 700);
      }
      lightning();
    }, wait * 1000);
  }

  /* ---------------------------------------------------------- opening */
  // About three seconds to the scroll prompt. A tap, a scroll or a key skips straight to the end.
  function opening() {
    var line = $(".opening-line"), en = $(".en", line), it = $(".it", line), band = $(".opening-band");
    var name = $(".name"), by = $(".byline"), insta = $(".opening-follow");
    line.style.opacity = 1; en.style.opacity = 0; it.style.opacity = 0;
    // Coming back in the same session, the opening plays at double speed
    var t = 1;
    try { if (sessionStorage.getItem("rumano-seen")) t = 0.5; sessionStorage.setItem("rumano-seen", "1"); } catch (e) {}
    var anims = [];
    var play = function (el, kf, o) {
      if (!el) return;
      var a = M.animate(el, kf, { duration: o.duration * t, delay: (o.delay || 0) * t, ease: o.ease });
      if (a) anims.push(a);
    };
    play(blackout, { opacity: [1, 0] }, { duration: 1.6, ease: "easeInOut" });
    play(band, { opacity: [0, 1] }, { duration: 1.2, delay: 0.4, ease: "easeOut" });
    play(en, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] }, { duration: 1.1, delay: 0.3, ease: EASE });
    play(it, { opacity: [0, 1] }, { duration: 0.9, delay: 0.7, ease: EASE });
    // The title comes into focus and settles: a slight zoom, so the letters never re-flow
    play(name, { opacity: [0, 1], filter: ["blur(12px)", "blur(0px)"], transform: ["scale(1.06)", "scale(1)"] }, { duration: 1.6, delay: 1.0, ease: EASE });
    play(by, { opacity: [0, 1] }, { duration: 0.9, delay: 1.6, ease: EASE });
    play(insta, { opacity: [0, 1] }, { duration: 0.9, delay: 1.8, ease: EASE });
    play(cue, { opacity: [0, 1] }, { duration: 0.8, delay: 2.2, ease: EASE });
    pushIn(heroImg, 24); // the slow drift of the picture keeps going: it is not part of the skip

    var events = ["pointerdown", "wheel", "touchstart", "keydown", "scroll"];
    var skip = function () {
      events.forEach(function (ev) { window.removeEventListener(ev, skip, true); });
      anims.forEach(function (a) { if (a.playState === "running" || a.playState === "paused") a.finish(); });
    };
    events.forEach(function (ev) { window.addEventListener(ev, skip, { capture: true, passive: true }); });
  }

  /* ------------------------------------------------------------ start */
  build();
  setupPhones();
  setupTakeover();
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { measure(); onScroll(); });
  // Coming back to a page kept in memory (the back button), check everything again
  window.addEventListener("pageshow", function () { measure(); onScroll(); });
  var again = $(".again");
  if (again) again.addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "instant" });
    onScroll();
  });
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  if (motionOn) {
    watchLines();
    opening();
    lightning();
  } else {
    root.classList.remove("js-motion");
    blackout.style.opacity = 0;
  }
  curScene = "hero";
  if (rain) { rain.set("opening", true); curRain = "opening"; }
  onScroll();
  window.__siteReady = true;
})();
