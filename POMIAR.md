# Pomiar terenowy czasu postoju — instrukcja

Notatnik w telefonie: **https://jedrzejf.github.io/ztm-poznan-web/pomiar.html**

## Po co

Postój liczony z GPS (co ~11,7 s) jest prawdopodobnie zawyżony o 5–8 s, bo
metoda nie uwzględnia hamowania i ruszania (`CONTEXT.md` §11.2). Pomiar
terenowy daje **prawdziwe** momenty zatrzymania i ruszenia dla konkretnych
pojazdów. Porównanie z GPS pokaże, o ile metoda się myli — osobno dla
tramwajów i autobusów, osobno dla przystanków ze światłami tuż za peronem.

## Przygotowanie (raz)

1. **Czas w telefonie ustawiany automatycznie** (Ustawienia → Data i godzina).
   To jest cała synchronizacja z GPS — ręczny stoper tego nie da.
2. Otwórz notatnik i dodaj go do ekranu głównego. Działa bez internetu po
   pierwszym wczytaniu, zapisuje się sam po każdym dotknięciu.
3. Naładowany telefon + powerbank (ekran nie gaśnie w trakcie pomiaru).
4. Próba „na sucho” na 2–3 pojazdach — przed pierwszą prawdziwą sesją.

## Gdzie stanąć

Tak, żeby widzieć **koła i wszystkie drzwi** pojazdu na całej długości
peronu. Z dala od krawędzi, nie na torowisku, nie zasłaniając kierowcy ani
wejść. Na pytania: „pomiar do pracy dyplomowej o punktualności”.

## Co naciskać — definicje (najważniejsza część)

| przycisk | kiedy | uwagi |
|---|---|---|
| **Stanął** | koła całkowicie się zatrzymały **przy peronie** | jeśli najpierw stał w kolejce przed peronem — znacznik „kolejka przed peronem” (niżej), a „Stanął” dopiero przy peronie |
| **Drzwi otwarte** | **pierwsze** otwarcie dowolnych drzwi — przez kierowcę albo pasażera | nie koniec otwierania. Kierowca „zwolnił” drzwi, a pasażer otworzył je po 5 s → moment otwarcia przez pasażera (zwolnienia nie widać) |
| **Drzwi zamknięte** | **ostatnie** domknięcie drzwi | ktoś otworzył je jeszcze raz → **↻ drzwi otwarte ponownie** (skasuje zapisane zamknięcie), potem „Drzwi zamknięte” jeszcze raz |
| **Ruszył** | koła ruszyły, pojazd zaczyna odjeżdżać | nie moment domknięcia drzwi |
| **Stanął ponownie** | po ruszeniu staje jeszcze raz w obrębie przystanku (światło, do ~50 m) | tylko jeśli się zdarzy |
| **Ruszył ponownie** | odjazd po drugim zatrzymaniu | |

- Naciskaj **w chwili zdarzenia**, nie „na oko” potem. Twoja stała reakcja
  (~0,2 s) znosi się w różnicach czasów.
- Przystanek na żądanie i pojazd **nie stanął** → flaga „Nie zatrzymał się”.
- **Nie jesteś pewien momentu → flaga „niepewny”, nie zgaduj.** Lepiej
  pominąć pojazd niż zapisać wymyślony czas.
- Pomyłka → „Cofnij” (usuwa ostatnie zdarzenie). Notatnik nie pozwoli
  nacisnąć zdarzeń w złej kolejności.

## Jak klikać — krok po kroku

1. **Pojazd się zbliża** (widzisz go 100–200 m przed peronem) → **+ Pojazd**.
   Karta pojawia się na górze. Linii i numeru jeszcze nie wpisuj.
2. **Patrz na koło przy stałym punkcie** — słupek, krawędź wiaty, łączenie
   płyt peronu. **Stanął** naciskasz, gdy koło przestaje przesuwać się
   względem tego punktu. Kciuk trzymaj już nad przyciskiem.
