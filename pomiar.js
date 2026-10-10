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
    ["628", "Swoboda 628 → Bułgarska/Polska (światło 39 m za)"],
    ["629", "Swoboda 629 → Szpitalna (światło 31 m za)"],
    ["1131", "Małe Garbary 1131 (bez świateł)"],
    ["1130", "Grochowe Łąki 1130 (światło za)"],
  ];

  var stan = { otwarte: [], zamkniete: [], przystanek: "", przystanekTekst: "", nazwaPrzystanku: "",
               tryb: "postoj", przejazd: null, przejazdy: [], rola: "zegar_liczenie", obserwator: "" };

  function osoba() { return { rola: stan.rola, obserwator: stan.obserwator }; }

  // przyciski licznikow: +, +5 (duza wymiana, 28.09), -
  function licznikHtml(pole, etykieta, n) {
    return "<div class='licznik'><span>" + etykieta + " <b>" + (n || 0) + "</b></span>" +
      "<button type='button' data-licz='" + pole + "' data-d='1'>+</button>" +
      "<button type='button' class='piec' data-licz='" + pole + "' data-d='5'>+5</button>" +
      "<button type='button' class='minus' data-licz='" + pole + "' data-d='-1'>−</button></div>";
  }
  function szacHtml(szac) {
    return "<button type='button' class='szac" + (szac ? " zrobione" : "") + "' data-szac>" +
      (szac ? "≈ oszacowane ✓" : "≈ nie dałem rady policzyć dokładnie") + "</button>";
  }
  // dodatek - np. przelaczenie na inny moment (tryb jazdy)
  function korektaHtml(etykieta, t, dodatek) {
    return "<div class='korekta'><span>" + esc(etykieta) + " <b>" + hms(t) + "</b></span>" +
      [-5, -1, 1, 5].map(function (d) {
        return "<button type='button' data-przesun='" + d + "'>" + (d > 0 ? "+" : "−") + Math.abs(d) + " s</button>";
      }).join("") + "<button type='button' data-przesun='ok'>OK</button>" +
      "<button type='button' data-przesun='usun' class='usun-moment'>\u2715 usu\u0144 ten moment</button>" + (dodatek || "") + "</div>";
  }
  function etZdarzenia(kod) { return P.ZDARZENIA.filter(function (z) { return z.kod === kod; })[0].etykieta; }

  // 1. dotkniecie start, 2. koniec, 3. kasuje; trwajacy odlicza na zywo (tik
  // w start() po data-trwa-od - bez przerysowania, nie gubic klawiatury)
  function opisZnacznika(x) {
    if (!x) return "dotknij: start";
    if (x.do === undefined) return "\u23f1 " + Math.round((Date.now() - x.od) / 1000) + " s \u2014 dotknij: koniec";
    return P.trwanieZnacznika(x) + " s \u2713 (dotknij: popraw)";
  }
  // znaczniki wspolne dla obu trybow (29.09): czeka (+ powod, dobierany
  // kiedykolwiek - czas liczy sie od dotkniecia) i kolejka przed peronem
  function znacznikiHtml(o, zDrugim) {
    var zn = o.znaczniki || {}, pw = (zn.czeka || {}).powod;
    return "<div class='znaczniki'>" + P.ZNACZNIKI.map(function (z) {
      var x = zn[z[0]], kl = !x ? "" : x.do === undefined ? "trwa" : "zrobione";
      return "<button type='button' data-znak='" + z[0] + "' class='" + kl + "'>" + esc(z[1]) +
        "<small" + (x && x.do === undefined ? " data-trwa-od='" + x.od + "'" : "") + ">" + opisZnacznika(x) + "</small></button>";
    }).join("") +
    (zDrugim ? "<button type='button' data-drugi class='" + (o.drugi ? "zrobione" : "") + "'>drugi przy peronie<small>" +
      (o.drugi ? "\u2713" : "za innym pojazdem") + "</small></button>" : "") + "</div>" +
    "<div class='powody'><span>czeka, bo:</span>" + P.POWODY.map(function (x) {
      return "<button type='button' data-powod='" + x[0] + "' class='" + (pw === x[0] ? "zrobione" : "") + "'>" + x[1] + "</button>";
    }).join("") + "</div>";
  }
  // korekta zapisanego znacznika (30.09): +/- s poczatku albo usuniecie
  function korektaZnacznikaHtml(o, kod) {
    var x = (o.znaczniki || {})[kod]; if (!x) return "";
    var et = P.ZNACZNIKI.filter(function (z) { return z[0] === kod; })[0][1];
    return "<div class='korekta'><span>" + esc(et) + ": pocz\u0105tek <b>" + hms(x.od0 !== undefined ? x.od0 : x.od) +
      "</b> \u00b7 " + P.trwanieZnacznika(x) + " s</span>" +
      [-5, -1, 1, 5].map(function (d) {
        return "<button type='button' data-przesunz='" + d + "'>" + (d > 0 ? "+" : "\u2212") + Math.abs(d) + " s</button>";
      }).join("") + "<button type='button' data-przesunz='ok'>OK</button>" +
      "<button type='button' data-przesunz='usun' class='usun-moment'>\u2715 usu\u0144 znacznik</button></div>";
  }
  // zamkniety znacznik: dotkniecie otwiera korekte; wyjatek - czekanie w trakcie
  // drugiego zatrzymania (dotkniecie wznawia je, P.znacznik)
  function znacznikDoKorekty(o, kod) {
    var x = (o.znaczniki || {})[kod], c = o.czasy || {};
    return !!(x && x.do !== undefined &&
      !(kod === "czeka" && c.stop2 !== undefined && c.rusz2 === undefined && x.do <= c.stop2));
  }
  // wlasny wiersz pod zegarem, nie pod "Ruszyl" (02.10: klikane zamiast niego);
  // obok cofniecie ostatniego - pokazuje zamkniecie, ktore wroci
  function ponowneHtml(o) {
    var lista = o.ponowne || [], w = lista[lista.length - 1] || {};
    return "<div class='ponowne-wiersz'><button type='button' class='ponowne' data-ponowne>\u21bb drzwi otwarte ponownie" +
      (o.ponowne_otw ? " <b>\u00d7" + o.ponowne_otw + "</b>" : "") + "</button>" +
      (o.ponowne_otw ? "<button type='button' class='ponowne cofnij-ponowne' data-ponowne-cofnij>\u21b6 cofnij ponowne" +
        (w.zamk !== undefined ? "<small>drzwi zamkni\u0119te " + hms(w.zamk).slice(0, 8) + "</small>" : "") + "</button>" : "") +
      "</div>";
  }

  function wczytaj() {
    try {
      var s = JSON.parse(localStorage.getItem(KLUCZ) || "null");
      if (s && s.otwarte && s.zamkniete) stan = Object.assign(stan, s);   // stary zapis bez przejazdow tez
    } catch (e) { /* prywatne okno albo zablokowany storage - dziala bez zapisu */ }
  }
  function zapisz() {
    try { localStorage.setItem(KLUCZ, JSON.stringify(stan)); } catch (e) { /* j.w. */ }
  }

  function esc(v) {
    return String(v).replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  // jeden formater zamiast toLocaleTimeString przy kazdym wywolaniu (Safari
  // tworzy go za kazdym razem od nowa; zegar odswiezany 5 razy na sekunde)
  var FORMAT_CZASU = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  function czas(t) { return FORMAT_CZASU.format(new Date(t)); }

  function hms(t) {
    var d = new Date(t);
    return czas(d) + "." + String(d.getMilliseconds()).padStart(3, "0").slice(0, 1);
  }

  function godz(t) { return t ? czas(t) : "--:--"; }

  // nazwa + kierunek jak nad kartami: bursztynowa "w strone ..." (30.09)
  function przystanekKarty(id) {
    var p = poId[id];
    if (!id) return "przystanek nieustawiony";
    if (!p) return esc(id);
    return esc(p.n) + " <span class='w-strone'>" + esc(P.etykietaKierunku(p).kierunek) + "</span>";
  }

  function karta(obs, i) {
    var el = document.createElement("article");
    el.className = "karta";
    var tr = P.trwanie(obs);
    var inny = stan.przystanek && stan.przystanek !== obs.przystanek;
    var wid = P.widoczne(obs.rola);
    el.innerHTML =
      "<div class='przyst-karty'><span>" + przystanekKarty(obs.przystanek) +
      "</span>" + (inny ? "<button type='button' data-akcja='przyst'>zmie\u0144 na: " + przystanekKarty(stan.przystanek) + "</button>" : "") + "</div>" +
      "<div class='pola'>" +
      "<label>Linia<input data-pole='linia' value='" + esc(obs.linia) + "' autocomplete='off' autocapitalize='characters'></label>" +
      "<label>Nr taborowy<input data-pole='pojazd' value='" + esc(obs.pojazd) + "' inputmode='numeric' pattern='[0-9]*' autocomplete='off'></label>" +
      "</div><div class='sekcja sek-zegar'" + (wid.zegar ? "" : " hidden") + "><div class='przyciski'>" +
      P.ZDARZENIA.map(function (z, k) {
        var t = obs.czasy[z.kod];
        return "<button type='button' data-zd='" + z.kod + "' class='" + (t !== undefined ? "zrobione " : "") +
               (k >= 4 ? "drugie" : "") + "' title='" + z.opis + "'>" + z.etykieta +
               (t !== undefined ? "<small>" + hms(t) + "</small>" : "") + "</button>";
      }).join("") + "</div>" + ponowneHtml(obs) +
      (stan.edycja && stan.edycja.id === obs.id && obs.czasy[stan.edycja.kod] !== undefined ?
        korektaHtml(etZdarzenia(stan.edycja.kod), obs.czasy[stan.edycja.kod]) : "") + "</div>" +
      "<div class='sekcja sek-znaczniki'" + (wid.zegar ? "" : " hidden") + ">" + znacznikiHtml(obs, false) +
      (stan.edycjaZ && stan.edycjaZ.id === obs.id ? korektaZnacznikaHtml(obs, stan.edycjaZ.kod) : "") + "</div>" +
      "<div class='sekcja sek-liczenie'" + (wid.liczenie ? "" : " hidden") + "><div class='pasazerowie'>" +
      licznikHtml("wsiadlo", "Wsiada", obs.wsiadlo) + licznikHtml("wysiadlo", "Wysiada", obs.wysiadlo) +
      szacHtml(obs.szac) +
      "<label class='drzwi'>Liczone drzwi <select data-pole='drzwi_obs'>" +
      ["", "1", "2", "3", "4", "wszystkie"].map(function (v) {
        return "<option value='" + v + "'" + (obs.drzwi_obs === v ? " selected" : "") + ">" + (v || "\u2014") + "</option>";
      }).join("") + "</select></label>" +
      "<div class='tlok'>" + P.TLOK.map(function (x) {
        return "<button type='button' data-tlok='" + x[0] + "' class='" + (obs.tlok === x[0] ? "zrobione" : "") + "'>" + x[1] + "</button>";
      }).join("") + "</div></div></div>" +
      "<div class='wyniki'>" + [
        tr.postoj !== null ? "postój " + tr.postoj.toFixed(1) + " s" : null,
        tr.drzwi !== null ? "drzwi " + tr.drzwi.toFixed(1) + " s" : null,
        tr.swiatlo !== null ? "2. zatrzymanie " + tr.swiatlo.toFixed(1) + " s" : null,
        P.opisKorekt(obs) ? "korekty: " + P.opisKorekt(obs) : null
      ].filter(Boolean).join(" · ") + "</div>" +
      "<details><summary>Okoliczności i uwagi</summary>" +
      P.FLAGI.map(function (f) {
        return "<label><input type='checkbox' data-flaga='" + f.kod + "'" + (obs.flagi[f.kod] ? " checked" : "") +
               "> " + f.etykieta + "</label>";
      }).join("") +
      "<label>Uwagi <input type='text' data-pole='uwagi' value='" + esc(obs.uwagi) + "'></label></details>" +
      "<div class='komunikat'></div>" +
      "<div class='stopka-karty'><button type='button' data-akcja='cofnij'>Cofnij ostatni klik</button>" +
      "<button type='button' data-akcja='usun'>Usuń</button>" +
      "<button type='button' class='zakoncz' data-akcja='zakoncz'>Zakończ</button></div>";

    var kom = el.querySelector(".komunikat");
    el.querySelectorAll("[data-zd]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = Date.now();                     // moment dotkniecia - przed czymkolwiek innym
        if (stan.otwarte[i].czasy[b.dataset.zd] !== undefined) {
          // zapisany moment: dotkniecie otwiera korekte o +/- sekundy (27.09)
          var ta = stan.edycja && stan.edycja.id === obs.id && stan.edycja.kod === b.dataset.zd;
          stan.edycja = ta ? null : { id: obs.id, kod: b.dataset.zd };
          rysuj(); return;
        }
        try {
          stan.otwarte[i] = P.zdarzenie(stan.otwarte[i], b.dataset.zd, t);   // Ruszyl konczy znaczniki
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
    el.querySelector("[data-szac]").addEventListener("click", function () {
      stan.otwarte[i].szac = !stan.otwarte[i].szac; zapisz(); rysuj();
    });
    var zmienObs = function (f) {
      try { stan.otwarte[i] = f(stan.otwarte[i]); zapisz(); rysuj(); }
      catch (e) { kom.textContent = e.message; }
    };
    el.querySelectorAll("[data-znak]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = Date.now(); if (navigator.vibrate) navigator.vibrate(20);
        if (znacznikDoKorekty(stan.otwarte[i], b.dataset.znak)) {
          var ta = stan.edycjaZ && stan.edycjaZ.id === obs.id && stan.edycjaZ.kod === b.dataset.znak;
          stan.edycjaZ = ta ? null : { id: obs.id, kod: b.dataset.znak }; rysuj(); return;
        }
        zmienObs(function (o) { return P.znacznik(o, b.dataset.znak, t); });
      });
    });
    el.querySelectorAll("[data-przesunz]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.dataset.przesunz, kod = stan.edycjaZ.kod;
        if (v === "ok") { stan.edycjaZ = null; rysuj(); return; }
        if (v === "usun") { stan.edycjaZ = null; zmienObs(function (o) { return P.usunZnacznik(o, kod); }); return; }
        zmienObs(function (o) { return P.przesunZnacznik(o, kod, Number(v) * 1000); });
      });
    });
    el.querySelectorAll("[data-powod]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = Date.now();
        zmienObs(function (o) { return P.powodCzekania(o, b.dataset.powod, t); });
      });
    });
    el.querySelector("[data-ponowne]").addEventListener("click", function () {
      var t = Date.now(); if (navigator.vibrate) navigator.vibrate(20);
      zmienObs(function (o) { return P.ponowneOtwarcie(o, t); });
    });
    var cp = el.querySelector("[data-ponowne-cofnij]");
    if (cp) cp.addEventListener("click", function () { zmienObs(P.cofnijPonowne); });
    el.querySelectorAll("[data-flaga]").forEach(function (cb) {
      cb.addEventListener("change", function () { stan.otwarte[i].flagi[cb.dataset.flaga] = cb.checked; zapisz(); });
    });
    el.querySelector("[data-akcja=cofnij]").addEventListener("click", function () {
      stan.otwarte[i] = P.cofnij(stan.otwarte[i]); zapisz(); rysuj();
    });
    el.querySelectorAll("[data-przesun]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.przesun === "ok") { stan.edycja = null; rysuj(); return; }
        try {
          if (b.dataset.przesun === "usun") {
            stan.otwarte[i] = P.usunZdarzenie(stan.otwarte[i], stan.edycja.kod); stan.edycja = null;
            zapisz(); rysuj(); return;
          }
          stan.otwarte[i] = P.przesun(stan.otwarte[i], stan.edycja.kod, Number(b.dataset.przesun) * 1000);
          zapisz(); rysuj();
        } catch (e) { kom.textContent = e.message; }
      });
    });
    var zm = el.querySelector("[data-akcja=przyst]");
    if (zm) zm.addEventListener("click", function () {
      stan.otwarte[i].przystanek = stan.przystanek; zapisz(); rysuj();
    });
    el.querySelector("[data-akcja=usun]").addEventListener("click", function () {
      if (confirm("Usunąć tę obserwację?")) { stan.otwarte.splice(i, 1); zapisz(); rysuj(); }
    });
    el.querySelector("[data-akcja=zakoncz]").addEventListener("click", function () {
      var b = P.braki(stan.otwarte[i]);
      if (b.length && !confirm("Brakuje: " + b.join(", ") + ".\nZakończyć mimo to? (trafi do CSV z brakami)")) return;
      var o = stan.otwarte.splice(i, 1)[0];
      o.zamknieta = true; stan.zamkniete.push(o);
      stan.zamkniete.sort(function (a, b) { return a.utworzona - b.utworzona; });   // edytowana wraca na swoje miejsce
      zapisz(); rysuj();
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
      stan.zamkniete.map(function (o, k) { return [o, k]; }).reverse().map(function (x) {
        var o = x[0], tr = P.trwanie(o);
        return "<button type='button' class='wiersz' data-edytuj='" + x[1] + "'><span><b>" + godz(o.czasy.stop || o.utworzona) + "</b> " +
               esc(o.linia || "?") + " / " + esc(o.pojazd || "?") + " \u00b7 " + esc(nazwa(o.przystanek)) +
               "</span><span>" + (tr.postoj !== null ? tr.postoj.toFixed(1) + " s" : (o.flagi.przejazd ? "przejazd" : "braki")) +
               " \u270e</span></button>";
      }).join("");
    l.querySelectorAll("[data-edytuj]").forEach(function (b) {
      b.addEventListener("click", function () {
        var o = stan.zamkniete.splice(Number(b.dataset.edytuj), 1)[0];
        o.zamknieta = false; stan.otwarte.unshift(o); zapisz(); rysuj();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  // Dwa pliki: postoje (obserwacja = pojazd na przystanku) i przejazdy
  // (wiersz = postoj w trakcie jazdy) - rozne jednostki, rozne kolumny.
  function eksport() {
    var znacznik = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    // Plik trybu, w ktorym jestes (pilotaz 27.09: udostepnianie dwoch plikow
    // naraz na telefonie oddawalo tylko pierwszy - przejazdy ginely).
    var pliki = [];
    if (stan.tryb === "jazda") {
      var jazdy = stan.przejazdy.concat(stan.przejazd ? [stan.przejazd] : []);
      if (jazdy.some(function (j) { return j.postoje.length; }))
        pliki.push(new File([P.csvPrzejazdy(jazdy)], "przejazdy_" + znacznik + ".csv", { type: "text/csv" }));
    } else {
      var postoje = stan.zamkniete.concat(stan.otwarte);
      if (postoje.length) pliki.push(new File([P.csv(postoje)], "pomiar_" + znacznik + ".csv", { type: "text/csv" }));
    }
    if (!pliki.length) {
      alert(stan.tryb === "jazda" ? "Brak zapisanych przystank\u00f3w w przejazdach (przycisk \u201eDalej\u201d)." : "Nic do eksportu.");
      return;
    }
    if (navigator.canShare && navigator.canShare({ files: pliki })) {
      navigator.share({ files: pliki, title: "pomiar " + znacznik }).catch(function () {});
      return;
    }
    pliki.forEach(function (plik, k) {
      setTimeout(function () {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(plik); a.download = plik.name; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }, k * 400);                             // przegladarki blokuja kilka pobran naraz
    });
  }

  // Wlasna lista podpowiedzi zamiast <datalist> - na telefonach datalist
  // nie pokazywal podpowiedzi (27.09, zgloszenie autora).
  var wszystkie = PRZYSTANKI.map(function (p) {
    return { s: p[0], n: p[1].replace(/ \d+ .*/, "").replace(/ \(.*/, ""), k: "", l: [], t: "" };
  });

  var trasy = {}, poId = {};
  function indeksuj() { poId = {}; wszystkie.forEach(function (p) { poId[p.s] = p; }); }
  function nazwa(id) {
    var p = poId[id];
    return p ? p.n + (p.k ? " \u2192 " + p.k : "") : (id || "\u2014");
  }

  // p: slupek albo nazwa z kilkoma slupkami (P.nazwyZWynikow) - wtedy kierunek
  // wybiera sie przyciskiem (krok 2), do tego czasu "+ Pojazd" prosi o kierunek
  function wybierz(pole, p) {
    if (p.slupki && p.slupki.length === 1) ustawBiezacy(p.slupki[0]);
    else if (p.slupki) {
      stan.przystanek = ""; stan.nazwaPrzystanku = p.n; stan.przystanekTekst = p.n;
      pole.value = p.n; zapisz(); rysujSzybkie(); rysuj();
    } else ustawBiezacy(p.s);
    document.getElementById("podpowiedzi").hidden = true;
    pole.blur();
  }

  // Krotka etykieta w polu (bez listy linii) i szybkie przyciski: pozostale
  // slupki tej nazwy + ostatnio uzywane (pilotaz 27.09: zmiana kierunku na tym
  // samym przystanku wymagala kasowania dlugiego tekstu).
  function ustawBiezacy(id) {
    stan.przystanek = id;
    // w polu sama nazwa (30.09) - kierunek pokazuja przyciski pod spodem
    stan.nazwaPrzystanku = poId[id] ? poId[id].n : "";
    stan.przystanekTekst = poId[id] ? poId[id].n : id;
    // karty, w ktorych nic jeszcze nie zapisano, ida za zmiana przystanku (30.09)
    stan.otwarte.forEach(function (o) { if (P.nietknieta(o)) o.przystanek = id; });
    stan.ostatnie = [id].concat((stan.ostatnie || []).filter(function (x) { return x !== id; })).slice(0, 6);
    document.getElementById("przystanek").value = stan.przystanekTekst;
    zapisz(); rysujSzybkie(); rysuj();
  }

  // Pod paskiem (nie w nim - przyklejony pasek z 8 przyciskami Ronda Rataje
  // blokowal przewijanie, 30.09): 2. kierunek - slupki tej nazwy, osobny
  // kolor, kierunek i linie glowne; po wyborze zwiniete do jednego przycisku
  // + "zmien kierunek". Nizej ostatnio uzywane (sama nazwa).
  var rozwinKierunki = false;
  function rysujSzybkie() {
    var box = document.getElementById("szybkie");
    var ja = poId[stan.przystanek];
    var n = ja ? ja.n : (stan.nazwaPrzystanku || "");
    var sl = n ? P.slupkiNazwy(wszystkie, n) : [];
    var zwin = ja && sl.length > 1 && !rozwinKierunki;
    var html = "";
    if (sl.length) {
      html += "<div class='kier-wiersz" + (ja ? "" : " brak") + "'><span class='etyk'>2. Kierunek" +
        (ja ? "" : " \u2014 wybierz, w kt\u00f3r\u0105 stron\u0119 jad\u0105 pojazdy:") + "</span><div class='kier-lista'>" +
        (zwin ? [ja] : sl).map(function (p) {
          var e = P.etykietaKierunku(p);
          return "<button type='button' class='kier" + (p.s === stan.przystanek ? " zrobione" : "") + "' data-szybki='" +
            esc(p.s) + "'><b>" + esc(e.kierunek) + "</b>" + (e.linie ? "<small>" + esc(e.linie) + "</small>" : "") + "</button>";
        }).join("") +
        (zwin ? "<button type='button' class='zmien-kier' data-rozwin>zmie\u0144 kierunek (" + sl.length + " do wyboru)</button>" : "") +
        "</div></div>";
    }
    var byly = {}, inne = [];
    (stan.ostatnie || []).forEach(function (id) {
      var p = poId[id];
      if (p && p.n !== n && !byly[p.n]) { byly[p.n] = 1; inne.push(id); }
    });
    if (inne.length) {
      html += "<div class='ostatnie'><span class='etyk'>Ostatnio:</span>" + inne.slice(0, 6).map(function (id) {
        return "<button type='button' data-szybki='" + esc(id) + "'>" + esc(poId[id].n) + "</button>";
      }).join("") + "</div>";
    }
    box.innerHTML = html;
    box.querySelectorAll("[data-szybki]").forEach(function (b) {
      b.addEventListener("click", function () { rozwinKierunki = false; ustawBiezacy(b.dataset.szybki); });
    });
    var rw = box.querySelector("[data-rozwin]");
    if (rw) rw.addEventListener("click", function () { rozwinKierunki = true; rysujSzybkie(); });
  }

  function podpowiedzi(pole, box, wybor) {
    box = box || document.getElementById("podpowiedzi");
    wybor = wybor || wybierz;
    var wyn = P.szukajPrzystankow(wszystkie, pole.value, 20);
    // na przystanku: kazda nazwa raz (kierunek potem przyciskiem); numer
    // slupka i tryb jazdy - slupki jak dotad
    var nazwy = wybor === wybierz && !/^\d+$/.test(pole.value.trim());
    if (nazwy) wyn = P.nazwyZWynikow(wyn);
    box.innerHTML = "";
    if (pole.value.trim().length < 2) { box.hidden = true; return; }
    if (!wyn.length) {
      box.innerHTML = "<div class='pusto'>Brak takiego przystanku \u2014 zostanie zapisany wpisany tekst.</div>";
    }
    wyn.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = nazwy ? "<b>" + esc(p.n) + "</b><small>" + esc(p.l.length > 8 ? p.l.slice(0, 8).join(", ") + "\u2026" : p.l.join(", ")) + "</small>"
        : esc(p.n) + (p.k ? " \u2192 " + esc(p.k) : "") +
        "<small>[" + esc(p.s) + "] " + esc((p.t === "0" ? "tramwaj " : p.t === "3" ? "autobus " : "") + p.l.join(", ")) + "</small>";
      // mousedown bez domyslnej akcji - pole nie traci fokusu, lista nie znika;
      // wybor dopiero na click, ktory przychodzi tylko po stuknieciu, nie po
      // przewinieciu (pilotaz 27.09: pointerdown wybieral przy probie przewiniecia)
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { wybor(pole, p); });
      box.appendChild(b);
    });
    box.hidden = false;
    box.scrollTop = 0;
  }

  /* ---- tryb "jade pojazdem" ---- */
  function zmienPrzejazd(f) {
    try { stan.przejazd = f(stan.przejazd); zapisz(); rysujJazde(); return true; }
    catch (e) { var k = document.querySelector("#jazda .komunikat"); if (k) k.textContent = e.message; return false; }
  }


  function etTlok(k) { var x = P.TLOK.filter(function (t) { return t[0] === k; })[0]; return x ? x[1] : k; }

  function rysujJazde() {
    var el = document.getElementById("jazda");
    var j = stan.przejazd;
    var zrobione = "<h2 style='font-size:15px;margin:12px 0 0'>Zako\u0144czone przejazdy: " + stan.przejazdy.length +
      " (postoj\u00f3w " + stan.przejazdy.reduce(function (a, x) { return a + x.postoje.length; }, 0) + ")</h2>" +
      stan.przejazdy.slice(-5).reverse().map(function (x) {
        return "<div class='wiersz'><span>" + esc(x.linia || "?") + " / " + esc(x.pojazd || "?") + (x.cel ? " \u2192 " + esc(x.cel) : "") +
          "</span><span>" + x.postoje.length + " post.</span></div>";
      }).join("");
    if (!j) {
      el.innerHTML = "<button class='glowny-duzy' id='nowy-przejazd' type='button'>Zacznij przejazd</button>" +
        "<p class='drobny'>Wsiadasz do pojazdu: wpisz lini\u0119 i numer taborowy, wybierz kierunek i przystanek, na kt\u00f3rym jeste\u015b. " +
        "Na ka\u017cdym przystanku licz wsiadaj\u0105cych i wysiadaj\u0105cych, a gdy sko\u0144czysz (tak\u017ce ju\u017c w trakcie jazdy) \u2014 <b>Dalej</b>.</p>" +
        "<div class='lista' style='margin:0'>" + zrobione + "</div>";
      el.querySelector("#nowy-przejazd").addEventListener("click", function () {
        stan.przejazd = P.nowyPrzejazd(Date.now(), osoba()); stan.trasaJakOtwarte = false; zapisz(); rysujJazde();
        var l = document.querySelector("#jazda [data-pole=linia]"); if (l) l.focus();
      });
      return;
    }
    var lTrasy = P.liniaTrasy(j);                      // inna niz linia przy zjezdzie do zajezdni (10.10)
    var kier = trasy[lTrasy] || {};
    var b = j.biezacy;
    // szacunek dla biezacego przystanku: ostatnia znana liczba + bilans licznikow
    var sz = P.szacujObciazenie(j.postoje.concat([Object.assign({}, b, { obciazenie: "" })]), j.zakres);
    var szTu = sz[sz.length - 1];
    var szPost = P.szacujObciazenie(j.postoje, j.zakres);
    var zObc = P.zakresObciazenia(b, j.zakres);
    var cz = b.czasy || {};
    var trasa = j.trasa || [];
    // w jezdzie sama nazwa przystanku; dopisek tylko przy powtorzonej nazwie (30.09)
    var sama = function (id) { return poId[id] ? poId[id].n : (id || "\u2014"); };
    var etTrasy = P.etykietyTrasy(trasa.map(sama));
    var wid = P.widoczne(j.rola);
    // na zadanie (30.09): "Nie stanal" na gorze karty, dopoki nie zapisano
    // "Stanal"; na zwyklym przystanku tych przyciskow nie ma
    var nz = P.naZadanie(poId[b.przystanek], lTrasy);
    var edJ = stan.edycjaJ && cz[stan.edycjaJ] !== undefined ? stan.edycjaJ : null;
    function przyciskZJ(k) {
      return "<button type='button' data-zj='" + k + "' class='" + (cz[k] !== undefined ? "zrobione" : "") + (edJ === k ? " edytowane" : "") + "'>" +
        esc(etZdarzenia(k)) + "<small>" + (cz[k] !== undefined ? hms(cz[k]).slice(0, 8) : "\u00a0") + "</small></button>";
    }
    // w ramce korekty pozostale zapisane momenty - jedyna droga do "Stanal"
    // po "Ruszyl" (wtedy jego dotkniecie zaczyna nastepny przystanek)
    function inneMomenty(k) {
      var inne = P.inneMomentyJazdy(cz, k);
      return inne.length ? "<div class='inne-momenty'><span>popraw inny moment:</span>" + inne.map(function (x) {
        return "<button type='button' data-inny-zj='" + x + "'>" + esc(etZdarzenia(x)) + "<small>" + hms(cz[x]).slice(0, 8) + "</small></button>";
      }).join("") + "</div>" : "";
    }
    el.innerHTML =
      "<article class='karta'>" +
      "<div class='pola'>" +
      "<label>Linia<input data-pole='linia' value='" + esc(j.linia) + "' autocomplete='off' autocapitalize='characters'></label>" +
      "<label>Nr taborowy<input data-pole='pojazd' value='" + esc(j.pojazd) + "' inputmode='numeric' pattern='[0-9]*' autocomplete='off'></label>" +
      "</div>" +
      // jedzie trasa innej linii (zjazd do zajezdni, objazd): linia zostaje
      // prawdziwa, lista przystankow z trasy wpisanej tutaj (10.10)
      "<details class='trasa-jak'" + (j.trasa_jak || stan.trasaJakOtwarte ? " open" : "") + "><summary>" +
        (j.trasa_jak ? "Przystanki jak linia " + esc(j.trasa_jak) : "Jedzie tras\u0105 innej linii? (np. do zajezdni)") + "</summary>" +
        "<label>Przystanki jak linia<input type='text' data-pole='trasa_jak' value='" + esc(j.trasa_jak || "") +
        "' autocomplete='off' autocapitalize='characters' placeholder='np. 3'></label>" +
        "<p class='drobny'>W polu \u201eLinia\u201d zostaw numer z pojazdu. Puste = zwyk\u0142a trasa.</p></details>" +
      (Object.keys(kier).length ? "<div class='tlok kierunki'>" + Object.keys(kier).map(function (k) {
        return "<button type='button' data-kier='" + esc(k) + "' class='" + (j.kierunek === k ? "zrobione" : "") + "'>\u2192 " + esc(kier[k].cel) + "</button>";
      }).join("") + "</div>" : (lTrasy ? "<p class='drobny'>Brak trasy tej linii w danych \u2014 przystanek wybierzesz wyszukiwark\u0105.</p>" : "")) +
      "<div class='biezacy'><span class='drobny'>Przystanek</span>" +
      (trasa.length ? "<div class='biezacy-wiersz'><button type='button' data-akcja='wstecz' title='poprzedni przystanek'" +
        (P.poprzedni(trasa, b.przystanek) ? "" : " disabled") + ">\u25c0</button><select data-przyst>" +
        (trasa.indexOf(b.przystanek) < 0 ? "<option value='" + esc(b.przystanek) + "' selected>" + esc(b.przystanek ? nazwa(b.przystanek) : "\u2014 wybierz \u2014") + "</option>" : "") +
        trasa.map(function (id, k) {
          return "<option value='" + esc(id) + "'" + (id === b.przystanek ? " selected" : "") + ">" + esc(etTrasy[k]) + "</option>";
        }).join("") + "</select></div>"
        : "<b>" + esc(b.przystanek ? nazwa(b.przystanek) : "\u2014") + "</b>") +
      (nz ? "<span class='drobny nz'>na \u017c\u0105danie</span>" : "") +
      // wyszukiwarka tylko bez trasy linii (28.09: objazd poza trasa - zbyt rzadki)
      (trasa.length ? "" : "<div class='szukaj'><input data-szukaj type='search' placeholder='wpisz nazw\u0119 przystanku'" +
        " autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' enterkeyhint='done'>" +
        "<div class='podpowiedzi' data-podp hidden></div></div>") + "</div>" +
      (nz && cz.stop === undefined ? "<div class='przyciski nie-stanal'>" +
        "<button type='button' data-akcja='nie-stanal'>Nie stan\u0105\u0142</button>" +
        // chwila minięcia slupka - tylko gdy zauwazona (latwo przeoczyc)
        "<button type='button' data-akcja='minal'>\u23f1 Nie stan\u0105\u0142<small>min\u0105\u0142 s\u0142upek TERAZ</small></button></div>" : "") +
      // ZEGAR (28.09: podstawa trybu jazdy, nie opcja) - zdarzenia trafiaja do
      // biezacego przystanku; dotkniecie zapisanego otwiera korekte +/- s
      "<div class='sekcja sek-zegar'" + (wid.zegar ? "" : " hidden") + "><div class='zegar-jazdy'>" +
      P.ZDARZENIA_JAZDY.slice(0, 4).map(przyciskZJ).join("") +
      "<button type='button' class='cofnij-zj' data-akcja='cofnij-zj' title='cofnij ostatnie zdarzenie'>\u21b6</button></div>" +
      // drugie zatrzymanie kilka metrow za peronem (29.09 - jak na przystanku);
      // pod "Ruszyl" teraz "Ruszyl ponownie" - pomylka odrzucona z komunikatem
      "<div class='zegar-jazdy2'>" + P.ZDARZENIA_JAZDY.slice(4).map(przyciskZJ).join("") + "</div>" + ponowneHtml(b) +
      // po "Ruszyl" przycisk "Stanal" zaczyna nastepny przystanek - korekta osobno (10.10)
      (P.stanalDoPoprawki(cz) && edJ !== "stop" ? "<div class='popraw-stop'><button type='button' data-inny-zj='stop'>popraw \u201eStan\u0105\u0142\u201d" +
        "<small>" + hms(cz.stop).slice(0, 8) + "</small></button></div>" : "") +
      (edJ ? korektaHtml(etZdarzenia(edJ), cz[edJ], inneMomenty(edJ)) : "") + "</div>" +
      // LICZENIE
      "<div class='sekcja sek-liczenie'" + (wid.liczenie ? "" : " hidden") + "><div class='pasazerowie'>" +
      licznikHtml("wsiadlo", "Wsiada", b.wsiadlo) + licznikHtml("wysiadlo", "Wysiada", b.wysiadlo) + szacHtml(b.szac) +
      "</div>" +
      // liczba osob obok zakresu liczenia, zakres liczby domyslnie jak licznikow
      "<div class='obc-wiersz'>" +
      "<label class='obciazenie'>W pojeździe po odjeździe" +
      "<input data-obc type='number' inputmode='numeric' min='0' value='" + esc(b.obciazenie === undefined ? "" : b.obciazenie) +
      "' placeholder='" + (szTu === null ? "np. 23" : "\u2248 " + szTu) + "'></label>" +
      "<label class='drzwi'>Liczone <select data-pole='zakres'>" + P.ZAKRES.map(function (z) {
        return "<option value='" + z[0] + "'" + (j.zakres === z[0] ? " selected" : "") + ">" + z[1] + "</option>";
      }).join("") + "</select></label>" +
      "<label class='drzwi'>ta liczba to <select data-obc-zakres>" +
        [["czlon", "m\u00f3j cz\u0142on"], ["caly", "ca\u0142y pojazd"]].map(function (z) {
          return "<option value='" + z[0] + "'" + (zObc === z[0] ? " selected" : "") + ">" + z[1] + "</option>";
        }).join("") + "</select></label>" +
      // ktora czesc liczy ta osoba - tylko gdy nie caly pojazd (dwie osoby)
      (j.zakres && j.zakres !== "caly" ? "<label class='drzwi'>moja cz\u0119\u015b\u0107 (od kabiny) <select data-pole='czesc'>" +
        P.CZESC.map(function (z) {
          return "<option value='" + z[0] + "'" + ((j.czesc || "") === z[0] ? " selected" : "") + ">" + z[1] + "</option>";
        }).join("") + "</select></label>" : "") + "</div>" +

      // zapelnienie - tylko gdy nie liczysz osob (28.09)
      "<details" + (b.tlok ? " open" : "") + "><summary>Zape\u0142nienie (gdy nie liczysz os\u00f3b)</summary>" +
      "<div class='tlok'>" + P.TLOK.map(function (x) {
        return "<button type='button' data-tlok='" + x[0] + "' class='" + (b.tlok === x[0] ? "zrobione" : "") + "'>" + x[1] + "</button>";
      }).join("") + "</div></details></div>" +
      // ZNACZNIKI - ten, kto klika zegar
      "<div class='sekcja sek-znaczniki'" + (wid.zegar ? "" : " hidden") + ">" + znacznikiHtml(b, true) +
      (stan.edycjaZJ ? korektaZnacznikaHtml(b, stan.edycjaZJ) : "") + "</div>" +
      "<input class='uwaga-przyst' data-uwaga type='text' placeholder='notatka do tego przystanku' value='" + esc(b.uwaga || "") + "'>" +

      "<div class='przyciski' style='margin-top:10px;grid-template-columns:1fr'>" +
      "<button type='button' class='zrobione' data-akcja='dalej'>Dalej \u25b6<small>przystanek policzony</small></button></div>" +
      "<div class='komunikat'></div>" +
      "<details><summary>Uwagi</summary><input type='text' data-pole='uwagi' value='" + esc(j.uwagi) + "'></details>" +
      "<div class='lista' style='margin:10px 0 0'>" + j.postoje.map(function (p, k) { return [p, szPost[k]]; }).slice(-6).reverse().map(function (x) {
        var p = x[0], o = x[1];
        if (p.nie_stanal) return "<div class='wiersz'><span>" + hms(p.t).slice(0, 8) + " " + esc(sama(p.przystanek)) +
          "</span><span>nie stan\u0105\u0142" + (p.t_minal ? " \u23f1" : "") + "</span></div>";
        return "<div class='wiersz'><span>" + hms(p.t).slice(0, 8) + " " + esc(sama(p.przystanek)) + "</span><span>+" + p.wsiadlo +
          " \u2212" + p.wysiadlo + (o !== null ? " \u00b7 " + (p.obciazenie !== undefined && p.obciazenie !== "" ? "" : "\u2248") + o + " os."
            // liczba z innego zakresu niz liczniki (caly pojazd przy liczeniu czlonu) - tez widoczna (30.09)
            : p.obciazenie !== undefined && p.obciazenie !== "" && p.obciazenie !== null ?
              " \u00b7 " + p.obciazenie + " os. (" + (P.zakresObciazenia(p, j.zakres) === "caly" ? "ca\u0142y pojazd" : "cz\u0142on") + ")" : "") +
          (p.tlok ? " \u00b7 " + esc(etTlok(p.tlok)) : "") +
          P.ZNACZNIKI.map(function (z) {
            var d = P.trwanieZnacznika((p.znaczniki || {})[z[0]], p.t);
            return d === null ? "" : " \u00b7 " + z[0] + " " + d + " s";
          }).join("") + (p.uwaga ? " \u00b7 \u270e" : "") + "</span></div>";
      }).join("") + "</div>" +
      "<div class='stopka-karty'><button type='button' data-akcja='cofnij'>Cofnij \u201eDalej\u201d</button>" +
      "<button type='button' data-akcja='usun'>Usu\u0144</button>" +
      "<button type='button' class='zakoncz' data-akcja='zakoncz'>Zako\u0144cz przejazd</button></div>" +
      "</article><div class='lista' style='margin:0'>" + zrobione + "</div>";

    el.querySelectorAll("[data-pole]").forEach(function (inp) {
      var ev = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(ev, function () {
        if (inp.dataset.pole === "zakres") {                 // wpisane liczby osob zostaja przy swoim zakresie
          stan.przejazd = P.ustawZakres(stan.przejazd, inp.value.trim()); zapisz(); rysujJazde(); return;
        }
        // linia w trwajacym przejezdzie - decyzja dopiero po zejsciu z pola (change)
        if (inp.dataset.pole === "linia" && stan.przejazd.postoje.length) return;
        stan.przejazd[inp.dataset.pole] = inp.value.trim(); zapisz();
      });
    });
    // linia zmienia liste kierunkow - przerysuj po zejsciu z pola, nie w trakcie pisania
    var poZmianieTrasy = function () {
      var jj = stan.przejazd, kk = Object.keys(trasy[P.liniaTrasy(jj)] || {});
      if (kk.indexOf(jj.kierunek) < 0) { jj.kierunek = ""; jj.cel = ""; jj.trasa = []; }
      zapisz();
      setTimeout(function () {                 // po przeniesieniu fokusu: nie gub pola, w ktore przeszedl
        var a = document.activeElement, pole = a && a.dataset ? a.dataset.pole : null;
        rysujJazde();
        if (pole) { var n = document.querySelector("#jazda [data-pole=" + pole + "]"); if (n) n.focus(); }
      }, 0);
    };
    // rozwiniecie przetrwa przerysowanie po zejsciu z pola linii
    el.querySelector("details.trasa-jak").addEventListener("toggle", function (ev) { stan.trasaJakOtwarte = ev.target.open; });
    el.querySelector("[data-pole=trasa_jak]").addEventListener("change", function (ev) {
      stan.przejazd.trasa_jak = ev.target.value.trim().toUpperCase(); poZmianieTrasy();
    });
    el.querySelector("[data-pole=linia]").addEventListener("change", function (ev) {
      var nowa = ev.target.value.trim(), st = stan.przejazd;
      if (st.postoje.length && nowa && nowa !== st.linia) {
        // 30.09: inna linia w trakcie przejazdu = przesiadka - nowy przejazd
        if (confirm("Zmieniasz lini\u0119 w trwaj\u0105cym przejedzie.\nZako\u0144czy\u0107 przejazd linii " + st.linia +
                    " i zacz\u0105\u0107 nowy dla linii " + nowa + "?")) {
          var para = P.nowyPoZmianieLinii(st, nowa, Date.now());
          stan.przejazdy.push(para[0]); stan.przejazd = para[1];
        } else st.linia = nowa;
      }
      poZmianieTrasy();
    });
    el.querySelectorAll("[data-kier]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        var t = kier[bt.dataset.kier];
        zmienPrzejazd(function (x) { return P.ustawTrase(x, bt.dataset.kier, t.cel, t.przystanki); });
      });
    });
    el.querySelectorAll("[data-znak]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        var t = Date.now();
        if (navigator.vibrate) navigator.vibrate(20);
        if (znacznikDoKorekty(stan.przejazd.biezacy, bt.dataset.znak)) {
          stan.edycjaZJ = stan.edycjaZJ === bt.dataset.znak ? null : bt.dataset.znak; rysujJazde(); return;
        }
        zmienPrzejazd(function (x) { return P.przelaczZnacznik(x, bt.dataset.znak, t); });
      });
    });
    el.querySelectorAll("[data-przesunz]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        var v = bt.dataset.przesunz, kod = stan.edycjaZJ;
        var nb = function (f) { return function (x) { return Object.assign({}, x, { biezacy: f(x.biezacy) }); }; };
        if (v === "ok") { stan.edycjaZJ = null; rysujJazde(); return; }
        if (v === "usun") { stan.edycjaZJ = null; zmienPrzejazd(nb(function (b) { return P.usunZnacznik(b, kod); })); return; }
        zmienPrzejazd(nb(function (b) { return P.przesunZnacznik(b, kod, Number(v) * 1000); }));
      });
    });
    el.querySelectorAll("[data-powod]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        var t = Date.now();
        zmienPrzejazd(function (x) { return P.powodJazdy(x, bt.dataset.powod, t); });
      });
    });
    el.querySelector("[data-ponowne]").addEventListener("click", function () {
      var t = Date.now(); if (navigator.vibrate) navigator.vibrate(20);
      zmienPrzejazd(function (x) { return P.ponowneJazdy(x, t); });
    });
    var cpj = el.querySelector("[data-ponowne-cofnij]");
    if (cpj) cpj.addEventListener("click", function () { zmienPrzejazd(P.cofnijPonowneJazdy); });
    el.querySelector("[data-drugi]").addEventListener("click", function () {
      zmienPrzejazd(function (x) {
        return Object.assign({}, x, { biezacy: Object.assign({}, x.biezacy, { drugi: !x.biezacy.drugi }) });
      });
    });
    var uw = el.querySelector("[data-uwaga]");
    uw.addEventListener("input", function () { stan.przejazd.biezacy.uwaga = uw.value; zapisz(); });
    var obc = el.querySelector("[data-obc]");
    obc.addEventListener("input", function () {          // bez przerysowania - nie gubic klawiatury
      stan.przejazd.biezacy.obciazenie = obc.value.trim() === "" ? "" : Math.max(0, Math.round(Number(obc.value)));
      zapisz();
    });
    var wst = el.querySelector("[data-akcja=wstecz]");
    if (wst) wst.addEventListener("click", function () {
      zmienPrzejazd(function (x) { return P.ustawPrzystanek(x, P.poprzedni(x.trasa, x.biezacy.przystanek) || x.biezacy.przystanek); });
    });
    var sel = el.querySelector("[data-przyst]");
    if (sel) sel.addEventListener("change", function () {
      zmienPrzejazd(function (x) { return P.ustawPrzystanek(x, sel.value); });
    });
    var sz = el.querySelector("[data-szukaj]"), box = el.querySelector("[data-podp]");
    if (sz) {
      var wyborJazda = function (pole, p) { zmienPrzejazd(function (x) { return P.ustawPrzystanek(x, p.s); }); };
      sz.addEventListener("input", function () { podpowiedzi(sz, box, wyborJazda); });
      sz.addEventListener("blur", function () { setTimeout(function () { box.hidden = true; }, 150); });
    }
    el.querySelectorAll("[data-zj]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        var t = Date.now();                              // moment dotkniecia - przed czymkolwiek
        var k = bt.dataset.zj;
        // zapisany moment: korekta +/- s (jak na przystanku); wyjatek: "Stanal"
        // po "Ruszyl" to juz nastepny przystanek - zapis, nie korekta
        var c = stan.przejazd.biezacy.czasy || {};
        if (c[k] !== undefined && !(k === "stop" && c.rusz !== undefined)) {
          stan.edycjaJ = stan.edycjaJ === k ? null : k; rysujJazde(); return;
        }
        stan.edycjaJ = null;
        if (zmienPrzejazd(function (x) { return P.zdarzenieJazdy(x, k, t); }) && navigator.vibrate)
          navigator.vibrate(30);
      });
    });
    el.querySelectorAll("[data-przesun]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        if (bt.dataset.przesun === "ok") { stan.edycjaJ = null; rysujJazde(); return; }
        if (bt.dataset.przesun === "usun") {
          var kod = stan.edycjaJ; stan.edycjaJ = null;
          zmienPrzejazd(function (x) { return Object.assign({}, x, { biezacy: P.usunZdarzenie(x.biezacy, kod) }); });
          return;
        }
        zmienPrzejazd(function (x) { return P.przesunJazdy(x, stan.edycjaJ, Number(bt.dataset.przesun) * 1000); });
      });
    });
    el.querySelectorAll("[data-inny-zj]").forEach(function (bt) {
      bt.addEventListener("click", function () { stan.edycjaJ = bt.dataset.innyZj; rysujJazde(); });
    });
    el.querySelector("[data-szac]").addEventListener("click", function () {
      zmienPrzejazd(function (x) {
        return Object.assign({}, x, { biezacy: Object.assign({}, x.biezacy, { szac: !x.biezacy.szac }) });
      });
    });
    el.querySelector("[data-akcja=cofnij-zj]").addEventListener("click", function () {
      zmienPrzejazd(P.cofnijZdarzenieJazdy);
    });
    el.querySelector("[data-obc-zakres]").addEventListener("change", function (ev) {
      var v = ev.target.value;
      zmienPrzejazd(function (x) {
        return Object.assign({}, x, { biezacy: Object.assign({}, x.biezacy,
          { obciazenie_zakres: v === P.zakresObciazenia({}, x.zakres) ? "" : v }) });
      });
    });
    el.querySelectorAll("[data-licz]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        if (navigator.vibrate) navigator.vibrate(15);
        var t = Date.now();
        zmienPrzejazd(function (x) { return P.zliczPrzejazd(x, bt.dataset.licz, Number(bt.dataset.d), t); });
      });
    });
    el.querySelectorAll("[data-tlok]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        zmienPrzejazd(function (x) {
          var bb = Object.assign({}, x.biezacy, { tlok: x.biezacy.tlok === bt.dataset.tlok ? "" : bt.dataset.tlok });
          return Object.assign({}, x, { biezacy: bb });
        });
      });
    });
    el.querySelector("[data-akcja=dalej]").addEventListener("click", function () {
      var t = Date.now();
      if (zmienPrzejazd(function (x) { return P.dalej(x, t); }) && navigator.vibrate) navigator.vibrate(30);
    });
    var ns = el.querySelector("[data-akcja=nie-stanal]"), mn = el.querySelector("[data-akcja=minal]");
    if (ns) ns.addEventListener("click", function () {
      var tt = Date.now(); zmienPrzejazd(function (x) { return P.nieStanal(x, tt, false); });
    });
    if (mn) mn.addEventListener("click", function () {
      var tt = Date.now();                               // chwila minięcia - przed czymkolwiek
      if (zmienPrzejazd(function (x) { return P.nieStanal(x, tt, true); }) && navigator.vibrate) navigator.vibrate(30);
    });
    el.querySelector("[data-akcja=cofnij]").addEventListener("click", function () { zmienPrzejazd(P.cofnijDalej); });
    el.querySelector("[data-akcja=usun]").addEventListener("click", function () {
      if (confirm("Usun\u0105\u0107 ten przejazd?")) { stan.przejazd = null; zapisz(); rysujJazde(); }
    });
    el.querySelector("[data-akcja=zakoncz]").addEventListener("click", function () {
      var br = P.brakiPrzejazdu(stan.przejazd);
      if (br.length && !confirm("Brakuje: " + br.join(", ") + ".\nZako\u0144czy\u0107 mimo to?")) return;
      stan.przejazdy.push(stan.przejazd); stan.przejazd = null; zapisz(); rysujJazde();
    });
  }

  function rysujRole() {
    document.querySelectorAll("[data-rola]").forEach(function (b) {
      b.classList.toggle("zrobione", b.dataset.rola === stan.rola);
    });
  }

  // Plan dnia (29.09): tabela z plan.js; przycisk w naglowku, nie obok trybow
  // pomiaru (autor: mieszal sie z nimi). Drugie dotkniecie wraca do pomiaru.
  function pokazPlan() {
    if (window.PlanDnia) window.PlanDnia.rysuj(document.getElementById("plan"));
  }

  function ustawTryb(tryb) {
    if (tryb !== "plan") stan.trybPomiaru = tryb;
    stan.tryb = tryb; zapisz();
    document.getElementById("plan-przycisk").classList.toggle("zrobione", tryb === "plan");
    document.getElementById("plan-przycisk").textContent = tryb === "plan" ? "\u2190 wr\u00f3\u0107 do pomiaru" : "Plan dnia";
    var jazda = tryb === "jazda", plan = tryb === "plan", postoj = !jazda && !plan;
    document.getElementById("jazda").hidden = !jazda;
    document.getElementById("plan").hidden = !plan;
    if (plan) pokazPlan();
    ["karty", "lista", "nowy"].forEach(function (id) { document.getElementById(id).hidden = !postoj; });
    document.querySelector(".pasek-gora").hidden = plan;
    document.querySelector(".tryby").hidden = plan;
    document.querySelector(".role").hidden = plan;
    document.querySelector(".pasek-gora .szukaj").hidden = !postoj;
    document.getElementById("szybkie").hidden = !postoj;
    document.getElementById("eksport").hidden = plan;
    document.getElementById("wyczysc").hidden = plan;
    document.querySelectorAll("[data-tryb]").forEach(function (b) {
      b.classList.toggle("zrobione", b.dataset.tryb === tryb);
    });
    if (jazda) rysujJazde(); else if (postoj) rysuj();
  }

  function start() {
    wczytaj();
    indeksuj();
    var pole = document.getElementById("przystanek");
    fetch("data/przystanki.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
      .then(function (d) {
        wszystkie = d.przystanki; trasy = d.trasy || {}; indeksuj();
        if (poId[stan.przystanek]) {             // zapis sprzed 30.09: "nazwa -> kierunek [id]"
          stan.nazwaPrzystanku = poId[stan.przystanek].n; stan.przystanekTekst = stan.nazwaPrzystanku;
          if (document.activeElement !== pole) pole.value = stan.przystanekTekst;
        }
        rysujSzybkie();
        if (stan.tryb !== "jazda") rysuj();
        if (document.activeElement === pole) podpowiedzi(pole);
        if (stan.tryb === "jazda") rysujJazde();
      })
      .catch(function () { /* bez sieci zostaje lista z planu proby */ });
    pole.value = stan.przystanekTekst || "";
    pole.addEventListener("input", function () { podpowiedzi(pole); });
    // fokus zaznacza cala tresc - wpisywanie od razu zastepuje poprzedni przystanek
    pole.addEventListener("focus", function () { setTimeout(function () { pole.select(); }, 0); });
    pole.addEventListener("blur", function () {
      setTimeout(function () { document.getElementById("podpowiedzi").hidden = true; }, 150);
    });
    pole.addEventListener("change", function () {
      if (pole.value.trim() === stan.nazwaPrzystanku) return;   // ta sama nazwa - kierunek zostaje
      if (pole.value.trim() && P.idZTekstu(pole.value) !== stan.przystanek) {
        stan.nazwaPrzystanku = "";
        stan.przystanekTekst = pole.value; stan.przystanek = P.idZTekstu(pole.value); zapisz(); rysuj();
      }
    });
    rysujSzybkie();
    document.getElementById("nowy").addEventListener("click", function () {
      if (!stan.przystanek && stan.nazwaPrzystanku) {
        alert("Wybierz kierunek (2.) \u2014 w kt\u00f3r\u0105 stron\u0119 jad\u0105 pojazdy z tego przystanku.");
        return;
      }
      stan.otwarte.unshift(P.nowa(stan.przystanek, Date.now(), osoba())); zapisz(); rysuj();
      var pierwsze = document.querySelector("#karty [data-pole=linia]");
      if (pierwsze) pierwsze.focus();
    });
    document.getElementById("eksport").addEventListener("click", eksport);
    document.getElementById("wyczysc").addEventListener("click", function () {
      if (!confirm("Usunąć WSZYSTKIE obserwacje z telefonu? Najpierw zrób eksport CSV.")) return;
      stan.otwarte = []; stan.zamkniete = []; stan.przejazd = null; stan.przejazdy = [];
      zapisz(); ustawTryb(stan.tryb);
    });
    setInterval(function () {
      document.getElementById("zegar").textContent =
        czas(Date.now());
      // trwajace znaczniki: tylko tekst, bez przerysowania (nie gubic klawiatury)
      document.querySelectorAll("[data-trwa-od]").forEach(function (el) {
        el.textContent = opisZnacznika({ od: Number(el.dataset.trwaOd) });
      });
    }, 200);
    // ekran nie gasnie w trakcie pomiaru (tam, gdzie przegladarka pozwala)
    if (navigator.wakeLock) {
      var zamek = function () { navigator.wakeLock.request("screen").catch(function () {}); };
      zamek();
      document.addEventListener("visibilitychange", function () { if (!document.hidden) zamek(); });
    }
    document.querySelectorAll("[data-tryb]").forEach(function (b) {
      b.addEventListener("click", function () { ustawTryb(b.dataset.tryb); });
    });
    document.getElementById("plan-przycisk").addEventListener("click", function () {
      ustawTryb(stan.tryb === "plan" ? (stan.trybPomiaru || "postoj") : "plan");
    });
    // rola i inicjaly: ustawienie telefonu; zmiana obejmuje tez otwarte zapisy
    // tej osoby (przelaczyla sie w trakcie), zakonczone zostaja jak byly
    var ini = document.getElementById("obserwator");
    ini.value = stan.obserwator || "";
    ini.addEventListener("input", function () {
      stan.obserwator = ini.value.trim().toUpperCase();
      stan.otwarte.forEach(function (o) { o.obserwator = stan.obserwator; });
      if (stan.przejazd) stan.przejazd.obserwator = stan.obserwator;
      zapisz();
    });
    document.querySelectorAll("[data-rola]").forEach(function (b) {
      b.addEventListener("click", function () {
        stan.rola = b.dataset.rola;
        stan.otwarte.forEach(function (o) { o.rola = stan.rola; });
        if (stan.przejazd) stan.przejazd.rola = stan.rola;
        zapisz(); rysujRole(); ustawTryb(stan.tryb);
      });
    });
    rysujRole();
    ustawTryb(stan.tryb || "postoj");
  }
  start();
})();
