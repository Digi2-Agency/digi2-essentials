# Changelog

Wersje odpowiadają tagom w repo. `@latest` na jsDelivr wskazuje najnowszy tag,
więc wydanie = tag + purge (patrz [CLAUDE.md](CLAUDE.md#wydanie)).

Format: co się zmieniło z punktu widzenia osoby budującej stronę.

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