3. **Drzwi otwarte** — przy pierwszym ruchu skrzydła dowolnych drzwi.
4. **W trakcie postoju** (zwykle 15–40 s): wpisz linię i numer taborowy,
   a jeśli liczysz pasażerów — naciskaj **+** przy każdej osobie (niżej).
   Przystanek przypisany do pojazdu widać na górze karty (ten, który był
   wybrany przy **+ Pojazd**); gdy zmienisz przystanek, karta pokaże
   przycisk „zmień na: …”.
   Wpisywanie nie wpływa na zapisane czasy.
5. **Drzwi zamknięte** — gdy ostatnie skrzydło się domknie. W tramwaju
   z kilkoma drzwiami patrz na te, które zamykają się ostatnie — którymi
   zwykle są, sprawdzisz w pilotażu.
6. **Ruszył** — pierwszy ruch koła względem tego samego punktu co w kroku 2.
   Nie przy sygnale zamykania drzwi, nie przy dźwięku silnika.
7. Jeśli po kilku metrach **staje przed światłem** → **Stanął ponownie**,
   potem **Ruszył ponownie**. Jeśli przy tym znów otworzy drzwi (kierowca
   wpuścił dobiegającego) → także **↻ drzwi otwarte ponownie**.
8. Pojazd odjechał → **Zakończ**. Karta znika do listy „Zakończone”.

## Znaczniki (oba tryby, 29.09)

Każdy znacznik mierzy czas: 1. dotknięcie start, 2. koniec, 3. kasuje;
bez końca trwa do „Ruszył”.

- **czeka po wymianie** — wymiana skończona, a pojazd stoi dalej **przy
  peronie**, bez ruchu. **Czas liczy się od razu po dotknięciu** (a gdy
  zapisano „Drzwi zamknięte” — od nich, bo orientujesz się po kilku
  sekundach). Powód dotknij kiedykolwiek albo wcale: **światło /
  zablokowany** (samochód na pasie, nie może wyjechać) **/ na czas / inne**.
  „Na czas” tylko, gdy oczywiste (np. > 10 s z otwartymi drzwiami bez
  wymiany) — 4–6 s i tak nie odróżnimy od zwykłego postoju.
- **kolejka przed peronem** — pojazd **całkiem stanął** w kolejce **do tego
  peronu**: najwyżej ~50 m przed nim (długość tramwaju + zapas) i **bez
  skrzyżowania po drodze**. Zatrzymania dalej — na światłach, rondzie,
  w korku przed poprzednim skrzyżowaniem — to czas jazdy między
  przystankami; GPS mierzy je sam, **nie zaznaczaj ich**. Samo zwolnienie
  (przepuszczenie pieszego bez zatrzymania) też nie. Próg z estymatora:
  GPS szuka postoju do 40 m od słupka.
- **Stanął / Ruszył ponownie** (przyciski zegara) — to nie znacznik:
  pojazd ruszył i po kilku metrach stanął (światło tuż za peronem).
  Różnica wobec „czeka”: czy koła się ruszyły.
- W jeździe dodatkowo **drugi przy peronie** — staje za innym pojazdem na
  peronie podwójnym.

**Dwa pojazdy naraz:** każdy ma swoją kartę, najnowsza na górze. Przed
naciśnięciem sprawdź numer linii na karcie. Jeśli nie nadążasz — obsłuż
jeden, drugi pomiń (lepiej mniej, a pewnie).

**Pomyłka:** „Cofnij” usuwa ostatnio zapisany moment. Zła kolejność
(np. „Stanął” po „Ruszył”) zostanie zablokowana z komunikatem.

**Kliknąłeś za wcześnie / za późno:** dotknij zapisanego przycisku (np.
„Drzwi zamknięte 12:01:03.4”) → pojawi się korekta **−5 s / −1 s / +1 s /
+5 s**. Kolejność nadal pilnowana; korekty trafiają do CSV (kolumna
`korekty`, np. `zamk+6`), więc wiadomo, które czasy są poprawione z pamięci.

