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
| **Stanął** | koła całkowicie się zatrzymały **przy peronie** | jeśli najpierw stał w kolejce przed peronem, zaznacz „kolejka” i naciśnij dopiero przy peronie |
| **Drzwi otwarte** | pierwsze drzwi **zaczynają** się otwierać | |
| **Drzwi zamknięte** | ostatnie drzwi **domknięte** | |
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
   Wpisywanie nie wpływa na zapisane czasy.
5. **Drzwi zamknięte** — gdy ostatnie skrzydło się domknie. W tramwaju
   z kilkoma drzwiami patrz na te, które zamykają się ostatnie — którymi
   zwykle są, sprawdzisz w pilotażu.
6. **Ruszył** — pierwszy ruch koła względem tego samego punktu co w kroku 2.
   Nie przy sygnale zamykania drzwi, nie przy dźwięku silnika.
7. Jeśli po kilku metrach **staje przed światłem** → **Stanął ponownie**,
   potem **Ruszył ponownie**.
8. Pojazd odjechał → **Zakończ**. Karta znika do listy „Zakończone”.

**Dwa pojazdy naraz:** każdy ma swoją kartę, najnowsza na górze. Przed
naciśnięciem sprawdź numer linii na karcie. Jeśli nie nadążasz — obsłuż
jeden, drugi pomiń (lepiej mniej, a pewnie).

**Pomyłka:** „Cofnij” usuwa ostatnio zapisany moment. Zła kolejność
(np. „Stanął” po „Ruszył”) zostanie zablokowana z komunikatem.

## Wymiana pasażerska (opcjonalnie)

Pozwoli skorelować postój z liczbą wsiadających i wysiadających.
**Priorytet mają czasy** — jeśli liczenie odciąga uwagę od „Stanął”
i „Ruszył”, nie licz.

- **Licz jedne, zawsze te same drzwi** — w tramwaju pierwsze (przy
  motorniczym) albo te najbliżej wejścia na przystanek; w krótkim autobusie
  można wszystkie. Wybierz je w polu **Liczone drzwi** — bez tego liczby są
  bezużyteczne (notatnik przypomni).
- **+** przy każdej osobie wsiadającej / wysiadającej przez te drzwi;
  **−** poprawia pomyłkę.
- **Zapełnienie** jednym dotknięciem: luźno / siedzenia zajęte / stoją.

Uzupełnienie na dużą skalę: plik ZTM
`Wymiana_pasazerska_wraz_z_rankingiem_na_strone_2023_aktualizacja_zatrzyman_04_07_2024.xlsx`
(zawartość do sprawdzenia — opis z nazwy pliku). Jeśli zawiera wymianę na
przystankach, pozwoli skorelować postój z GPS z wymianą na **wszystkich**
przystankach; pomiar terenowy da szczegół dla pojedynczych postojów.

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
   notatnik sam przechodzi na kolejny. Objazd → pole „inny”, wyszukiwarka.
3. **Liczone**: moje drzwi / mój człon (wagon) / cały pojazd — raz na
   przejazd, zawsze to samo. Bez tego liczby są bezużyteczne.
4. Na każdym przystanku **+** przy każdej osobie wsiadającej i wysiadającej,
   potem **zapełnienie po odjeździe** (luźno / siedzenia zajęte / stoją / ścisk).
5. Pojazd rusza → **Odjazd ▶**. Zapisuje postój z czasem telefonu, liczniki
   od zera, przystanek przechodzi na następny.
6. Przystanek na żądanie, pojazd nie stanął → **Nie stanął** (przejście
   dalej bez zapisu). Pomyłka → **Cofnij odjazd** (postój wraca do edycji).
7. Wysiadasz → **Zakończ przejazd**.

Czas „Odjazd” + numer taborowy wystarczą do dopasowania z GPS, więc źle
wybrany przystanek da się naprawić w analizie. Eksport daje drugi plik,
`przejazdy_*.csv` — wiersz na postój: `id, linia, pojazd, kierunek, cel,
zakres, lp, przystanek, t_odjazd, wsiadlo, wysiadlo, tlok, uwagi`
(`t_odjazd` w ms od epoki, UTC). Trasy w notatniku to wariant główny kierunku z aktualnego
rozkładu (ten sam co w tabeli punktualności); kursy skrócone kończą się
wcześniej — wtedy po prostu **Zakończ**.

## Numer taborowy — obowiązkowo

Na boku i z przodu pojazdu: **3 cyfry tramwaj, 4 cyfry autobus**. To klucz do
dopasowania z GPS — obserwacja bez numeru jest bezużyteczna. Linię też wpisz.

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
| 3 | **Swoboda** (autobusy) | 628 → Bułgarska/Polska (bez świateł), 629 → Szpitalna (światło 31 m za) | 10:00–12:00 | ~20 |
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
