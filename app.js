/* ============================================================
   Para ti, Fernanda
   1) Pantalla de bloqueo (mantener 3 s)
   2) Contador de tiempo juntos
   ============================================================ */

/* ============================================================
   ⬇️  LA FECHA EN QUE EMPEZAMOS — cámbiala aquí y nada más
   Formato: (año, mes - 1, día, hora, minuto)
   Ojo: el mes va de 0 a 11 → 6 = julio
   ============================================================ */
var FECHA_INICIO = new Date(2026, 6, 12, 0, 0, 0);


/* ¿Quieres que la canción empiece sola al pasar la portada?
   Ponlo en false y entonces solo suena si ella toca el play. */
var MUSICA_AL_ENTRAR = true;


/* ------------------------------------------------------------
   Despertar el audio (iOS / Safari)

   Safari solo deja sonar un <audio> si play() se llama DENTRO de un
   gesto real del usuario. El desbloqueo termina en un temporizador,
   que ya no cuenta como gesto, así que aquí lo despertamos en el
   primer toque del corazón: lo silenciamos, lo reproducimos un
   instante, lo pausamos y lo dejamos en cero. No se oye nada y desde
   ese momento el navegador ya lo deja reproducir por código.
   ------------------------------------------------------------ */

var AUDIO_DESPIERTO = false;

function prepararAudio() {
  if (AUDIO_DESPIERTO) { return; }

  var a = document.getElementById("audio");
  if (!a) { return; }

  AUDIO_DESPIERTO = true;
  var silencioAntes = a.muted;
  a.muted = true;

  var restaurar = function () {
    try { a.pause(); a.currentTime = 0; } catch (e) {}
    a.muted = silencioAntes;
  };

  var p;
  try { p = a.play(); } catch (e) { restaurar(); AUDIO_DESPIERTO = false; return; }

  if (p && p.then) {
    p.then(restaurar).catch(function () {
      restaurar();
      AUDIO_DESPIERTO = false;      /* se reintenta en el próximo toque */
    });
  } else {
    restaurar();
  }
}


/* ------------------------------------------------------------
   1) Pantalla de bloqueo
   ------------------------------------------------------------ */

