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

  /* Tabela punktualnosci. Wiersze gotowe z web/opoznienia.punktualnosc:
     {p: przystanek|"*", l: linia|"*", n, przed, punkt, po, med, p90}.
     - przystanek i linia: jeden wiersz
     - tylko przystanek: linie na przystanku + suma "*"
     - tylko linia: przystanki linii (bez "*") - najgorsze na gorze
     - nic: linie w calej sieci (p = "*") */
  function filtrPunkt(wiersze, przystanek, linia) {
    var w;
    if (przystanek && linia) w = wiersze.filter(function (r) { return r.p === przystanek && r.l === linia; });
    else if (przystanek) w = wiersze.filter(function (r) { return r.p === przystanek; });
    else if (linia) w = wiersze.filter(function (r) { return r.l === linia && r.p !== "*"; });
    else w = wiersze.filter(function (r) { return r.p === "*"; });
    return w.slice().sort(function (a, b) {
      if (a.l === "*" && b.l !== "*") return -1;      // suma przystanku na gorze
      if (b.l === "*" && a.l !== "*") return 1;
      return a.punkt / a.n - b.punkt / b.n;           // najgorsze pierwsze
    });
  }

  return {
    TRYBY: TRYBY, NASYCENIE: NASYCENIE, MOTYWY: MOTYWY, TYPY: TYPY,
    pozycja: pozycja, kolor: kolor, komorka: komorka, wartosc: wartosc,
    pasujeTyp: pasujeTyp, ranking: ranking, nazwa: nazwa, opis: opis,
    filtrPunkt: filtrPunkt, fmtIloraz: fmtIloraz, fmtRoznica: fmtRoznica,
    fmtOpozn: fmtOpozn, fmtProc: fmtProc, fmtGodz: fmtGodz, fmtWartosc: fmtWartosc
  };
}));
