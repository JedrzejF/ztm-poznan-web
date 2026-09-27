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

  var stan = { otwarte: [], zamkniete: [], przystanek: "", przystanekTekst: "",
               tryb: "postoj", przejazd: null, przejazdy: [] };

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

  function hms(t) {
    var d = new Date(t);
    return d.toLocaleTimeString("pl-PL", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0").slice(0, 1);
  }

  function godz(t) { return t ? new Date(t).toLocaleTimeString("pl-PL", { hour12: false }) : "--:--"; }

  function karta(obs, i) {
    var el = document.createElement("article");
    el.className = "karta";
    var tr = P.trwanie(obs);
    var inny = stan.przystanek && stan.przystanek !== obs.przystanek;
    el.innerHTML =
      "<div class='przyst-karty'><span>" + esc(obs.przystanek ? nazwa(obs.przystanek) + " [" + obs.przystanek + "]" : "przystanek nieustawiony") +
      "</span>" + (inny ? "<button type='button' data-akcja='przyst'>zmie\u0144 na: " + esc(nazwa(stan.przystanek)) + "</button>" : "") + "</div>" +
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

  function wybierz(pole, p) {
    ustawBiezacy(p.s);
    document.getElementById("podpowiedzi").hidden = true;
    pole.blur();
  }

  // Krotka etykieta w polu (bez listy linii) i szybkie przyciski: pozostale
  // slupki tej nazwy + ostatnio uzywane (pilotaz 27.09: zmiana kierunku na tym
  // samym przystanku wymagala kasowania dlugiego tekstu).
  function ustawBiezacy(id) {
    stan.przystanek = id;
    stan.przystanekTekst = poId[id] ? nazwa(id) + " [" + id + "]" : id;
    stan.ostatnie = [id].concat((stan.ostatnie || []).filter(function (x) { return x !== id; })).slice(0, 6);
    document.getElementById("przystanek").value = stan.przystanekTekst;
    zapisz(); rysujSzybkie(); rysuj();
  }

  function rysujSzybkie() {
    var box = document.getElementById("szybkie");
    var ids = P.tenSamPrzystanek(wszystkie, stan.przystanek).map(function (p) { return p.s; });
    (stan.ostatnie || []).forEach(function (id) { if (ids.indexOf(id) < 0 && poId[id]) ids.push(id); });
    var ja = poId[stan.przystanek];
    box.innerHTML = ids.slice(0, 8).map(function (id) {
      var p = poId[id] || { n: id, k: "" };
      // ta sama nazwa co biezacy - wystarczy kierunek; inna - skrocona nazwa
      var tekst = ja && p.n === ja.n ? "\u2192 " + (p.k || "koniec") : p.n + (p.k ? " \u2192 " + p.k : "");
      return "<button type='button' data-szybki='" + esc(id) + "' class='" + (id === stan.przystanek ? "zrobione" : "") + "'>" +
        esc(tekst) + " <small>" + esc(id) + "</small></button>";
    }).join("");
    var akt = box.querySelector(".zrobione");
    if (akt) box.scrollLeft = Math.max(0, akt.offsetLeft - box.offsetLeft - 16);
    box.querySelectorAll("[data-szybki]").forEach(function (b) {
      b.addEventListener("click", function () { ustawBiezacy(b.dataset.szybki); });
    });
  }

  function podpowiedzi(pole, box, wybor) {
    box = box || document.getElementById("podpowiedzi");
    wybor = wybor || wybierz;
    var wyn = P.szukajPrzystankow(wszystkie, pole.value, 20);
    box.innerHTML = "";
    if (pole.value.trim().length < 2) { box.hidden = true; return; }
    if (!wyn.length) {
      box.innerHTML = "<div class='pusto'>Brak takiego przystanku \u2014 zostanie zapisany wpisany tekst.</div>";
    }
    wyn.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = esc(p.n) + (p.k ? " \u2192 " + esc(p.k) : "") +
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
        stan.przejazd = P.nowyPrzejazd(Date.now()); zapisz(); rysujJazde();
        var l = document.querySelector("#jazda [data-pole=linia]"); if (l) l.focus();
      });
      return;
    }
    var kier = trasy[j.linia] || {};
    var b = j.biezacy;
    var trasa = j.trasa || [];
    el.innerHTML =
      "<article class='karta'>" +
      "<div class='pola'>" +
      "<label>Linia<input data-pole='linia' value='" + esc(j.linia) + "' autocomplete='off' autocapitalize='characters'></label>" +
      "<label>Nr taborowy<input data-pole='pojazd' value='" + esc(j.pojazd) + "' inputmode='numeric' pattern='[0-9]*' autocomplete='off'></label>" +
      "</div>" +
      (Object.keys(kier).length ? "<div class='tlok kierunki'>" + Object.keys(kier).map(function (k) {
        return "<button type='button' data-kier='" + esc(k) + "' class='" + (j.kierunek === k ? "zrobione" : "") + "'>\u2192 " + esc(kier[k].cel) + "</button>";
      }).join("") + "</div>" : (j.linia ? "<p class='drobny'>Brak trasy tej linii w danych \u2014 przystanek wybierzesz wyszukiwark\u0105.</p>" : "")) +
      "<div class='biezacy'><span class='drobny'>Przystanek</span>" +
      (trasa.length ? "<select data-przyst>" +
        (trasa.indexOf(b.przystanek) < 0 ? "<option value='" + esc(b.przystanek) + "' selected>" + esc(b.przystanek ? nazwa(b.przystanek) : "\u2014 wybierz \u2014") + "</option>" : "") +
        trasa.map(function (id) {
          return "<option value='" + esc(id) + "'" + (id === b.przystanek ? " selected" : "") + ">" + esc(nazwa(id)) + "</option>";
        }).join("") + "</select>"
        : "<b>" + esc(b.przystanek ? nazwa(b.przystanek) : "\u2014") + "</b>") +
      "<div class='szukaj'><input data-szukaj type='search' placeholder='" + (trasa.length ? "inny (objazd) \u2014 wpisz nazw\u0119" : "wpisz nazw\u0119 przystanku") +
        "' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' enterkeyhint='done'>" +
        "<div class='podpowiedzi' data-podp hidden></div></div></div>" +
      "<div class='pasazerowie'>" +
      "<div class='licznik'><span>Wsiada <b>" + b.wsiadlo + "</b></span>" +
      "<button type='button' data-licz='wsiadlo' data-d='1'>+</button><button type='button' class='minus' data-licz='wsiadlo' data-d='-1'>\u2212</button></div>" +
      "<div class='licznik'><span>Wysiada <b>" + b.wysiadlo + "</b></span>" +
      "<button type='button' data-licz='wysiadlo' data-d='1'>+</button><button type='button' class='minus' data-licz='wysiadlo' data-d='-1'>\u2212</button></div>" +
      "</div>" +
      "<div class='drobny' style='margin:6px 0 4px'>Zape\u0142nienie po odje\u017adzie (mo\u017cna liczy\u0107 i zaznacza\u0107 ju\u017c w trakcie jazdy)</div>" +
      "<div class='tlok'>" + P.TLOK.map(function (x) {
        return "<button type='button' data-tlok='" + x[0] + "' class='" + (b.tlok === x[0] ? "zrobione" : "") + "'>" + x[1] + "</button>";
      }).join("") + "</div>" +
      "<div class='przyciski' style='margin-top:10px'>" +
      "<button type='button' class='zrobione' data-akcja='dalej'>Dalej \u25b6<small>przystanek policzony</small></button>" +
      "<button type='button' data-akcja='pomin'>Nie stan\u0105\u0142<small>(na \u017c\u0105danie)</small></button></div>" +
      "<div class='komunikat'></div>" +
      "<label class='drzwi'>Liczone <select data-pole='zakres'>" + P.ZAKRES.map(function (z) {
        return "<option value='" + z[0] + "'" + (j.zakres === z[0] ? " selected" : "") + ">" + z[1] + "</option>";
      }).join("") + "</select></label>" +
      "<details><summary>Uwagi</summary><input type='text' data-pole='uwagi' value='" + esc(j.uwagi) + "'></details>" +
      "<div class='lista' style='margin:10px 0 0'>" + j.postoje.slice(-6).reverse().map(function (p) {
        return "<div class='wiersz'><span>" + hms(p.t).slice(0, 8) + " " + esc(nazwa(p.przystanek)) + "</span><span>+" + p.wsiadlo +
          " \u2212" + p.wysiadlo + (p.tlok ? " \u00b7 " + esc(etTlok(p.tlok)) : "") + "</span></div>";
      }).join("") + "</div>" +
      "<div class='stopka-karty'><button type='button' data-akcja='cofnij'>Cofnij \u201eDalej\u201d</button>" +
      "<button type='button' data-akcja='usun'>Usu\u0144</button>" +
      "<button type='button' class='zakoncz' data-akcja='zakoncz'>Zako\u0144cz przejazd</button></div>" +
      "</article><div class='lista' style='margin:0'>" + zrobione + "</div>";

    el.querySelectorAll("[data-pole]").forEach(function (inp) {
      var ev = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(ev, function () {
        stan.przejazd[inp.dataset.pole] = inp.value.trim(); zapisz();
      });
    });
    // linia zmienia liste kierunkow - przerysuj po zejsciu z pola, nie w trakcie pisania
    el.querySelector("[data-pole=linia]").addEventListener("change", function () {
      var jj = stan.przejazd, kk = Object.keys(trasy[jj.linia] || {});
      if (kk.indexOf(jj.kierunek) < 0) { jj.kierunek = ""; jj.cel = ""; jj.trasa = []; }
      zapisz();
      setTimeout(function () {                 // po przeniesieniu fokusu: nie gub pola, w ktore przeszedl
        var a = document.activeElement, pole = a && a.dataset ? a.dataset.pole : null;
        rysujJazde();
        if (pole) { var n = document.querySelector("#jazda [data-pole=" + pole + "]"); if (n) n.focus(); }
      }, 0);
    });
    el.querySelectorAll("[data-kier]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        var t = kier[bt.dataset.kier];
        zmienPrzejazd(function (x) { return P.ustawTrase(x, bt.dataset.kier, t.cel, t.przystanki); });
      });
    });
    var sel = el.querySelector("[data-przyst]");
    if (sel) sel.addEventListener("change", function () {
      zmienPrzejazd(function (x) { return P.ustawPrzystanek(x, sel.value); });
    });
    var sz = el.querySelector("[data-szukaj]"), box = el.querySelector("[data-podp]");
    var wyborJazda = function (pole, p) { zmienPrzejazd(function (x) { return P.ustawPrzystanek(x, p.s); }); };
    sz.addEventListener("input", function () { podpowiedzi(sz, box, wyborJazda); });
    sz.addEventListener("blur", function () { setTimeout(function () { box.hidden = true; }, 150); });
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
    el.querySelector("[data-akcja=pomin]").addEventListener("click", function () { zmienPrzejazd(P.pomin); });
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

  function ustawTryb(tryb) {
    stan.tryb = tryb; zapisz();
    var jazda = tryb === "jazda";
    document.getElementById("jazda").hidden = !jazda;
    ["karty", "lista", "nowy"].forEach(function (id) { document.getElementById(id).hidden = jazda; });
    document.querySelector(".pasek-gora .szukaj").hidden = jazda;
    document.getElementById("szybkie").hidden = jazda;
    document.querySelectorAll("[data-tryb]").forEach(function (b) {
      b.classList.toggle("zrobione", b.dataset.tryb === tryb);
    });
    if (jazda) rysujJazde(); else rysuj();
  }

  function start() {
    wczytaj();
    indeksuj();
    var pole = document.getElementById("przystanek");
    fetch("data/przystanki.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
      .then(function (d) {
        wszystkie = d.przystanki; trasy = d.trasy || {}; indeksuj(); rysujSzybkie();
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
      if (pole.value.trim() && P.idZTekstu(pole.value) !== stan.przystanek) {
        stan.przystanekTekst = pole.value; stan.przystanek = P.idZTekstu(pole.value); zapisz(); rysuj();
      }
    });
    rysujSzybkie();
    document.getElementById("nowy").addEventListener("click", function () {
      stan.otwarte.unshift(P.nowa(stan.przystanek, Date.now())); zapisz(); rysuj();
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
        new Date().toLocaleTimeString("pl-PL", { hour12: false });
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
    ustawTryb(stan.tryb || "postoj");
  }
  start();
})();
