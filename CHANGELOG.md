# Changelog

Wersje odpowiadają tagom w repo. `@latest` na jsDelivr wskazuje najnowszy tag,
więc wydanie = tag + purge (patrz [CLAUDE.md](CLAUDE.md#wydanie)).

Format: co się zmieniło z punktu widzenia osoby budującej stronę.

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
