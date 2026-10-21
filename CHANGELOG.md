# Changelog

Wersje odpowiadają tagom w repo. `@latest` na jsDelivr wskazuje najnowszy tag,
więc wydanie = tag + purge (patrz [CLAUDE.md](CLAUDE.md#wydanie)).

Format: co się zmieniło z punktu widzenia osoby budującej stronę.

## v1.9.0-ma.13 — 2026-10-21 (przedpremierowa, tylko gałąź `feat/d2-ma-12-2destate-visitor`, nie `@latest`)

### `d2-ma` — gorący lead, poprawki z recenzji

- „Wyczyść” i wycofanie zgody odwołują powiązanie w 2destate zawsze, gdy
  formularz dostał kiedyś `visitorId`, także wtedy, gdy strona nie zobaczyła
  leada.
- Zgoda wycofana między wizytami: przy następnej odsłonie moduł najpierw
  wysyła odwołanie do 2destate, potem kasuje bazę.
- Gdy adres 2destate jeszcze nie działa (404), sygnały wstrzymują się na dobę.
  Odrzucona treść (413, 422) wstrzymuje je do końca wizyty.
- Wartość `d2-ma-hot-lead` bez `https://` daje ostrzeżenie w konsoli.
- MA przypinaj tagiem `@v1.9.0-ma.N`, nigdy `@latest`.

## v1.9.0-ma.12 — 2026-10-21 (przedpremierowa, tylko gałąź `feat/d2-ma-12-2destate-visitor`, nie `@latest`)

### `d2-ma` — gorący lead wraca (MA-D38 etap 1, wariant D′)

- Nowy atrybut `d2-ma-hot-lead` na tagu loadera, tylko dla strony dema i leadów
  testowych agencji. Wartość to adres API 2destate; puste pole oznacza
  `https://api.2destate.com/api/v1`.
- Formularz dema przekazuje 2destate identyfikator przeglądarki (`visitorId`)
  w polu `d2ma_visitor_id`. Można go wziąć z `digi2.ma.visitorId()` albo
  z ukrytego pola z atrybutem `d2-ma-visitor-id`, które moduł wypełnia przy
  wysyłce. Bez zgody identyfikatora nie ma.
- Gdy w tej samej wizycie był też lead (`generate_lead`), przy kolejnej wizycie
  moduł wysyła do 2destate, jakie lokale gość ogląda (bez danych formularza).
  Bez leada nic nie wychodzi z przeglądarki.
- „Wyczyść” i wycofanie zgody usuwają powiązanie w 2destate.
- Bez `d2-ma-hot-lead` strona działa jak dotąd.
- Scenariusze można czytać z 2destate: wystarczy zmienić adres w `d2-ma`.

## v1.9.0-ma.11 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-popups`

- Popup otwarty kliknięciem w link do kotwicy (np. `#profil`) nie traci
  fokusu na rzecz skryptu przewijania Webflow: przez 2 sekundy po otwarciu
  fokus, który strona wyniesie poza okno, wraca do popupu. Fokus w lightboxie
  albo w innym oknie modalnym zostaje tam, gdzie jest.

## v1.9.0-ma.10 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-popups`

- `closeOnEsc` działa niezależnie od `manageFocus`, więc Esc zamyka popup także
  przy wyłączonej obsłudze fokusu.
- Po zamknięciu górnego popupu fokus i klawisze wracają do popupu pod spodem.
- Esc nie zatrzymuje już propagacji zdarzenia (`preventDefault` wystarcza),
  więc inne skrypty strony dalej je widzą.

## v1.9.0-ma.8 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-popups` — dostępność (wszystkie popupy)

- Po otwarciu fokus przechodzi do przycisku zamknięcia, a gdy go nie ma, do
  okna. Nigdy nie trafia w pole formularza, więc na telefonie nie wyskakuje
  klawiatura. Tab nie wychodzi poza popup, a po zamknięciu fokus wraca tam,
  gdzie był.
- **Esc zamyka popup** jak przycisk zamknięcia (z cookie).
- Okno dostaje `role="dialog"`, `aria-modal` i `aria-labelledby` z pierwszego
  nagłówka, tylko tam, gdzie strona tego nie ustawiła.
- Wyłączenie: `manageFocus: false`, `closeOnEsc: false`.
- Kilka okien naraz: Esc i Tab obsługuje tylko popup na wierzchu. Esc w
  lightboxie nad popupem zamyka sam lightbox, a fokus w lightboxie albo w
  innym oknie modalnym nie jest zabierany. Popup ukryty przez stronę bez
  `hide()` niczego nie blokuje, a `destroy()` otwartego popupu zdejmuje blokadę
  Tab.

### `d2-lightbox`

- Esc zamykający lightbox jest oznaczany jako obsłużony (`preventDefault`),
  żeby popup pod spodem nie zamknął się razem z nim.
- **Uwaga przy wydaniu stabilnym:** to zmienia zachowanie wszystkich popupów
  na stronach klientów (Esc, fokus). Dziś jest tylko w wersji przedpremierowej.

### `d2-ma`

- Zmieniony szablon popupu w nowej rewizji koperty przebudowuje popup przy
  następnym pokazie.

## v1.9.0-ma.7 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-ma` — popup z szablonu panelu (§13.9)

- Gdy strona nie ma własnego popupu `[d2-ma-popup="<szablon>"]`, a koperta
  ma `templates.popup[]` z tym szablonem, popup buduje się z niego: tytuł,
  tekst, obrazek i przycisk, położenie (środek, prawy dół, dół, góra), rozmiar
  i kolory oraz font z tokenów strony. Wygląd zmienia się publikacją w panelu,
  bez zmian w Webflow. Własny popup strony zawsze ma pierwszeństwo.
- Tylko tekst, nigdy HTML. Błędne pola są pomijane z ostrzeżeniem w konsoli.
- Przycisk-link z szablonu prowadzi wyłącznie na stronę, na której stoi popup
  (ta sama domena i port, tylko https). Do 2destate prowadzi „Zobacz lokal”.
- Popup czekający na zamknięcie dymku mapy, zastąpiony popupem z innego
  scenariusza, nie zużywa swojej częstotliwości. Pokaże się następnym razem.

## v1.9.0-ma.6 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-ma` — popup nie zasłania dymku mapy

- Na telefonie stuknięcie lokalu na mapie 2destate otwiera dymek na cały ekran.
  Popup ze scenariusza (np. „Preferencja pokoi”) czeka teraz, aż gość zamknie
  dymek, zamiast nakładać się na niego. Gdy dymek jest otwarty dłużej niż 5
  minut, popup przepada i może pojawić się następnym razem. Obejście z
  `z-index` na stronie demo można zostawić, nie przeszkadza.

## v1.9.0-ma.5 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-ma` — warunki na stronie (kontrakt §13.11, wariant B)

- **Pokaż albo ukryj element według historii gościa**, samymi atrybutami w
  Webflow: `d2-ma-show-visits="3+/30d"` (3 wizyty w 30 dniach),
  `d2-ma-show-segment="2-pokoje"`, `d2-ma-show-views-rooms="3:2+"`,
  `d2-ma-show-lead="false"`, `d2-ma-show-pref-rooms="2"` i `d2-ma-hide-*`.
  Kilka atrybutów na jednym elemencie musi pasować wszystkie, `hide` wygrywa.
  Decyzja zapada w przeglądarce, nic nie jest wysyłane.
- **Bloki alternatywne**: kontener `d2-ma-variants` z blokami
  `d2-ma-variant="<nazwa>"`. Pokazuje się pierwszy pasujący, a gdy żaden nie
  pasuje, blok `default`.
- **Ukrywa CSS strony**, nie skrypt: każdy element z warunkami dostaje znacznik
  `d2-ma-cond`, a na stronie trzeba raz wkleić gotowy blok CSS (README,
  docs.html). Element z warunkiem bez znacznika skrypt ukrywa. Bez zgody i bez
  historii zostaje treść domyślna. Błędny warunek ukrywa element.
- **Podgląd** `?d2-ma-preview=2-pokoje`: pokazuje segment albo wariant bez zgody,
  bez zapisu i bez wysyłki do GA4.
- **Popup** z takim warunkiem na nakładce otworzy się dopiero, gdy warunek
  pasuje (veto w module popupów, tylko gdy na stronie jest d2-ma).
- **Segmenty w profilu**: `ma_segment` dodaje segment, `ma_segment_exit` zdejmuje
  ten sam. Trzymane tak długo jak historia.
- **Obraz i wideo w podmianie treści**: `content` z `image` albo `video`
  (YouTube i Vimeo bez ciasteczek, tylko po zgodzie marketingowej, wcześniej
  plakat z podpisem; MP4 z domeny strony).
- **Analityka pól formularza**: czas i kliknięcia na każdym polu (nazwa pola,
  nigdy treść) jako `ma_form_field` przy porzuceniu albo wysłaniu.
- **`frequency: "every_time"`** dla podmiany tekstu i mapy: zmiana wraca na każdej
  odsłonie, nie tylko na pierwszej.
- **`map_order`**: lokale pasujące do preferencji na początku listy 2destate
  (gdy 2destate wyda `setProductOrder`).
- Nowe w API: `digi2.ma.apply()`, `digi2.ma.allows(el)`.

**Zmiany dla kopert pisanych pod ma.4:**
- `ma_form_abandon` z akcji `datalayer` niesie dodatkowo `fields_touched`.
- `ma_segment` i `ma_segment_exit` bez `params.segment` dają ostrzeżenie w
  konsoli i nie zmieniają segmentów profilu. Zdarzenie do `dataLayer` idzie jak
  dotąd.
- Porzucony formularz i analityka pól liczą tylko formularze z `formIds`
  wyzwalacza. Dowolny formularz tylko wtedy, gdy pola `formIds` w ogóle nie ma.
  Pusta lista albo napis zamiast listy wyłączają ten węzeł z ostrzeżeniem.

### `d2-popups`

- Nakładka z atrybutem `d2-ma-show-*` / `d2-ma-hide-*` czeka z otwarciem na
  warunek d2-ma. Strony bez d2-ma bez zmian.

## v1.9.0-ma.4 — 2026-10-20 (przedpremierowa, nie `@latest`)

### `d2-ma` — nowe wyzwalacze i akcje (kontrakt §13.8)

Wszystko poniżej działa tylko wtedy, gdy koperta scenariusza ma dany węzeł, i
dopiero po zgodzie. Strona bez tych węzłów zachowuje się dokładnie jak na ma.3,
nie dostaje też żadnego nowego nasłuchu.

- **`exit_intent`**: gość wyprowadza mysz przez górną krawędź okna, raz na
  wizytę. Na telefonach i tabletach nie działa (nie ma wiarygodnego sygnału).
- **`engagement`**: czas na stronie (liczony tylko przy widocznej karcie),
  przewinięcie w % i filtr UTM (`utm_source` / `utm_medium` / `utm_campaign`
  z pierwszej strony wizyty). Sam filtr UTM z zerowym czasem = „przyszedł
  z kampanii”, odpala od razu.
- **`form_abandon`**: ktoś zaczął wypełniać formularz i go nie wysłał
  (bezczynność albo wyjście ze strony). Moduł wie tylko, który to formularz i ile
  pól dotknięto, a nigdy, co w nich wpisano. Formularz z `d2-ma-ignore` jest
  pomijany. Przy wyjściu ze strony nic nie jest wysyłane: scenariusz wykona się
  przy następnej odsłonie (najpóźniej po 24 h przepada).
- **Akcja `content`**: podmienia tekst elementu z `d2-ma-slot="<nazwa>"`, np.
  nagłówek „2 pokoje z ogródkiem”. Pola `{{pref.roomsLabel}}` („2 pokoje”,
  „5 pokoi”), `{{unit.name}}`, `{{unit.pricePerSqm}}` itd. Szablony tekstu
  przychodzą z panelu w kopercie. Tylko tekst, nigdy HTML. Gdy pole nie ma
  wartości, tekst zostaje bez zmian. Przycisk „Wyczyść” przywraca oryginał.
- **Akcja `map_mark`**: na mapie 2destate wyróżnia lokale pasujące do
  preferencji gościa, bez sprzedanych. Na dzisiejszym 2destate przełącza piętro
  i podświetla najlepszy lokal.
- **Nowe zdarzenia GA4** z akcji `datalayer`: `ma_exit_intent`, `ma_engaged`,
  `ma_form_abandon`, `ma_content`. Bez danych osobowych i bez treści pól.
- **Kanały z `via`** (§13.10) strona pomija: e-mail, SMS ani telefonu nie
  zleca przeglądarka, tylko lead po naszej stronie (decyzja Piotra MA-D30).
  Webhook z koperty v0 działa jak dotąd.
- **`cooldownMinutes`** na akcji: najmniejszy odstęp między jej wykonaniami,
  także między wizytami.

## v1.9.0-ma.3 — 2026-10-19 (przedpremierowa, nie `@latest`)

### `d2-ma` — zdarzenie przy wycofaniu zgody

- Gdy gość wycofa zgodę w trakcie wizyty (albo koperta zacznie wymagać
  zgody), moduł kasuje bazę i wysyła `ma:change` z
  `{ cleared: true, tracking: false, reason }`. Sekcja „co o Tobie wie
  strona” może na nim pokazać stan „brak zgody”. Wcześniej pola
  `[d2-ma-profile]` czyściły się bez żadnego zdarzenia.

## v1.9.0-ma.2 — 2026-10-19 (przedpremierowa, nie `@latest`)

### `d2-ma` — pola rejestru 2destate

- **Obrazek w popupie** (`d2-ma-field="image"`) z pola rejestru 2destate
  `obrazek-popup`, potem `marketing_image` / `image`. Klucze rejestru mają
  myślnik, więc wcześniejsze `popup_image` nie było czytane z niczego.
- **Nowe pole `d2-ma-field="promoText"`**: hasło promocji z pola rejestru
  `haslo-promocji`, tylko gdy promocja jest włączona (`promo_active`). Puste
  pole jest ukrywane jak każde inne. Oba pola są
  czytane z mapy (płasko) i ze świeżego statusu z Products API (pod `fields`).
- Świeży status z Products API (strona bez mapy) odświeża w popupie tylko
  status, cenę, promocję, obrazek i hasło. Nazwa i budynek zostają takie,
  jakie zapisało kliknięcie na mapie. Hasło promocji i obrazek usunięte w
  2destate znikają z popupu po świeżym odczycie i nie są pokazywane z
  zapisanej historii.
- Podświetlenie mapy: grupa o tym samym tytule co kształt nie wyłącza już
  podświetlenia tego kształtu. Pominięte kształty z powtórzonym tytułem widać
  w logu (`d2-debug`).

## v1.9.0-ma.1 — 2026-10-19 (przedpremierowa, nie `@latest`)

### Nowy moduł `d2-ma` — marketing automation na stronie (demo, kontrakt v0)

Wersja **wyłącznie do dema** „AI Marketing Automation dla deweloperów”. Tag
przedpremierowy nie przesuwa `@latest`, więc **strony klientów niczego nie
dostają**. Stronę demo ładuje się przypiętą wersją:

```html
<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@v1.9.0-ma.1/dist/digi2-loader.min.js"
  d2-ma="https://digi2.app/api/ma/scenario/osiedle-demo.json"
  d2-ma-consent-required="true"
  d2-popups></script>
```

Co robi:

- **Zapamiętuje obejrzane lokale** z 3D Estate (`oa3de__unit-open` w `dataLayer`,
  deep link `?sm-unit=`) i z mapy 2destate (`onProductClick`). Wszystko w
  przeglądarce odwiedzającego (IndexedDB `d2ma`, 90 dni), bez danych osobowych.
  Ten sam lokal w ciągu 5 s liczy się raz.
- **Wykonuje scenariusze z digi2.app**: wyzwalacze (obejrzał lokal / typ, wrócił,
  lead, wynik telefonu z CRM w demo), warunki (preferencja pokoi i piętra, lead,
  liczba wizyt) i akcje: popup „ostatnio oglądany” na module popupów (świeży
  status z 2destate, sprzedanego nie pokazuje), segment `ma_segment` /
  `ma_segment_exit` w `dataLayer` dla grup GA4, webhook do Make (tylko
  `testOnly: true`).
- **Do pokazu:** `demoState.timeScale` (minuta zamiast godziny), przycisk
  `d2-ma-simulate-return`, przycisk `d2-ma-clear`, sekcja „co o Tobie wie strona”
  (`d2-ma-profile`, `d2-ma-history`), podświetlenie preferowanych lokali na mapie
  2destate (`d2-ma-highlight`): tylko lokale z piętra na ekranie, bez grup,
  bez kształtów, których tytuł powtarza się na innym piętrze, po jednym na
  klatkę animacji. Po zmianie piętra podświetlenie wraca.
- **Zgody:** gdy koperta ma `storage.consentRequired: true` **albo** tag ma
  `d2-ma-consent-required="true"`, bez zgody nic nie jest zapisywane i żadna
  akcja nie rusza, a obejrzenia sprzed zgody przepadają. Wycofanie zgody
  kasuje bazę od razu, w tej samej wizycie. Zgoda jest czytana z każdego
  banera, który mówi Consent Mode. Rozstrzyga pierwsze źródło, które zna
  kategorię: `gtag('consent', 'update', …)` w `dataLayer` (także sprzed startu
  modułu), potem stan tagu Google (szablon CMP w GTM), potem `default` z `region`
  (tylko jako odmowa), potem `default` bez `region`. Na końcu moduł
  `d2-gtm`. Demo na digi2.agency działa z banerem zgód (decyzja
  Piotra z 19.10.2026). `demoState` z koperty z `consentRequired: false` działa
  po zgodzie.

- **Prywatność:** adres lokalu to ścieżka strony z samym `?sm-unit=` /
  `?d2-unit=` — `gclid`, `fbclid`, UTM ani nic innego z linku kampanii nie trafia
  do bazy ani do webhooka. Obrazek w popupie tylko z `https:`, link tylko `https:`
  albo ta sama domena. Profil nieodwiedzany dłużej niż retencja zaczyna się od
  nowa.
- **Na stronie klienta zawsze `d2-ma-consent-required="true"`** — bez tego koperta
  z `consentRequired: false` wyłączyłaby zgodę. `d2-ma-refresh` i `demoState`
  (`timeScale`, wynik telefonu) są tylko na demo.

Strona testowa: `sandbox/ma.html`. Szczegóły: README, sekcja „Marketing
Automation”.

**Co się zmieni na stronach, które już mają essentials:** nic, dopóki nie dodasz
flagi `d2-ma`. Loader zna nową flagę (`d2-ma`, `d2-ma-*`) i udostępnia `digi2.ma`
jako proxy, tak jak pozostałe moduły.

## v1.8.0 — 2026-10-14

### Rozwinięcie produktu w wyszukiwarce trafia do dataLayer z danymi produktu

Do tej pory otwarcie wiersza w wyszukiwarce wysyłało `select_item` z samą nazwą
grupy i wygenerowanym id taba (`accordion-1-5`). Z tego nie dało się powiedzieć,
**który** lokal ktoś obejrzał.

Teraz tab albo akordeon otwarty wewnątrz `[d2-cms-item]` wysyła dane tego wiersza,
czyli te same `d2-cms-field-*`, które i tak są na stronie dla filtrów i sortowania:

```html
<div d2-accordion-item d2-cms-item
     d2-cms-field-name="B.1.05" d2-cms-field-floor="1"
     d2-cms-field-area="52,30 m²" d2-cms-field-price="689 000 zł"
     d2-cms-field-status="Dostępne">…</div>
```

```js
{ event: 'select_item', interaction: 'expand',
  item_list_id: 'lokale', item_list_name: 'lokale',   // najbliższy d2-cms-list, bez niego nazwa grupy
  item_id: 'B.1.05', item_name: 'B.1.05',             // pole id, bez niego name / title
  item_floor: 1, item_area: 52.3, item_price: 689000, item_status: 'Dostępne' }
```

- Wysyła tylko przy **otwarciu**. Zamknięcie i domyślne otwarcie przy ładowaniu
  (`d2-accordion-open`, `d2-tab-default`) niczego nie wysyłają.
- Liczby (`"52,30 m²"`, `"689 000 zł"`) idą jako liczby. `"1.250.000 zł"` zostaje
  tekstem, chyba że dodasz `d2-cms-field-type-price="number"`.
- Zdarzenie jest neutralne branżowo: na `view_flat` czy Meta `ViewContent` tłumaczy je GTM.
- Na stronie musi być flaga `d2-datalayer`. Samo `d2-tabs` nic nie wysyła.

**Co się zmieni na stronach, które już mają `d2-datalayer`:** `select_item` z wiersza
`[d2-cms-item]` ma inne `item_id` (nazwa lokalu zamiast `accordion-1-5`),
inne `item_list_name` (nazwa listy zamiast grupy) oraz nowe parametry. Nie jest też
już wysyłany przy domyślnym otwarciu wiersza. Jeśli trigger GTM filtrował po starym
`item_id`, sprawdź go. Taby poza `[d2-cms-item]` działają bez zmian.

Dla programisty: `tabs:change` niesie teraz także `panel`, `trigger` i `initial`.

## v1.7.0 — 2026-09-30

### Popupy potrafią poczekać na koniec animacji intro

Strona, która otwiera się loaderem, psuła każdy wyzwalacz czasowy: `openAfterDelay: 7`
liczy od załadowania strony, więc przy sześciosekundowym intro popup otwierał się
**za kurtyną**, a kiedy animacja schodziła, wisiał na ekranie już od sekundy.

Nowa opcja `startOn` przesuwa linię startu:

```js
digi2.popups.create('promo', {
  popupSelector: '#popup-promo',
  startOn: 'intro:done',   // poczekaj na moment
  openAfterDelay: 7,       // …i dopiero wtedy odliczaj 7 s
})

// tam, gdzie kończy się animacja:
digi2.signal('intro:done')
```

W Designerze, bez ruszania JS-a strony:

| Atrybut | Element | Wartość |
|---|---|---|
| `d2-popup-start-on` | overlay popupu | `intro:done` |
| `d2-popup-start-timeout` | overlay popupu | `12` (sekundy) albo `never` |

Nazwa zdarzenia jest dowolna — jedna strona może czekać na `intro:done`, inna na
`video:ended`.

**Moment zgłosisz na trzy sposoby**, bo kto pisze animację, rzadko pisze popup:
`digi2.signal('intro:done')` (najlepszy), `window.dispatchEvent(new CustomEvent('intro:done'))`
albo to samo na `document`.

**Nowe w szynie zdarzeń: sygnały.** `digi2.emit()` dociera tylko do tych, którzy już
słuchają, a moduły dociągają się asynchronicznie — intro, które skończy się przed
`popups.js`, wołałoby w pustkę i bramka nie otworzyłaby się nigdy. `digi2.signal(nazwa)`
zapamiętuje, że coś się wydarzyło, `digi2.when(nazwa, fn)` odpala callback także po
fakcie, a `digi2.signalled(nazwa)` odpowiada true/false.

**Bezpiecznik.** Animacja potrafi nie dojechać: wtyczka z 404, odwiedzający
z `prefers-reduced-motion`, błąd trzy linijki wcześniej. Utrata wszystkich
automatycznych popupów na stronie jest gorsza niż pokazanie ich odrobinę za wcześnie,
więc **bramka otwiera się sama po 10 s**. `{ event, timeout: 12 }` zmienia ten czas,
`timeout: false` (albo `d2-popup-start-timeout="never"`) każe czekać bez końca.
Ustaw go odrobinę dłużej, niż trwa animacja.

**Bramka wstrzymuje tylko to, co strona wymyśliła sama** — `openOnLoad`,
`openAfterDelay`, exit intent, odsłony, bezczynność, scroll, szybki scroll, zmianę
karty i zegar sekwencji. Wszystko, po co sięga odwiedzający (`d2-show-popup`,
`openTriggerSelector`, `digi2.popups.show()`, hover, rage click, przechwycony link),
działa od razu: kto kliknął, ten poprosił.

Sekwencja przyjmuje to jako własną opcję — `digi2.popups.sequence(kroki, { startOn: 'intro:done' })`
— a czas czekania nie jest doliczany do wizyty. Przy `sequence` podanym w `create()`
wystarczy `startOn` na popupie.

**Bez `startOn` nic się nie zmienia**: bramka jest od razu otwarta, a wyzwalacze
podpinają się dokładnie tak jak dotąd.

### `minPageViews` — „dopiero gdy pozwiedzał, i dopiero po chwili"

`openAfterPageViews: 2` **jest** wyzwalaczem: otwiera popup w momencie wejścia na drugą
podstronę i nie da się go połączyć z opóźnieniem (wyzwalacze są łańcuchem else-if).
Nowa opcja to bramka, która łączy się z czymkolwiek:

```js
digi2.popups.create('oferta', {
  openAfterDelay: 30,   // 30 s na stronie…
  minPageViews: 2,      // …i nie wcześniej niż na drugiej podstronie wizyty
})
```

W Designerze: `d2-popup-min-pageviews="2"` na overlayu popupu.

Wstrzymuje **tylko otwarcia automatyczne** — klik w `d2-show-popup` czy `digi2.popups.show()`
otwiera popup zawsze, bo przycisk, który nic nie robi na pierwszej podstronie, jest gorszy
niż popup pokazany za wcześnie.

### Strona z dwoma popupami liczyła każdą odsłonę podwójnie

Licznik odsłon (`sessionStorage`, domyślnie `popupPageViews`) był podbijany przez **każdą
instancję** popupu przy starcie. Na stronie z dwoma popupami jedno wejście liczyło się jako
dwa, więc `openAfterPageViews: 2` odpalało już na pierwszej podstronie. Teraz odsłonę liczy
pierwsza instancja w dokumencie, a reszta tylko czyta.

## v1.6.5 — 2026-09-10

### Popup promocyjny nie wchodzi już na otwarty formularz — nigdy, nie tylko z sekwencji

Zgłoszone z `rajska77.com`: po kliknięciu „Zarezerwuj" w wyszukiwarce i zamknięciu
popupa nie dało się scrollować strony. Odtworzone — po drugim otwarciu i zamknięciu
formularza strona zostawała z `body { overflow: hidden }`, przy czym **żaden popup nie
był widoczny**: nie było czego zamknąć, a przycisk „Zarezerwuj" przestawał otwierać
cokolwiek. Ratował tylko reload. Winne były dwie rzeczy naraz.

**Zasada „jeden popup naraz" obejmuje teraz wszystkie popupy, nie tylko te z sekwencji:**

- **Popup otwarty automatycznie czeka** — `openAfterDelay`, exit intent, scroll,
  bezczynność, odsłony, krok sekwencji. Nie zasłania i nie zamyka tego, co jest na
  ekranie: parkuje się i wchodzi ~0,6 s po tym, jak ekran się zwolni. Promocja nie
  wchodzi na formularz, który odwiedzający właśnie wypełnia.
- **Popup otwarty świadomie przez odwiedzającego wygrywa** — `d2-show-popup`,
  `openTriggerSelector`, `digi2.popups.show()`, przechwycony link. To, co jest na
  ekranie, zamyka się **pierwsze**, a nowy popup wchodzi dopiero po tym zamknięciu, więc
  nie ma nawet klatki, w której widać oba.
- Odłożony popup przy swojej kolejce sprawdza wszystko od nowa: cookie zapisane w
  międzyczasie, harmonogram, `canShow()`. Czeka na wolny ekran, nie rezerwuje sobie pokazu.

Zmiana zachowania: dwa popupy otwarte jawnie (`show()`) nie nakładają się już na siebie —
wcześniej ustępował tylko popup otwarty przez sekwencję.

### Zdjęcie blokady scrolla nie zależy już od kaprysu przeglądarki

Koniec animacji zamykania czytany był z gołego `transitionend`, co myliło się w dwie strony.
Zdarzenie **bąbelkuje**, więc przejście przycisku *wewnątrz* popupu (choćby hover) wyglądało
jak koniec animacji samego popupu i rwało zamykanie w połowie. A bywa, że nie przychodzi
w ogóle — `display: none`, `prefers-reduced-motion`, transition nadpisany CSS-em strony,
karta w tle. Wtedy popup zostawał na zawsze „w trakcie animacji": trzymał blokadę scrolla,
`hide()` nic już nie robił, a `show()` nie otwierał go ponownie.

- Liczy się **wyłącznie własne zdarzenie popupu**, a nie to, które przyszło z dziecka.
- Do tego **zapadka czasowa** tuż po czasie animacji: bookkeeping domyka się nawet wtedy,
  gdy przeglądarka nie zgłosi niczego. Blokada scrolla zawsze schodzi.
- **Krzyżyk kliknięty w trakcie otwierania** zamyka popup, zamiast zostać zignorowany
  (`hide()` odmawiał pracy, dopóki trwała animacja wejścia).

## v1.6.3 — 2026-09-09

### Popup z sekwencji nie wchodzi już na formularz

Zgłoszone z `wielka16.com/products/…`: „nie działa zamykanie popupa po kliknięciu
Zapytaj o cenę". Zamykanie działało — problem był inny. Popup promocyjny
z sekwencji (`sequence: [4, …]`) wyskakiwał 4 s po wejściu i zostawał na ekranie.
Kliknięcie „Zapytaj o cenę" otwierało formularz **na nim**, więc zamknięcie
formularza odsłaniało tamten popup i wyglądało to tak, jakby krzyżyk nic nie zrobił.

- **Krok sekwencji czeka, gdy cokolwiek innego jest otwarte** i wchodzi dopiero,
  gdy ekran jest wolny. Nie przepada — czeka.
- **Popup otwarty świadomie przez odwiedzającego zamyka ten z sekwencji**, jeśli
  ten zasłania ekran. Ustępuje tylko popup otwarty przez sekwencję; ten, który
  strona otworzyła sama, zostaje nietknięty.

### Zablokowany scroll po zamknięciu popupów

Druga połowa tego samego zgłoszenia, i realny powód, dla którego „dalej nie
działa": po zamknięciu obu popupów **strona zostawała zablokowana** — nie dało
się jej przewijać, więc wyglądało to jak niezamknięty popup.

Każdy popup zapamiętywał `body.style.overflow` osobno. Przy dwóch nachodzących
drugi zapamiętywał `hidden` ustawione przez pierwszego: zamknięcie pierwszego
odblokowywało stronę **pod otwartym modalem**, a zamknięcie drugiego wpisywało
`hidden` z powrotem — na stałe. Blokada jest teraz liczona i zdejmowana, gdy
zamyka się ostatni popup, który ją trzymał.

## v1.6.2 — 2026-09-09

### Suwaki zakresu przestają się nawzajem zabijać

Dwa suwaki nad jedną listą przeliczały sobie nawzajem granice. Wystarczyło
przesunąć metraż na tyle, żeby została jedna oferta, a suwak ceny zwijał się do
punktu (`9 358 784 … 9 358 784`) — bez rozpiętości, więc martwy: nie reagował na
przeciąganie, klawiaturę ani kliknięcie w tor, a każdy kolejny ruch skakał.
Odtworzone na `bernardynska.com/wyszukiwarka`.

- **Granice liczą się wyłącznie z filtrów kategorialnych** (taby, chipy,
  checkboxy, selecty). Żaden filtr zakresu — ani własny suwaka, ani sąsiada —
  nie zawęża skali. Granice odpowiadają na pytanie „co jest w ofercie w tym
  tabie", a to pytanie o facety.
- **Suwak, którym się właśnie rusza, nie jest przeliczany.** Przeliczenie
  w trakcie przeciągania przesuwa mapowanie piksel→wartość pod palcem: ta sama
  pozycja kursora daje inną liczbę między dwoma zdarzeniami i uchwyt skacze.
- Zwężenie do jednej wartości przez **facet** zostaje — gdy tab zostawia jedno
  mieszkanie, „900 000 … 900 000" to prawda o ofercie, a facet da się odkliknąć.

Zachowanie, które ktoś mógł lubić, a które znika: wybór ceny nie zawęża już
skali metrażu. To świadomy kompromis — to sprzężenie zabijało widżet.

## v1.6.1 — 2026-09-07

- Pasek miniaturek w lightboxie jest **wyśrodkowany, dopóki się mieści**. Cztery
  zdjęcia siedzą na środku, a nie przy lewej krawędzi; do wyrównania od lewej
  pasek przechodzi dopiero przy przepełnieniu, bo wyśrodkowany pasek
  z przewijaniem ucina początek listy i nie da się do niej wrócić.

## v1.6.0 — 2026-09-07

### Lightbox: pasek miniatur w jednej linii, z przewijaniem

Pasek miniatur zawijał się do kolejnych rzędów, więc galeria z trzydziestoma
zdjęciami budowała pod zdjęciem kilkupiętrowy stos i wypychała samo zdjęcie
poza ekran — im więcej było do oglądania, tym mniej było widać.

Teraz pasek to **jedna linia**, niezależnie od liczby zdjęć:

- **wyśrodkowany, dopóki się mieści** — cztery miniatury siedzą na środku, nie
  przy lewej krawędzi; do wyrównania od lewej przechodzi dopiero, gdy jest ich
  za dużo (wyśrodkowany pasek z przewijaniem ucina początek listy i nie da się
  do niej wrócić)
- własne strzałki po bokach paska, widoczne **tylko wtedy, gdy jest co
  przewijać**, wygaszane na krańcach
- jedno naciśnięcie przesuwa ok. 80% szerokości widoku, zostawiając kilka
  miniatur w polu widzenia
- **pasek jedzie za galerią** — zmiana zdjęcia przewija pasek do aktywnej
  miniatury i centruje ją tam, gdzie jest miejsce
- pasek szanuje `prefers-reduced-motion` i przelicza się przy zmianie rozmiaru
  okna (obrót telefonu)

Pasek scrollbara jest ukryty — przewijasz gestem, strzałkami albo wybierając
zdjęcie. We własnym modalu kontener `[d2-lightbox-thumbs]` zachowuje Twój CSS;
automatyczne przewijanie do aktywnej miniatury działa i tam, strzałki są tylko
we wbudowanym.

## v1.4.0 — 2026-09-07

### Zdarzenia formularza w dataLayer — `generate_lead` mierzył zły moment

Dotąd `generate_lead` leciał w chwili kliknięcia „Wyślij", po walidacji
w przeglądarce — **zanim** Webflow wysłał zgłoszenie. Odrzucenie przez spam
guard, limit planu albo błąd sieci i tak liczyło się jako konwersja, a ponieważ
`generate_lead` jest zwykle kluczowym zdarzeniem w GA4 i trafia do Google Ads,
na tym sygnale uczyły się algorytmy licytacji.

Nowe zdarzenia — lecą **zawsze**, niezależnie od ustawień:

| Zdarzenie | Kiedy |
|---|---|
| `form_submit` | klik „Wyślij", walidacja kliencka przeszła |
| `form_submit_success` | **serwer przyjął zgłoszenie** (`.w-form-done`) |
| `form_submit_error` | serwer odrzucił (`.w-form-fail`) |
| `form_error` | walidacja kliencka odrzuciła (bez zmian) |

`form_submit_success` i `generate_lead` z potwierdzenia niosą kontekst leada:
`form_location`, `lead_source` / `lead_medium` / `lead_campaign` (z URL-a albo
z cookie), `has_gclid` / `has_fbclid` jako **boolean**, `consent_marketing`.
Treść pól nigdy nie trafia do `dataLayer`.

**`generate_lead` bez zmian domyślnie.** Nadal leci przy `form_submit`, żeby
nie ruszyć liczb u nikogo, kto ma je już wpięte w GA4 i Ads. Przepięcie na
prawdziwy sygnał to jeden atrybut, do włączenia świadomie:

```html
<script src="…/digi2-loader.min.js" d2-forms d2-datalayer d2-datalayer-lead="success"></script>
```

Przed przełączeniem u klienta: sprawdź kluczowe zdarzenia w GA4 i import
konwersji do Ads. Wszystkie cztery zdarzenia lecą też przed przełączeniem, więc
poprawną konwersję można zbudować i zweryfikować w GTM zawczasu. Rozjazd między
`form_submit` a `form_submit_success` to darmowy wskaźnik awarii formularza.

Wykrywanie działa na każdym `.w-form`, zarejestrowanym przez `create()` czy nie
— wcześniej `generate_lead` w ogóle nie działał bez wywołania `create()` /
`createAll()` w kodzie strony. Stan sukcesu widoczny już w chwili wczytania
strony jest ignorowany; liczy się wyłącznie przejście w ten stan.

### Lejek formularza — gdzie ludzie odpadają

Nowa grupa `forms-detail` (osobna, bo gadatliwa — wyłączasz przez
`d2-datalayer-disable="forms-detail"` nie tracąc zdarzeń konwersji):

| Zdarzenie | Kiedy |
|---|---|
| `form_start` | pierwsza interakcja z formularzem — **raz na wizytę**, nie na odsłonę |
| `form_field_interaction` | **pierwsza zmiana każdego pola**, z `field_name` i `field_type` |
| `form_submit_click` | naciśnięcie przycisku, **przed** walidacją |

Razem daje to pełny lejek: `form_start → form_field_interaction →
form_submit_click → form_submit / form_error → generate_lead /
form_submit_error`. Różnica `form_submit_click` minus `form_submit` to
„nacisnął i odbiła go walidacja", a pole, na którym ludzie się zatrzymują, widać
jako ostatnie `form_field_interaction` przed porzuceniem.

Do `dataLayer` trafia **nazwa i typ pola, nigdy wpisana wartość** — żadnych
maili, telefonów ani treści wiadomości. `form_field_interaction` leci przy
pierwszej zmianie pola, nie przy każdym `blur`: formularz z 12 polami inaczej
wypychałby tuzin zdarzeń na użytkownika i zaszumił raporty GA4.

### Poprawki z tej samej analizy

- **Testy A/B raportowały puste zdarzenia.** Most czytał `d.test` / `d.variant`,
  a moduł emituje `ab_test` / `ab_variant`, więc do `dataLayer` szło samo
  `{event: 'experiment_impression'}` bez parametrów.
- **`select_content` bez `item_id`** — `lightbox:open` nie niósł `src`.
- **Testy A/B raportowały się dwa razy** — moduł `ab-tests` pcha
  `digi2_ab_assigned` sam, a most `datalayer` mapuje to samo zdarzenie na
  `experiment_impression`. Oba nadal lecą domyślnie (klienci mają triggery GTM
  na nazwach `digi2_*`), ale `d2-ab-datalayer="false"` wyłącza własny push
  modułu tam, gdzie robotę wykonuje most.
- **Nazwy ukrytych pól w README** były nieaktualne: dokumentacja podawała
  `utm_source_hidden`, `gclid`, `page_url` małymi literami, a moduł wstrzykuje
  `UTM_SOURCE`, `GCLID`, `PAGE_URL` wielkimi. Kto mapował pola po nazwie w CRM
  albo w Make, dostawał puste wartości.
- **`console.warn` w module google** odsyłał do nieistniejącego atrybutu
  `g-gtm-id` zamiast `d2-gtm`.

## v1.3.7 — 2026-09-04

### Popupy: kierowanie na źródło ruchu

- `d2-popup-utm="utm_source:facebook|instagram"` — popup tylko dla ruchu z danej
  kampanii. Sam klucz albo `*` = dowolna niepusta wartość, dopasowanie dokładne
  i niewrażliwe na wielkość liter, klucz to dowolny parametr URL (`ref:partner-a`).
- `d2-popup-utm-exclude="utm_medium:cpc"` — odwrotnie; wyklucznie wygrywa.
- Opcje JS: `utm`, `utmExclude`, `utmCookie` (domyślnie `true`), `utmCookieDays` (365).
- Kampania jest zapamiętywana w cookie przy pierwszym wejściu, pod tą samą nazwą
  co w module forms — bramka działa też na kolejnych podstronach, gdzie w URL-u
  nie ma już `?utm_source=`.
- Kolejność bramek: URL → ruch → harmonogram → promocja → `canShow`. Niedopasowanie
  ruchu nie jest parkowane dla `showIfPending()`, a krok sekwencji, który nie pasuje
  do ruchu, jest pomijany — inaczej łańcuch stanąłby na nim do końca wizyty.

### Poprawki odczytu cookies (dotyczą wszystkich popupów, nie tylko nowych)

- Odczyt ciasteczka dekodował **cały** nagłówek `document.cookie` przed rozbiciem
  na pary. Jedno obce ciasteczko z gołym `%` (np. `promoCode=SAVE50%`) rzucało
  `URIError`, co zamieniało się w „brak wartości" — filtr wykluczający otwierał
  się wtedy dla ruchu, który miał wykluczać. Zakodowany `;` w cudzym ciasteczku
  fabrykował pary, więc obcy skrypt mógł podszyć się pod wartość kampanii.
- Ten sam błąd siedział w istniejącym odczycie ciasteczka „nie pokazuj ponownie",
  w dodatku bez `try/catch`: jedno ciasteczko z `%` na stronie wywalało wyjątek
  przez `_isCookieSet()` i `_init()`, zabierając całe wywołanie `create()`.

## v1.3.6 — 2026-09-02

- `d2-static-width` przyjmuje wartości per breakpoint: `d2-static-width="left;right@728"`
  — kotwica zmienia się razem z szerokością okna. Wcześniej był to jedyny atrybut
  czytany surowo, z pominięciem parsera responsywnego.
- Wartość, która nie obowiązuje przy danej szerokości, czyści kotwicę zamiast
  zostawiać ustawienie z innego progu.
- Zablokowana szerokość jest mierzona od nowa przy zmianie progu — pomiar z desktopu
  potrafił ściskać element na mobile, gdzie ta sama treść zawija się węziej.
- Pierwsze testy loadera (wcześniej nie miał żadnych).

## v1.3.0 – v1.3.5 — 2026-08-21

Moduł country-picker (angielskie nazwy krajów wybierane po URL-u, parowanie pola
z przełącznikiem w obrębie formularza, szerokość podążająca za przyciskiem),
kolory pól autouzupełnionych przez przeglądarkę oraz liczniki wyników CMS
w dwóch językach z poprawną odmianą liczby mnogiej.

## v1.2.0 – v1.2.3 — 2026-08-21

Poprawki modułu country-picker: flaga loadera nie jest polem telefonu, własne
ustawienie przełącznika przez autora nie jest nadpisywane.

## v1.1.0 – v1.1.1 — 2026-08-13

- Formularze wracają z ekranu „Dziękujemy" do pustego formularza:
  `d2-form-reset="30"` na wrapperze `.w-form`, opcja `resetAfterSuccess`,
  API `digi2.forms.autoReset()` / `.restore()`.
- Wartości ukrytych pól śledzących (`UTM_*`, `GCLID`, `IP_ADDRESS`) przeżywają
  reset; przy błędzie wysyłki znika sam komunikat, a wpisane dane zostają.

## v1.0.0 – v1.0.1 — 2026-08-13

- Sekwencje popupów przez całą wizytę: `sequence: [4, {after: 60, afterPageChange: true}, 180]`
  w `create()` dla jednego popupu, `digi2.popups.sequence([...])` dla łańcucha różnych.
  Zegar stoi, gdy karta jest w tle; stan przeżywa przejścia między podstronami.
- Ostrzeżenie, gdy sekwencję ucisza ciasteczko z wcześniejszej konfiguracji —
  wtedy nowi odwiedzający widzą wszystko, a powracający nic.
- Pierwsze tagi semver w repo. Wcześniej `@latest` nie miał się do czego odnieść
  i zamrażał się na przypadkowym commicie, czego żaden purge nie ruszał.
