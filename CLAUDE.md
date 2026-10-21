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
nie zmienia dla stron klientów:

```bash
npm run build && npm test
# wpis w CHANGELOG.md pod nowym numerem — przed tagiem, nie po
git tag -a v1.3.8 -m "opis" && git push origin v1.3.8
curl -s "https://purge.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/modules/<moduł>.min.js"
```

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
