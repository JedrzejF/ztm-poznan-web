/*
 * pomiar-logika.js - czyste funkcje aplikacji do pomiaru terenowego postoju
 * (docs/POMIAR_TERENOWY.md). Bez DOM i bez localStorage - testowane w Node
 * (tests/test_pomiar_terenowy.py).
 *
 * Obserwacja = jeden pojazd na jednym przystanku. Zdarzenia sa momentami
 * zapisanymi z zegara telefonu (ms od epoki, UTC) - tym samym, co vehicle_ts
 * w GTFS-RT, wiec dopasowanie do GPS nie wymaga zadnej synchronizacji recznej.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Pomiar = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Kolejnosc zdarzen w typowym postoju. Zdarzenia "2" - drugie zatrzymanie
  // na tym samym przystanku (swiatlo na wylocie, kolejka) - opcjonalne.
  var ZDARZENIA = [
    { kod: "stop", etykieta: "Stanął", opis: "koła stanęły przy peronie" },
    { kod: "otw", etykieta: "Drzwi otwarte", opis: "pierwsze drzwi zaczęły się otwierać" },
    { kod: "zamk", etykieta: "Drzwi zamknięte", opis: "ostatnie drzwi domknięte" },
    { kod: "rusz", etykieta: "Ruszył", opis: "koła ruszyły" },
    { kod: "stop2", etykieta: "Stanął ponownie", opis: "np. światło tuż za przystankiem" },
    { kod: "rusz2", etykieta: "Ruszył ponownie", opis: "odjazd po drugim zatrzymaniu" }
  ];
  var KODY = ZDARZENIA.map(function (z) { return z.kod; });

  var FLAGI = [
    { kod: "kolejka", etykieta: "Najpierw stał w kolejce przed peronem" },
    { kod: "dwa", etykieta: "Dwa pojazdy przy peronie naraz" },
    { kod: "rampa", etykieta: "Rampa / wózek / długi postój z powodu pasażera" },
    { kod: "przejazd", etykieta: "Nie zatrzymał się (przejazd)" },
    { kod: "niepewny", etykieta: "Któryś moment niepewny" }
  ];

  var licznik = 0;
  function nowa(przystanek, teraz) {
    licznik += 1;
    return { id: teraz + "-" + licznik, przystanek: przystanek || "", linia: "", pojazd: "",
             czasy: {}, flagi: {}, uwagi: "", zamknieta: false, utworzona: teraz,
             wsiadlo: 0, wysiadlo: 0, drzwi_obs: "", tlok: "" };
  }

  // Wymiana pasazerska (27.09, prosba autora): liczniki dla OBSERWOWANYCH
  // drzwi (jedna osoba nie policzy 4 drzwi tramwaju) i zapelnienie w 3 klasach.
  var TLOK = [["luzno", "lu\u017ano"], ["siedzenia", "siedzenia zaj\u0119te"], ["stoja", "stoj\u0105"]];

  /* Licznik +1 / -1; nigdy ponizej zera. */
  function zlicz(obs, pole, delta) {
    if (pole !== "wsiadlo" && pole !== "wysiadlo") throw new Error("nieznany licznik: " + pole);
    var o = Object.assign({}, obs);
    o[pole] = Math.max(0, (obs[pole] || 0) + delta);
    return o;
  }

  /* Zapis zdarzenia. Zwraca nowa obserwacje (bez mutacji) albo rzuca blad,
     gdy zdarzenie lamie kolejnosc - pomylony przycisk w terenie ma byc od
     razu widoczny, a nie odkryty przy analizie. */
  function zapisz(obs, kod, t) {
    if (KODY.indexOf(kod) < 0) throw new Error("nieznane zdarzenie: " + kod);
    if (obs.czasy[kod] !== undefined) throw new Error(kod + " już zapisane");
    var i = KODY.indexOf(kod);
    for (var j = 0; j < KODY.length; j++) {
      var inny = obs.czasy[KODY[j]];
      if (inny === undefined) continue;
      if (j < i && inny > t) throw new Error(kod + " wcześniej niż " + KODY[j]);
      if (j > i && inny < t) throw new Error(kod + " później niż " + KODY[j]);
    }
    if (kod === "rusz2" && obs.czasy.stop2 === undefined)
      throw new Error("najpierw „Stanął ponownie”");
    var c = {}; Object.keys(obs.czasy).forEach(function (k) { c[k] = obs.czasy[k]; });
    c[kod] = t;
    return Object.assign({}, obs, { czasy: c });
  }

  /* Cofniecie ostatnio zapisanego (najpozniejszego) zdarzenia. */
  function cofnij(obs) {
    var ost = null;
    Object.keys(obs.czasy).forEach(function (k) {
      if (ost === null || obs.czasy[k] >= obs.czasy[ost]) ost = k;
    });
    if (ost === null) return obs;
    var c = {}; Object.keys(obs.czasy).forEach(function (k) { if (k !== ost) c[k] = obs.czasy[k]; });
    return Object.assign({}, obs, { czasy: c });
  }

  /* Czy obserwacja nadaje sie do porownania z GPS: wymagane linia, numer
     taborowy, zatrzymanie i ruszenie (albo flaga "przejazd"). Zwraca liste
     brakow - pusta = kompletna. */
  function braki(obs) {
    var b = [];
    if (!obs.linia) b.push("linia");
    if (!/^\d{3,4}$/.test(obs.pojazd)) b.push("numer taborowy (3–4 cyfry)");
    if (!obs.flagi.przejazd) {
      if (obs.czasy.stop === undefined) b.push("Stanął");
      if (obs.czasy.rusz === undefined) b.push("Ruszył");
    }
    if (obs.czasy.stop2 !== undefined && obs.czasy.rusz2 === undefined) b.push("Ruszył ponownie");
    // liczba pasazerow bez wskazania drzwi jest nieinterpretowalna
    if ((obs.wsiadlo || obs.wysiadlo) && !obs.drzwi_obs) b.push("kt\u00f3re drzwi liczone");
    return b;
  }

  /* Czasy trwania [s] liczone z zapisanych momentow - do podgladu w terenie. */
  function trwanie(obs) {
    var c = obs.czasy, d = function (a, b) {
      return c[a] !== undefined && c[b] !== undefined ? (c[b] - c[a]) / 1000 : null;
    };
    return { postoj: d("stop", "rusz"), drzwi: d("otw", "zamk"),
             swiatlo: d("stop2", "rusz2"), calosc: c.rusz2 !== undefined ? d("stop", "rusz2") : d("stop", "rusz") };
  }

  /* Przystanek w wyszukiwarce: "Fredry \u2192 Gwarna [117] \u00b7 tramwaj 3, 4".
     Z wybranego wpisu bierzemy id slupka; tekst wpisany recznie zostaje
     tekstem (dopasowanie do GPS i tak idzie po numerze taborowym i czasie). */
  var TYP = { "0": "tramwaj", "3": "autobus", "0,3": "tramwaj/autobus" };
  function etykietaPrzystanku(p) {
    return p.n + (p.k ? " \u2192 " + p.k : "") + " [" + p.s + "] \u00b7 " +
      (TYP[p.t] || "") + " " + p.l.join(", ");
  }
  function idZTekstu(tekst) {
    var m = /.*\[(\w+)\]/.exec(tekst || "");   // OSTATNI nawias - nazwa tez moze go miec
    return m ? m[1] : (tekst || "").trim();
  }

  /* Wyszukiwanie przystankow dla wlasnej listy podpowiedzi (datalist nie
     dziala na telefonach - 27.09). Bez polskich znakow i wielkosci liter;
     kolejnosc: nazwa od poczatku > slowo od poczatku > gdziekolwiek. */
  function normuj(t) {
    return String(t || "").toLowerCase().replace(/\u0142/g, "l")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function szukajPrzystankow(lista, zapytanie, ile) {
    var q = normuj(zapytanie).trim();
    if (q.length < 2) return [];
    var wyniki = [];
    lista.forEach(function (p) {
      var n = normuj(p.n), pelny = normuj(p.n + " " + (p.k || "") + " " + p.s);
      var w = n.indexOf(q) === 0 ? 0
            : (" " + n).indexOf(" " + q) >= 0 || (" " + n).indexOf("." + q) >= 0 || (" " + n).indexOf("/" + q) >= 0 ? 1
            : pelny.indexOf(q) >= 0 ? 2 : -1;
      if (w >= 0) wyniki.push([w, p]);
    });
    wyniki.sort(function (a, b) {
      return a[0] - b[0] || a[1].n.localeCompare(b[1].n, "pl") || (a[1].k || "").localeCompare(b[1].k || "", "pl");
    });
    return wyniki.slice(0, ile || 12).map(function (x) { return x[1]; });
  }

  function csvPole(v) {
    var s = v === undefined || v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  var KOLUMNY = ["id", "przystanek", "linia", "pojazd"].concat(KODY.map(function (k) { return "t_" + k; }))
    .concat(FLAGI.map(function (f) { return "f_" + f.kod; }))
    .concat(["wsiadlo", "wysiadlo", "drzwi_obs", "tlok", "uwagi", "utworzona"]);

  /* CSV: czasy jako ms od epoki (UTC) - jednoznaczne, do zlaczenia z vehicle_ts. */
  function csv(obserwacje) {
    var w = [KOLUMNY.join(",")];
    obserwacje.forEach(function (o) {
      var r = [o.id, o.przystanek, o.linia, o.pojazd]
        .concat(KODY.map(function (k) { return o.czasy[k]; }))
        .concat(FLAGI.map(function (f) { return o.flagi[f.kod] ? 1 : 0; }))
        .concat([o.wsiadlo || 0, o.wysiadlo || 0, o.drzwi_obs || "", o.tlok || "", o.uwagi, o.utworzona]);
      w.push(r.map(csvPole).join(","));
    });
    return w.join("\n") + "\n";
  }

  return { ZDARZENIA: ZDARZENIA, KODY: KODY, FLAGI: FLAGI, KOLUMNY: KOLUMNY, TLOK: TLOK,
           etykietaPrzystanku: etykietaPrzystanku, idZTekstu: idZTekstu,
           normuj: normuj, szukajPrzystankow: szukajPrzystankow,
           nowa: nowa, zapisz: zapisz, cofnij: cofnij, zlicz: zlicz, braki: braki,
           trwanie: trwanie, csv: csv };
}));