(function () {
  "use strict";

  var HOLD_MS = 3000;          // tiempo que hay que mantener presionado
  var RING_R  = 46;            // radio del anillo de progreso (viewBox 100x100)
  var TOP     = 28;            // y del borde superior del corazón
  var BOTTOM  = 110;           // y de la punta del corazón
  var SPAN    = BOTTOM - TOP;

  var HINT_IDLE = "Mantén presionado el corazón";
  var HINT_HOLD = "Sigue así… te estoy leyendo el corazón";

  var lock    = document.getElementById("lock");
  var btn     = document.getElementById("heart");
  var ringBar = document.getElementById("ringBar");
  var fill    = document.getElementById("fillRect");
  var scan    = document.getElementById("scanLine");
  var hint    = document.getElementById("hint");
  var welcome = document.getElementById("welcome");
  var main    = document.getElementById("main");
  var burstBox = btn && btn.querySelector(".burst");

  if (!lock || !btn || !ringBar || !fill) { return; }

  var CIRC = 2 * Math.PI * RING_R;
  var reduce = window.matchMedia &&
               window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var raf = 0;
  var startedAt = 0;
  var progress = 0;
  var holding = false;
  var unlocked = false;

  /* ---------- estado inicial ---------- */

  document.body.classList.add("is-locked");
  ringBar.style.strokeDasharray = CIRC.toFixed(2);
  render(0);

  /* ---------- pintar el progreso ---------- */

  function render(p) {
    progress = p;
    ringBar.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(2);

    var h = SPAN * p;
    fill.setAttribute("y", (BOTTOM - h).toFixed(2));
    fill.setAttribute("height", h.toFixed(2));

    if (scan) {
      scan.setAttribute("y", (BOTTOM - h - 1.3).toFixed(2));
      scan.setAttribute("opacity", p > 0.015 && p < 1 ? "0.95" : "0");
    }
  }

  /* ---------- bucle de carga ---------- */

  function frame(now) {
    if (!holding || unlocked) { return; }
    var p = Math.min(1, (now - startedAt) / HOLD_MS);
    render(p);
    if (p >= 1) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function begin() {
    if (unlocked || holding) { return; }
    holding = true;
    btn.classList.remove("is-reset");
    btn.classList.add("is-holding");
    hint.textContent = HINT_HOLD;
    render(0);                                  // siempre desde cero
    startedAt = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function cancel() {
    if (unlocked || !holding) { return; }
    holding = false;
    cancelAnimationFrame(raf);
    btn.classList.remove("is-holding");
    hint.textContent = HINT_IDLE;

    if (progress > 0.06) {
      btn.classList.add("is-reset");
      window.setTimeout(function () { btn.classList.remove("is-reset"); }, 480);
    }
    drain(progress);
  }

  /* el corazón se vacía de vuelta en lugar de cortarse en seco */
  function drain(from) {
    var t0 = performance.now();
    var dur = Math.max(220, from * 520);

    function back(now) {
      if (holding || unlocked) { return; }
      var k = Math.min(1, (now - t0) / dur);
      render(from * (1 - k) * (1 - k));
      if (k < 1) { raf = requestAnimationFrame(back); }
      else { render(0); }
    }
    raf = requestAnimationFrame(back);
  }

  /* ---------- desbloqueo ---------- */

  function finish() {
    unlocked = true;
    holding = false;
    cancelAnimationFrame(raf);
    render(1);

    btn.classList.remove("is-holding");
    btn.classList.add("is-full");
    btn.setAttribute("aria-disabled", "true");

    hint.classList.add("is-gone");
    welcome.textContent = "Bienvenido, amor";
    welcome.classList.add("is-in");

    if (!reduce) { sparkle(); }

    if (navigator.vibrate) {
      try { navigator.vibrate([18, 60, 30]); } catch (e) {}
    }

    window.setTimeout(reveal, reduce ? 900 : 1700);
  }

  function reveal() {
    document.body.classList.remove("is-locked");
    lock.classList.add("is-lifted");

    var hide = function () { lock.hidden = true; };
    lock.addEventListener("transitionend", hide, { once: true });
    window.setTimeout(hide, 1700);

    if (main) {
      main.removeAttribute("aria-hidden");
      if (main.focus) { main.focus({ preventScroll: true }); }
    }

    /* aquí arranca el confeti (lo escucha la sección 5) */
    document.dispatchEvent(new CustomEvent("pagina:desbloqueada"));
  }

  /* ---------- destellos ---------- */

  function sparkle() {
    if (!burstBox) { return; }
    var N = 16;
    for (var i = 0; i < N; i++) {
      var s = document.createElement("span");
      var a = (i / N) * Math.PI * 2 + Math.random() * 0.4;
      var d = 92 + Math.random() * 95;
      s.className = "spark";
      s.style.setProperty("--dx", (Math.cos(a) * d).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(a) * d).toFixed(1) + "px");
      s.style.setProperty("--r",  Math.round(Math.random() * 360) + "deg");
      s.style.setProperty("--dur", Math.round(780 + Math.random() * 520) + "ms");
      s.style.setProperty("--sc", (0.55 + Math.random() * 0.75).toFixed(2));
      burstBox.appendChild(s);
      (function (node) {
        window.setTimeout(function () { node.remove(); }, 1600);
      })(s);
    }
  }

  /* ---------- eventos ----------

     Esto usa Pointer Events, que es la API que unifica dedo, ratón y
     lápiz: en un teléfono los dispara el dedo al instante, sin el
     retraso viejo de 300 ms. Solo si el navegador no los soporta se
     cae a touchstart/touchend + mouse. Escuchar las dos familias a la
     vez sería un error: cada toque contaría doble y el contador se
     reiniciaría solo. */

  function alPresionar(e) {
    if (e.type === "mousedown" && typeof e.button === "number" && e.button !== 0) {
      return;
    }
    /* corta el scroll y el menú de "copiar" del toque largo */
    if (e.cancelable) { e.preventDefault(); }

    /* iOS: el audio hay que tocarlo dentro del gesto, no después */
    prepararAudio();

    if (e.pointerId !== undefined && btn.setPointerCapture) {
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    }
    begin();
  }

  if (window.PointerEvent) {
    btn.addEventListener("pointerdown", alPresionar);
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointercancel", cancel);
    btn.addEventListener("lostpointercapture", cancel);
  } else {
    btn.addEventListener("touchstart", alPresionar, { passive: false });
    btn.addEventListener("touchend", cancel);
    btn.addEventListener("touchcancel", cancel);
    btn.addEventListener("mousedown", alPresionar);
    btn.addEventListener("mouseup", cancel);
    btn.addEventListener("mouseleave", cancel);
  }

  window.addEventListener("blur", cancel);

  btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  btn.addEventListener("click", function (e) { e.preventDefault(); });
  btn.addEventListener("dragstart", function (e) { e.preventDefault(); });

  btn.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter" || e.key === "Spacebar") {
      e.preventDefault();
      if (!e.repeat) { prepararAudio(); begin(); }
    }
  });

  btn.addEventListener("keyup", function (e) {
    if (e.key === " " || e.key === "Enter" || e.key === "Spacebar") {
      e.preventDefault();
      cancel();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { cancel(); }
  });
})();


