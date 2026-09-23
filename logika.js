/*
 * logika.js - czyste funkcje strony (bez DOM), testowane w Node
 * (tests/test_web_strona.py). Strona NIE liczy miar: iloraz i mediany
 * przychodza gotowe z web/korki.py (D-036). Tu tylko wybor, kolor, tekst.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Logika = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Skala symetryczna: iloraz w logarytmie (x1,5 i /1,5 to ta sama odleglosc
  // od normy), roznica w sekundach liniowo. Nasycenie na krancach skali.
  var NASYCENIE = { iloraz: Math.log2(1.5), roznica: 60 };

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

  /* Pozycja na skali w [-1, 1]; ujemna = szybciej niz zwykle. */
  function pozycja(wartosc, tryb) {
    var x = tryb === "iloraz" ? Math.log2(wartosc) / NASYCENIE.iloraz
                              : wartosc / NASYCENIE.roznica;
    return Math.max(-1, Math.min(1, x));
  }

  function kolor(wartosc, tryb, motyw) {
    var P = MOTYWY[motyw || "jasny"];
    if (wartosc === null || wartosc === undefined || isNaN(wartosc)) return P.brak;
    var t = pozycja(wartosc, tryb);
    return t < 0 ? mieszaj(P.srodek, P.szybciej, -t) : mieszaj(P.srodek, P.wolniej, t);
  }

  /* Wartosc odcinka w godzinie: iloraz godzina/doba albo roznica [s].
     null, gdy godzina ma za malo przejazdow (komorka pominieta w danych). */
  function wartosc(odc, godz, tryb) {
    var c = odc.h[String(godz)];
    if (!c) return null;
    return tryb === "iloraz" ? c[2] : c[1] - odc.d[1];
  }

  function pasujeTyp(odc, typ) {
    return typ === "wszystkie" || String(odc.t) === String(typ);
  }

  /* Odcinki najbardziej wydluzone w godzinie, malejaco. */
  function ranking(odcinki, godz, typ, tryb, ile) {
    return odcinki
      .filter(function (o) { return pasujeTyp(o, typ) && wartosc(o, godz, tryb) !== null; })
      .sort(function (a, b) { return wartosc(b, godz, tryb) - wartosc(a, godz, tryb); })
      .slice(0, ile || 15);
  }

  function liczba(x, miejsc) {
    return x.toFixed(miejsc).replace(".", ",");
  }
  function fmtIloraz(x) {
    return x >= 1 ? "×" + liczba(x, 2) : "÷" + liczba(1 / x, 2);
  }
  function fmtRoznica(s) {
    return (s > 0 ? "+" : s < 0 ? "−" : "±") + Math.abs(Math.round(s)) + " s";
  }
  function fmtGodz(h) {
    return String(h).padStart(2, "0") + ":00–" + String(h).padStart(2, "0") + ":59";
  }
  var TYPY = { "0": "tramwaj", "3": "autobus" };

  function nazwa(odc, przystanki) {
    return (przystanki[odc.a] || odc.a) + " → " + (przystanki[odc.b] || odc.b);
  }

  function opis(odc, godz, przystanki) {
    var c = odc.h[String(godz)];
    var glowa = nazwa(odc, przystanki) + " (" + (TYPY[odc.t] || "typ " + odc.t) + ")";
    if (!c) return glowa + "\n" + fmtGodz(godz) + ": za mało przejazdów";
    return glowa + "\n" + fmtGodz(godz) + ": " + Math.round(c[1]) + " s (cała doba "
      + Math.round(odc.d[1]) + " s, " + fmtIloraz(c[2]) + ", "
      + fmtRoznica(c[1] - odc.d[1]) + ")\nprzejazdów: " + c[0];
  }

  return {
    NASYCENIE: NASYCENIE, MOTYWY: MOTYWY, TYPY: TYPY, pozycja: pozycja, kolor: kolor,
    wartosc: wartosc, pasujeTyp: pasujeTyp, ranking: ranking, nazwa: nazwa, opis: opis,
    fmtIloraz: fmtIloraz, fmtRoznica: fmtRoznica, fmtGodz: fmtGodz
  };
}));
