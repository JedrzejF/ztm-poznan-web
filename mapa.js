/* mapa.js - rysowanie; cala logika wyboru i koloru w logika.js */
(function () {
  "use strict";
  var L_ = window.Logika;
  var stan = { godz: 15, typ: "wszystkie", tryb: "iloraz", wybrany: null };
  var dane, punkt, mapa, warstwy = [], podklad;

  var LEGENDA = {
    iloraz: ["÷1,5 szybciej", "×1,5 wolniej"],
    roznica: ["−60 s szybciej", "+60 s wolniej"],
    opoznienie: ["1 min przed czasem", "3 min opóźnienia"],
    punktualnosc: ["100% punktualnie", "50% i mniej"]
  };

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
    var jednostronna = stan.tryb === "punktualnosc";
    document.getElementById("leg-pasek").style.background = jednostronna
      ? "linear-gradient(90deg," + P.srodek + "," + P.wolniej + ")"
      : "linear-gradient(90deg," + P.szybciej + "," + P.srodek + "," + P.wolniej + ")";
    document.getElementById("leg-lewa").textContent = LEGENDA[stan.tryb][0];
    document.getElementById("leg-prawa").textContent = LEGENDA[stan.tryb][1];
    document.querySelector(".legenda .brak i").style.background = P.brak;
  }

  function odswiez() {
    var m = motyw();
    warstwy.forEach(function (w) {
      var o = w.odc, widoczny = L_.pasujeTyp(o, stan.typ);
      var v = L_.wartosc(o, stan.godz, stan.tryb);
      if (!widoczny) { w.linia.setStyle({ opacity: 0, interactive: false }); return; }
      w.linia.setStyle({
        color: L_.kolor(v, stan.tryb, m), interactive: true,
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
    var zOpozn = L_.TRYBY[stan.tryb].zrodlo === "o";
    document.getElementById("tab-tytul").textContent = stan.tryb === "punktualnosc"
      ? "Odcinki z najniższą punktualnością" : zOpozn
      ? "Największe opóźnienia" : "Najbardziej wydłużone odcinki";
    document.getElementById("tab-glowa").innerHTML = zOpozn
      ? "<tr><th>Odcinek (przyjazd na drugi przystanek)</th><th>Pojazd</th><th class='l'>Mediana opóźnienia</th><th class='l'>Punktualnie</th><th class='l'>Przyjazdów</th></tr>"
      : "<tr><th>Odcinek</th><th>Pojazd</th><th class='l'>W tej godzinie</th><th class='l'>Cała doba</th><th class='l'>Zmiana</th><th class='l'>Przejazdów</th></tr>";
    tb.innerHTML = "";
    L_.ranking(dane.odcinki, stan.godz, stan.typ, stan.tryb, 15).forEach(function (o) {
      var c = L_.komorka(o, stan.godz, stan.tryb), tr = document.createElement("tr");
      var v = L_.wartosc(o, stan.godz, stan.tryb);
      var glowa = "<td><span class='kropka' style='background:" + L_.kolor(v, stan.tryb, m) +
                  "'></span>" + L_.nazwa(o, dane.przystanki) + "</td><td>" + L_.TYPY[o.t] + "</td>";
      tr.innerHTML = glowa + (zOpozn
        ? "<td class='l'>" + L_.fmtOpozn(c[1]) + "</td><td class='l'>" + L_.fmtProc(c[2]) +
          "</td><td class='l'>" + c[0] + "</td>"
        : "<td class='l'>" + Math.round(c[1]) + " s</td><td class='l'>" + Math.round(o.d[1]) +
          " s</td><td class='l'>" + L_.fmtWartosc(v, stan.tryb) + "</td><td class='l'>" + c[0] + "</td>");
      tr.addEventListener("click", function () {
        var w = warstwy.find(function (x) { return x.odc === o; });
        wybierz(w);
        mapa.fitBounds(w.linia.getBounds(), { maxZoom: 16, padding: [60, 60] });
        document.getElementById("mapa").scrollIntoView({ behavior: "smooth", block: "center" });
      });
      tb.appendChild(tr);
    });
  }

  function profil(o) {
    var svg = document.getElementById("profil"), m = motyw();
    var zOpozn = L_.TRYBY[stan.tryb].zrodlo === "o";
    var W = 320, H = 160, lewo = 34, dol = 18, gora = 8, szer = (W - lewo) / 24;
    var s = "", y;
    if (zOpozn) {
      // slupki od zera: opoznienie moze byc ujemne
      var wart = Object.keys(o.o || {}).map(function (h) { return o.o[h][1]; });
      var lo = Math.min(0, Math.min.apply(null, wart.concat([0]))) * 1.1;
      var hi = Math.max(180, Math.max.apply(null, wart.concat([0]))) * 1.1;
      y = function (v) { return gora + (H - dol - gora) * (hi - v) / (hi - lo); };
      for (var h = 0; h < 24; h++) {
        var c = (o.o || {})[String(h)];
        if (!c) continue;
        var v = stan.tryb === "punktualnosc" ? c[2] : c[1];
        var y0 = y(0), y1 = y(c[1]);
        s += "<rect x='" + (lewo + h * szer + 1) + "' y='" + Math.min(y0, y1) + "' width='" + (szer - 2) +
             "' height='" + Math.max(1, Math.abs(y1 - y0)) + "' rx='2' fill='" + L_.kolor(v, stan.tryb, m) + "'" +
             (h === stan.godz ? " stroke='currentColor' stroke-width='1.5'" : "") + "><title>" +
             L_.fmtGodz(h) + ": " + L_.fmtOpozn(c[1]) + ", punktualnie " + L_.fmtProc(c[2]) +
             ", n=" + c[0] + "</title></rect>";
      }
      [[0, "0"], [180, "+3 min"]].forEach(function (p) {
        s += "<line x1='" + lewo + "' x2='" + W + "' y1='" + y(p[0]) + "' y2='" + y(p[0]) +
             "' stroke='currentColor' stroke-dasharray='" + (p[0] ? "4 3" : "0") + "' opacity='0.5'/>" +
             "<text x='" + (lewo - 4) + "' y='" + (y(p[0]) + 3) + "' text-anchor='end'>" + p[1] + "</text>";
      });
    } else {
      var godziny = Object.keys(o.h).map(Number);
      var maks = Math.max(o.d[1], Math.max.apply(null, godziny.map(function (h) { return o.h[h][1]; }))) * 1.1;
      y = function (v) { return gora + (H - dol - gora) * (1 - v / maks); };
      for (var g = 0; g < 24; g++) {
        var k = o.h[String(g)];
        if (!k) continue;
        var w = stan.tryb === "iloraz" ? k[2] : k[1] - o.d[1];
        s += "<rect x='" + (lewo + g * szer + 1) + "' y='" + y(k[1]) + "' width='" + (szer - 2) +
             "' height='" + (H - dol - y(k[1])) + "' rx='2' fill='" + L_.kolor(w, stan.tryb, m) + "'" +
             (g === stan.godz ? " stroke='currentColor' stroke-width='1.5'" : "") +
             "><title>" + L_.fmtGodz(g) + ": " + Math.round(k[1]) + " s, n=" + k[0] + "</title></rect>";
      }
      s += "<line x1='" + lewo + "' x2='" + W + "' y1='" + y(o.d[1]) + "' y2='" + y(o.d[1]) +
           "' stroke='currentColor' stroke-dasharray='4 3' opacity='0.7'/>";
      [0, Math.round(maks / 2), Math.round(maks)].forEach(function (v) {
        s += "<text x='" + (lewo - 4) + "' y='" + (y(v) + 3) + "' text-anchor='end'>" + v + " s</text>";
      });
    }
    [0, 6, 12, 18].forEach(function (h) {
      s += "<text x='" + (lewo + h * szer + szer / 2) + "' y='" + (H - 4) + "' text-anchor='middle'>" + h + "</text>";
    });
    svg.style.color = getComputedStyle(document.body).color;
    svg.innerHTML = s;
    document.getElementById("panel-tytul").textContent = L_.nazwa(o, dane.przystanki) + " (" + L_.TYPY[o.t] + ")";
    document.getElementById("panel-opis").textContent = zOpozn
      ? "Mediana opóźnienia przy przyjeździe na " + (dane.przystanki[o.b] || o.b) +
        " wg godziny planowej; przerywana linia — granica 3 min."
      : "Mediana czasu przejazdu w każdej godzinie; przerywana linia — mediana całej doby (" +
        Math.round(o.d[1]) + " s, " + o.d[0] + " przejazdów).";
  }

  function wybierz(w) {
    stan.wybrany = w;
    odswiez();
  }

  /* --- punktualnosc ---------------------------------------------------- */
  function tabelaPunkt() {
    var P = L_.MOTYWY[motyw()];
    var przyst = document.getElementById("p-przystanek").value.trim();
    var linia = document.getElementById("p-linia").value;
    var znany = !przyst || punkt.przystanki.has(przyst);
    var w = znany ? L_.filtrPunkt(punkt.wiersze, przyst, linia) : [];
    document.getElementById("p-kol").textContent = linia && !przyst ? "Przystanek" : "Linia";
    var tb = document.getElementById("p-tab");
    tb.innerHTML = "";
    w.slice(0, 200).forEach(function (r) {
      var tr = document.createElement("tr");
      if (r.l === "*") tr.className = "suma";
      var etyk = linia && !przyst ? r.p : (r.l === "*" ? "wszystkie linie" : r.l);
      var pr = function (k) { return (100 * r[k] / r.n); };
      tr.innerHTML = "<td>" + etyk + "</td><td><span class='slupek' title='przed / punktualnie / po'>" +
        "<i style='width:" + pr("przed") + "%;background:" + P.szybciej + "'></i>" +
        "<i style='width:" + pr("punkt") + "%;background:" + P.srodek + "'></i>" +
        "<i style='width:" + pr("po") + "%;background:" + P.wolniej + "'></i></span></td>" +
        "<td class='l'>" + Math.round(pr("punkt")) + "%</td><td class='l'>" + Math.round(pr("przed")) +
        "%</td><td class='l'>" + Math.round(pr("po")) + "%</td><td class='l'>" + L_.fmtOpozn(r.med) +
        "</td><td class='l'>" + L_.fmtOpozn(r.p90) + "</td><td class='l'>" + r.n.toLocaleString("pl-PL") + "</td>";
      if (!linia && !przyst) {
        tr.style.cursor = "pointer";
        tr.addEventListener("click", function () {
          document.getElementById("p-linia").value = r.l; tabelaPunkt();
        });
      }
      tb.appendChild(tr);
    });
    document.getElementById("p-info").textContent = !znany
      ? "Nie znam przystanku „" + przyst + "” — wybierz z listy podpowiedzi."
      : w.length > 200 ? "Pokazano 200 z " + w.length + " wierszy (najgorsze na górze)."
      : !przyst && !linia ? "Kliknij linię, żeby zobaczyć jej przystanki." : "";
  }

  function startPunkt(p) {
    punkt = p;
    punkt.przystanki = new Set(p.wiersze.filter(function (r) { return r.p !== "*"; })
                                         .map(function (r) { return r.p; }));
    var lista = document.getElementById("p-lista");
    Array.from(punkt.przystanki).sort(function (a, b) { return a.localeCompare(b, "pl"); })
      .forEach(function (n) { var o = document.createElement("option"); o.value = n; lista.appendChild(o); });
    var linie = Array.from(new Set(p.wiersze.filter(function (r) { return r.l !== "*"; })
                                            .map(function (r) { return r.l; })))
      .sort(function (a, b) { return a.localeCompare(b, "pl", { numeric: true }); });
    var sel = document.getElementById("p-linia");
    linie.forEach(function (l) { var o = document.createElement("option"); o.value = l; o.textContent = l; sel.appendChild(o); });
    document.getElementById("p-przed").textContent = Math.abs(p.meta.przed_s / 60) + " min";
    document.getElementById("p-po").textContent = p.meta.po_s / 60 + " min";
    ["p-przystanek", "p-linia"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", tabelaPunkt);
    });
    document.getElementById("p-przystanek").addEventListener("input", function (e) {
      if (punkt.przystanki.has(e.target.value.trim()) || !e.target.value) tabelaPunkt();
    });
    document.getElementById("p-wyczysc").addEventListener("click", function () {
      document.getElementById("p-przystanek").value = "";
      document.getElementById("p-linia").value = "";
      tabelaPunkt();
    });
    tabelaPunkt();
  }

  /* --- start ------------------------------------------------------------- */
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
      linia.bindTooltip(function () { return L_.opis(o, stan.godz, d.przystanki, stan.tryb); }, { sticky: true });
      linia.on("click", function () { wybierz(w); });
      warstwy.push(w);
    });
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
    ustawPodklad(); odswiez(); if (punkt) tabelaPunkt();
  });

  function blad(e) {
    document.getElementById("meta").textContent = "Błąd wczytywania danych: " + e;
  }
  fetch("data/korki.json").then(function (r) { return r.json(); }).then(start).catch(blad);
  fetch("data/punktualnosc.json").then(function (r) { return r.json(); }).then(startPunkt).catch(blad);
})();