**Poprawki po fakcie:** lista „Zakończone” pokazuje godzinę, linię, pojazd
i przystanek. Stuknięcie wiersza otwiera obserwację ponownie do edycji.

**Zmiana kierunku na tym samym przystanku:** pod polem przystanku jest
rząd szybkich przycisków — pozostałe słupki tej nazwy („→ Szwedzka 215”)
i ostatnio używane. Jedno stuknięcie zamiast wpisywania.

## Dwie osoby, role (28.09)

Pod przełącznikiem trybu: **zegar + liczenie** (jedna osoba, domyślnie),
**tylko zegar**, **tylko liczenie** oraz pole na **inicjały**. Rola chowa
cudze przyciski; rola i inicjały trafiają do CSV (kolumny `rola`,
`obserwator`). Sekcje mają kolory: zegar niebieski, liczenie zielone,
znaczniki bursztynowe.

- **Priorytet: zegar.** Dokładne „Stanął” i „Ruszył” są cenniejsze niż
  dokładna liczba osób.
- **Liczenie dzielić po drzwiach**, nie na wsiadających / wysiadających —
  przy podziale na kierunki obie osoby muszą patrzeć na wszystkie drzwi;
  przy podziale po drzwiach każda widzi cały ruch swoich drzwi, a liczby
  się sumują. Tramwaj: przód / tył (w jeździe **Liczone: mój człon**
  i **moja część: przód / tył**, od kabiny prowadzącego). Autobus i
  przystanek: osoba A — zegar + przednie drzwi, osoba B — pozostałe drzwi.
- **Obie osoby mogą klikać zegar w jeździe** — różnica ich kliknięć to
  zmierzony błąd obserwatora (potrzebny do kalibracji).
- **Duża wymiana** (powyżej ~15 osób): **+5** przy grupie i przycisk
  **≈ nie dałem rady policzyć dokładnie** (kolumna `szacunek`). Szacunek jest
  użyteczny, pusty wiersz — nie.
- W roli „tylko liczenie” brak czasów nie jest brakiem — klika je druga osoba
  (łączenie po numerze taborowym, przystanku i czasie).

## Wymiana pasażerska (opcjonalnie)

Pozwoli skorelować postój z liczbą wsiadających i wysiadających.
**Priorytet mają czasy** — jeśli liczenie odciąga uwagę od „Stanął”
i „Ruszył”, nie licz (albo podzielcie się rolami, wyżej).

- **Licz jedne, zawsze te same drzwi** — w tramwaju pierwsze (przy
  motorniczym) albo te najbliżej wejścia na przystanek; w krótkim autobusie
  można wszystkie. Pole **Liczone drzwi** ma domyślnie „wszystkie” — zmień
  je, jeśli liczysz tylko część.
- **+** przy każdej osobie wsiadającej / wysiadającej przez te drzwi;
  **−** poprawia pomyłkę.
- **Zapełnienie** jednym dotknięciem: luźno / siedzenia zajęte / stoją.

Pliki `Wymiana_pasazerska_*.xlsx` (sprawdzone 27.09) to dane UTK o **stacjach
kolejowych** w Polsce — nie dotyczą przystanków ZTM. Wymianę na przystankach
daje tylko własne liczenie (tryb „Jadę pojazdem” — dużo postojów na godzinę).

## Pomiar poza planem (dowolny przystanek)

Można mierzyć **gdziekolwiek** — dopasowanie do GPS idzie po numerze
taborowym i czasie, a przystanek wynika z trajektorii pojazdu. W notatniku
wpisz początek nazwy i wybierz słupek z kierunkiem („Fredry → Gwarna [117]”).

- Nie ma minimum na przystanek: jednostką analizy jest **grupa**
  (tramwaj/autobus × światło za przystankiem / brak), nie przystanek.
  Kilka przystanków po kilka–kilkanaście obserwacji to nawet lepiej niż
  jeden — wynik nie zależy od jednego miejsca.
