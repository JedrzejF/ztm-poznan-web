/* mapa.js - rysowanie; cala logika wyboru i koloru w logika.js */
(function () {
  "use strict";
  var L_ = window.Logika;
  var stan = { godz: 15, typ: "wszystkie", tryb: "iloraz", wybrany: null };
  var dane, mapa, warstwy = [], podklad;

  function motyw() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "dark") return "ciemny";
    if (t === "light") return "jasny";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "ciemny" : "jasny";
  }

  function ustawPodklad() {
    // Szary podklad bez klucza API (CARTO wymaga go od 2026) - kolor na mapie
    // niesie dane, wiec tlo musi byc neutralne.
    var styl = motyw() === "ciemny" ? "World_Dark_Gray_Base" : "World_Light_Gray_Base";
    if (podklad) mapa.removeLayer(podklad);
    podklad = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" +
                          styl + "/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, attribution: "Podkład &copy; Esri, OpenStreetMap"
    }).addTo(mapa);
  }

  function legenda() {
    var P = L_.MOTYWY[motyw()];
    document.getElementById("leg-pasek").style.background =
      "linear-gradient(90deg," + P.szybciej + "," + P.srodek + "," + P.wolniej + ")";
    var it = stan.tryb === "iloraz";
    document.getElementById("leg-lewa").textContent = it ? "÷1,5 szybciej" : "−60 s szybciej";
    document.getElementById("leg-prawa").textContent = it ? "×1,5 wolniej" : "+60 s wolniej";
    document.querySelector(".legenda .brak i").style.background = P.brak;
  }

  function odswiez() {
    var m = motyw();
    warstwy.forEach(function (w) {
      var o = w.odc, widoczny = L_.pasujeTyp(o, stan.typ);
      var v = L_.wartosc(o, stan.godz, stan.tryb);
      if (!widoczny) { w.linia.setStyle({ opacity: 0, interactive: false }); return; }
      w.linia.setStyle({
        color: L_.kolor(v, stan.tryb, m),
        weight: v === null ? 1.5 : (w === stan.wybrany ? 6 : 3.5),
        opacity: v === null ? 0.5 : 0.95
      });
      if (v !== null) w.linia.bringToFront();
    });
    document.getElementById("godz-etykieta").textContent = L_.fmtGodz(stan.godz);
    document.getElementById("tab-godz").textContent = L_.fmtGodz(stan.godz);
    legenda();
    tabela();
    if (stan.wybrany) profil(stan.wybrany.odc);
  }

  function tabela() {
    var tb = document.getElementById("tab"), m = motyw();
    tb.innerHTML = "";
    L_.ranking(dane.odcinki, stan.godz, stan.typ, stan.tryb, 15).forEach(function (o) {
      var c = o.h[String(stan.godz)], tr = document.createElement("tr");
      var v = L_.wartosc(o, stan.godz, stan.tryb);
      tr.innerHTML =
        "<td><span class='kropka' style='background:" + L_.kolor(v, stan.tryb, m) + "'></span>" +
        L_.nazwa(o, dane.przystanki) + "</td><td>" + L_.TYPY[o.t] + "</td>" +
        "<td class='l'>" + Math.round(c[1]) + " s</td><td class='l'>" + Math.round(o.d[1]) + " s</td>" +
        "<td class='l'>" + (stan.tryb === "iloraz" ? L_.fmtIloraz(c[2]) : L_.fmtRoznica(c[1] - o.d[1])) +
        "</td><td class='l'>" + c[0] + "</td>";
      tr.addEventListener("click", function () {
        var w = warstwy.find(function (x) { return x.odc === o; });
        wybierz(w);
        mapa.fitBounds(w.linia.getBounds(), { maxZoom: 16, padding: [60, 60] });
      });
      tb.appendChild(tr);
    });
  }

  function profil(o) {
    var svg = document.getElementById("profil"), m = motyw();
    var W = 320, H = 160, lewo = 30, dol = 18, gora = 8;
    var godziny = Object.keys(o.h).map(Number);
    var maks = Math.max(o.d[1], Math.max.apply(null, godziny.map(function (h) { return o.h[h][1]; }))) * 1.1;
    var y = function (s) { return gora + (H - dol - gora) * (1 - s / maks); };
    var szer = (W - lewo) / 24;
    var s = "";
    for (var h = 0; h < 24; h++) {
      var c = o.h[String(h)];
      if (!c) continue;
      var v = stan.tryb === "iloraz" ? c[2] : c[1] - o.d[1];
      s += "<rect x='" + (lewo + h * szer + 1) + "' y='" + y(c[1]) + "' width='" + (szer - 2) +
           "' height='" + (H - dol - y(c[1])) + "' rx='2' fill='" + L_.kolor(v, stan.tryb, m) + "'" +
           (h === stan.godz ? " stroke='currentColor' stroke-width='1.5'" : "") +
           "><title>" + L_.fmtGodz(h) + ": " + Math.round(c[1]) + " s, n=" + c[0] + "</title></rect>";
    }
    s += "<line x1='" + lewo + "' x2='" + W + "' y1='" + y(o.d[1]) + "' y2='" + y(o.d[1]) +
         "' stroke='currentColor' stroke-dasharray='4 3' opacity='0.7'/>";
    [0, 6, 12, 18].forEach(function (h) {
      s += "<text x='" + (lewo + h * szer + szer / 2) + "' y='" + (H - 4) + "' text-anchor='middle'>" + h + "</text>";
    });
    [0, Math.round(maks / 2), Math.round(maks)].forEach(function (v) {
      s += "<text x='" + (lewo - 4) + "' y='" + (y(v) + 3) + "' text-anchor='end'>" + v + " s</text>";
    });
    svg.style.color = getComputedStyle(document.body).color;
    svg.innerHTML = s;
    document.getElementById("panel-tytul").textContent = L_.nazwa(o, dane.przystanki) + " (" + L_.TYPY[o.t] + ")";
    document.getElementById("panel-opis").textContent =
      "Mediana całej doby: " + Math.round(o.d[1]) + " s (" + o.d[0] + " przejazdów). Słupek obwiedziony — wybrana godzina.";
  }

  function wybierz(w) {
    stan.wybrany = w;
    odswiez();
  }

  function start(d) {
    dane = d;
    // przyblizanie kolkiem dopiero po kliknieciu w mape - inaczej przewijanie
    // strony "wpada" w mape i ja przybliza
    mapa = L.map("mapa", { preferCanvas: true, zoomControl: true, maxZoom: 16,
                           scrollWheelZoom: false }).setView([52.405, 16.925], 13);
    mapa.on("click", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("mouseout", function () { mapa.scrollWheelZoom.disable(); });
    ustawPodklad();
    d.odcinki.forEach(function (o) {
      var linia = L.polyline(o.g, { offset: 2.5, lineCap: "round" }).addTo(mapa);
      var w = { odc: o, linia: linia };
      linia.bindTooltip(function () { return L_.opis(o, stan.godz, d.przystanki); }, { sticky: true });
      linia.on("click", function () { wybierz(w); });
      warstwy.push(w);
    });
    // widok startowy: miasto; linie podmiejskie siegaja kilkadziesiat km dalej
    var dz = d.meta.doby;
    document.getElementById("meta").textContent =
      dz.length + " dób roboczych: " + dz[0] + " – " + dz[dz.length - 1] +
      " · " + d.odcinki.length + " odcinków · wygenerowano " + d.meta.wygenerowano.replace("T", " ");
    document.getElementById("min-n").textContent = d.meta.min_n;
    odswiez();
  }

  document.getElementById("godz").addEventListener("input", function (e) {
    stan.godz = Number(e.target.value); odswiez();
  });
  document.querySelectorAll("input[name=typ]").forEach(function (r) {
    r.addEventListener("change", function (e) { stan.typ = e.target.value; odswiez(); });
  });
  document.querySelectorAll("input[name=tryb]").forEach(function (r) {
    r.addEventListener("change", function (e) { stan.tryb = e.target.value; odswiez(); });
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    ustawPodklad(); odswiez();
  });

  fetch("data/korki.json").then(function (r) { return r.json(); }).then(start)
    .catch(function (e) { document.getElementById("meta").textContent = "Błąd wczytywania danych: " + e; });
})();