/* ------------------------------------------------------------
   2) Contador: días / horas / minutos / segundos
   ------------------------------------------------------------ */

(function () {
  "use strict";

  var elDays  = document.getElementById("uDays");
  var elHours = document.getElementById("uHours");
  var elMins  = document.getElementById("uMins");
  var elSecs  = document.getElementById("uSecs");
  var elSince = document.getElementById("sinceDate");

  if (!elDays || !elHours || !elMins || !elSecs) { return; }

  var MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  var lastSec = -1;

  /* "12 de julio de 2026" */
  if (elSince) {
    try {
      elSince.textContent = FECHA_INICIO.toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric"
      });
    } catch (e) { /* se queda el texto del HTML */ }
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function set(el, value) {
    if (el.textContent !== value) { el.textContent = value; }
  }

  function update() {
    var diff = Date.now() - FECHA_INICIO.getTime();
    if (diff < 0) { diff = 0; }

    var days  = Math.floor(diff / DAY);
    var hours = Math.floor((diff % DAY) / HOUR);
    var mins  = Math.floor((diff % HOUR) / MIN);
    var secs  = Math.floor((diff % MIN) / 1000);

    set(elDays,  String(days));
    set(elHours, pad(hours));
    set(elMins,  pad(mins));
    set(elSecs,  pad(secs));

    /* latido en los segundos */
    if (secs !== lastSec) {
      lastSec = secs;
      elSecs.classList.remove("is-tick");
      void elSecs.offsetWidth;          // reinicia la animación
      elSecs.classList.add("is-tick");
    }
  }

  update();
  window.setInterval(update, 1000);

  /* al volver a la pestaña, sincroniza de inmediato */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { update(); }
  });
})();


/* ------------------------------------------------------------
   3) El sobre y el modal de la carta
   ------------------------------------------------------------ */

(function () {
  "use strict";

  var env     = document.getElementById("envelope");
  var hint    = document.getElementById("envHint");
  var modal   = document.getElementById("letterModal");
  var veil    = document.getElementById("modalVeil");
  var closeBt = document.getElementById("modalClose");
  var scroll  = modal && modal.querySelector(".modal__scroll");

  if (!env || !modal || !closeBt) { return; }

  var reduce = window.matchMedia &&
               window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var HINT_CLOSED = "Toca el sobre para abrir";
  var HINT_OPEN   = "Tócalo otra vez para volver a leerla";

  var lastFocus = null;

  /* la zona con scroll debe poder recibir foco para navegar con teclado */
  if (scroll) { scroll.setAttribute("tabindex", "0"); }

  env.addEventListener("click", function () {
    if (env.classList.contains("is-open")) {
      openModal();
      return;
    }
    env.classList.add("is-open");
    env.setAttribute("aria-label", "Abrir la carta");
    document.dispatchEvent(new CustomEvent("carta:abierta"));
    hint.textContent = HINT_OPEN;
    /* a mitad del giro la solapa pasa detrás de la hoja */
    window.setTimeout(function () {
      env.classList.add("flap-back");
    }, reduce ? 0 : 430);
    /* la solapa y la hoja tardan ~1.1 s: el modal entra justo después */
    window.setTimeout(openModal, reduce ? 180 : 1100);
  });

  function openModal() {
    if (!modal.hidden) { return; }
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    void modal.offsetWidth;                 // fuerza el reflow para la transición
    modal.classList.add("is-in");
    if (scroll) { scroll.scrollTop = 0; }
    closeBt.focus();
  }

  function closeModal() {
    if (modal.hidden) { return; }
    modal.classList.remove("is-in");
    document.body.classList.remove("no-scroll");
    window.setTimeout(function () { modal.hidden = true; }, reduce ? 160 : 400);
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  closeBt.addEventListener("click", closeModal);
  if (veil) { veil.addEventListener("click", closeModal); }

  document.addEventListener("keydown", function (e) {
    if (modal.hidden) { return; }

    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }

    /* el foco se queda dentro del modal */
    if (e.key === "Tab") {
      var stops = [closeBt];
      if (scroll) { stops.push(scroll); }
      var i = stops.indexOf(document.activeElement);
      var next = e.shiftKey ? i - 1 : i + 1;
      if (i === -1 || next < 0 || next >= stops.length) {
        e.preventDefault();
        stops[e.shiftKey ? stops.length - 1 : 0].focus();
      }
    }
  });

  /* deja el texto inicial coherente aunque se recargue a mitad */
  hint.textContent = HINT_CLOSED;
})();