- **Unikaj pętli i przystanków końcowych** (postój regulacyjny; odjazdu
  z ostatniego przystanku GPS nie zmierzy).
- Nie wiesz, czy za przystankiem jest światło → wpisz w uwagach
  „światło za” albo „brak”.
- Niedziela i święta: ważne dla pomiaru hamowania i ruszania (mały ruch to
  zaleta), oznaczane w analizie osobno; wpływ świateł i kolejek w szczycie —
  tylko dni robocze.

## Tryb „Jadę pojazdem” — liczenie pasażerów w trakcie jazdy

Do wyrywkowego liczenia na pojedynczych przejazdach, bez planu próby —
kontekst dla postoju i punktualności, nie osobna hipoteza. Przełącznik
**Jadę pojazdem** u góry notatnika; tryb „Na przystanku” działa bez zmian.

1. **Zacznij przejazd** → linia, numer taborowy (w środku: naklejka nad
   drzwiami albo przy kabinie), kierunek (przyciski „→ cel” z rozkładu).
2. **Przystanek** — z listy trasy wybierz ten, na którym jesteś. Dalej
   notatnik sam przechodzi na kolejny. (Wyszukiwarka tylko, gdy linii nie ma
   w danych — objazd poza trasą jest zbyt rzadki, 28.09.)
   **Zegar postoju** (niebieski, na górze — 28.09: podstawa trybu, nie
   dodatek): Stanął / Drzwi otwarte / Drzwi zamknięte / Ruszył, pod nimi
   Stanął ponownie / Ruszył ponownie i ↻ drzwi otwarte ponownie — jak na
   przystanku, zapisuje się do bieżącego przystanku. „Stanął”, gdy bieżący
   już ruszył, sam robi „Dalej” — zdarzenie trafia do właściwego przystanku,
   nawet jeśli nie zdążysz nacisnąć „Dalej”. ↶ cofa ostatnie. **Dotknięcie
   zapisanego** otwiera korektę −5 / −1 / +1 / +5 s (kolumna `korekty`, np.
   `rusz-2`) — zamiast notatki „ruszył 2 s wcześniej”.
3. **Liczone** (obok „W pojeździe po odjeździe”): moje drzwi / mój człon
   (wagon) / cały pojazd (domyślnie) — raz na przejazd, zawsze to samo.
   Gdy nie cały pojazd, obok **moja część (od kabiny)**: przód / środek / tył
   — bez tego dwa pliki „człon” tego samego pojazdu nie dają się zsumować.
   Liczba osób w pojeździe ma domyślnie ten sam zakres („ta liczba to”);
   można ją zmienić na przystanku, np. raz policzyć cały pojazd. Szacunek
   ciągnie się tylko od liczby z tym samym zakresem co liczniki.
4. Na każdym przystanku **+** przy każdej osobie wsiadającej i wysiadającej.
   **Zapełnienie** (luźno / siedzenia / stoją / ścisk) jest zwinięte — tylko
   gdy nie liczysz osób; przy liczbie osób nic nie dodaje (28.09).
   **Znaczniki** — jak na przystanku (rozdział „Znaczniki” wyżej): czeka po
   wymianie (+ powód), kolejka przed peronem, drugi przy peronie. Dawne
   „czeka na czas” i „światło za przystankiem” (27–28.09) zastąpione:
   czekanie przy peronie to „czeka” z powodem, drugie zatrzymanie kilka
   metrów dalej to „Stanął/Ruszył ponownie”.

   **Notatka do tego przystanku** — krótki tekst przypięty do przystanku
   (np. „dobiegł pasażer”), zamiast uwag do całego przejazdu.

   **W pojeździe po odjeździe** (opcjonalnie): wpisz liczbę osób, gdy
   policzysz — przy wejściu albo na dowolnym późniejszym przystanku. Dalej
   notatnik szacuje sam z liczników (≈ w polu i na liście); każda nowa
   wpisana liczba koryguje szacunek.
