# digi2-essentials

Biblioteka modułów dla Webflow sterowana atrybutami `d2-*`. Jeden loader dociąga
tylko te moduły, które strona zadeklarowała flagami na tagu `<script>`.

## Struktura

| Ścieżka | Co to |
|---|---|
| `webflow-scripts/digi2-loader.js` | loader: bus zdarzeń, parser wartości responsywnych, `d2-static-width`, ładowanie modułów |
| `webflow-scripts/modules/*.js` | moduły (cms, popups, forms, tabs, sliders, lightbox…) — **tu piszesz kod** |
| `dist/**` | build (`npm run build`, terser) — commitowany, bo to on idzie na CDN |
| `tests/*.test.js` | testy (`npm test`, node:test + vm z mini-DOM-em) |
| `README.md` | dokumentacja techniczna dla programisty |
| `docs.html` | **dokumentacja główna** — samodzielny cheatsheet (angielski), to ją dostaje odbiorca |
| `docs/` | druga wersja dokumentacji, sterowana danymi (`index.html` + `data.js` + `data2.js` + `app.js`, polski) |

Dokumentacja jest w dwóch miejscach i obie trzeba utrzymywać. `docs.html` jest
tą główną. `docs/` trzyma te same treści w formie danych (`window.D2DOCS`).

## Każda zmiana kończy się aktualizacją dokumentacji

Nowa funkcja, nowy atrybut, nowa opcja, zmiana zachowania — **zawsze**, w tej
samej zmianie co kod, opisz ją w **czterech** miejscach:

1. **`docs.html`** — dokumentacja główna, szczegóły niżej
2. **`docs/`** (`data.js` / `data2.js`) — druga wersja, ta sama treść w formie danych
3. **`README.md`** — opis techniczny: składnia, zachowania brzegowe, dlaczego tak
4. **`CHANGELOG.md`** — wpis pod numerem wersji, z punktu widzenia osoby budującej stronę

Żadnego z tych czterech nie pomijaj i nie odkładaj „na potem". Dokumentacja, która
nie zna funkcji, jest gorsza niż jej brak: ktoś sprawdza, nie znajduje i pisze
to od nowa. Zmiana bez wpisu w changelogu jest niewidoczna dla kogoś, kto podbija
wersję na stronie klienta i musi wiedzieć, co się zmieni.

### `docs.html`

Samodzielny plik: cała treść, style i skrypt w środku, bez zależności. Konwencje,
których trzymaj się przy dopisywaniu:

- nowy temat = `<section id="...">` z `<h2>`, wstawiona **w kolejności** obok
  pokrewnych sekcji, plus link `<a href="#id">` w odpowiedniej grupie paska bocznego
- gdzie coś da się zrobić i z JS, i atrybutem — blok `.platform` z dwiema
  zakładkami (`data-platform-tab="js"` / `"webflow"`)
- mapowanie na Webflow: `.wf-map` → `.wf-el` z chipami `Name` / `Value`
- kod w `<pre><code>` z ręcznym podświetleniem: `<span class="fn|prop|string|comment|keyword|num">`
- tabele `<table><tr><th>` na warianty i zachowania brzegowe, `.muted` na przypisy
- opcje JS modułu dopisz też do jego tabeli opcji (kolumny: nazwa, domyślna, opis)
- treść po angielsku, jak reszta pliku

Po edycji sprawdź, że każdy `href="#..."` ma swoją sekcję i nie powstały duplikaty `id`.

### `docs/data.js` / `docs/data2.js`

Moduł = klucz w `window.D2DOCS`:

- **nowy atrybut** → tablica `attrs` danego modułu:
  `{ a: 'd2-...', v: 'wartości', el: 'na jakim elemencie', d: 'opis', n: 'przypis' }`
  (`req: true` dla wymaganych, `set: true` dla flag ustawianych przez moduł,
  `g: '...'` grupuje atrybuty w sekcje — trzymaj się grup już użytych w module)
- **nowa opcja JS lub metoda API** → `api.code` tego modułu (komentarze w kodzie
  są częścią dokumentacji) i w razie potrzeby `api.desc`
- **nowy wzorzec użycia** → `examples: [{ title, desc, code }]`
- **nowy element w strukturze Webflow** → `structures` / drzewko w `kreator.build`
- **zmiana zachowania istniejącej funkcji** → popraw istniejący wpis, nie dodawaj
  drugiego obok

Podział plików: `data.js` to config, start, cms, filter, forms, popups, toasts;
`data2.js` — reszta modułów. Po edycji sprawdź `node --check docs/data.js`.

Do tego nagłówek komentarza w samym module (dla kogoś, kto czyta kod) i blok
opcji modułu w `webflow-scripts/digi2-loader.js`, jeśli doszła opcja JS.

