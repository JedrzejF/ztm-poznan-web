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
             wsiadlo: 0, wysiadlo: 0, drzwi_obs: "wszystkie", tlok: "" };
  }

  // Wymiana pasazerska (27.09, prosba autora): liczniki dla OBSERWOWANYCH
  // drzwi (jedna osoba nie policzy 4 drzwi tramwaju) i zapelnienie w 3 klasach.
  // Domyslnie "wszystkie" (27.09, po pilotazu: autor liczy wszystkie, jesli nie
  // zaznaczy inaczej) - pusty wybor zostaje brakiem tylko przy jawnym skasowaniu.
  // "scisk" (27.09): z wnetrza pojazdu widac tez tlok, ktorego z peronu nie ocenisz.
  var TLOK = [["luzno", "lu\u017ano"], ["siedzenia", "siedzenia zaj\u0119te"], ["stoja", "stoj\u0105"],
              ["scisk", "\u015bcisk"]];

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

  /* Korekta zapisanego momentu o delta ms (27.09: "drzwi zamkniete 6 s pozniej
     niz kliknalem" - zamiast notatki). Kolejnosc pilnowana jak przy zapisie;
     suma korekt kazdego zdarzenia zostaje w obserwacji i trafia do CSV -
     wiadomo, ktore czasy sa z klikniecia, a ktore poprawione z pamieci. */
  function przesun(obs, kod, delta) {
    if (obs.czasy[kod] === undefined) throw new Error(kod + " nie jest zapisane");
    var bez = {}; Object.keys(obs.czasy).forEach(function (k) { if (k !== kod) bez[k] = obs.czasy[k]; });
    var o = zapisz(Object.assign({}, obs, { czasy: bez }), kod, obs.czasy[kod] + delta);
    var kor = Object.assign({}, obs.korekty || {});
    kor[kod] = (kor[kod] || 0) + delta;
    if (!kor[kod]) delete kor[kod];
    return Object.assign(o, { korekty: kor });
  }

  function opisKorekt(obs) {
    return Object.keys(obs.korekty || {}).map(function (k) {
      var d = obs.korekty[k] / 1000; return k + (d > 0 ? "+" : "") + d;
    }).join(" ");
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

  /* ---- Tryb "jade pojazdem" (27.09): wyrywkowe liczenie pasazerow na
     pojedynczych przejazdach. Jeden przejazd = jeden pojazd, ciag postojow.
     Przystanek biezacy podpowiada trasa linii (wariant glowny kierunku,
     opoznienia.trasy); moment "Odjazd" zapisuje postoj z czasem telefonu -
     z numerem taborowym wystarcza do dopasowania z GPS, nawet gdy przystanek
     wybrano zle. Zapelnienie dotyczy odcinka PO odjezdzie z przystanku.
     Pilotaz 27.09: liczenie trwa czesto jeszcze w trakcie jazdy, wiec moment
     "Dalej" to NIE odjazd - zapisujemy t_zapis (dotkniecie "Dalej") i
     t_pierwsze (pierwsze dotkniecie licznika na tym przystanku); do GPS
     dopasowuje przede wszystkim przystanek i kolejnosc, czasy tylko zawezaja. */
  var ZAKRES = [["", "\u2014"], ["drzwi", "moje drzwi"], ["czlon", "m\u00f3j cz\u0142on / wagon"],
                ["caly", "ca\u0142y pojazd"]];

  function nowyPrzejazd(teraz) {
    licznik += 1;
    return { id: "J" + teraz + "-" + licznik, linia: "", pojazd: "", kierunek: "", cel: "", trasa: [],
             zakres: "caly", uwagi: "", postoje: [], utworzona: teraz,
             biezacy: _pusty("") };
  }

  function _pusty(przystanek) {
    return { przystanek: przystanek || "", wsiadlo: 0, wysiadlo: 0, tlok: "", obciazenie: "",
             obciazenie_zakres: "", znaczniki: {}, uwaga: "", czasy: {} };
  }

  /* Znaczniki postoju w trakcie jazdy (27.09: notatki "Krzesiny 170 s czekania
     na czas" trafialy do uwag calego przejazdu). Kazdy znacznik mierzy czas:
     1. dotkniecie = poczatek, 2. = koniec, 3. = skasowanie (pomylka).
     Bez konca - trwa do "Dalej". */
  var ZNACZNIKI = [["czas", "czeka na czas"], ["przed", "korek / \u015bwiat\u0142o przed peronem"],
                   ["za", "\u015bwiat\u0142o za przystankiem"]];

  function przelaczZnacznik(prz, kod, t) {
    var b = Object.assign({}, prz.biezacy), z = Object.assign({}, b.znaczniki || {});
    var x = z[kod], c = b.czasy || {};
    // swiatlo za przystankiem: liczacy orientuje sie po kilku sekundach -
    // gdy zapisano "Drzwi zamkniete", start od nich (i koniec na "Ruszyl")
    if (!x && kod === "za" && c.zamk !== undefined)
      z[kod] = c.rusz !== undefined ? { od: c.zamk, do: Math.max(c.rusz, c.zamk) } : { od: c.zamk };
    else if (!x) z[kod] = { od: t };
    else if (x.do === undefined) z[kod] = { od: x.od, do: Math.max(t, x.od) };
    else delete z[kod];
    b.znaczniki = z;
    return Object.assign({}, prz, { biezacy: b });
  }

  /* Czas trwania znacznika [s]; niezamkniety liczony do `koniec` (Dalej). */
  function trwanieZnacznika(x, koniec) {
    if (!x) return null;
    var k = x.do !== undefined ? x.do : koniec;
    return k === undefined ? null : Math.round((k - x.od) / 100) / 10;
  }

  /* Liczba osob w pojezdzie PO odjezdzie z przystanku (27.09, prosba autora):
     wpisana recznie gdziekolwiek (przy wejsciu albo pozniej) jest kotwica,
     dalej szacunek = kotwica + suma (wsiadlo - wysiadlo) kolejnych postojow.
     Przed pierwsza kotwica szacunku nie ma - liczby wsteczne bylyby zgadywane. */
  /* 28.09: liczba osob moze dotyczyc innego zakresu niz liczniki (liczysz
     czlon, ale raz policzyles caly pojazd). Kotwica prowadzi bilans tylko,
     gdy jej zakres = zakres licznikow; inna kotwica przerywa szacunek (liczby
     z dwoch zakresow sie nie sumuja). zakres pominiety - jak wczesniej. */
  function zakresObciazenia(p, zakres) {
    return p.obciazenie_zakres || (zakres === "czlon" ? "czlon" : "caly");
  }

  function szacujObciazenie(postoje, zakres) {
    var wynik = [], biez = null;
    postoje.forEach(function (p) {
      if (p.obciazenie !== undefined && p.obciazenie !== "" && p.obciazenie !== null) {
        biez = zakres === undefined || zakresObciazenia(p, zakres) === zakres ? Number(p.obciazenie) : null;
      } else if (biez !== null) biez = Math.max(0, biez + (p.wsiadlo || 0) - (p.wysiadlo || 0));
      wynik.push(biez);
    });
    return wynik;
  }

  /* Wybor kierunku: trasa = lista stop_id; biezacy = pierwszy przystanek,
     chyba ze biezacy juz lezy na tej trasie (zmiana kierunku w trakcie). */
  function ustawTrase(prz, kierunek, cel, trasa) {
    var b = Object.assign({}, prz.biezacy);
    if (trasa.indexOf(b.przystanek) < 0) b.przystanek = trasa[0] || "";
    return Object.assign({}, prz, { kierunek: kierunek, cel: cel, trasa: trasa.slice(), biezacy: b });
  }

  function ustawPrzystanek(prz, id) {
    return Object.assign({}, prz, { biezacy: Object.assign({}, prz.biezacy, { przystanek: id }) });
  }

  function zliczPrzejazd(prz, pole, delta, t) {
    var b = zlicz(prz.biezacy, pole, delta);
    if (b.t0 === undefined && delta > 0 && t !== undefined) b.t0 = t;
    return Object.assign({}, prz, { biezacy: b });
  }

  /* Nastepny przystanek na trasie po `id`; "" gdy koniec trasy albo `id`
     poza trasa (objazd, wpis reczny) - wtedy wybiera sie recznie. */
  function nastepny(trasa, id) {
    var i = trasa.indexOf(id);
    return i >= 0 && i + 1 < trasa.length ? trasa[i + 1] : "";
  }

  /* "Dalej": postoj zapisany z czasem t, biezacy przesuwa sie na nastepny
     przystanek trasy. */
  function dalej(prz, t) {
    if (!prz.biezacy.przystanek) throw new Error("wybierz przystanek");
    var ost = prz.postoje[prz.postoje.length - 1];
    if (ost && ost.t > t) throw new Error("czas wcze\u015bniejszy ni\u017c poprzedni zapis");
    var p = Object.assign({}, prz.biezacy, { t: t });
    return Object.assign({}, prz, { postoje: prz.postoje.concat([p]),
                                    biezacy: _pusty(nastepny(prz.trasa, p.przystanek)) });
  }

  /* Zegar postoju w jezdzie (28.09, opcjonalny): Stanal / Drzwi otwarte /
     Drzwi zamkniete / Ruszyl dla biezacego przystanku, kolejnosc jak na
     przystanku. "Stanal", gdy biezacy juz ruszyl = to jest nastepny przystanek:
     najpierw "Dalej" (zapis z ta chwila), potem zdarzenie - dane trafiaja do
     wlasciwego przystanku, nawet gdy liczacy nie zdazyl nacisnac "Dalej".
     "Ruszyl" konczy trwajace znaczniki. */
  var ZDARZENIA_JAZDY = ["stop", "otw", "zamk", "rusz"];

  function zdarzenieJazdy(prz, kod, t) {
    if (ZDARZENIA_JAZDY.indexOf(kod) < 0) throw new Error("nieznane zdarzenie: " + kod);
    var x = prz;
    if (kod === "stop" && (x.biezacy.czasy || {}).rusz !== undefined) x = dalej(x, t);
    var b = zapisz(Object.assign({ czasy: {} }, x.biezacy), kod, t);
    if (kod === "rusz") {
      var z = {};
      Object.keys(b.znaczniki || {}).forEach(function (k) {
        var m = b.znaczniki[k];
        z[k] = m.do === undefined ? { od: m.od, do: Math.max(t, m.od) } : m;
      });
      b = Object.assign({}, b, { znaczniki: z });
    }
    return Object.assign({}, x, { biezacy: b });
  }

  function cofnijZdarzenieJazdy(prz) {
    return Object.assign({}, prz, { biezacy: cofnij(Object.assign({ czasy: {} }, prz.biezacy)) });
  }

  /* Przystanek bez zatrzymania (na zadanie) - przesuniecie bez zapisu. */
  function pomin(prz) {
    return ustawPrzystanek(prz, nastepny(prz.trasa, prz.biezacy.przystanek));
  }

  /* Cofniecie ostatniego "Dalej": postoj wraca do edycji z licznikami. */
  function cofnijDalej(prz) {
    if (!prz.postoje.length) return prz;
    var p = Object.assign({}, prz.postoje[prz.postoje.length - 1]); delete p.t;
    return Object.assign({}, prz, { postoje: prz.postoje.slice(0, -1), biezacy: p });
  }

  function brakiPrzejazdu(prz) {
    var b = [];
    if (!prz.linia) b.push("linia");
    if (!/^\d{3,4}$/.test(prz.pojazd)) b.push("numer taborowy (3\u20134 cyfry)");
    if (!prz.postoje.length) b.push("\u017caden zapisany przystanek");
    var liczono = prz.postoje.some(function (p) { return p.wsiadlo || p.wysiadlo; });
    if (liczono && !prz.zakres) b.push("zakres liczenia");
    return b;
  }

  /* Inne slupki o tej samej nazwie - szybka zmiana kierunku na tym samym
     przystanku (pilotaz 27.09: tramwaje na zmiane w obu kierunkach). */
  function tenSamPrzystanek(lista, id) {
    var ja = null;
    lista.forEach(function (p) { if (p.s === id) ja = p; });
    if (!ja) return [];
    return lista.filter(function (p) { return p.n === ja.n; })
      .sort(function (a, b) { return (a.k || "").localeCompare(b.k || "", "pl") || a.s.localeCompare(b.s); });
  }

  function csvPole(v) {
    var s = v === undefined || v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  var KOLUMNY = ["id", "przystanek", "linia", "pojazd"].concat(KODY.map(function (k) { return "t_" + k; }))
    .concat(FLAGI.map(function (f) { return "f_" + f.kod; }))
    .concat(["wsiadlo", "wysiadlo", "drzwi_obs", "tlok", "uwagi", "utworzona", "korekty"]);

  /* CSV: czasy jako ms od epoki (UTC) - jednoznaczne, do zlaczenia z vehicle_ts. */
  function csv(obserwacje) {
    var w = [KOLUMNY.join(",")];
    obserwacje.forEach(function (o) {
      var r = [o.id, o.przystanek, o.linia, o.pojazd]
        .concat(KODY.map(function (k) { return o.czasy[k]; }))
        .concat(FLAGI.map(function (f) { return o.flagi[f.kod] ? 1 : 0; }))
        .concat([o.wsiadlo || 0, o.wysiadlo || 0, o.drzwi_obs || "", o.tlok || "", o.uwagi, o.utworzona, opisKorekt(o)]);
      w.push(r.map(csvPole).join(","));
    });
    return w.join("\n") + "\n";
  }

  var KOLUMNY_PRZEJAZDU = ["id", "linia", "pojazd", "kierunek", "cel", "zakres", "lp", "przystanek",
                           "t_pierwsze", "t_zapis", "t_stop", "t_otw", "t_zamk", "t_rusz",
                           "wsiadlo", "wysiadlo", "tlok", "obciazenie", "obciazenie_zakres", "obciazenie_szac"]
    .concat(ZNACZNIKI.map(function (z) { return "z_" + z[0] + "_s"; })).concat(["uwaga_przyst", "uwagi"]);

  /* CSV przejazdow: wiersz = postoj (format dlugi), czasy w ms od epoki. */
  function csvPrzejazdy(lista) {
    var w = [KOLUMNY_PRZEJAZDU.join(",")];
    lista.forEach(function (j) {
      var sz = szacujObciazenie(j.postoje, j.zakres);
      j.postoje.forEach(function (p, k) {
        var c = p.czasy || {}, obc = p.obciazenie === undefined ? "" : p.obciazenie;
        w.push([j.id, j.linia, j.pojazd, j.kierunek, j.cel, j.zakres, k + 1, p.przystanek, p.t0, p.t,
                c.stop, c.otw, c.zamk, c.rusz,
                p.wsiadlo || 0, p.wysiadlo || 0, p.tlok || "", obc,
                obc === "" ? "" : zakresObciazenia(p, j.zakres),
                sz[k] === null ? "" : sz[k]]
          .concat(ZNACZNIKI.map(function (z) { var d = trwanieZnacznika((p.znaczniki || {})[z[0]], p.t); return d === null ? "" : d; }))
          .concat([p.uwaga || "", j.uwagi]).map(csvPole).join(","));
      });
    });
    return w.join("\n") + "\n";
  }

  return { ZAKRES: ZAKRES, KOLUMNY_PRZEJAZDU: KOLUMNY_PRZEJAZDU, nowyPrzejazd: nowyPrzejazd,
           ustawTrase: ustawTrase, ustawPrzystanek: ustawPrzystanek, zliczPrzejazd: zliczPrzejazd,
           nastepny: nastepny, dalej: dalej, pomin: pomin, cofnijDalej: cofnijDalej,
           tenSamPrzystanek: tenSamPrzystanek, szacujObciazenie: szacujObciazenie,
           zakresObciazenia: zakresObciazenia, ZDARZENIA_JAZDY: ZDARZENIA_JAZDY,
           zdarzenieJazdy: zdarzenieJazdy, cofnijZdarzenieJazdy: cofnijZdarzenieJazdy,
           ZNACZNIKI: ZNACZNIKI, przelaczZnacznik: przelaczZnacznik, trwanieZnacznika: trwanieZnacznika,
           przesun: przesun, opisKorekt: opisKorekt,
           brakiPrzejazdu: brakiPrzejazdu, csvPrzejazdy: csvPrzejazdy,
           ZDARZENIA: ZDARZENIA, KODY: KODY, FLAGI: FLAGI, KOLUMNY: KOLUMNY, TLOK: TLOK,
           etykietaPrzystanku: etykietaPrzystanku, idZTekstu: idZTekstu,
           normuj: normuj, szukajPrzystankow: szukajPrzystankow,
           nowa: nowa, zapisz: zapisz, cofnij: cofnij, zlicz: zlicz, braki: braki,
           trwanie: trwanie, csv: csv };
}));