5. Skończyłeś liczyć (także już w trakcie jazdy) → **Dalej ▶**. Liczniki od
   zera, przystanek przechodzi na następny. To **nie** jest moment odjazdu —
   zapisuje się czas pierwszego „+” na przystanku i czas „Dalej”.
6. Przystanek na żądanie (notatnik rozpoznaje go sam z rozkładu dla wpisanej
   linii: napis „na żądanie” i dwa przyciski na górze karty; na zwykłym
   przystanku ich nie ma — pominięcie opisz w notatce), pojazd nie stanął →
   **Nie stanął** (zapis
   „przejazd”, dalej następny przystanek). Jeśli zauważysz chwilę, w której
   pojazd **mija znak przystanku** → zamiast tego **⏱ nie stanął — minął
   słupek TERAZ** (kolumna `t_minal`). Nie musisz — łatwo przeoczyć; sam fakt
   „nie stanął” też się liczy. Po co: na przystankach na żądanie GPS często
   nie widzi, czy pojazd stanął, i dwie metody liczenia czasu jazdy różnią się
   tam o minutę (835/837, Admiralska — 29.09). Pomyłka → **Cofnij „Dalej”** (postój wraca do edycji).
7. Wysiadasz → **Zakończ przejazd**.

Do GPS dopasowuje przede wszystkim przystanek i kolejność; czasy tylko
zawężają okno. **Eksport CSV w trybie „Jadę pojazdem”** daje plik
`przejazdy_*.csv` (w trybie „Na przystanku” — `pomiar_*.csv`; osobno, bo
udostępnianie dwóch plików naraz w telefonie oddawało tylko pierwszy).
Wiersz na postój: `id, linia, pojazd, kierunek, cel, zakres, lp, przystanek,
t_pierwsze, t_zapis, t_stop, t_otw, t_zamk, t_rusz, wsiadlo, wysiadlo, tlok, obciazenie,
obciazenie_zakres, obciazenie_szac, z_czas_s, z_przed_s, z_za_s, uwaga_przyst,
uwagi, korekty, szacunek, czesc, rola, obserwator` (czasy w ms od epoki, UTC;
`obciazenie` wpisane, `obciazenie_szac` z bilansu; `z_*_s` — czas trwania
znaczników w sekundach; nowe kolumny zawsze na końcu). Trasy w notatniku to wariant główny kierunku z aktualnego
rozkładu (ten sam co w tabeli punktualności); kursy skrócone kończą się
wcześniej — wtedy po prostu **Zakończ**.

## Numer taborowy — obowiązkowo

Na boku i z przodu pojazdu: **3 cyfry tramwaj, 4 cyfry autobus**. To klucz do
dopasowania z GPS — obserwacja bez numeru jest bezużyteczna. Linię też wpisz.

## Po co jeszcze obserwacje „na przystanku” (27.09)

Z 15 czystych obserwacji skalibrowano poprawkę hamowania i ruszania
(D-039): a = 0,73 m/s², ale 95% przedział 0,64–2,05 — poprawka postoju
w sieci 3–7 s. **~50–70 obserwacji** zawęzi przedział mniej więcej o połowę;
najlepiej po równo tramwaje i autobusy (osobne `a`), w odkrytym terenie
(nie Piaśnicka — tunel). Przetrzymania i wymianę dają przejazdy.

## Plan próby

**Cel: co najmniej 35 kompletnych obserwacji w każdej z 4 grup**
(tramwaj / autobus × bez świateł / światło tuż za przystankiem), razem ok. 150.

Dlaczego 35: różnica „GPS − teren” dla jednego pojazdu ma rozrzut ~5 s, więc
35 obserwacji daje błąd średniej ~0,8 s wobec spodziewanego obciążenia 5–8 s.
Zapas ponad 30 na ~15% obserwacji, których nie da się dopasować.