/* ------------------------------------------------------------
   4) Nuestra canción: reproductor
   ------------------------------------------------------------ */

(function () {
  "use strict";

  var player = document.getElementById("player");
  var audio  = document.getElementById("audio");
  var btn    = document.getElementById("playBtn");
  var seek   = document.getElementById("seek");
  var tNow   = document.getElementById("tNow");
  var tEnd   = document.getElementById("tEnd");
  var status = document.getElementById("audioStatus");

  if (!player || !audio || !btn || !seek) { return; }

  var dragging = false;

  function fmt(s) {
    if (!isFinite(s) || s < 0) { s = 0; }
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function paintTrack(ratio) {
    seek.style.setProperty("--p", (ratio * 100).toFixed(2) + "%");
  }

  function say(msg) { if (status) { status.textContent = msg || ""; } }

  btn.addEventListener("click", function () {
    if (audio.paused) {
      var p = audio.play();
      if (p && p.catch) {
        p.catch(function () {
          say("No pude reproducir el audio. Revisa que el archivo exista en la carpeta «musica».");
        });
      }
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", function () {
    player.classList.add("is-playing");
    btn.setAttribute("aria-label", "Pausar");
    say("");
  });

  audio.addEventListener("pause", function () {
    player.classList.remove("is-playing");
    btn.setAttribute("aria-label", "Reproducir");
  });

  function showDuration() { tEnd.textContent = fmt(audio.duration); }

  audio.addEventListener("loadedmetadata", showDuration);

  /* si los metadatos ya habían cargado antes de llegar aquí,
     el evento no vuelve a dispararse: hay que leerlos a mano */
  if (audio.readyState >= 1) { showDuration(); }

  audio.addEventListener("timeupdate", function () {
    if (dragging || !audio.duration) { return; }
    var r = audio.currentTime / audio.duration;
    seek.value = String(Math.round(r * 1000));
    paintTrack(r);
    tNow.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener("ended", function () {
    player.classList.remove("is-playing");
    btn.setAttribute("aria-label", "Reproducir");
    audio.currentTime = 0;
    seek.value = "0";
    paintTrack(0);
    tNow.textContent = "0:00";
  });

  audio.addEventListener("error", function () {
    player.classList.remove("is-playing");
    say("Falta el archivo de audio. Guarda tu canción dentro de la carpeta «musica» y escribe su nombre en el src del <audio>.");
  });

  /* arrastrar la barra */
  seek.addEventListener("input", function () {
    dragging = true;
    var r = Number(seek.value) / 1000;
    paintTrack(r);
    if (audio.duration) { tNow.textContent = fmt(r * audio.duration); }
  });

  seek.addEventListener("change", function () {
    var r = Number(seek.value) / 1000;
    if (audio.duration) { audio.currentTime = r * audio.duration; }
    dragging = false;
  });

  paintTrack(0);

  /* La canción arranca al pasar la portada. Funciona porque el primer
     toque del corazón ya despertó el <audio> (ver prepararAudio). */
  document.addEventListener("pagina:desbloqueada", function () {
    if (!MUSICA_AL_ENTRAR || !audio.paused) { return; }
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        say("Toca el botón rosado para escuchar nuestra canción.");
      });
    }
  });
})();


/* ------------------------------------------------------------
   5) Confeti continuo + lluvia de corazones al abrir la carta

   Dos lienzos <canvas>:
   · #confetti  — arranca al pasar la pantalla de bloqueo y no para
   · #heartRain — una lluvia de corazones de unos segundos al abrir
                  la carta, por encima del modal
   ------------------------------------------------------------ */

(function () {
  "use strict";

  /* ====== ajustes: cámbialos a gusto ====== */
  var COLORES = ["#FFFFFF", "#FFD6E2", "#E5449A", "#E8455F"];
  var FORMAS = ["corazon", "corazon", "mono", "circulo", "cuadrado"];

  /* En un teléfono va bastante menos confeti: la pantalla es chica,
     tapaba el texto de la carta y así además no calienta la batería. */
  var ESTRECHO = Math.min(window.innerWidth, window.innerHeight) < 640;
  var CANTIDAD  = ESTRECHO ? 26 : 52;   // piezas en pantalla a la vez
  var CORAZONES = ESTRECHO ? 24 : 60;   // corazones por lluvia
  /* ======================================== */

  var lienzoConf = document.getElementById("confetti");
  var lienzoLluv = document.getElementById("heartRain");

  if (!lienzoConf || !lienzoLluv || !lienzoConf.getContext) { return; }

  var reduce = window.matchMedia &&
               window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- dibujo de las formas --- */

  function corazon(ctx, s) {
    var a = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -a * 0.35);
    ctx.bezierCurveTo(0, -a * 0.9, -a, -a * 0.9, -a, -a * 0.1);
    ctx.bezierCurveTo(-a, a * 0.45, -a * 0.35, a * 0.75, 0, a);
    ctx.bezierCurveTo(a * 0.35, a * 0.75, a, a * 0.45, a, -a * 0.1);
    ctx.bezierCurveTo(a, -a * 0.9, 0, -a * 0.9, 0, -a * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  function mono(ctx, s) {
    var a = s * 0.55, b = s * 0.32;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-a, -b); ctx.lineTo(-a, b);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(a, -b); ctx.lineTo(a, b);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  function pintar(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.giro);
    ctx.globalAlpha = p.alfa;
    ctx.fillStyle = p.color;

    if (p.forma === "corazon")       { corazon(ctx, p.t); }
    else if (p.forma === "mono")     { mono(ctx, p.t); }
    else if (p.forma === "circulo")  {
      ctx.beginPath();
      ctx.arc(0, 0, p.t * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else {
      var r = p.t * 0.22;
      var h = p.t * 0.8;
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(-h / 2, -h / 2, h, h, r); }
      else { ctx.rect(-h / 2, -h / 2, h, h); }
      ctx.fill();
    }
    ctx.restore();
  }

  /* --- una capa de partículas sobre un canvas --- */

  function Capa(canvas, opciones) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.op = opciones;
    this.piezas = [];
    this.corriendo = false;
    this.raf = 0;
    this.ultimo = 0;
    this.w = 0;
    this.h = 0;
    this.medir();
  }

  Capa.prototype.medir = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = Math.round(this.w * dpr);
    this.c.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Capa.prototype.nueva = function (arriba) {
    var t = this.op.min + Math.random() * (this.op.max - this.op.min);
    return {
      x: Math.random() * this.w,
      y: arriba ? -20 - Math.random() * this.h * 0.5
                : Math.random() * this.h,
      t: t,
      vy: this.op.vyMin + Math.random() * (this.op.vyMax - this.op.vyMin),
      vaiven: 14 + Math.random() * 26,
      fase: Math.random() * Math.PI * 2,
      ritmo: 0.5 + Math.random() * 0.9,
      giro: Math.random() * Math.PI * 2,
      vgiro: (Math.random() - 0.5) * 1.5,
      alfa: this.op.alfaMin + Math.random() * (this.op.alfaMax - this.op.alfaMin),
      color: COLORES[(Math.random() * COLORES.length) | 0],
      forma: this.op.formas[(Math.random() * this.op.formas.length) | 0]
    };
  };

  Capa.prototype.llenar = function (n, arriba) {
    for (var i = 0; i < n; i++) { this.piezas.push(this.nueva(arriba)); }
  };

  Capa.prototype.paso = function (ahora) {
    if (!this.corriendo) { return; }

    var dt = Math.min((ahora - this.ultimo) / 1000, 0.05);
    this.ultimo = ahora;
    this.ctx.clearRect(0, 0, this.w, this.h);

    for (var i = this.piezas.length - 1; i >= 0; i--) {
      var p = this.piezas[i];
      p.y += p.vy * dt;
      p.fase += p.ritmo * dt;
      p.x += Math.sin(p.fase) * p.vaiven * dt;
      p.giro += p.vgiro * dt;

      if (p.y - p.t > this.h) {
        if (this.op.ciclico) {
          this.piezas[i] = this.nueva(true);
          this.piezas[i].y = -20 - Math.random() * 60;
        } else {
          this.piezas.splice(i, 1);
          continue;
        }
      }
      if (p.x < -40) { p.x += this.w + 80; }
      if (p.x > this.w + 40) { p.x -= this.w + 80; }

      pintar(this.ctx, p);
    }

    if (!this.op.ciclico && !this.piezas.length) { this.parar(); return; }

    var self = this;
    this.raf = requestAnimationFrame(function (t) { self.paso(t); });
  };

  Capa.prototype.arrancar = function () {
    if (this.corriendo) { return; }
    this.corriendo = true;
    this.c.hidden = false;
    this.medir();
    this.ultimo = performance.now();
    var self = this;
    this.raf = requestAnimationFrame(function (t) { self.paso(t); });
  };

  Capa.prototype.parar = function () {
    this.corriendo = false;
    cancelAnimationFrame(this.raf);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.c.hidden = true;
  };

  /* --- las dos capas --- */

  var confeti = new Capa(lienzoConf, {
    formas: FORMAS, ciclico: true,
    min: 9, max: 17, vyMin: 22, vyMax: 58,
    alfaMin: 0.55, alfaMax: 0.9
  });

  var lluvia = new Capa(lienzoLluv, {
    formas: ["corazon", "corazon", "mono"], ciclico: false,
    min: ESTRECHO ? 11 : 13, max: ESTRECHO ? 20 : 26,
    vyMin: 120, vyMax: 300,
    alfaMin: 0.7, alfaMax: 1
  });

  /* el confeti empieza al pasar la pantalla de bloqueo */
  document.addEventListener("pagina:desbloqueada", function () {
    if (reduce) { return; }               // sin animación si se pidió menos movimiento
    confeti.llenar(CANTIDAD, false);
    confeti.arrancar();
  });

  /* lluvia de corazones cada vez que se abre la carta */
  ["carta:abierta", "sorpresa:revelada"].forEach(function (nombre) {
  document.addEventListener(nombre, function () {
    if (reduce) { return; }
    lluvia.piezas.length = 0;
    lluvia.llenar(CORAZONES, true);
    lluvia.arrancar();
  });
  });

  /* redimensionar sin deformar nada */
  var temporizador = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(function () {
      if (confeti.corriendo) { confeti.medir(); }
      if (lluvia.corriendo)  { lluvia.medir(); }
    }, 150);
  });

  /* en segundo plano no gasta batería */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(confeti.raf);
      cancelAnimationFrame(lluvia.raf);
    } else {
      if (confeti.corriendo) {
        confeti.ultimo = performance.now();
        confeti.raf = requestAnimationFrame(function (t) { confeti.paso(t); });
      }
      if (lluvia.corriendo) {
        lluvia.ultimo = performance.now();
        lluvia.raf = requestAnimationFrame(function (t) { lluvia.paso(t); });
      }
    }
  });
})();


