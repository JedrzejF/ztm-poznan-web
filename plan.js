/* plan.js - plan dnia pomiarow terenowych: tabela z filtrem po osobie.
 * Sama (bez drugiej osoby) W. jezdzi tylko autobusami; tramwajem wolno 9/11
 * na odcinku Piatkowska - Most Teatralny (ruch do ogarniecia w pojedynke).
 * Uzywany przez notatnik (pomiar.html, przycisk "Plan dnia") i przez
 * plan-dnia.html. Godziny z rozkladu ZTM (wersja 24.09, z objazdami). */
(function () {
  "use strict";
  var DANE = {
    tytul: "Plan pomiarów — środa 30.09",
    osoby: ["W.", "G."],
    // od, do, kto, gdzie, tryb, uwagi
    wiersze: [
      ["13:15", "13:45", "W.+G.", "Fredry 117 → Gwarna (bez świateł)", "przystanek", "W.: zegar + przód · G.: tylko liczenie, środek i tył"],
      ["13:45", "14:05", "W.+G.", "Fredry 118 → Most Teatralny (światło 25 m)", "przystanek", "jak wyżej; czeka po wymianie → światło"],
      ["14:06", "14:15", "W.+G.", "Tramwaj 8: Fredry 118 → Żeromskiego 61", "jazda", "oboje zegar; zapas 14:16"],
      ["14:15", "14:35", "W.+G.", "Żeromskiego 61 → Ogrody (bez świateł)", "przystanek", "razem; dwa pojazdy naraz: W. przedni, G. tylny"],
      ["14:40", "15:05", "W.+G.", "Żeromskiego 60 (światło 3 m)", "przystanek", "jak wyżej; potem wróćcie na 61"],
      ["15:13", "15:19", "W.+G.", "Autobus 193: Żeromskiego 61 → Swoboda", "jazda", "oboje zegar; W. wysiada na Swobodzie, G. jedzie dalej"],
      ["15:19", "15:33", "W.", "Swoboda 628 → Bułgarska/Polska", "przystanek", "~20 autobusów/h"],
      ["15:19", "15:40", "G.", "Autobus 193 dalej: Swoboda → Os. Kopernika 1061", "jazda", "10 przystanków"],
      ["15:33", "15:59", "W.", "Autobus 177: Swoboda 628 → Junikowo", "jazda", "18 przystanków; zapas 16:03"],
      ["15:40", "16:25", "G.", "Os. Kopernika 1061 / 1062", "przystanek", "~21 pojazdów/h na stronę"],
      ["16:11", "16:33", "W.", "Autobus 177: Junikowo → Swoboda 629", "jazda", "18 przystanków; zapas 16:41 → 17:03"],
      ["16:27", "17:12", "G.", "Autobus 164: Os. Kopernika 1061 → Literacka", "jazda", "przez Jeżyce i Golęcin"],
      ["16:33", "17:13", "W.", "Swoboda 629 → Szpitalna", "przystanek", "~20 autobusów/h"],
      ["17:12", "17:27", "G.", "Literacka", "przystanek", "164, 170, 226, 835, 837"],
      ["17:13", "17:55", "W.", "Autobus 191: Swoboda 629 → Os. Sobieskiego", "jazda", "26 przystanków; wcześniejszy kurs 16:58"],
      ["17:27", "17:44", "G.", "Autobus 835: Literacka → Stary Strzeszyn 17:30 → Strzeszynek 17:33 → Kiekrz 17:44", "jazda", "wysiadasz, gdzie ci pasuje; 835/837 to linie, na których GPS najbardziej myli przystanki — każdy postój z zegarem się liczy"]
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