Miejsca wybrane tak, że **oba kierunki jednej pary przystanków** trafiają do
różnych grup — te same warunki ruchu, różnica tylko w świetle:

| sesja | miejsce | słupki | kiedy | pojazdów/h na kierunek |
|---|---|---|---|---|
| 1 | **Fredry** (tramwaje) | 117 → Gwarna (bez świateł), 118 → Most Teatralny (światło 25 m za) | dzień roboczy 10:00–12:00 | ~24 |
| 2 | Fredry | j.w. | dzień roboczy 15:00–17:00 | ~36 |
| 3 | **Swoboda** (autobusy) | 628 → Bułgarska/Polska (światło **39 m** za), 629 → Szpitalna (światło 31 m za) — **oba ze światłem** (poprawka 29.09, niżej) | 10:00–12:00 | ~20 |
| 4 | Swoboda | j.w. | 15:00–17:00 | ~21 |

- Dni robocze, najlepiej wt–czw. Nie w dniu zmiany rozkładu.
- Oba kierunki na zmianę — ile się da, bez utraty jakości.
- Szczyt i poza szczytem, bo w szczycie inaczej działają światła i kolejki.

**Zapasowe miejsca** (gdyby któreś się nie nadawało): tramwaje — Poznańska
8 / 7 (światło 5 m za), Kórnicka 158 / 159 (11 m); autobusy — Małe Garbary
1131 / Grochowe Łąki 1130 (19 m).

**Sprawdź na miejscu** (wpisz w uwagach pierwszej obserwacji): czy na słupku
„bez świateł” rzeczywiście nie ma sygnalizacji tuż za peronem, a na słupku
„światło za” jest. Klasyfikacja pochodzi z mapy OSM (stan z maja 2026)
i automatycznej reguły (35 m) — Twoje oko jest dokładniejsze.

**Poprawka 29.09 (autor, potwierdzone w OSM):** za 628 też jest sygnalizacja,
39 m za słupkiem — reguła 35 m wrzuciła ją do „bez świateł”. Swoboda nie
jest więc parą światło / brak, tylko 31 m / 39 m. Porównanie z przystankiem
bez świateł daje za to **Małe Garbary 1131** (brak sygnalizacji do 80 m)
wobec **Grochowe Łąki 1130** (19 m) — autobusy, ~21 pojazdów/h. Na Swobodzie
koszt światła mierzy wprost znacznik **„czeka po wymianie” z powodem
„światło”** — bez grupy kontrolnej. Pozostałe pary sprawdzone w OSM 29.09:
Fredry 117 brak do 80 m / 118 25 m; Poznańska 8 brak / 7 5 m; Kórnicka
158 brak za peronem / 159 11 m.

**Objazdy:** plan liczony na rozkładzie objazdowym obowiązującym do 04.10.2026.
Po tej dacie częstotliwości mogą się zmienić — sprawdzić przed sesją.

## Po sesji

1. **Eksport CSV** (dolny pasek) — zapisz lub wyślij plik, zanim cokolwiek
   wyczyścisz.
2. Plik do repozytorium: `data/static/teren/` (wersjonowany — tych danych nie
   da się powtórzyć).
3. Dopasowanie do GPS i wynik: skrypt zestawi obserwacje ze zdarzeniami GPS
   po numerze taborowym i czasie, policzy różnicę postoju osobno dla 4 grup.
   Od wyniku zależy poprawka estymatora postoju, punktualność odjazdu i `L_a`.

## Co zapisuje notatnik

CSV: przystanek, linia, numer taborowy, liczby wsiadających i wysiadających
z oznaczeniem liczonych drzwi, zapełnienie, momenty zdarzeń w **milisekundach od
epoki (UTC)** — te same jednostki co czas pozycji w GTFS-RT — flagi i uwagi.
Czas pozycji w feedzie ZTM ma rozdzielczość 1 s, więc dokładność telefonu
(poniżej 0,1 s po synchronizacji) z zapasem wystarcza.