/* ------------------------------------------------------------
   6) Frasco de razones

   ⬇️ ESCRIBE AQUÍ TUS RAZONES. Pon todas las que quieras.
   Salen al azar y ninguna se repite hasta que se acaben todas.
   ------------------------------------------------------------ */

var RAZONES = [
  "Porque te ríes de tus propios chistes antes de terminarlos.",
  "Porque me cuentas las cosas dos veces y me gustan más la segunda.",
  "Porque tienes paciencia los días en que ando insoportable.",
  "Porque haces que los lugares comunes se sientan bonitos.",
  "Porque te acuerdas de los detalles que yo digo sin pensar.",
  "Porque cuando algo te da ternura haces una cara que no puedes disimular.",
  "Porque contigo hasta esperar se me hace corto.",
  "Porque me escuchas sin apurarme.",
  "Porque te emocionas por cosas pequeñas y eso me alegra el día.",
  "Porque sabes exactamente cuándo no hace falta decir nada.",
  "Porque tu manera de ordenar las cosas antes de empezar algo me parece adorable.",
  "Porque me haces querer ser más atento sin pedírmelo.",
  "Porque cantas mal y con toda la seguridad del mundo.",
  "Porque me mandas cosas a media tarde y me cambias el ánimo.",
  "Porque eres valiente en las cosas que a mí me cuestan.",
  "Porque me hablas de tus planes como si yo ya estuviera en ellos.",
  "Porque te preocupas por la gente que quieres sin hacer ruido.",
  "Porque a tu lado no tengo que fingir estar bien.",
  "Porque te tomas el café más lento de lo que cualquiera creería posible.",
  "Porque discutimos y seguimos siendo nosotros.",
  "Porque me haces reír justo cuando menos ganas tengo.",
  "Porque nunca me has hecho sentir que sobro.",
  "Porque hasta tus manías me parecen parte de lo bueno.",
  "Porque dos meses contigo se sienten mucho más largos y mucho más cortos a la vez."
];


