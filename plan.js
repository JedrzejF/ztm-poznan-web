/* plan.js - plan dnia pomiarow terenowych: tabela z filtrem po osobie.
 * Uzywany przez notatnik (pomiar.html, przycisk "Plan dnia") i przez
 * plan-dnia.html. Godziny z rozkladu ZTM na sroda 07.10 (wersja z 06.10). */
(function () {
  "use strict";
  var DANE = {
    tytul: "Plan pomiarów — środa 07.10",
    osoby: ["W."],
    // od, do, kto, gdzie, tryb, uwagi
    wiersze: [
      ["13:41", "14:12", "W.", "Autobus 151: Os. Sobieskiego 381 → Naramowice 4008", "jazda", "wysiądź, gdy autobus mija Naramowice po raz drugi"],
      ["14:14", "14:19", "W.", "Tramwaj 3 lub 10: Naramowice 4008 → Błażeja 4002", "jazda", "ok. 14:15, pierwszy, który podjedzie; zapamiętaj numer pojazdu"],
      ["14:20", "14:24", "W.", "Tramwaj 3 lub 10: Błażeja 4001 → Naramowice 4007", "jazda", "od razu z powrotem, innym pojazdem niż poprzednio (np. 14:20 linia 10)"],
      ["14:57", "15:21", "W.", "Autobus 146: Naramowice 4008 → Szarych Szeregów 342", "jazda", "kierunek Instytut Technologiczno-Przyrodniczy"],
      ["15:26", "15:48", "W.", "Autobus 178: Szarych Szeregów 342 → Połabska 493", "jazda", "kierunek Rondo Śródka"],
      ["15:55", "16:06", "W.", "Autobus 174: Połabska 494 → Os. Batorego 391", "jazda", "ok. 15:55; kursuje co 15 min, rozkładowo 15:47 i 16:02"],
      ["16:08", "16:14", "W.", "Autobus 348: Os. Batorego 392 → UAM Wydział Geografii 418", "jazda", "ten sam autobus staje też na Batorego 394 o 16:10"],
      ["16:18", "16:30", "W.", "Autobus 198: UAM Wydział Geografii 417 → Os. Sobieskiego", "jazda", "przystanek 417 jest po drugiej stronie, ok. 130 m dalej; koniec"],
      ["15:40", "16:06", "W.", "ZAPAS (gdy nie zdążysz na 146): Autobus 183: Szarych Szeregów 342 → Połabska 493", "jazda", "kierunek Rondo Śródka"],
      ["16:17", "16:31", "W.", "ZAPAS: Autobus 174: Połabska 494 → Os. Sobieskiego", "jazda", "ok. 16:15; koniec"]
    ],
    zasady: [
      "Zegar ważniejszy niż liczenie: „Stanął” i „Ruszył” w chwili zdarzenia.",
      "Duża wymiana: +5 i „≈ nie dałem rady”. Tłum: licz tylko swoje drzwi.",
      "„Drzwi zamknięte” = ostatnie domknięcie; otwarte znów → ↻ drzwi otwarte ponownie.",
      "Po wymianie stoi przy peronie → „czeka po wymianie” (+ powód). Ruszył i stanął kilka metrów dalej → Stanął / Ruszył ponownie.",
      "Kolejka przed peronem: tylko pełne zatrzymanie do ~50 m przed peronem, bez skrzyżowania po drodze.",
      "Na koniec: Eksport CSV w każdym trybie, w którym coś zapisałeś."
    ]
  };

  var KLUCZ = "ztm-plan-kto";
  var STYL = "<style>" +
    ".plan-tab{width:100%;border-collapse:collapse;font:13px/1.3 system-ui,sans-serif}" +
    ".plan-tab th,.plan-tab td{border:1px solid var(--linia);padding:4px 6px;text-align:left;vertical-align:top}" +
    ".plan-tab th{background:var(--tlo-2);font-weight:600;position:sticky;top:0}" +
    ".plan-tab td.g{white-space:nowrap;font-variant-numeric:tabular-nums}" +
    ".plan-tab td.k{white-space:nowrap;font-weight:600}" +
    ".plan-tab tr.razem td.k{color:var(--tekst-2)}" +
    ".plan-tab .u{color:var(--tekst-2);font-size:12px;margin-top:2px}" +
    ".plan-ramka{overflow-x:auto;margin:6px 0}" +
    ".plan-filtr{display:flex;gap:4px;margin:6px 0}" +
    ".plan-filtr button{min-height:34px;padding:0 12px;font:600 13px system-ui,sans-serif;border-radius:6px;" +
    "border:1px solid var(--linia);background:var(--tlo);color:var(--tekst)}" +
    ".plan-filtr button.zrobione{background:var(--tekst);color:var(--tlo)}" +
    ".plan-zasady{font-size:13px;margin-top:8px}.plan-zasady li{margin:2px 0}" +
    "</style>";

  function esc(v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function czytaj() {
    try {
      var k = localStorage.getItem(KLUCZ);
      if (k) return k === "*" ? "" : k;          // "*" = wybrano "wszyscy"
      // domyslnie: inicjaly wpisane w notatniku, jesli pasuja do osoby z planu
      var s = JSON.parse(localStorage.getItem("ztm-pomiar-v1") || "null");
      var ini = s && s.obserwator ? String(s.obserwator).toUpperCase().charAt(0) + "." : "";
      return DANE.osoby.indexOf(ini) >= 0 ? ini : "";
    } catch (e) { return ""; }
  }

  function rysuj(el) {
    var kto = czytaj();
    var w = DANE.wiersze.filter(function (r) { return !kto || r[2].split("+").indexOf(kto) >= 0; });
    el.innerHTML = STYL + "<h2 style='font-size:17px;margin:8px 0 2px'>" + esc(DANE.tytul) + "</h2>" +
      "<div class='plan-filtr'>" + [""].concat(DANE.osoby).map(function (o) {
        return "<button type='button' data-kto='" + o + "' class='" + (o === kto ? "zrobione" : "") + "'>" + (o || "wszyscy") + "</button>";
      }).join("") + "</div>" +
      "<div class='plan-ramka'><table class='plan-tab'><thead><tr><th>Godz.</th><th>Kto</th><th>Gdzie</th><th>Tryb</th></tr></thead><tbody>" +
      w.map(function (r) {
        return "<tr class='" + (r[2].indexOf("+") >= 0 ? "razem" : "") + "'><td class='g'>" + esc(r[0]) + (r[1] ? "–" + esc(r[1]) : "") +
          "</td><td class='k'>" + esc(r[2]) + "</td><td>" + esc(r[3]) + (r[5] ? "<div class='u'>" + esc(r[5]) + "</div>" : "") +
          "</td><td>" + esc(r[4]) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      "<details class='plan-zasady'><summary>Zasady klikania</summary><ul>" +
      DANE.zasady.map(function (z) { return "<li>" + esc(z) + "</li>"; }).join("") + "</ul></details>";
    el.querySelectorAll("[data-kto]").forEach(function (b) {
      b.addEventListener("click", function () {
        try { localStorage.setItem(KLUCZ, b.dataset.kto || "*"); } catch (e) { /* bez zapisu - filtr do przeladowania */ }
        rysuj(el);
      });
    });
  }

  window.PlanDnia = { DANE: DANE, rysuj: rysuj };
})();
