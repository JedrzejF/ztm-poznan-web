/*
 * logika.js - czyste funkcje strony (bez DOM), testowane w Node
 * (tests/test_web.py). Strona NIE liczy miar: mediany, ilorazy i udzialy
 * przychodza gotowe z web/korki.py i web/opoznienia.py (D-036). Tu tylko
 * wybor, kolor, sortowanie i tekst.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Logika = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Miary mapy. zrodlo: "h" - czas przejazdu odcinka (wg godziny przejazdu),
  // "o" - opoznienie przy przyjezdzie na koniec odcinka (wg godziny PLANOWEJ).
  // Nasycenie koloru:
  //   iloraz      - symetrycznie w logarytmie: x1,5 i /1,5 to ta sama odleglosc
  //   roznica     - +-60 s liniowo
  //   opoznienie  - na granicach punktualnosci D-037: -60 s i +180 s, wiec
  //                 kolor pelny = juz niepunktualnie
  //   punktualnosc - 100% neutralnie, pelna czerwien przy 50%
  var TRYBY = {
    iloraz: { zrodlo: "h", indeks: 2 },
    roznica: { zrodlo: "h", indeks: 1 },
    opoznienie: { zrodlo: "o", indeks: 1 },
    punktualnosc: { zrodlo: "o", indeks: 2 }
  };
  var NASYCENIE = { iloraz: Math.log2(1.5), roznica: 60, przed: 60, po: 180, punkt: 0.5 };

  // Para rozbiezna palety (dataviz): niebieski <-> czerwony, szary srodek.
  // Srodek ciemniejszy niz szarosc tla wykresu - na mapie siec w normie ma
  // byc widoczna, ale cofnieta.
  var MOTYWY = {
    jasny: { szybciej: "#2a78d6", srodek: "#b9b8b3", wolniej: "#e34948", brak: "#d9d8d4" },
    ciemny: { szybciej: "#3987e5", srodek: "#6b6a65", wolniej: "#e66767", brak: "#3a3a37" }
  };

  function hexNaRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbNaHex(c) {
    return "#" + c.map(function (v) {
      return Math.round(v).toString(16).padStart(2, "0");
    }).join("");
  }
  function mieszaj(a, b, t) {
    var x = hexNaRgb(a), y = hexNaRgb(b);
    return rgbNaHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; }));
  }
  function obetnij(x) { return Math.max(-1, Math.min(1, x)); }

  /* Pozycja na skali w [-1, 1]; ujemna = lepiej niz zwykle / przed czasem. */
  function pozycja(v, tryb) {
    switch (tryb) {
      case "iloraz": return obetnij(Math.log2(v) / NASYCENIE.iloraz);
      case "roznica": return obetnij(v / NASYCENIE.roznica);
      case "opoznienie": return obetnij(v < 0 ? v / NASYCENIE.przed : v / NASYCENIE.po);
      case "punktualnosc": return obetnij((1 - v) / NASYCENIE.punkt);
    }
    throw new Error("nieznana miara: " + tryb);
  }

  function kolor(v, tryb, motyw) {
    var P = MOTYWY[motyw || "jasny"];
    if (v === null || v === undefined || isNaN(v)) return P.brak;
    var t = pozycja(v, tryb);
    return t < 0 ? mieszaj(P.srodek, P.szybciej, -t) : mieszaj(P.srodek, P.wolniej, t);
  }

  function komorka(odc, godz, tryb) {
    var zr = odc[TRYBY[tryb].zrodlo];
    return (zr && zr[String(godz)]) || null;
  }

  /* Wartosc miary; null, gdy komorka ma za malo przejazdow (pominieta w danych). */
  function wartosc(odc, godz, tryb) {
    var c = komorka(odc, godz, tryb);
    if (!c) return null;
    if (tryb === "roznica") return c[1] - odc.d[1];
    return c[TRYBY[tryb].indeks];
  }

  function pasujeTyp(odc, typ) {
    return typ === "wszystkie" || String(odc.t) === String(typ);
  }

  /* Najgorsze odcinki w godzinie: najwieksze wydluzenie/opoznienie,
     najnizsza punktualnosc. */
  function ranking(odcinki, godz, typ, tryb, ile) {
    var znak = tryb === "punktualnosc" ? 1 : -1;
    return odcinki
      .filter(function (o) { return pasujeTyp(o, typ) && wartosc(o, godz, tryb) !== null; })
      .sort(function (a, b) { return znak * (wartosc(a, godz, tryb) - wartosc(b, godz, tryb)); })
      .slice(0, ile || 15);
  }

  /* Ranking par wg mediany odchylenia od rozkladu (dane z kalibracja.py).
     kierunek "krotki": rozklad daje za malo czasu - najwieksze dodatnie
     odchylenie na gorze; "dlugi": za duzo - najbardziej ujemne na gorze.
     Para z odchyleniem po drugiej stronie zera nie trafia do listy. */
  function rankingPar(pary, kierunek, typ, tylkoIstotne, ile) {
    var znak = kierunek === "dlugi" ? -1 : 1;
    return pary
      .filter(function (p) {
        return pasujeTyp(p, typ) && (!tylkoIstotne || p.i) && znak * p.d > 0;
      })
      .sort(function (x, y) { return znak * (y.d - x.d) || x.a.localeCompare(y.a); })
      .slice(0, ile || 15);
  }

  /* Skala wykresu schodow: os x do xmax metrow (dalsze przedzialy na krawedzi),
     os y od zera do najwiekszej mediany z zapasem, siatka co 60 s. */
  function skalaSchodow(schody, xmax) {
    var ymax = Math.max.apply(null, [120].concat(schody.map(function (s) {
      return Math.max(s.o, s.s);
    }))) * 1.1;
    return { xmax: xmax || 1600, ymax: Math.ceil(ymax / 60) * 60 };
  }

  function liczba(x, miejsc) { return x.toFixed(miejsc).replace(".", ","); }
  function fmtIloraz(x) {
    return x >= 1 ? "×" + liczba(x, 2) : "÷" + liczba(1 / x, 2);
  }
  function fmtRoznica(s) {
    return (s > 0 ? "+" : s < 0 ? "−" : "±") + Math.abs(Math.round(s)) + " s";
  }
  function fmtOpozn(s) {
    var a = Math.abs(Math.round(s)), m = Math.floor(a / 60), r = a % 60;
    var z = s > 0 ? "+" : s < 0 ? "−" : "±";
    return z + (m ? m + " min " + String(r).padStart(2, "0") + " s" : r + " s");
  }
  function fmtProc(p) { return Math.round(100 * p) + "%"; }
  function fmtGodz(h) {
    return String(h).padStart(2, "0") + ":00–" + String(h).padStart(2, "0") + ":59";
  }
  function fmtWartosc(v, tryb) {
    return tryb === "iloraz" ? fmtIloraz(v) : tryb === "roznica" ? fmtRoznica(v)
         : tryb === "opoznienie" ? fmtOpozn(v) : fmtProc(v);
  }
  var TYPY = { "0": "tramwaj", "3": "autobus" };

  function nazwa(odc, przystanki) {
    return (przystanki[odc.a] || odc.a) + " → " + (przystanki[odc.b] || odc.b);
  }

  function opis(odc, godz, przystanki, tryb) {
    var glowa = nazwa(odc, przystanki) + " (" + (TYPY[odc.t] || "typ " + odc.t) + ")";
    var c = komorka(odc, godz, tryb || "iloraz");
    if (!c) return glowa + "\n" + fmtGodz(godz) + ": za mało przejazdów";
    if (TRYBY[tryb || "iloraz"].zrodlo === "o") {
      return glowa + "\nprzyjazd na " + (przystanki[odc.b] || odc.b) + ", planowo " +
        fmtGodz(godz) + ":\nmediana opóźnienia " + fmtOpozn(c[1]) +
        ", punktualnie " + fmtProc(c[2]) + "\nprzyjazdów: " + c[0];
    }
    return glowa + "\n" + fmtGodz(godz) + ": " + Math.round(c[1]) + " s (cała doba "
      + Math.round(odc.d[1]) + " s, " + fmtIloraz(c[2]) + ", "
      + fmtRoznica(c[1] - odc.d[1]) + ")\nprzejazdów: " + c[0];
  }

  /* Tabela punktualnosci (23.09: kierunek, kolejnosc na trasie, zjazdy osobno).
     d = {wiersze, trasy} z web/opoznienia.py:
       wiersze: {s: stop_id|"*", p: nazwa|"*", l: linia|"*", k: kierunek, n, przed, punkt, po, med, p90}
       trasy:   {linia: {kierunek: {cel, przystanki: [stop_id...]}}} - wariant glowny
     Zwraca {glowne, inne}: glowne - na glownej trasie (w jej kolejnosci),
     inne - zjazdy, objazdy, kursy skrocone (malejaco wg liczby przyjazdow).
       - linia (+ kierunek): przystanki linii w kolejnosci trasy
       - przystanek: suma "*" + linie w kierunkach; linia na tym przystanku
         poza swoja glowna trasa -> inne
       - nic: linie x kierunki w calej sieci, najgorsze na gorze */
  function naTrasie(d, r) {
    var t = d.trasy[r.l] && d.trasy[r.l][r.k];
    return t ? t.przystanki.indexOf(r.s) : -1;
  }
  function udzial(r) { return r.punkt / r.n; }

  function filtrPunkt(d, przystanek, linia, kierunek) {
    var w = d.wiersze, glowne, inne;
    if (linia && !przystanek) {
      var k = kierunek || Object.keys(d.trasy[linia] || {})[0];
      var wl = w.filter(function (r) { return r.l === linia && r.k === k && r.s !== "*"; });
      glowne = wl.filter(function (r) { return naTrasie(d, r) >= 0; })
                 .sort(function (a, b) { return naTrasie(d, a) - naTrasie(d, b); });
      inne = wl.filter(function (r) { return naTrasie(d, r) < 0; })
               .sort(function (a, b) { return b.n - a.n; });
      var suma = w.filter(function (r) { return r.s === "*" && r.p === "*" && r.l === linia && r.k === k; });
      return { glowne: suma.concat(glowne), inne: inne };
    }
    if (przystanek) {
      var wp = w.filter(function (r) {
        return r.p === przystanek && (!linia || r.l === linia);
      });
      var sumy = linia ? [] : wp.filter(function (r) { return r.s === "*"; });
      var reszta = wp.filter(function (r) { return r.s !== "*"; });
      var porz = function (a, b) {
        return a.l.localeCompare(b.l, "pl", { numeric: true }) || a.k.localeCompare(b.k);
      };
      return { glowne: sumy.concat(reszta.filter(function (r) { return naTrasie(d, r) >= 0; }).sort(porz)),
               inne: reszta.filter(function (r) { return naTrasie(d, r) < 0; }).sort(porz) };
    }
    return { glowne: w.filter(function (r) { return r.s === "*" && r.p === "*"; })
                      .sort(function (a, b) { return udzial(a) - udzial(b); }),
             inne: [] };
  }

  /* Etykiety peronow: ta sama nazwa drugi raz na trasie -> "peron 2". */
  function etykietyPeronow(d, linia, k, nazwy) {
    var t = d.trasy[linia] && d.trasy[linia][k], licz = {}, wynik = {};
    if (!t) return wynik;
    t.przystanki.forEach(function (s) {
      var n = nazwy[s] || s;
      licz[n] = (licz[n] || 0) + 1;
      wynik[s] = licz[n] > 1 ? n + " (peron " + licz[n] + ")" : n;
    });
    return wynik;
  }

  return {
    TRYBY: TRYBY, NASYCENIE: NASYCENIE, MOTYWY: MOTYWY, TYPY: TYPY,
    pozycja: pozycja, kolor: kolor, komorka: komorka, wartosc: wartosc,
    pasujeTyp: pasujeTyp, ranking: ranking, rankingPar: rankingPar, skalaSchodow: skalaSchodow,
    nazwa: nazwa, opis: opis,
    filtrPunkt: filtrPunkt, etykietyPeronow: etykietyPeronow, fmtIloraz: fmtIloraz, fmtRoznica: fmtRoznica,
    fmtOpozn: fmtOpozn, fmtProc: fmtProc, fmtGodz: fmtGodz, fmtWartosc: fmtWartosc
  };
}));