(function () {
  "use strict";

  var jar    = document.getElementById("jar");
  var card   = document.getElementById("reasonCard");
  var label  = document.getElementById("reasonLabel");
  var texto  = document.getElementById("reasonText");
  var cuenta = document.getElementById("reasonCount");

  if (!jar || !texto || !RAZONES.length) { return; }

  var reduce = window.matchMedia &&
               window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var bolsa = [];        // las que quedan por salir en esta vuelta
  var vistas = 0;        // cuántas ha visto en total

  function revolver() {
    bolsa = RAZONES.map(function (t, i) { return i; });
    /* Fisher-Yates */
    for (var i = bolsa.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bolsa[i]; bolsa[i] = bolsa[j]; bolsa[j] = tmp;
    }
  }

  function sacar() {
    if (!bolsa.length) { revolver(); }
    var i = bolsa.pop();
    vistas++;

    label.textContent = "razón n.º " + (i + 1);
    texto.textContent = RAZONES[i];

    cuenta.textContent = bolsa.length
      ? "quedan " + bolsa.length + " sin repetir"
      : "ya viste todas — vuelve a empezar";

    card.classList.remove("is-new");
    void card.offsetWidth;            // reinicia la animación
    card.classList.add("is-new");
  }

  jar.addEventListener("click", function () {
    if (!reduce) {
      jar.classList.remove("is-shaking");
      void jar.offsetWidth;
      jar.classList.add("is-shaking");
      window.setTimeout(sacar, 240);
    } else {
      sacar();
    }
  });

  revolver();
})();


