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

  /* Role (28.09, dwie osoby przy jednym pojezdzie): kazda widzi tylko swoje
     przyciski - zamiast chowac sekcje pod malymi rozwijanymi naglowkami.
     Rola i inicjaly trafiaja do CSV: przy analizie wiadomo, ktore zapisy
     z dwoch telefonow opisuja ten sam pojazd, a podwojny zegar daje blad
     obserwatora (roznica klikniec dwoch osob). */
  var ROLE = [["zegar_liczenie", "zegar + liczenie"], ["zegar", "tylko zegar"], ["liczenie", "tylko liczenie"]];

  function widoczne(rola) {
    return { zegar: rola !== "liczenie", liczenie: rola !== "zegar" };
  }

  function _osoba(opcje) {
    opcje = opcje || {};
    return { rola: opcje.rola || "zegar_liczenie", obserwator: opcje.obserwator || "" };
  }

  var licznik = 0;
  function nowa(przystanek, teraz, opcje) {
    licznik += 1;
    return Object.assign({ id: teraz + "-" + licznik, przystanek: przystanek || "", linia: "", pojazd: "",
             czasy: {}, flagi: {}, uwagi: "", zamknieta: false, utworzona: teraz,
             wsiadlo: 0, wysiadlo: 0, drzwi_obs: "wszystkie", tlok: "", szac: false }, _osoba(opcje));
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
    // 30.09: przypadkowe "Stanal ponownie" przed "Ruszyl" zapisywalo sie bez ostrzezenia
    if (kod === "stop2" && obs.czasy.rusz === undefined)
      throw new Error("najpierw „Ruszył”");
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

  /* Skasowanie wybranego momentu (30.09: przypadkowe "Stanal ponownie" nie
     dalo sie odznaczyc - "Cofnij" na dole karty nie bylo widac). Moment, od
     ktorego zalezy pozniejszy, kasuje sie dopiero po nim. */
  function usunZdarzenie(obs, kod) {
    var c = obs.czasy || {};
    if (c[kod] === undefined) return obs;
    if (kod === "stop2" && c.rusz2 !== undefined) throw new Error("najpierw usu\u0144 „Ruszył ponownie”");
    if (kod === "rusz" && c.stop2 !== undefined) throw new Error("najpierw usu\u0144 „Stanął ponownie”");
    var cz = Object.assign({}, c); delete cz[kod];
    var kor = Object.assign({}, obs.korekty || {}); delete kor[kod];
    var zn = Object.assign({}, obs.znaczniki || {}), m = zn.czeka;
    // czekanie wznowione przez kasowane "Stanal ponownie" - zostaje pierwszy odcinek
    if (kod === "stop2" && m && m.suma !== undefined && m.od === c.stop2) zn.czeka = Object.assign({}, m, { do: m.od });
    return Object.assign({}, obs, { czasy: cz, korekty: kor, znaczniki: zn });
  }

  /* Karta, w ktorej nic jeszcze nie zapisano - idzie za zmiana przystanku
     (30.09: po zmianie duzym przyciskiem trzeba bylo zmieniac drugi raz w karcie). */
  function nietknieta(obs) {
    return !obs.linia && !obs.pojazd && !Object.keys(obs.czasy || {}).length && !obs.wsiadlo && !obs.wysiadlo &&
      !obs.uwagi && !obs.tlok && !Object.keys(obs.znaczniki || {}).length &&
      !Object.keys(obs.flagi || {}).some(function (k) { return obs.flagi[k]; });
  }

  /* Cofniecie ostatnio zapisanego (najpozniejszego) zdarzenia. "Drzwi
     otwarte ponownie" klikniete po nim tez jest zdarzeniem - bez tego cofniecie
     po pomylce kasowalo "Drzwi otwarte" (zamkniecie juz skasowane). */
  function cofnij(obs) {
    var ost = null;
    Object.keys(obs.czasy).forEach(function (k) {
      if (ost === null || obs.czasy[k] >= obs.czasy[ost]) ost = k;
    });
    var pon = (obs.ponowne || [])[(obs.ponowne || []).length - 1];
    if (pon && pon.t !== undefined && (ost === null || pon.t >= obs.czasy[ost])) return cofnijPonowne(obs);
    return ost === null ? obs : usunZdarzenie(obs, ost);
  }

  /* Czy obserwacja nadaje sie do porownania z GPS: wymagane linia, numer
     taborowy, zatrzymanie i ruszenie (albo flaga "przejazd"). Zwraca liste
     brakow - pusta = kompletna. */
  function braki(obs) {
    var b = [];
    if (!obs.linia) b.push("linia");
    if (!/^\d{3,4}$/.test(obs.pojazd)) b.push("numer taborowy (3–4 cyfry)");
    // tylko liczenie: czasy klika druga osoba - ich brak to nie brak
    if (!obs.flagi.przejazd && widoczne(obs.rola).zegar) {
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
  // Ktora czesc pojazdu liczy ta osoba (28.09): dwie osoby, przod i tyl
  // tramwaju - bez tego dwa pliki "czlon" tego samego pojazdu wygladaja tak
  // samo i nie wiadomo, czy je sumowac. Liczone od kabiny prowadzacego.
  var CZESC = [["", "\u2014"], ["przod", "prz\u00f3d"], ["srodek", "\u015brodek"], ["tyl", "ty\u0142"]];

  function nowyPrzejazd(teraz, opcje) {
    licznik += 1;
    return Object.assign({ id: "J" + teraz + "-" + licznik, linia: "", pojazd: "", kierunek: "", cel: "", trasa: [],
             zakres: "caly", czesc: "", uwagi: "", postoje: [], utworzona: teraz,
             biezacy: _pusty("") }, _osoba(opcje));
  }

  function _pusty(przystanek) {
    return { przystanek: przystanek || "", wsiadlo: 0, wysiadlo: 0, tlok: "", obciazenie: "",
             obciazenie_zakres: "", znaczniki: {}, uwaga: "", czasy: {}, szac: false };
  }

  /* Znaczniki postoju - te same w obu trybach (29.09, ujednolicenie). Kazdy
     mierzy czas: 1. dotkniecie = poczatek, 2. = koniec, 3. = skasowanie.
     Bez konca - trwa do "Ruszyl" (albo do "Dalej").
     czeka  - wymiana skonczona, pojazd stoi dalej (swiatlo, zablokowany przez
              samochod na pasie, na czas). Liczy sie OD RAZU po dotknieciu -
              powod mozna dobrac pozniej albo wcale; gdy zapisano juz "Drzwi
              zamkniete", start od nich (liczacy orientuje sie po kilku s).
              Zastepuje "swiatlo za przystankiem" i "czeka na czas" (27-28.09),
              ktore mieszaly czekanie przy peronie z drugim zatrzymaniem kilka
              metrow dalej - to drugie to "Stanal/Ruszyl ponownie".
     przed  - kolejka do TEGO peronu: pojazd stanal calkiem, najwyzej ~50 m
              przed peronem (dlugosc tramwaju + zapas), bez skrzyzowania po
              drodze. Dalsze zatrzymania to czas jazdy - GPS mierzy je sam.
              Prog z estymatora: GPS szuka postoju do 40 m od slupka.
     odblok - drzwi tylko odblokowane (01.10, D-046, autor): na postoju bez
              pasazerow kierowca czesto tylko odblokowuje drzwi i nikt ich nie
              otwiera. Stoper zamiast "Drzwi otwarte/zamkniete" - czas
              odblokowania to wtedy odpowiednik czasu drzwi. */
  var ZNACZNIKI = [["czeka", "czeka po wymianie"], ["przed", "kolejka przed peronem"],
                   ["odblok", "drzwi tylko odblokowane"]];
  var POWODY = [["swiatlo", "\u015bwiat\u0142o"], ["blokada", "zablokowany"], ["czas", "na czas"], ["inne", "inne"]];
  // kolumny z_*_s w CSV przejazdow do 28.09 - zostaja (puste), zeby stare
  // pliki i nowe mialy ten sam uklad poczatku
  var ZNACZNIKI_DAWNE = ["czas", "przed", "za"];

  function znacznik(o, kod, t) {
    if (!ZNACZNIKI.some(function (z) { return z[0] === kod; })) throw new Error("nieznany znacznik: " + kod);
    var z = Object.assign({}, o.znaczniki || {}), x = z[kod], c = o.czasy || {};
    // drugie zatrzymanie trwa (30.09): czekanie liczy sie od "Stanal ponownie"
    var drugie = kod === "czeka" && c.stop2 !== undefined && c.rusz2 === undefined;
    if (!x) {
      var od = drugie ? Math.min(c.stop2, t)
        : kod === "czeka" && c.zamk !== undefined && c.zamk <= t ? c.zamk : t;
      z[kod] = !drugie && kod === "czeka" && c.rusz !== undefined ? { od: od, do: Math.max(c.rusz, od) } : { od: od };
    } else if (x.do === undefined) z[kod] = Object.assign({}, x, { do: Math.max(t, x.od) });
    else if (drugie && x.do <= c.stop2) z[kod] = _wznow(x, c.stop2);
    else delete z[kod];
    return Object.assign({}, o, { znaczniki: z });
  }

  // kolejny odcinek tego samego znacznika: zamkniety czas idzie do `suma`
  function _wznow(x, t) {
    var y = Object.assign({}, x, { suma: (x.suma || 0) + (x.do - x.od), od: t,
                                   od0: x.od0 !== undefined ? x.od0 : x.od });
    delete y.do;
    return y;
  }

  /* Korekta poczatku znacznika o delta ms (30.09, autor: kolejke zaznacza
     sie zwykle pozniej, niz sie zaczela). Przy wznowionym czekaniu
     przesuwa sie poczatek pierwszego odcinka (od0, suma). Korekta trafia
     do "korekty" jako <kod>_od. */
  function przesunZnacznik(o, kod, delta) {
    var x = (o.znaczniki || {})[kod];
    if (!x) throw new Error("znacznik nie jest zapisany");
    var y = Object.assign({}, x);
    if (x.suma !== undefined) {
      if (x.suma - delta < 0) throw new Error("pocz\u0105tek p\u00f3\u017aniej ni\u017c koniec");
      y.od0 = x.od0 + delta; y.suma = x.suma - delta;
    } else {
      var koniec = x.do !== undefined ? x.do : Infinity;
      if (x.od + delta > koniec) throw new Error("pocz\u0105tek p\u00f3\u017aniej ni\u017c koniec");
      y.od = x.od + delta;
    }
    var kor = Object.assign({}, o.korekty || {}), k = kod + "_od";
    kor[k] = (kor[k] || 0) + delta;
    if (!kor[k]) delete kor[k];
    var z = Object.assign({}, o.znaczniki); z[kod] = y;
    return Object.assign({}, o, { znaczniki: z, korekty: kor });
  }

  function usunZnacznik(o, kod) {
    var z = Object.assign({}, o.znaczniki || {}); delete z[kod];
    var kor = Object.assign({}, o.korekty || {}); delete kor[kod + "_od"];
    return Object.assign({}, o, { znaczniki: z, korekty: kor });
  }

  /* Godziny znacznika do CSV (30.09): poczatek pierwszego odcinka i koniec;
     niezamkniety - do `koniec`. Sama dlugosc nie pozwalala porownac kolejki
     z GPS ani jej poprawic. */
  function godzinyZnacznika(x, koniec) {
    if (!x) return ["", ""];
    var d = x.do !== undefined ? x.do : koniec;
    return [x.od0 !== undefined ? x.od0 : x.od, d === undefined ? "" : d];
  }

  /* Powod czekania: dotkniecie ustawia, drugie tego samego kasuje. Bez
     znacznika - najpierw go uruchamia (czas liczy sie od razu). */
  function powodCzekania(o, powod, t) {
    if (!POWODY.some(function (p) { return p[0] === powod; })) throw new Error("nieznany pow\u00f3d: " + powod);
    var x = (o.znaczniki || {}).czeka ? o : znacznik(o, "czeka", t);
    var m = Object.assign({}, x.znaczniki.czeka);
    if (m.powod === powod) delete m.powod; else m.powod = powod;
    return Object.assign({}, x, { znaczniki: Object.assign({}, x.znaczniki, { czeka: m }) });
  }

  /* "Ruszyl" konczy trwajace znaczniki. */
  function zamknijZnaczniki(o, t) {
    var z = {};
    Object.keys(o.znaczniki || {}).forEach(function (k) {
      var m = o.znaczniki[k];
      z[k] = m.do === undefined ? Object.assign({}, m, { do: Math.max(t, m.od) }) : m;
    });
    return Object.assign({}, o, { znaczniki: z });
  }

  /* Zapis zdarzenia z zamknieciem znacznikow na "Ruszyl" - dla obu trybow.
     30.09 (Zeromskiego, Zamek): pojazd po wymianie czeka, podjezdza kilka
     metrow i czeka dalej - "czeka po wymianie" konczylo sie na "Ruszyl"
     i gubilo drugie czekanie. Teraz "Stanal ponownie" wznawia zapisane
     czekanie (ten sam powod), "Ruszyl ponownie" je konczy; czas = suma obu
     odcinkow (bez podjazdu miedzy nimi). */
  function zdarzenie(o, kod, t) {
    var x = zapisz(Object.assign({ czasy: {} }, o), kod, t);
    if (kod === "rusz" || kod === "rusz2") return zamknijZnaczniki(x, t);
    var cz = (x.znaczniki || {}).czeka;
    if (kod === "stop2" && cz && cz.do !== undefined)
      return Object.assign({}, x, { znaczniki: Object.assign({}, x.znaczniki, { czeka: _wznow(cz, t) }) });
    return x;
  }

  /* Drzwi otwarte ponownie (29.09, autor): pasazer otwiera je jeszcze raz,
     kierowca zwalnia dla dobiegajacego. "Drzwi zamkniete" ma byc OSTATNIM
     domknieciem - wiec ponowne otwarcie przed "Ruszyl" kasuje zapisane
     zamkniecie; kolejne dotkniecie "Drzwi zamkniete" zapisze wlasciwe.
     Czekanie biegnie dalej (30.09, Rondo Rataje: ponowne otwarcie w trakcie
     czerwonego kasowalo ~2 min czekania - pojazd nadal stoi przy peronie). Po "Ruszyl" (otwarcie po ruszeniu o kilka
     metrow) - tylko liczy; takie zatrzymanie to "Stanal/Ruszyl ponownie". */
  function ponowneOtwarcie(o, t) {
    var x = Object.assign({}, o, { ponowne_otw: (o.ponowne_otw || 0) + 1 });
    var c = o.czasy || {}, wpis = { t: t };
    if (c.zamk !== undefined && c.rusz === undefined) {
      wpis.zamk = c.zamk;
      if ((o.korekty || {}).zamk) wpis.kor = o.korekty.zamk;
      var cz = Object.assign({}, c); delete cz.zamk;
      var kor = Object.assign({}, o.korekty || {}); delete kor.zamk;
      x = Object.assign(x, { czasy: cz, korekty: kor });
    }
    // skasowane zamkniecie zostaje do cofniecia (cofnijPonowne)
    x.ponowne = (o.ponowne || []).concat([wpis]);
    return x;
  }

  /* Cofniecie ostatniego "drzwi otwarte ponownie" (02.10, 832/8313 i 16/601:
     klikniete zamiast "Ruszyl" kasowalo zamkniecie bez powrotu). Skoro drzwi
     nie otwarto ponownie, ostatnim domknieciem jest to sprzed klikniecia -
     wraca z korekta, w miejsce zamkniecia zapisanego po nim. Kolejnosc
     pilnowana jak przy zapisie. */
  function cofnijPonowne(o) {
    if (!o.ponowne_otw) return o;
    var lista = o.ponowne || [], w = lista[lista.length - 1] || {};
    var x = Object.assign({}, o, { ponowne_otw: o.ponowne_otw - 1, ponowne: lista.slice(0, -1) });
    if (w.zamk === undefined) return x;
    var cz = Object.assign({}, x.czasy); delete cz.zamk;
    x = zapisz(Object.assign(x, { czasy: cz }), "zamk", w.zamk);
    var kor = Object.assign({}, o.korekty || {}); delete kor.zamk;
    if (w.kor) kor.zamk = w.kor;
    return Object.assign(x, { korekty: kor });
  }

  function przelaczZnacznik(prz, kod, t) {
    return Object.assign({}, prz, { biezacy: znacznik(prz.biezacy, kod, t) });
  }
  function powodJazdy(prz, powod, t) {
    return Object.assign({}, prz, { biezacy: powodCzekania(prz.biezacy, powod, t) });
  }
  function ponowneJazdy(prz, t) {
    return Object.assign({}, prz, { biezacy: ponowneOtwarcie(prz.biezacy, t) });
  }
  function cofnijPonowneJazdy(prz) {
    return Object.assign({}, prz, { biezacy: cofnijPonowne(Object.assign({ czasy: {} }, prz.biezacy)) });
  }

  /* Czas trwania znacznika [s]; niezamkniety liczony do `koniec` (Dalej). */
  function trwanieZnacznika(x, koniec) {
    if (!x) return null;
    var k = x.do !== undefined ? x.do : koniec;
    return k === undefined ? null : Math.round(((x.suma || 0) + k - x.od) / 100) / 10;
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

  /* Etykiety przystankow trasy w trybie jazdy (30.09): sama nazwa - kierunek
     slupka ("Uniwersytet Ekonomiczny -> Zamek") bywa inny niz trasa tej
     linii i myli. Dopisek tylko, gdy nazwa jest na trasie wiecej niz raz:
     slupki po kolei (Rondo Rataje) - "(1. slupek)", "(2. slupek)";
     powrot w to samo miejsce (petla, Admiralska) - pierwszy przejazd sama
     nazwa, kolejne "(2. raz)". 07.10: dawny dopisek "-> nastepny przystanek"
     na liniach okreznych (151: tam i z powrotem tymi samymi ulicami) trafial
     do prawie kazdej pozycji. `nazwy` - nazwy kolejnych przystankow trasy. */
  function etykietyTrasy(nazwy) {
    var ile = {};
    nazwy.forEach(function (n) { ile[n] = (ile[n] || 0) + 1; });
    return nazwy.map(function (n, i) {
      if (ile[n] < 2) return n;
      var a = i, b = i;                                  // ciag tej samej nazwy wokol i
      while (a > 0 && nazwy[a - 1] === n) a--;
      while (b + 1 < nazwy.length && nazwy[b + 1] === n) b++;
      var raz = 1;                                       // ciagi tej nazwy przed tym
      for (var j = 0; j < a; j++) if (nazwy[j] === n && (j === 0 || nazwy[j - 1] !== n)) raz++;
      var d = [];
      if (raz > 1) d.push(raz + ". raz");
      if (b > a) d.push((i - a + 1) + ". s\u0142upek");
      return d.length ? n + " (" + d.join(", ") + ")" : n;
    });
  }

  /* Nastepny przystanek na trasie po `id`; "" gdy koniec trasy albo `id`
     poza trasa (objazd, wpis reczny) - wtedy wybiera sie recznie. */
  function nastepny(trasa, id) {
    var i = trasa.indexOf(id);
    return i >= 0 && i + 1 < trasa.length ? trasa[i + 1] : "";
  }

  /* "Dalej": postoj zapisany z czasem t, biezacy przesuwa sie na nastepny
     przystanek trasy. 30.09: dwa "Dalej" szybciej niz PODWOJNE_MS to
     podwojne dotkniecie (W., Wiedenska: drugi zapis 0,8 s po pierwszym,
     pusty, przystanek przeskoczony) - drugie odrzucone. */
  var PODWOJNE_MS = 1500;
  function dalej(prz, t) {
    if (!prz.biezacy.przystanek) throw new Error("wybierz przystanek");
    var ost = prz.postoje[prz.postoje.length - 1];
    if (ost && ost.t > t) throw new Error("czas wcze\u015bniejszy ni\u017c poprzedni zapis");
    if (ost && t - ost.t < PODWOJNE_MS) throw new Error("podw\u00f3jne \u201eDalej\u201d \u2014 pomini\u0119te");
    var p = _zamrozZakres(Object.assign({}, prz.biezacy, { t: t }), prz.zakres);
    return Object.assign({}, prz, { postoje: prz.postoje.concat([p]),
                                    biezacy: _pusty(nastepny(prz.trasa, p.przystanek)) });
  }

  /* Zakres wpisanej liczby osob zapisuje sie razem z nia (30.09): policzony
     caly pojazd przy wejsciu, potem zmiana "Liczone" na czlon - domyslny
     zakres liczby szedl za zmiana i 76 osob stawalo sie liczba dla czlonu. */
  function _zamrozZakres(p, zakres) {
    var jest = p.obciazenie !== undefined && p.obciazenie !== "" && p.obciazenie !== null;
    return jest && !p.obciazenie_zakres ? Object.assign({}, p, { obciazenie_zakres: zakresObciazenia(p, zakres) }) : p;
  }

  function ustawZakres(prz, zakres) {
    return Object.assign({}, prz, { zakres: zakres, biezacy: _zamrozZakres(prz.biezacy, prz.zakres),
      postoje: prz.postoje.map(function (p) { return _zamrozZakres(p, prz.zakres); }) });
  }

  /* Zegar postoju w jezdzie (28.09, opcjonalny): Stanal / Drzwi otwarte /
     Drzwi zamkniete / Ruszyl dla biezacego przystanku, kolejnosc jak na
     przystanku. "Stanal", gdy biezacy juz ruszyl = to jest nastepny przystanek:
     najpierw "Dalej" (zapis z ta chwila), potem zdarzenie - dane trafiaja do
     wlasciwego przystanku, nawet gdy liczacy nie zdazyl nacisnac "Dalej".
     "Ruszyl" konczy trwajace znaczniki. 29.09: takze "Stanal/Ruszyl
     ponownie" - drugie zatrzymanie kilka metrow za peronem (swiatlo), jak na
     przystanku; "Stanal" (nie "ponownie") po ruszeniu to nadal nastepny przystanek. */
  var ZDARZENIA_JAZDY = ["stop", "otw", "zamk", "rusz", "stop2", "rusz2"];

  function zdarzenieJazdy(prz, kod, t) {
    if (ZDARZENIA_JAZDY.indexOf(kod) < 0) throw new Error("nieznane zdarzenie: " + kod);
    var x = prz;
    if (kod === "stop" && (x.biezacy.czasy || {}).rusz !== undefined) x = dalej(x, t);
    return Object.assign({}, x, { biezacy: zdarzenie(x.biezacy, kod, t) });
  }

  /* Inne zapisane momenty biezacego przystanku - przelaczenie w ramce korekty
     (02.10, 832/8313 lp18: po "Ruszyl" dotkniecie "Stanal" to nastepny
     przystanek, wiec "Stanal" nie dalo sie poprawic). */
  function inneMomentyJazdy(czasy, kod) {
    return ZDARZENIA_JAZDY.filter(function (k) { return k !== kod && (czasy || {})[k] !== undefined; });
  }

  function cofnijZdarzenieJazdy(prz) {
    return Object.assign({}, prz, { biezacy: cofnij(Object.assign({ czasy: {} }, prz.biezacy)) });
  }

  /* Korekta +/- s zdarzenia biezacego przystanku - jak na przystanku (28.09:
     "ruszyl 2 s wczesniej niz kliknalem" w notatkach). */
  function przesunJazdy(prz, kod, delta) {
    return Object.assign({}, prz, { biezacy: przesun(Object.assign({ czasy: {} }, prz.biezacy), kod, delta) });
  }

  /* Poprzedni przystanek trasy (30.09): powrot o jeden, gdy notatnik
     przeskoczyl za daleko (przypadkowe "Dalej" / "Nie stanal") - zamiast
     szukania na liscie, co dawalo powtorzone przystanki u trzech osob. */
  function poprzedni(trasa, id) {
    var i = trasa.indexOf(id);
    return i > 0 ? trasa[i - 1] : "";
  }

  /* Zmiana linii w trwajacym przejezdzie (30.09, G.: tramwaj 8 i autobus 193
     w jednym zapisie) - zapisany przejazd konczy sie ze STARA linia, nowy
     zaczyna sie od biezacego przystanku (przesiadka). */
  function nowyPoZmianieLinii(prz, linia, teraz) {
    var nowy = Object.assign(nowyPrzejazd(teraz, { rola: prz.rola, obserwator: prz.obserwator }),
      { linia: linia, zakres: prz.zakres, czesc: prz.czesc || "", biezacy: Object.assign({}, prz.biezacy) });
    var zak = Object.assign({}, prz, { biezacy: _pusty("") });
    return [zak, nowy];
  }

  /* Przystanek bez zatrzymania (na zadanie) - przesuniecie bez zapisu. */
  function pomin(prz) {
    return ustawPrzystanek(prz, nastepny(prz.trasa, prz.biezacy.przystanek));
  }

  /* "Nie stanal" z zapisem (29.09): sam fakt przejazdu bez zatrzymania to
     dana - na przystankach na zadanie GPS nie widzi, czy pojazd stanal
     (Admiralska 835/837: polowa postojow "przejazd", czasy z sekwencji
     i z kotwicy roznia sie o 50-80 s). minal = true: t to chwila minięcia
     slupka (znaku przystanku) - prawda do porownania z oboma czasami GPS.
     Bez tego (latwo przeoczyc moment) - tylko fakt, t = chwila zapisu.
     Podwojne dotkniecie jak przy "Dalej" (02.10, 832/8313: drugie 1,1 s po
     pierwszym zapisalo przejazd przez nastepny przystanek). */
  function nieStanal(prz, t, minal) {
    if (!prz.biezacy.przystanek) throw new Error("wybierz przystanek");
    var c = prz.biezacy.czasy || {};
    if (c.stop !== undefined) throw new Error("zapisano „Stanął” — to nie przejazd (cofnij ↶)");
    var ost = prz.postoje[prz.postoje.length - 1];
    if (ost && ost.t > t) throw new Error("czas wcześniejszy niż poprzedni zapis");
    if (ost && t - ost.t < PODWOJNE_MS) throw new Error("podwójne „Nie stanął” — pominięte");
    var p = Object.assign({}, prz.biezacy, { t: t, nie_stanal: true });
    if (minal) p.t_minal = t;
    return Object.assign({}, prz, { postoje: prz.postoje.concat([p]),
                                    biezacy: _pusty(nastepny(prz.trasa, p.przystanek)) });
  }

  /* Przystanek na zadanie dla tej linii (30.09): `p` - wpis z przystanki.json,
     `z` = linie, dla ktorych slupek jest NZ (z rozkladu; zalezy od linii -
     Rynek Jezycki NZ tylko dla nocnej 219). Notatnik pokazuje "Nie stanal"
     tylko na NZ - na zwyklym pominiecie opisuje sie w notatce. */
  function naZadanie(p, linia) {
    var l = String(linia || "").trim().toUpperCase();
    return !!(p && l && (p.z || []).indexOf(l) >= 0);
  }

  /* Cofniecie ostatniego "Dalej": postoj wraca do edycji z licznikami.
     Cofniety "Nie stanal" przestaje nim byc (02.10, 832/8313 Zlotkowo:
     cofniety i normalnie policzony postoj zostawal w CSV przejazdem). */
  function cofnijDalej(prz) {
    if (!prz.postoje.length) return prz;
    var p = Object.assign({}, prz.postoje[prz.postoje.length - 1]); delete p.t; delete p.nie_stanal; delete p.t_minal;
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
    return ja ? slupkiNazwy(lista, ja.n) : [];
  }

  // slupki tej nazwy: wg kierunku, koniec trasy (tylko wysiadanie) na koncu
  function slupkiNazwy(lista, nazwa) {
    return lista.filter(function (p) { return p.n === nazwa; })
      .sort(function (a, b) {
        return (!a.k - !b.k) || (a.k || "").localeCompare(b.k || "", "pl") || a.s.localeCompare(b.s);
      });
  }

  /* Przystanek w dwoch krokach (30.09, dla osob z zewnatrz: za duzo strzalek
     i numerow): 1. nazwa z wyszukiwarki - kazda raz, 2. kierunek przyciskiem.
     Wyniki wyszukiwania -> nazwy w tej samej kolejnosci; zapytanie z samych
     cyfr (numer slupka) zostaje przy slupkach. */
  function nazwyZWynikow(wyn) {
    var byly = {}, out = [];
    wyn.forEach(function (p) {
      if (byly[p.n]) { byly[p.n].slupki.push(p.s); byly[p.n].l = byly[p.n].l.concat(p.l); return; }
      byly[p.n] = { n: p.n, slupki: [p.s], t: p.t, l: p.l.slice() };
      out.push(byly[p.n]);
    });
    out.forEach(function (g) {
      g.l = g.l.filter(function (x, i) { return g.l.indexOf(x) === i; })
        .sort(function (a, b) { return a.length - b.length || a.localeCompare(b); });
    });
    return out;
  }

  /* Etykieta slupka bez strzalek i numerow (30.09): kierunek = nastepny
     przystanek o innej nazwie (d - kilka, gdy kursy sie rozchodza), linie
     glowne osobno tramwaje / autobusy (bez zjazdow do zajezdni i nocnych;
     pole g z publikacji). Na wezlach (Rondo Rataje: 8 slupkow) linie
     rozrozniaja slupki o tym samym kierunku. */
  var MAX_LINII = 8;
  function _skrot(l) { return l.slice(0, MAX_LINII).join(", ") + (l.length > MAX_LINII ? "\u2026" : ""); }
  function etykietaKierunku(p) {
    // "w strone: ..." albo koniec trasy (tylko wysiadanie) - gotowy tekst
    var kier = p.k ? "w stron\u0119: " + (p.d || [p.k]).join(" / ") : "koniec trasy \u2014 tylko wysiadanie";
    var g = p.g || (p.t === "0" ? { "0": p.l } : { "3": p.l });
    var linie = [["0", "tramwaje"], ["3", "autobusy"]].filter(function (x) { return (g[x[0]] || []).length; })
      .map(function (x) { return x[1] + " " + _skrot(g[x[0]]); }).join(" \u00b7 ");
    return { kierunek: kier, linie: linie };
  }

  function csvPole(v) {
    var s = v === undefined || v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  var KOLUMNY = ["id", "przystanek", "linia", "pojazd"].concat(KODY.map(function (k) { return "t_" + k; }))
    .concat(FLAGI.map(function (f) { return "f_" + f.kod; }))
    .concat(["wsiadlo", "wysiadlo", "drzwi_obs", "tlok", "uwagi", "utworzona", "korekty",
             "szacunek", "rola", "obserwator",
             "z_czeka_s", "z_czeka_powod", "z_przed_s", "ponowne_otw",
             "z_przed_od", "z_przed_do", "z_czeka_od", "z_czeka_do",
             "z_odblok_s", "z_odblok_od", "z_odblok_do"]);

  // czas znacznika [s] do CSV; niezamkniety - do `koniec`
  function _zs(o, kod, koniec) {
    var d = trwanieZnacznika((o.znaczniki || {})[kod], koniec);
    return d === null ? "" : d;
  }
  function _powod(o) { return ((o.znaczniki || {}).czeka || {}).powod || ""; }

  /* CSV: czasy jako ms od epoki (UTC) - jednoznaczne, do zlaczenia z vehicle_ts. */
  function csv(obserwacje) {
    var w = [KOLUMNY.join(",")];
    obserwacje.forEach(function (o) {
      var r = [o.id, o.przystanek, o.linia, o.pojazd]
        .concat(KODY.map(function (k) { return o.czasy[k]; }))
        // kolejka z czasem (znacznik) tez ustawia flage kolejki
        .concat(FLAGI.map(function (f) {
          return o.flagi[f.kod] || (f.kod === "kolejka" && (o.znaczniki || {}).przed) ? 1 : 0;
        }))
        .concat([o.wsiadlo || 0, o.wysiadlo || 0, o.drzwi_obs || "", o.tlok || "", o.uwagi, o.utworzona, opisKorekt(o),
                 o.szac ? 1 : 0, o.rola || "", o.obserwator || "",
                 _zs(o, "czeka", o.czasy.rusz), _powod(o), _zs(o, "przed", o.czasy.rusz), o.ponowne_otw || 0]
          .concat(godzinyZnacznika((o.znaczniki || {}).przed, o.czasy.rusz))
          .concat(godzinyZnacznika((o.znaczniki || {}).czeka, o.czasy.rusz2 !== undefined ? o.czasy.rusz2 : o.czasy.rusz))
          .concat([_zs(o, "odblok", o.czasy.rusz)])
          .concat(godzinyZnacznika((o.znaczniki || {}).odblok, o.czasy.rusz)));
      w.push(r.map(csvPole).join(","));
    });
    return w.join("\n") + "\n";
  }

  var KOLUMNY_PRZEJAZDU = ["id", "linia", "pojazd", "kierunek", "cel", "zakres", "lp", "przystanek",
                           "t_pierwsze", "t_zapis", "t_stop", "t_otw", "t_zamk", "t_rusz",
                           "wsiadlo", "wysiadlo", "tlok", "obciazenie", "obciazenie_zakres", "obciazenie_szac"]
    .concat(ZNACZNIKI_DAWNE.map(function (k) { return "z_" + k + "_s"; })).concat(["uwaga_przyst", "uwagi"])
    .concat(["korekty", "szacunek", "czesc", "rola", "obserwator"])
    .concat(["z_czeka_s", "z_czeka_powod", "t_stop2", "t_rusz2", "ponowne_otw", "drugi_przy_peronie"])
    .concat(["nie_stanal", "t_minal"])
    .concat(["z_przed_od", "z_przed_do", "z_czeka_od", "z_czeka_do"])
    .concat(["z_odblok_s", "z_odblok_od", "z_odblok_do"]);

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
          .concat(ZNACZNIKI_DAWNE.map(function (k) { return _zs(p, k, p.t); }))
          .concat([p.uwaga || "", j.uwagi, opisKorekt(p), p.szac ? 1 : 0, j.czesc || "", j.rola || "", j.obserwator || ""])
          .concat([_zs(p, "czeka", p.t), _powod(p), c.stop2, c.rusz2, p.ponowne_otw || 0, p.drugi ? 1 : 0])
          .concat([p.nie_stanal ? 1 : 0, p.t_minal])
          .concat(godzinyZnacznika((p.znaczniki || {}).przed, p.t))
          .concat(godzinyZnacznika((p.znaczniki || {}).czeka, p.t))
          .concat([_zs(p, "odblok", p.t)])
          .concat(godzinyZnacznika((p.znaczniki || {}).odblok, p.t))
          .map(csvPole).join(","));
      });
    });
    return w.join("\n") + "\n";
  }

  return { ROLE: ROLE, widoczne: widoczne, CZESC: CZESC, przesunJazdy: przesunJazdy,
           nieStanal: nieStanal, naZadanie: naZadanie, usunZdarzenie: usunZdarzenie, nietknieta: nietknieta,
           ustawZakres: ustawZakres, przesunZnacznik: przesunZnacznik, usunZnacznik: usunZnacznik,
           godzinyZnacznika: godzinyZnacznika, POWODY: POWODY, znacznik: znacznik, powodCzekania: powodCzekania, zamknijZnaczniki: zamknijZnaczniki,
           zdarzenie: zdarzenie, ponowneOtwarcie: ponowneOtwarcie, powodJazdy: powodJazdy, ponowneJazdy: ponowneJazdy,
           cofnijPonowne: cofnijPonowne, cofnijPonowneJazdy: cofnijPonowneJazdy,
           ZAKRES: ZAKRES, KOLUMNY_PRZEJAZDU: KOLUMNY_PRZEJAZDU, nowyPrzejazd: nowyPrzejazd,
           ustawTrase: ustawTrase, ustawPrzystanek: ustawPrzystanek, zliczPrzejazd: zliczPrzejazd,
           nastepny: nastepny, etykietyTrasy: etykietyTrasy, poprzedni: poprzedni,
           nowyPoZmianieLinii: nowyPoZmianieLinii, PODWOJNE_MS: PODWOJNE_MS, dalej: dalej, pomin: pomin, cofnijDalej: cofnijDalej,
           tenSamPrzystanek: tenSamPrzystanek, slupkiNazwy: slupkiNazwy, nazwyZWynikow: nazwyZWynikow,
           etykietaKierunku: etykietaKierunku, szacujObciazenie: szacujObciazenie,
           zakresObciazenia: zakresObciazenia, ZDARZENIA_JAZDY: ZDARZENIA_JAZDY,
           zdarzenieJazdy: zdarzenieJazdy, cofnijZdarzenieJazdy: cofnijZdarzenieJazdy, inneMomentyJazdy: inneMomentyJazdy,
           ZNACZNIKI: ZNACZNIKI, przelaczZnacznik: przelaczZnacznik, trwanieZnacznika: trwanieZnacznika,
           przesun: przesun, opisKorekt: opisKorekt,
           brakiPrzejazdu: brakiPrzejazdu, csvPrzejazdy: csvPrzejazdy,
           ZDARZENIA: ZDARZENIA, KODY: KODY, FLAGI: FLAGI, KOLUMNY: KOLUMNY, TLOK: TLOK,
           etykietaPrzystanku: etykietaPrzystanku, idZTekstu: idZTekstu,
           normuj: normuj, szukajPrzystankow: szukajPrzystankow,
           nowa: nowa, zapisz: zapisz, cofnij: cofnij, zlicz: zlicz, braki: braki,
           trwanie: trwanie, csv: csv };
}));