## Wydanie

`@latest` na jsDelivr wskazuje **najnowszy tag semver**, więc sam push niczego
nie zmienia dla stron klientów.

**Jedyna droga wydania to `scripts/release.sh`** (decyzja Piotra, 2026-10-31):

```bash
# wpis w CHANGELOG.md pod nowym numerem, zacommitowany — przed wydaniem, nie po
scripts/release.sh v1.3.8 "opis"
```

Skrypt uruchamia bramkę (`npm run release:check -- v1.3.8`: build, `dist/`
zgodny z commitem, `npm test`, Playwright na `sandbox/gate-*.html`). Na
czerwonym zatrzymuje się przed tagiem, a na zielonym robi tag, push tagu i
purge zmienionych plików `dist/`. Tag stabilny powstaje tylko z `main` albo
z `release/vX.Y.Z` (poprawka od poprzedniego stabilnego tagu, jak v1.8.2 i
v1.8.3). Szczegóły: README → Build → Release gate.

- Ręczne `git tag` / `npm version` + push to **złamanie procedury**. Hook
  `pre-push` (`.githooks/`, włącza go `npm install`) odrzuci tag, którego commit
  nie przeszedł bramki dla tej wersji.
- `git push --no-verify` omija hook. To **świadome obejście bramki**, a nie
  sposób na jej awarię: wolno tylko za zgodą Piotra na to jedno wydanie.
- Czerwona bramka to stop, nie przeszkoda: popraw kod albo wzorzec zrzutu
  (po obejrzeniu PNG), zacommituj i uruchom ponownie.

Dwie pułapki jsDelivr, sprawdzone 2026-10-21:

- **Plik, którego nie ma w najnowszym stabilnym tagu, `@latest` bierze z
  najnowszego tagu, który go ma — także przedpremierowego.** Dopóki moduł
  istnieje tylko w linii `v1.9.0-ma.N`, `@latest/dist/modules/ma.min.js` serwuje
  kod gałęzi prerelease (nawet niescalonej), z cache 12 h na CDN i 7 dni w
  przeglądarce. Loader 1.8.0 zamienia każdy nieznany atrybut `d2-x` na moduł
  `x`, więc strona z `@latest` i `d2-ma` **uruchomiłaby** ten kod. Strona na
  `@latest` nie dostaje atrybutu nowego modułu, dopóki nie wyjdzie stabilny tag
  z tym plikiem. Purge tego nie naprawia: po nim `@latest` przelicza się na
  najnowszy prerelease z tym plikiem.
- **Strona przypięta do `@main` (gałęzi) dostaje każdy merge do main od razu**,
  z pominięciem tagów i `@latest`. Przed scaleniem zmian, które mają czekać na
  wydanie, sprawdź, czy żadna strona nie ładuje `@main`.
- **Tagi `ma.N` bywają kładzione na gałęziach spoza main** (drugi zespół).
  Wolny numer sprawdzaj `git ls-remote --tags origin 'v1.9.0-ma.*'`, nie po
  stanie main; cudzego tagu nie przesuwaj, bierz następny numer. Pierwsze
  żądanie pliku ze świeżego tagu może dostać 404 z cache — purge tego jednego
  adresu z tagiem (nie `@latest`) je czyści.

Purge czyści CDN, ale **nie** przeglądarkę odwiedzającego: jsDelivr wysyła
`max-age=604800`, więc powracający użytkownik trzyma stary plik nawet tydzień.
Strona, która musi dostać zmianę od razu, wskazuje przypiętą wersję
(`@v1.3.7/dist/...`), nie `@latest`.

## Konwencje kodu

- Moduły to IIFE bez zależności; ES5-owy styl wewnątrz (`var`, `function`),
  klasy ES6 tam, gdzie już są. Bez frameworków i bez build-stepu poza terserem.
- Atrybuty: `d2-<moduł>-<rzecz>`, wartości `klucz:wartość|wartość`
  (pipe = OR), listy rozdzielane `|`. Każdy atrybut ma alias `data-d2-*`.
- Wartości czytaj przez `digi2.attr(el, name)` — obsługuje składnię
  responsywną `wartość;wartość@maxPx`. Wyjątek: wartości, które mogą legalnie
  zawierać `;` lub `@` (np. parametry kampanii) czytaj surowym `getAttribute`.
- Nowa funkcja = nowe testy. Sprawdź, że test pada bez poprawki — test, który
  przechodzi zawsze, niczego nie pilnuje.
- Cookies czytaj po jednej, dekodując tylko wartość dopasowanego ciasteczka.
  `decodeURIComponent(document.cookie)` na całym nagłówku wybucha na jednym
  obcym `%` i skleja pary po zakodowanym `;`.