/* ------------------------------------------------------------
   7) Rasca y gana
   ------------------------------------------------------------ */

(function () {
  "use strict";

  var caja   = document.getElementById("scratch");
  var lienzo = document.getElementById("scratchCover");
  var otra   = document.getElementById("scratchAgain");

  if (!caja || !lienzo || !lienzo.getContext) { return; }

  var LIMITE = 0.55;          // con este % raspado se descubre todo
  var RADIO  = 26;            // grosor de la "uña"

  var ctx = lienzo.getContext("2d", { willReadFrequently: true });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0;
  var raspando = false;
  var listo = false;
  var ultimo = null;
  var cuentaMov = 0;

  function tapar() {
    var r = caja.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* la capa plateada rosada */
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#F6C9D8");
    g.addColorStop(0.35, "#E9A8BF");
    g.addColorStop(0.55, "#F7D3DF");
    g.addColorStop(1, "#DE93AE");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    /* moñitos y corazones sueltos, muy tenues */
    ctx.fillStyle = "rgba(255, 255, 255, .34)";
    for (var i = 0; i < 34; i++) {
      var x = Math.random() * w, y = Math.random() * h;
      var s = 5 + Math.random() * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-s, -s * 0.6); ctx.lineTo(-s, s * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(s, -s * 0.6); ctx.lineTo(s, s * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(110, 74, 87, .55)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var tam = Math.max(13, Math.min(18, w * 0.042));
    ctx.font = "700 " + tam + "px Quicksand, system-ui, sans-serif";
    ctx.fillText("R A S P A   A Q U Í", w / 2, h / 2);

    listo = false;
    cuentaMov = 0;
    caja.classList.remove("is-done");
    lienzo.style.pointerEvents = "";
    if (otra) { otra.hidden = true; }
  }

  /* sirve igual para un PointerEvent, un TouchEvent o un MouseEvent */
  function punto(e) {
    var r = lienzo.getBoundingClientRect();
    var f = e;
    if (e.touches && e.touches.length)            { f = e.touches[0]; }
    else if (e.changedTouches && e.changedTouches.length) { f = e.changedTouches[0]; }
    return { x: f.clientX - r.left, y: f.clientY - r.top };
  }

  function rascar(a, b) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = RADIO * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, RADIO, 0, Math.PI * 2);
    ctx.fill();
  }

  /* mide el porcentaje descubierto sobre una muestra, no pixel a pixel */
  function medir() {
    var paso = 8;
    var datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
    var total = 0, vacios = 0;
    var anchoPx = lienzo.width;
    for (var y = 0; y < lienzo.height; y += paso) {
      for (var x = 0; x < anchoPx; x += paso) {
        var i = (y * anchoPx + x) * 4 + 3;
        total++;
        if (datos[i] < 40) { vacios++; }
      }
    }
    return total ? vacios / total : 0;
  }

  function descubrir() {
    listo = true;
    caja.classList.add("is-done");
    lienzo.style.pointerEvents = "none";
    if (otra) { otra.hidden = false; }
    document.dispatchEvent(new CustomEvent("sorpresa:revelada"));
  }

  function empezar(e) {
    if (listo) { return; }
    if (e.type === "mousedown" && typeof e.button === "number" && e.button !== 0) {
      return;
    }
    /* sin esto el dedo arrastraría la página en vez de raspar */
    if (e.cancelable) { e.preventDefault(); }
    if (e.pointerId !== undefined && lienzo.setPointerCapture) {
      try { lienzo.setPointerCapture(e.pointerId); } catch (err) {}
    }
    raspando = true;
    ultimo = punto(e);
    rascar(ultimo, ultimo);
  }

  function mover(e) {
    if (!raspando || listo) { return; }
    if (e.cancelable) { e.preventDefault(); }
    var p = punto(e);
    rascar(ultimo || p, p);
    ultimo = p;

    /* revisar el avance de vez en cuando, no en cada píxel */
    if (++cuentaMov % 12 === 0 && medir() >= LIMITE) { descubrir(); }
  }

  function soltar() {
    if (!raspando) { return; }
    raspando = false;
    ultimo = null;
    if (!listo && medir() >= LIMITE) { descubrir(); }
  }

  /* misma idea que en la portada: Pointer Events si existen, y si no,
     touch + ratón. Nunca los dos a la vez. */
  if (window.PointerEvent) {
    lienzo.addEventListener("pointerdown", empezar);
    lienzo.addEventListener("pointermove", mover);
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);
    lienzo.addEventListener("pointerleave", soltar);
  } else {
    lienzo.addEventListener("touchstart", empezar, { passive: false });
    lienzo.addEventListener("touchmove", mover, { passive: false });
    lienzo.addEventListener("touchend", soltar);
    lienzo.addEventListener("touchcancel", soltar);
    lienzo.addEventListener("mousedown", empezar);
    lienzo.addEventListener("mousemove", mover);
    lienzo.addEventListener("mouseup", soltar);
    lienzo.addEventListener("mouseleave", soltar);
  }

  if (otra) { otra.addEventListener("click", tapar); }

  /* al cambiar el tamaño hay que redibujar; si ya lo descubrió, se deja */
  var temp = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(temp);
    temp = window.setTimeout(function () { if (!listo) { tapar(); } }, 180);
  });

  /* esperar a que la tarjeta tenga su tamaño final */
  if (document.readyState === "complete") { tapar(); }
  else { window.addEventListener("load", tapar); }
})();


/* ------------------------------------------------------------
   8) Cielo de recuerdos
   ------------------------------------------------------------ */

(function () {
  "use strict";

  var campo  = document.querySelector(".sky__field");
  var nota   = document.getElementById("skyNote");
  var fecha  = document.getElementById("skyDate");
  var titulo = document.getElementById("skyTitle");
  var texto  = document.getElementById("skyText");

  if (!campo || !nota) { return; }

  var estrellas = campo.querySelectorAll(".star");

  function elegir(btn) {
    for (var i = 0; i < estrellas.length; i++) {
      var on = estrellas[i] === btn;
      estrellas[i].classList.toggle("is-on", on);
      estrellas[i].setAttribute("aria-pressed", on ? "true" : "false");
    }

    fecha.textContent  = btn.getAttribute("data-fecha")  || "";
    titulo.textContent = btn.getAttribute("data-titulo") || "";
    texto.textContent  = btn.getAttribute("data-texto")  || "";

    nota.classList.remove("is-new");
    void nota.offsetWidth;
    nota.classList.add("is-new");
  }

  for (var i = 0; i < estrellas.length; i++) {
    (function (btn) {
      btn.addEventListener("click", function () { elegir(btn); });
    })(estrellas[i]);
  }
})();
