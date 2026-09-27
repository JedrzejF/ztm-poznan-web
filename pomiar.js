/* pomiar.js - interfejs; logika i walidacja w pomiar-logika.js */
(function () {
  "use strict";
  var P = window.Pomiar;
  var KLUCZ = "ztm-pomiar-v1";

  // Miejsca z planu proby (docs/POMIAR_TERENOWY.md): oba kierunki tej samej
  // pary - jeden bez swiatel, drugi ze swiatlem tuz za przystankiem.
  var PRZYSTANKI = [
    ["117", "Fredry 117 → Gwarna (bez świateł)"],
    ["118", "Fredry 118 → Most Teatralny (światło za)"],
    ["8", "Poznańska 8 → Most Teatralny (bez świateł)"],
    ["7", "Poznańska 7 → Wielkopolska (światło za)"],
    ["158", "Kórnicka 158 → Rondo Rataje (bez świateł)"],
    ["159", "Kórnicka 159 (światło za)"],
    ["628", "Swoboda 628 → Bułgarska/Polska (bez świateł)"],
    ["629", "Swoboda 629 → Szpitalna (światło za)"],
    ["1131", "Małe Garbary 1131 (bez świateł)"],
    ["1130", "Grochowe Łąki 1130 (światło za)"],
  ];

  var stan = { otwarte: [], zamkniete: [], przystanek: "", przystanekTekst: "" };

  function wczytaj() {
    try {
      var s = JSON.parse(localStorage.getItem(KLUCZ) || "null");
      if (s && s.otwarte && s.zamkniete) stan = s;
    } catch (e) { /* prywatne okno albo zablokowany storage - dziala bez zapisu */ }
  }
  function zapisz() {
    try { localStorage.setItem(KLUCZ, JSON.stringify(stan)); } catch (e) { /* j.w. */ }
  }

  function esc(v) {
    return String(v).replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function hms(t) {
    var d = new Date(t);
    return d.toLocaleTimeString("pl-PL", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0").slice(0, 1);
  }

  function karta(obs, i) {
    var el = document.createElement("article");
    el.className = "karta";
    var tr = P.trwanie(obs);
    el.innerHTML =
      "<div class='pola'>" +
      "<label>Linia<input data-pole='linia' value='" + esc(obs.linia) + "' autocomplete='off' autocapitalize='characters'></label>" +
      "<label>Nr taborowy<input data-pole='pojazd' value='" + esc(obs.pojazd) + "' inputmode='numeric' pattern='[0-9]*' autocomplete='off'></label>" +
      "</div><div class='przyciski'>" +
      P.ZDARZENIA.map(function (z, k) {
        var t = obs.czasy[z.kod];
        return "<button type='button' data-zd='" + z.kod + "' class='" + (t !== undefined ? "zrobione " : "") +
               (k >= 4 ? "drugie" : "") + "' title='" + z.opis + "'>" + z.etykieta +
               (t !== undefined ? "<small>" + hms(t) + "</small>" : "") + "</button>";
      }).join("") + "</div>" +
      "<div class='pasazerowie'>" +
      "<div class='licznik'><span>Wsiada <b>" + (obs.wsiadlo || 0) + "</b></span>" +
      "<button type='button' data-licz='wsiadlo' data-d='1'>+</button><button type='button' class='minus' data-licz='wsiadlo' data-d='-1'>\u2212</button></div>" +
      "<div class='licznik'><span>Wysiada <b>" + (obs.wysiadlo || 0) + "</b></span>" +
      "<button type='button' data-licz='wysiadlo' data-d='1'>+</button><button type='button' class='minus' data-licz='wysiadlo' data-d='-1'>\u2212</button></div>" +
      "<label class='drzwi'>Liczone drzwi <select data-pole='drzwi_obs'>" +
      ["", "1", "2", "3", "4", "wszystkie"].map(function (v) {
        return "<option value='" + v + "'" + (obs.drzwi_obs === v ? " selected" : "") + ">" + (v || "\u2014") + "</option>";
      }).join("") + "</select></label>" +
      "<div class='tlok'>" + P.TLOK.map(function (x) {
        return "<button type='button' data-tlok='" + x[0] + "' class='" + (obs.tlok === x[0] ? "zrobione" : "") + "'>" + x[1] + "</button>";
      }).join("") + "</div></div>" +
      "<div class='wyniki'>" + [
        tr.postoj !== null ? "postój " + tr.postoj.toFixed(1) + " s" : null,
        tr.drzwi !== null ? "drzwi " + tr.drzwi.toFixed(1) + " s" : null,
        tr.swiatlo !== null ? "2. zatrzymanie " + tr.swiatlo.toFixed(1) + " s" : null
      ].filter(Boolean).join(" · ") + "</div>" +
      "<details><summary>Okoliczności i uwagi</summary>" +
      P.FLAGI.map(function (f) {
        return "<label><input type='checkbox' data-flaga='" + f.kod + "'" + (obs.flagi[f.kod] ? " checked" : "") +
               "> " + f.etykieta + "</label>";
      }).join("") +
      "<label>Uwagi <input type='text' data-pole='uwagi' value='" + esc(obs.uwagi) + "'></label></details>" +
      "<div class='komunikat'></div>" +
      "<div class='stopka-karty'><button type='button' data-akcja='cofnij'>Cofnij</button>" +
      "<button type='button' data-akcja='usun'>Usuń</button>" +
      "<button type='button' class='zakoncz' data-akcja='zakoncz'>Zakończ</button></div>";

    var kom = el.querySelector(".komunikat");
    el.querySelectorAll("[data-zd]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = Date.now();                     // moment dotkniecia - przed czymkolwiek innym
        try {
          stan.otwarte[i] = P.zapisz(stan.otwarte[i], b.dataset.zd, t);
          if (navigator.vibrate) navigator.vibrate(30);
          zapisz(); rysuj();
        } catch (e) { kom.textContent = e.message; el.classList.add("blad"); }
      });
    });
    el.querySelectorAll("[data-pole]").forEach(function (inp) {
      var ev = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(ev, function () { stan.otwarte[i][inp.dataset.pole] = inp.value.trim(); zapisz(); });
    });
    el.querySelectorAll("[data-licz]").forEach(function (b) {
      b.addEventListener("click", function () {
        stan.otwarte[i] = P.zlicz(stan.otwarte[i], b.dataset.licz, Number(b.dataset.d));
        if (navigator.vibrate) navigator.vibrate(15);
        zapisz(); rysuj();
      });
    });
    el.querySelectorAll("[data-tlok]").forEach(function (b) {
      b.addEventListener("click", function () {
        var o = stan.otwarte[i];
        o.tlok = o.tlok === b.dataset.tlok ? "" : b.dataset.tlok;
        zapisz(); rysuj();
      });
    });
    el.querySelectorAll("[data-flaga]").forEach(function (cb) {
      cb.addEventListener("change", function () { stan.otwarte[i].flagi[cb.dataset.flaga] = cb.checked; zapisz(); });
    });
    el.querySelector("[data-akcja=cofnij]").addEventListener("click", function () {
      stan.otwarte[i] = P.cofnij(stan.otwarte[i]); zapisz(); rysuj();
    });
    el.querySelector("[data-akcja=usun]").addEventListener("click", function () {
      if (confirm("Usunąć tę obserwację?")) { stan.otwarte.splice(i, 1); zapisz(); rysuj(); }
    });
    el.querySelector("[data-akcja=zakoncz]").addEventListener("click", function () {
      var b = P.braki(stan.otwarte[i]);
      if (b.length && !confirm("Brakuje: " + b.join(", ") + ".\nZakończyć mimo to? (trafi do CSV z brakami)")) return;
      var o = stan.otwarte.splice(i, 1)[0];
      o.zamknieta = true; stan.zamkniete.push(o); zapisz(); rysuj();
    });
    return el;
  }

  function rysuj() {
    var k = document.getElementById("karty");
    k.innerHTML = "";
    stan.otwarte.forEach(function (o, i) { k.appendChild(karta(o, i)); });
    var l = document.getElementById("lista");
    var kompletne = stan.zamkniete.filter(function (o) { return !P.braki(o).length; }).length;
    l.innerHTML = "<h2 style='font-size:15px;margin:0'>Zakończone: " + stan.zamkniete.length +
      " (kompletne " + kompletne + ")</h2>" +
      stan.zamkniete.slice(-8).reverse().map(function (o) {
        var tr = P.trwanie(o);
        return "<div class='wiersz'><span>" + esc(o.linia || "?") + " / " + esc(o.pojazd || "?") + " · " + esc(o.przystanek) +
               "</span><span>" + (tr.postoj !== null ? tr.postoj.toFixed(1) + " s" : (o.flagi.przejazd ? "przejazd" : "braki")) +
               "</span></div>";
      }).join("");
  }

  function eksport() {
    var wszystkie = stan.zamkniete.concat(stan.otwarte);
    var tekst = P.csv(wszystkie);
    var nazwa = "pomiar_" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".csv";
    var plik = new File([tekst], nazwa, { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [plik] })) {
      navigator.share({ files: [plik], title: nazwa }).catch(function () {});
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(plik); a.download = nazwa; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function listaPrzystankow(lista) {
    var dl = document.getElementById("przystanki-lista");
    dl.innerHTML = "";
    lista.forEach(function (tekst) {
      var o = document.createElement("option"); o.value = tekst; dl.appendChild(o);
    });
  }

  function start() {
    wczytaj();
    var pole = document.getElementById("przystanek");
    // bez sieci zostaje lista z planu proby
    listaPrzystankow(PRZYSTANKI.map(function (p) { return p[1] + " [" + p[0] + "]"; }));
    fetch("data/przystanki.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
      .then(function (d) { listaPrzystankow(d.przystanki.map(P.etykietaPrzystanku)); })
      .catch(function () {});
    pole.value = stan.przystanekTekst || "";
    pole.addEventListener("change", function () {
      stan.przystanekTekst = pole.value; stan.przystanek = P.idZTekstu(pole.value); zapisz();
    });
    document.getElementById("nowy").addEventListener("click", function () {
      stan.otwarte.unshift(P.nowa(stan.przystanek, Date.now())); zapisz(); rysuj();
      var pierwsze = document.querySelector("#karty [data-pole=linia]");
      if (pierwsze) pierwsze.focus();
    });
    document.getElementById("eksport").addEventListener("click", eksport);
    document.getElementById("wyczysc").addEventListener("click", function () {
      if (!confirm("Usunąć WSZYSTKIE obserwacje z telefonu? Najpierw zrób eksport CSV.")) return;
      stan.otwarte = []; stan.zamkniete = []; zapisz(); rysuj();
    });
    setInterval(function () {
      document.getElementById("zegar").textContent =
        new Date().toLocaleTimeString("pl-PL", { hour12: false });
    }, 200);
    // ekran nie gasnie w trakcie pomiaru (tam, gdzie przegladarka pozwala)
    if (navigator.wakeLock) {
      var zamek = function () { navigator.wakeLock.request("screen").catch(function () {}); };
      zamek();
      document.addEventListener("visibilitychange", function () { if (!document.hidden) zamek(); });
    }
    rysuj();
  }
  start();
})();
