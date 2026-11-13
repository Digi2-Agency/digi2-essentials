# Changelog

Wersje odpowiadają tagom w repo. `@latest` na jsDelivr wskazuje najnowszy tag,
więc wydanie = tag + purge (patrz [CLAUDE.md](CLAUDE.md#wydanie)).

Format: co się zmieniło z punktu widzenia osoby budującej stronę.

**Wersje przedpremierowe `v1.9.0-ma.N` a `@latest`.** `@latest` na jsDelivr
pomija tagi z sufiksem, więc pliki z wersji stabilnych idą z najnowszej stabilnej
1.8.x (dziś 1.8.2). Pliku, którego nie ma w żadnej wersji stabilnej
(`dist/modules/ma.min.js`), jsDelivr szuka jednak w najnowszym tagu, który go ma —
także przedpremierowym, także na gałęzi spoza `main`. Strona z `d2-ma` na
`@latest` dostaje więc najnowszy `ma.N` zaraz po tagu (cache CDN do 12 h; purge
czyści tylko CDN, przeglądarki trzymają plik do 7 dni), a loader 1.8.x zamienia
każdy nieznany atrybut `d2-x` na moduł `x`. Strona z `d2-ma` wskazuje
przypiętą wersję (`@v1.9.0-ma.N/dist/...`). Strony bez `d2-ma` na `@latest` nowych
tagów `ma.N` nie dostają — także zmian w `popups.js` z tej linii.

## v1.9.0-ma.52 — niewydana (czeka na akceptację wydania)

- **Popupy: „jeden popup naraz” obejmuje też baner zgód i popupy pisane przez
  stronę** (standard agencji z 13.11). Popup otwierany automatycznie
  (`openAfterDelay`, exit intent, scroll, bezczynność, krok sekwencji) nie
  wchodzi już na widoczny baner d2-cookies (`#consentsBanner`, `.d2c`), na
  element oznaczony `d2-modal` / `data-d2-modal` ani na żaden widoczny
  `[aria-modal="true"]` spoza biblioteki. Czeka (sprawdzanie co 1 s, tylko gdy
  coś czeka) i wchodzi ~0,6 s po zniknięciu tamtego elementu; krok sekwencji
  ponawia się na swoim takcie. Popup otwarty klikiem (`d2-show-popup`,
  `digi2.popups.show()`) otwiera się od razu, jak dotąd. Element ukryty
  (`hidden`, `aria-hidden="true"`, `display: none`, `visibility: hidden`,
  `opacity: 0`, poza ekranem) niczego nie blokuje.
  Co zrobić na stronie: popup pisany ręcznie oznacz na overlayu atrybutem
  `data-d2-modal` (pusty). Uwaga: strona, której baner zgód nigdy nie znika
  (np. odwiedzający go ignoruje), nie zobaczy popupów automatycznych, dopóki nie
  odpowie na baner — to zamierzone.
- **Nowe `digi2.popups.isScreenBusy()`** — `true`, gdy na ekranie jest popup
  biblioteki (także w trakcie znikania), otwarty lightbox albo jeden z modali
  wyżej. Własny skrypt popupu strony pyta o to zamiast trzymać własną listę
  selektorów.

## v1.9.0-ma.51 — 2026-11-11 (przedpremierowa, `@latest`: patrz uwaga na górze)

- **`d2-ma`: ostrzeżenie, gdy przycisk kontaktu nie ma dokąd przewinąć.**
  Przycisk `contact` bez własnego adresu (`href="#"` albo brak) przewija do
  `[d2-ma-contact]`, a bez niego do `#kontakt`. Gdy na stronie nie ma żadnego
  z nich, klik tylko zamyka popup. Teraz skrypt pisze o tym w konsoli, raz na
  popup: `[digi2.ma] popup "d2-ma-promo-filter" has a contact button without
  its own href, but the page has no [d2-ma-contact] or #kontakt…`. Popup
  strony sprawdzany jest od razu po starcie, popup z szablonu panelu i
  wbudowany — przy pokazaniu. Naprawa po stronie strony: oznacz formularz
  `d2-ma-contact` albo daj przyciskowi prawdziwy adres (`/kontakt`, `tel:`).
- **`d2-ma`: klik kontaktu bez celu dostaje informację `no_target: true`**
  w `ma_popup_cta` (dataLayer) i `ma:action`. Klik dalej liczy się jako
  kontakt; pole pojawia się tylko w tym przypadku, inne kliki bez zmian.

## v1.9.0-ma.50 — 2026-11-10 (przedpremierowa, `@latest`: patrz uwaga na górze)

- **`d2-ma`: popup `promo-filter` z własnymi tekstami bez wydania JS** (zasada 9
  standardu „Designer = strona”). Wbudowane teksty („Dla Ciebie”, zdanie o
  pokojach, „Porozmawiajmy”) zostają tylko jako zapas. Własne teksty daje
  popup zbudowany w Designerze jako `[d2-ma-popup="promo-filter"]`: tekst jest
  zwykłym tekstem Webflow, a liczba pokoi trafia do spana
  `d2-ma-field="pref.rooms"` (albo `pref.roomsLabel` → „3 pokoje”,
  `pref.floor`). Pola `pref.*` działają w każdym popupie; puste pole jest
  ukrywane. Druga droga bez zmian: szablon panelu o id `promo-filter`.
- **`d2-ma`: przycisk `contact` w popupie strony.** Bez własnego adresu
  (`href="#"` albo brak) zamyka popup i przewija do `[d2-ma-contact]` /
  `#kontakt`, jak w szablonie panelu. Z adresem (`#kontakt`, `/pl/kontakt`)
  zamyka popup, a przeglądarka idzie pod adres. Do ma.49 oba warianty były
  martwe: klik był blokowany i nic się nie działo.
  **Kogo dotyczy:** strony z `d2-ma` i własnym `[d2-ma-popup]` z przyciskiem
  `d2-ma-template-cta="contact"`. Dziś żadna znana strona nie ma takiego
  popupu. Wbudowane popupy i szablony panelu działają jak w ma.49.

## v1.9.0-ma.49 — 2026-11-10 (przedpremierowa, `@latest`: patrz uwaga na górze)

- **`d2-ma`: „Porozmawiajmy” we wbudowanym popupie `promo-filter` przewija do
  formularza.** Przycisk ma akcję `contact`, ale do ma.48 przewijał tylko w
  popupie z szablonu panelu. Wbudowany ma `href="#"`, więc klik wysyłał
  `ma_popup_cta`, zamykał popup i na tym koniec. Teraz zamyka i po 450 ms
  przewija do `[d2-ma-contact]`, a bez niego do `#kontakt`. Bez żadnego celu
  tylko zamyka, jak dotąd. Własny `[d2-ma-popup]` strony bez zmian.
  **Kogo dotyczy:** strony z `d2-ma` i scenariuszem z popupem `promo-filter`
  (dziś Demo marketing automation na digi2.agency). Strona przypięta do
  `@v1.9.0-ma.4x` dostaje poprawkę dopiero po przepięciu na `ma.49`.
- Bramka wydania (bez wpływu na strony): serwer testów w przeglądarce bierze
  5179, a gdy port jest zajęty (inna bramka albo pozostawiony serwer), dowolny
  wolny. Wcześniej bramka padała na czerwono, zanim ruszył jakikolwiek test.

## v1.9.0-ma.48 — 2026-11-09 (przedpremierowa, `@latest`: patrz uwaga na górze)

- **Kalendarz `d2-booking`: tydzień zaczyna się od poniedziałku w każdym
  języku.** Do ma.47 pierwszy dzień tygodnia szedł za językiem strony, a samo
  `en` przeglądarka czyta jak angielski amerykański, więc angielska wersja
  strony zaczynała tydzień od niedzieli, a polska od poniedziałku. Teraz
  domyślnie jest poniedziałek. Nowy atrybut `d2-booking-week-start` na
  kalendarzu albo na tagu loadera (dla wszystkich kalendarzy): `mon`
  (domyślnie), `sun` (niedziela) albo `auto` (region z `<html lang>`, np.
  `en-US` → niedziela, `en-GB` → poniedziałek; bez regionu sam język, czyli
  zachowanie sprzed ma.48). **Kogo dotyczy od razu:** `booking.min.js` nie ma
  w żadnej wersji stabilnej, więc strona z `d2-booking` na `@latest` dostaje
  ma.48 zaraz po tagu (cache CDN do 12 h), bez przepinania. Strona przypięta do
  `@v1.9.0-ma.4x` dostaje zmianę dopiero po przepięciu. **Co zrobić na
  stronie:** nic, chyba że strona celowo pokazywała tydzień od niedzieli. Wtedy
  dopisz `d2-booking-week-start="sun"`.
- **`digi2.booking.apply()` nie czeka już na sloty `d2-booking-bind` poza
  listą** (zmiana z ma.47, dopiero teraz zapisana). Obietnica rozwiązuje się,
  gdy gotowe są kalendarze, lista i bloki powrotu. Zdjęcie i opis obiektu
  strony mogą dojść chwilę później, a moduł nie ogłasza tego osobnym
  zdarzeniem. Kod strony, który po `await apply()` czytał te sloty, musi je
  sprawdzić później (np. po zdarzeniu `load` obrazka).
- Sloty poza listą: błąd przy wpisywaniu danych obiektu kończy się jednym
  ostrzeżeniem w konsoli, a nie „Uncaught (in promise)”. Slot, który już
  pokazuje dany obiekt, nie wraca do treści z Designera.

## v1.9.0-ma.47 — 2026-11-09 (przedpremierowa, `@latest`: patrz uwaga na górze)

Poprawki po recenzji ma.46 (#75).

- **`d2-booking-bind` poza listą: nigdy zdjęcie innego apartamentu.** Gdy gość
  wybierze w kalendarzu inny obiekt, a jego odczyt się nie uda, sloty wracają do
  tego, co zbudowano w Designerze: tekst i znaczniki w środku, `src`/`alt`
  obrazka, tło. W ma.46 zostawało zdjęcie i nazwa poprzednio wybranego obiektu.
- Wybór z kalendarza wygrywa także z `d2-booking-product` wpisanym na slocie,
  bo sloty pokazują to, co gość właśnie rezerwuje. Tak było już w ma.46, teraz
  jest to opisane.
- Wolna odpowiedź o obiekcie w sekcji nad widgetem (np. inny apartament) nie
  wstrzymuje już startu kalendarza.
- Loader: bezpiecznik 10 s jest kasowany, gdy moduły drugiego loadera dotrą
  normalnie. Zachowanie się nie zmienia, w pamięci nie zostaje martwy zegar.
- Dwa loadery: deklarację `<digi2-module>` czyta pierwszy loader, więc
  zadeklarowany tak moduł przychodzi z jego adresu (`@latest`). Moduł, który ma
  przyjść z przypiętej wersji, stawiaj na tagu przypiętego loadera. To nie jest
  zmiana, teraz jest opisane.
- Testy: ścieżka „moduł pobiera już pierwszy loader”, callback zarejestrowany
  po bezpieczniku odpala od razu.

## v1.9.0-ma.46 — 2026-11-09 (przedpremierowa, `@latest`: patrz uwaga na górze)

**Loader: dwa loadery na jednej stronie nie podwajają już `digi2.onReady`.**
Dotyczy stron z loaderem witryny (`@latest`) i drugim loaderem w Embedzie,
przypiętym do wersji dla `d2-booking`.

- Do ma.45 każdy callback `digi2.onReady` umieszczony pod drugim tagiem
  wykonywał się **dwa razy**. `forms.create` / `popups.create` tylko ostrzegały
  („already exists”), ale kod strony, który w callbacku dokładał listenery,
  robił to podwójnie. Przykład z pierwszej strony z bookingiem:
  `select_promotion` trafiał do dataLayer 2× na jeden klik.
- Od ma.46 drugi loader dołącza do pierwszego. `onReady` odpala **raz**, gdy
  są już moduły obu loaderów (moduł, który się nie załadował, też się liczy
  jako gotowy). Każdy moduł przychodzi ze swojego loadera: formularze z
  `@latest`, booking z przypiętej wersji, nic dwa razy.
- **Co zrobić na stronie:** przepiąć Embed z `@v1.9.0-ma.4x` na
  `@v1.9.0-ma.46`. Tag witryny zostaje bez zmian, bo poprawka siedzi w drugim
  loaderze. **Warunek:** loader witryny musi wykonać się pierwszy, czyli stać w
  `<head>` (Site Settings → Head), nad Embedem, i bez `async`/`defer`. Jeśli
  stoi w stopce, ma `async` albo na stronie są dwa Embedy, oba loadery muszą
  być ≥ ma.46. Strażnik „raz” dopisany doraźnie w kodzie strony nie szkodzi
  i może zostać.
- Bezpiecznik: jeśli moduł drugiego loadera nie przyjdzie wcale (zawieszone
  połączenie), `onReady` rusza najpóźniej po 10 s, a w konsoli pojawia się
  ostrzeżenie z nazwą modułu. Formularze nie czekają w nieskończoność.
- Deklaracje `<digi2-module>` czyta tylko pierwszy loader, a `digi2.modules`,
  `digi2.attr` i `d2-static-width` zostają z pierwszego. Strona z jednym
  loaderem działa jak dotąd.

**`d2-booking`: zdjęcie, nazwa i opis apartamentu poza listą.**

- `d2-booking-bind` działa teraz także **poza** listą wyników: w widgecie, w
  formularzu, w sekcji nad nimi. Pokazuje obiekt, który rezerwuje ta strona
  (`<img d2-booking-bind="image">`, `<h2 d2-booking-bind="name">`,
  `<p d2-booking-bind="description">`), z tymi samymi polami i zasadami co
  karta listy. Na stronie jednego apartamentu nie trzeba już wklejać zdjęcia
  ręcznie.
- Obiekt to ten wybrany w kalendarzu, a jeśli kalendarz żadnego nie wybrał:
  najbliższy `d2-booking-product`, potem z tagu loadera, potem `?apartament=`.
  Wybór innego obiektu w kalendarzu przepina sloty. Dane pochodzą z tego samego
  zapytania o obiekt, które strona już robi (z `?lang=`), więc nic nie
  dochodzi.
- Gdy obiektu nie da się odczytać, sloty zostają takie, jak w Designerze.
  Wiersze listy dalej biorą każdy swój obiekt.
- Do zrobienia osobno: opcjonalny nagłówek ze zdjęciem w **narysowanym**
  widgecie. Na razie sloty buduje się w Designerze.

## v1.9.0-ma.45 — 2026-11-08 (przedpremierowa, `@latest`: patrz uwaga na górze)

Poprawka wyzwalacza `page` z ma.44 (warunek architekt-it z recenzji #72).
**Zatwierdzaj w 2destate ma.45, nie ma.44.**

- Wpis w `paths` ze znakiem, którego adres strony nigdy nie zawiera
  (`? # " < > \ ` { }` albo spacja), wyłącza węzeł. `| ^ [ ]` przechodzą,
  bo przeglądarka zostawia je w adresie bez kodowania. Dotyczy to np.
  wklejonego `/kontakt?utm_source=fb` albo `/oferta#formularz`. W ma.44 taki
  wpis w `exclude` po cichu nie wykluczał, więc popup pokazywał się szerzej.
- `return_visit → akcja → page`: akcja należy do bieżącej odsłony, więc `page`
  odpala na następnej. Zachowanie się nie zmienia, teraz jest zapisane wprost
  i ma swój przypadek.
- ma-cases: 36 przypadków. Rozszerzony 030 (nowe znaki) i nowe 033–036:
  akcja przed `page`, powtórzony prefiks, 11 wpisów `langPrefixes`, `chance`
  ze znakiem spoza BMP.

## v1.9.0-ma.44 — 2026-11-08 (przedpremierowa, `@latest`: patrz uwaga na górze)

**`d2-ma`: nowy wyzwalacz `page` — popup tylko dla wybranych stron i gości**
(spec silnika §13.8.2, PR #1903). Koperta, która go używa, ma `minScript: "ma.44"`.
Panel nie pozwoli jej opublikować, dopóki strona i zatwierdzona wersja skryptu
w 2destate (`MA_APPROVED_SCRIPT`) nie są ≥ ma.44.

- Filtry w `when`: `paths` (`include` / `exclude`), `lang` (klucze nowego pola
  koperty `langPrefixes`, np. `{ "pl": "/", "en": "/en" }`), `device`
  (`desktop` | `mobile`), `minPageViews`, `minSeconds`, `minScrollPct`,
  `chance` (odsetek gości, stały dla gościa). Raz na odsłonę.
- Ścieżka z granicą segmentu: `/kontakt` nie łapie `/kontakty-handlowe`, `"/"`
  to tylko strona główna. Wielkość liter ma znaczenie, polskie znaki wpisuje się
  zakodowane (`%C5%BC`).
- Działa „na zamknięte”: nieznane pole albo zła wartość wyłącza ten węzeł z
  ostrzeżeniem w konsoli, zamiast pokazać popup szerzej. Starszy skrypt nie zna
  `page` i też nic nie pokaże.
- Po innym wyzwalaczu (`unit_view → page`) liczy się następna pasująca odsłona,
  nie ta, na której to się stało — także gdy lokal obejrzano przy ładowaniu
  strony. Wyjątek: `return_visit → page` odpala na stronie, która otworzyła
  wizytę powrotną.
- Wpis w `paths` z `/` na końcu (`"/kontakt/"`), z polskim znakiem wpisanym
  wprost albo z wielką literą poza `%XX` wyłącza węzeł — tak samo odrzuca go
  panel przy publikacji.
- Strony bez wyzwalacza `page` nie dostają żadnego nowego nasłuchu.

**Przypadki zgodności `tests/fixtures/ma-cases/`** (32 na start, wszystkie o
`page`). Ten sam plik czyta symulacja osi czasu popupów w panelu 2destate. Jest
na CDN pod `@v1.9.0-ma.44/tests/fixtures/ma-cases/index.json`. Niespełniony
przypadek zatrzymuje bramkę wydania.

## v1.9.0-ma.43 — 2026-11-08 (przedpremierowa, `@latest`: patrz uwaga na górze)

**`d2-booking`: płatność niedostępna, bo wdrożenie nie ma strony powrotu**
(kontrakt 2destate: nowy błąd 409 `payment_return_unavailable`, PR 2destate #358;
`contract_version` bez zmian, 1).

- **Z płatności** (rezerwacja już jest): stan `d2-booking-payment="final"`,
  przycisk zostaje wyłączony, nie ma ponawiania. Do tej pory moduł brał ten
  powód za nieznany, pokazywał „Spróbuj ponownie” i oddawał przycisk, więc gość
  klikał w kółko w ten sam błąd. Zdanie: „Płatność online jest chwilowo
  niedostępna. Rezerwacja jest wstępna i nieopłacona — skontaktuj się z
  obiektem, aby ją potwierdzić.” Rezerwacja wygasa jak zwykła blokada, a
  właściciel może ją do tego czasu zatwierdzić albo oznaczyć jako opłaconą w panelu.
- **Z zakładania rezerwacji przedpłaconej** (zanim zajmie termin): ten sam stan
  końcowy, rezerwacja nie powstaje, `booking:created` nie leci, płatność się nie
  otwiera. Zdanie mówi, że termin nie został zarezerwowany.
- W obu przypadkach komunikat ma spokojny styl `d2-booking-ok` (to nie błąd
  gościa), a `booking:refused` niesie `reason: 'payment_return_unavailable'`.
- Słowniki `pl`/`en`/`de`/`uk`: nowe klucze `payment_return_unavailable` i
  `payment_return_unavailable_unbooked` (`de`/`uk` maszynowe, jak reszta).
- `digi2.ma.version` = 43. W `ma.js` nic poza numerem się nie zmienia.

## v1.9.0-ma.42 — 2026-11-07 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.41–ma.16)

**Nowy moduł `d2-booking`**: rezerwacja apartamentu ze strony klienta przez
publiczne API 2destate. Obejmuje formularz, kalendarz, cenę, płatność, powrót z
płatności, obsługę rezerwacji z linku w mailu, listę obiektów z wyszukiwarką i
słowniki `pl`/`en`/`de`/`uk`. Szczegóły w sekcjach „ma.42 — …” niżej (etapy 5,
6 i 8 oraz poprawki po recenzjach). Poza bookingiem w `dist/` zmienia się tylko
loader: atrybut `d2-booking` na tagu.

- **Strona z bookingiem przypina wersję:** `@v1.9.0-ma.42/dist/...`, nie
  `@latest`. `@latest` zostaje na loaderze 1.8.3, a `booking.min.js` dostaje z
  tego tagu (plik nowy, patrz uwaga na górze). Uruchamia go tylko strona z
  `d2-booking`.
- **Język:** bez atrybutu widget mówi `default_language` klucza, a
  `<html lang>` nie jest czytany. Strona wielojęzyczna (Webflow Localization)
  dopisuje `d2-booking-lang="auto"`, a jeden język na sztywno to
  `d2-booking-lang="de"`.
- **Pomiar:** Form Block nie wysyła danych gościa do Webflow Forms, a trigger
  formularza w GTM tego nie usłyszy. Rezerwację mierz zdarzeniem
  `booking:created`, które nie niesie danych gościa.
- Tłumaczenia `de` i `uk` są maszynowe i czekają na przeczytanie przez native
  speakera.
- `ma.min.js`: zmienia się tylko numer wersji (`digi2.ma.version` = `ma.42`),
  bez zmian w działaniu. Strony przypięte do `ma.N` bez zmian.

## ma.42 — `d2-booking`: słowniki językowe `pl`, `en`, `de`, `uk` (etap 8)

Każde zdanie, które czyta gość, siedzi teraz w **słowniku językowym** — po
jednym na język, płaski `klucz → zdanie`, w tym samym kształcie co pliki
i18next portalu (decyzja D7), żeby ten sam klucz dał się znaleźć po obu
stronach. Moduł nie ma zależności, więc i18next w nim być nie może: te małe
tablice to całość jego tłumaczenia. Są cztery języki, te same, z którymi
startuje portal: **`pl`, `en`, `de`, `uk`**. Polskie zdania **nie zmieniły się
ani o literę** — są przepisane jeden do jednego i przypięte w testach.

- **`d2-booking-lang="de"`** na tagu loadera ustawia język, w którym gość czyta
  stronę (`pl`, `en`, `de`, `uk`). Bez atrybutu decyduje `default_language`
  klucza. Czytane przez `digi2.attr`.
- **`<html lang>` jest czytany tylko przy `d2-booking-lang="auto"`** (decyzja
  Piotra, 2026-11-07). Webflow ustawia w wielu projektach domyślnie
  `<html lang="en">`, więc czytany sam z siebie przestawiłby polską stronę
  klienta na angielski po cichu. Strona wielojęzyczna (Webflow Localization),
  która ustawia `lang` na każdej wersji językowej, włącza to jednym słowem:
  `d2-booking-lang="auto"`.
- Kolejność jest jedna: `d2-booking-lang` (albo przy `"auto"` — `<html lang>`)
  → `default_language`.
  Język, na który **klucz nie pozwala** (`languages` z `/config`) — albo taki,
  którego moduł nie ma w słowniku — wraca do domyślnego: pół strony po
  niemiecku obiecuje usługę, której właściciel nie da. **W konsoli mówi o tym
  wpisany atrybut** `d2-booking-lang`; odmowa `<html lang>` przy `"auto"`
  jest cicha. Klucz, którego `/config` nie ma
  `languages` wcale, nie jest pilnowany (nie ma z czym porównać): atrybut
  zostaje w mocy, a wszystko inne działa jak dotąd.
- Sam **domyślny język klucza jest pilnowany tak samo**: `default_language`,
  którego moduł nie ma w słowniku (np. `fr`), wraca do `pl` i mówi o tym w
  konsoli. Inaczej zdania wychodziłyby z polskiej tablicy, a każda data, nazwa
  miesiąca i kwota byłyby sformatowane w języku, którego na stronie nikt nie
  czyta — strona w dwóch językach naraz.
- Wybrany język idzie też jako **`locale` rezerwacji** (maile z portalu zgadzają
  się ze stroną), za nim idzie **każde formatowanie `Intl`** (kwoty, procenty,
  nazwy miesięcy i dni tygodnia, i to, od którego dnia zaczyna się tydzień), a
  od tej zmiany mówi nim też **API** — niżej. Do tej pory język brało się tylko
  z `<html lang>`, więc strona po angielsku na polskim shellu nie miała jak
  poprosić o angielski.
- **Moduł mówi API, w jakim języku jest strona.** `?lang=<język>` dostają
  **cztery trasy** kontraktu: `GET /products` (lista), `GET /products/<ref>`
  (jeden obiekt), `GET …/availability` (kalendarz) i `POST …/bookings`
  (zakładanie rezerwacji). Dzięki temu **nazwa i opis miejsca przychodzą w tym
  języku, w którym gość czyta stronę** — do tej pory szły w `default_language`
  klucza, więc niemiecka strona pokazywała niemieckie zdania wokół polskich
  nazw. Każde pole wraca do wartości bazowej osobno (tłumaczenie z nazwą, ale
  bez opisu, nie zeruje opisu), a zdjęcia od języka nie zależą; sama lista
  miejsc też nie — ta sama strona po niemiecku pokazuje te same mieszkania.
  Backend czyta `Accept-Language` celowo **nie**, więc bez tego parametru nie
  da się dostać odpowiedzi w innym języku niż domyślny klucza.
- Wysyłany jest **ten język, w którym moduł naprawdę renderuje**, a nie surowy
  `d2-booking-lang`: gdy klucz odmówił niemieckiego, w zapytaniu jedzie
  domyślny — gość nie ma czytać niemieckich zdań obok polskich nazw ani
  odwrotnie. Kody z regionem albo wielką literą (`de-DE`, `EN`) czytają
  słownik swojego języka także w łańcuchu zapasowym i w `digi2.booking.texts()`,
  Nazwa sezonu z odpowiedzi ceny (`label`, wpisana przez właściciela tylko w
  języku domyślnym klucza) pokazuje się **tylko na stronie w
  `default_language`**; na stronie w innym języku linia dostaje słowo ze
  słownika („Aufenthalt in der Saison”) zamiast polskiej nazwy sezonu.
  A `digi2.booking.message()` z powodem, którego zdanie wymaga wartości
  (np. `child_age_max`), mówi zdanie ogólne zamiast klamer `{max}`. Backend i
  tak zawęża wartość do `languages` klucza, a wartości,
  której nie może użyć (pustej, bezsensownej, absurdalnie długiej), **nie
  odmawia — pomija ją**.
- Przy `POST …/bookings` wybrany język **zapisuje się na rezerwacji**: w nim są
  pisane **wszystkie jej późniejsze maile** do gościa, a linki do portalu w tych
  mailach otwierają go w tym samym języku. `locale` w ciele żądania działa jak
  dotąd (backend bierze je pod uwagę, gdy w adresie nie ma `lang`).
- `?lang=` nie dostaje **żadna inna trasa**: `/config`, `quote`,
  `checkout-session`, `status`, `manage`, `requests` i `balance-checkout` mają w
  kontrakcie przypięty zbiór parametrów (test kontraktu po stronie API
  porównuje z nim prawdziwą trasę), więc dopisanie języka gdzie indziej byłoby
  kłamstwem o kontrakcie. `GET /bookings/<id>/manage` jest bez niego świadomie:
  jego `product_name` idzie za językiem **tej rezerwacji**, czyli za językiem
  maila, z którego gość kliknął link. `/config` czyta się **przed** ustaleniem
  języka — to jego odpowiedź go ustala — i parametru nie ma, więc kury i jajka
  tu nie ma: pozostałe cztery trasy pytają dopiero po `/config` (także
  `GET /products/<ref>`, które czeka na nią wprost, żeby raz rozwiązany obiekt
  nie został zapamiętany w złym języku).
- Brakujący klucz w jednym słowniku czyta się w następnym języku łańcucha
  (proszony → domyślny klucza → `pl`), więc na stronie nie zostaje dziura.
  Klucza, którego nie ma **żaden** słownik, moduł nie wypisuje wcale i mówi w
  konsoli który to — gość nie ma czytać `manage_label_nights`. Zdanie, do
  którego brakuje wartości `{w nawiasie}`, wraca do zdania, które jej nie
  potrzebuje — nigdy do wypisanego nawiasu.
- Liczby **odmienia słownik, nie kod**: `nights_one` / `nights_few` /
  `nights_many` po polsku i ukraińsku, `nights_one` / `nights_other` po
  angielsku i niemiecku, a który z nich wybrać, mówi funkcja `plural` tego
  słownika. Ukraiński ma **własną** regułę trzech form, nie polską: mówi
  „21 ніч” tam, gdzie polski mówi „21 nocy”.
- **Niemiecki i ukraiński to tłumaczenia maszynowe, które czekają na czytanie
  przez native speakera.** Zanim postawisz niemiecką albo ukraińską stronę
  przed gośćmi, przeczytaj zwłaszcza zdania o pieniądzach i o skutkach:
  dopłatę (`manage_label_balance`, `return_balance`, `manage_pay_balance`),
  zwrot (`request_kind_refund`, `manage_refund`),
  anulowanie i wygaśnięcie blokady terminu (`return_cancelled`,
  `return_cancelled_hold`, `return_expired`), prośby do właściciela
  (`request_not_allowed`, `manage_request_sent`) i dopłatę za zwierzę
  (`pet_fee_*`). Niemiecki mówi do gościa przez „Sie”, ukraiński przez „ви”,
  a polski oryginał jest na „ty”, bo tak pisze się polskie teksty w sieci.
  Zdania są przypięte w testach, więc poprawka native speakera będzie świadomą
  zmianą zdania, a nie cichym dryfem.
- **Sprawdzanie formularza w przeglądarce też mówi ze słownika** — cztery
  zdania, które pisze samo: `adults_required` („podaj liczbę dorosłych — dzieci
  liczą się razem z nimi”), `child_age_max`, `child_ages_count` i
  `too_many_pets_over_threshold`, obok `required`, `email` i `number`. Żadne
  zdanie, które czyta gość, nie jest już napisem w kodzie.
- Odmieniane są **dwa** słowa: `nights` i `years` — granica wieku dziecka mówi
  „2 lata” i „12 lat”, a po ukraińsku „2 роки” i „12 років”.
- Jedno zdanie **cytuje nazwę linku z maila portalu**, więc oba muszą się
  zgadzać: `manage_balance_elsewhere` wysyła gościa do dopłaty po nazwie —
  „Dopłata” (pl), „Balance” (en), „Restzahlung” (de), «Доплата» (uk). To są
  cztery napisy, do których portal (etap 9) musi przetłumaczyć swój przycisk;
  mail nazwany inaczej każe gościowi szukać w skrzynce linku, którego nie ma.
- Nowe w API modułu: **`digi2.booking.language()`** (w jakim języku czyta gość),
  **`digi2.booking.text(klucz, wartości)`** (jedno zdanie ze słownika, z
  wstawionymi `{wartościami}`) i **`digi2.booking.texts(język)`** (cała tablica
  tego języka, kopia) — strona, która dopisuje własny przycisk, ma czym go
  podpisać w języku gościa.
- Powód odmowy, rodzaj wiersza ceny, stan rezerwacji, rodzaj prośby i jednostka
  ceny, których słownik nie zna, nadal pokazują się tak jak dotąd (po nazwie z
  odpowiedzi albo wcale) i **nie trafiają do konsoli**: to nazwy od backendu,
  który może nazwać rzecz, o której ta wersja nie słyszała.
- Pilnują tego testy: wszystkie cztery słowniki mają **dokładnie ten sam zbiór
  kluczy** (język nie wyjdzie wypełniony w połowie), a każdy klucz, o który
  moduł pyta, jest **wyczytany ze źródła** i sprawdzony w każdym słowniku —
  klucz z gałęzi, której nie chodzi żaden inny test, to dokładnie ten, który
  ginie w tłumaczeniu. Do tego każda reguła `plural` jest przepytana liczbami
  0–150 i musi mieć w swoim słowniku każdą formę, którą potrafi wskazać
  (brakującego `nights_few` zbiór kluczy nie widzi, bo składa formy w jeden
  klucz), a zdanie, o które **nic w module nie pyta**, jest błędem — żeby
  martwy klucz nie był tłumaczony cztery razy. W przeglądarce bramka wydania
  otwiera
  `sandbox/gate-booking-lang.html`: strona z polskim `<html lang>`, która prosi
  o niemiecki, i cały widget wychodzi po niemiecku razem z kwotami i datami —
  a w adresach żądań, które ta strona naprawdę wysyła, stoi `?lang=de` na tych
  czterech trasach i na żadnej innej.

## ma.42 — `d2-booking`: kontrakt zsynchronizowany z 2destate (868923b5f)

- Kopia kontraktu w `tests/fixtures/booking-api/` = `docs/booking-client-site/kontrakt/`
  z 2destate `feat/d2-booking-9-i18n` @ `868923b5f` (zawiera ich #350, #351, #352).
  `contract_version` dalej 1.
- **Prośba o zwrot albo zmianę terminu, która już czeka, mówi teraz o tym
  wprost** („Taka prośba już czeka na decyzję właściciela”). Odpowiedź 409 z
  `/requests` niesie `reason` obok zdania w `detail`, a moduł go czyta;
  wcześniej obie odmowy 409 kończyły się jednym zdaniem ogólnym.
- Linia ceny o rodzaju, którego słownik nie zna, nosi nazwę od właściciela
  (`label`, bez dopisanej stawki) także na stronie w innym języku, zamiast
  surowego identyfikatora.
- `reason` obok zdania jest czytany **tylko przy 409**. Odpowiedź 5xx (także
  z JSON-em od proxy, z jakimkolwiek `reason`) zostaje wynikiem niepewnym:
  ponowienie idzie pod tym samym `Idempotency-Key`, więc nie powstanie druga
  rezerwacja.
- `<html lang>` nie zmienia języka widgetu bez `d2-booking-lang="auto"`, więc
  domyślne `lang="en"` z Webflow nie przestawi polskiej strony na angielski.

## ma.42 — `d2-booking`: poprawki po recenzji etapów 5 i 6

- **Poprawka e-maila po zerwanym połączeniu nie blokuje już własnego terminu.**
  `Idempotency-Key` jest związany z blokadą (obiekt, termin, skład grupy), a nie
  z całym formularzem. Gość, któremu zapis przekroczył czas, a który potem
  poprawił e-mail, dostaje swoją rezerwację z powrotem zamiast „termin zajęty”,
  a nowy adres idzie do niej przez `/contact` przed płatnością. Zmieniona w tym
  jednym przypadku uwaga (`note`) zostaje taka, jak wysłana za pierwszym razem.
  Pierwsza treść wraca **tylko** po odpowiedzi, której nie dało się odczytać
  (brak sieci, 5xx); po każdej innej odmowie (np. 422 na e-mailu, 413 na
  uwadze) poprawiony formularz idzie jako nowe żądanie.
- **Wyczyszczony telefon albo imię są czyszczone także w rezerwacji** (idą do
  `/contact` jako `null`). Wcześniej puste pole było pomijane, a backend czytał
  to jako „zostaw stary numer”.
- **`booking:created` nie niesie już danych gościa**: `customer_name`,
  `customer_email`, `customer_phone` i `customer_note` są zdjęte z kopii.
  Jeśli tag GTM wypycha to zdarzenie do dataLayer, nie wyśle e-maila gościa.
  Kto czytał stamtąd e-mail, musi go wziąć z własnego formularza.
- `Retry-After` jest czytany najwyżej do **3600 s** we wszystkich miejscach
  (przycisk formularza, panel obsługi, lista). Wartość ponad ~24,8 dnia
  przepełniała `setTimeout`, który wtedy odblokowywał przycisk od razu.
- Przy **dwóch listach** czekających po `429` przycisk szukania odblokowuje się
  dopiero po ostatnim czekaniu, nie po pierwszym.
- Pole szukania zbudowane dwa razy, którego widoczna kopia stoi w panelu
  `position: fixed` (szuflada na telefonie), jest czytane z tej widocznej kopii.
- **Przed wydaniem:** zsynchronizować fixture kontraktu z 2destate po ich
  #350/#351 (`contact_token` nullable, `reason` w `/requests`).
- Nie ukrywaj wzorca karty przez `display: none` na jego rodzicu — wiersze
  trafiają do tego samego rodzica i byłyby niewidoczne.
- Opis listy: wiersze trafiają do **rodzica wzorca** (w Collection List — do
  rodzica Collection Item), a do `[d2-booking-results]` tylko bez wzorca.

## ma.42 — `d2-booking`: lista obiektów i wyszukiwanie (etap 6)

Lista apartamentów z `GET /products`, wpisana we wzorzec karty, który zbudował
Designer, oraz formularz szukania nad nią: termin, liczba gości i miasto.
Wychodzi tym samym tagiem co reszta modułu (`v1.9.0-ma.42`). (Słowniki
językowe to osobny etap.)

- `[d2-booking-results]` to lista obiektów, czytana **raz na wizytę**. Pierwszy
  `[d2-booking-template]` w środku jest wzorcem karty: moduł pamięta go,
  **zabiera ze strony**, zanim cokolwiek się pokaże, i klonuje pod każdy obiekt
  odpowiedzi — z klasami i zagnieżdżeniem, jakie dał Designer. Klon traci
  `d2-booking-template` (także w środku), a dostaje `d2-booking-item`. Wzorzec
  zostawiony na stronie byłby pustą kartą nad każdą prawdziwą.
- Ze strony schodzi **każdy** wzorzec, nie tylko pierwszy: karta zbudowana w
  Collection List jest renderowana raz na element kolekcji, więc opublikowana
  strona ma ten atrybut na każdej z nich, a kopia zostawiona na stronie byłaby
  klikalną kartą-zaślepką, której kolejne wczytanie listy nigdy nie usuwa
  (moduł czyści tylko własne `[d2-booking-item]`). Pierwszy jest wzorcem,
  resztę moduł zabiera i mówi w konsoli, ile ich znalazł.
- Wiersze są **dopisywane** na koniec listy, więc przycisk „pokaż więcej”,
  licznik i komunikat „nic nie znaleźliśmy” stawia się **obok** listy, nie w
  niej — tam, gdzie zostawia je układ Webflow. Ten w środku moduł też wypełni i
  nigdy go nie usunie (czyści tylko własne `[d2-booking-item]`): wiersze staną
  za nim. Przy jednej liście na stronie sterowanie może stać gdziekolwiek; przy
  dwóch każda lista musi mieć swoje w środku.
- `[d2-booking-bind="<pole>"]` wpisuje jedno pole obiektu jako **tekst**.
  Wiąże się **każde** pole kontraktu po własnej nazwie — `name`,
  `project_name`, `city`, `city_line`, `address_line`, `rooms`, `area`, `floor`,
  `beds`, `max_guests`, `description`, `rental_kind`, `timezone`, `latitude`… —
  więc strona nie jest ograniczona do listy, którą ktoś wpisał w moduł.
- Cztery wartości czyta się inaczej: `image` to `image_url` (na `<img>` `src`, a
  `alt` z nazwy obiektu; na czymkolwiek innym tło), `price` to cena obiektu w
  **walucie obiektu** przez to samo `Intl`, co wycena — moduł i tu nic nie
  liczy — `price_unit` mówi, za co jest ta kwota („za noc”), a lista wartości
  (`amenities`, `allowed_units`, `image_urls`) jedzie po przecinku.
- Brak wartości, `null`, `""` i obiekt (`pet_fee`, `prices`) zostawiają miejsce
  **puste i oznaczone `d2-booking-empty`** — nigdy słowa „null” ani
  „[object Object]”. W kontrakcie `null` może być w osiemnastu polach, więc to
  nie przypadek brzegowy, a większość stron. Nazwa, której odpowiedź nie ma
  wcale (literówka albo `constructor`), też nie wypisuje nic: pole musi być
  własnym polem obiektu, inaczej w karcie stanąłby kod JavaScriptu. `false`
  (`requires_approval`) czyści miejsce jak brak wartości, `true` zostawia je
  **dokładnie takie, jakie zbudował Designer** — tekst i cały układ w środku,
  razem z ikoną obok „na zapytanie” — i nie oznacza go jako puste. A
  zadeklarowane `0` (parter) to odpowiedź i wchodzi na stronę.
- Nic z odpowiedzi nie staje się kodem strony: wartość wchodzi przez
  `textContent`, adres przez `setAttribute`, a zdjęcie dopiero wtedy, gdy
  `image_url` czyta się jak adres zdjęcia (`https:`, `/…` albo `data:image/`,
  bez cudzysłowu, nawiasu i odwrotnego ukośnika) — inny adres to ostrzeżenie w
  konsoli i puste miejsce. `src` jest jedno kliknięcie od uruchomienia, a tło
  wchodzi do właściwości stylu, gdzie jeden cudzysłów zamyka deklarację. Te
  nazwy pochodzą z CMS-a, którego moduł nie prowadzi.
- `[d2-booking-link]` (na karcie albo na linku w karcie) prowadzi domyślnie pod
  `?apartament=<slug>` — dokładnie to zapytanie, które czyta strona rezerwacji,
  więc lista i rezerwacja pasują do siebie bez ustawiania czegokolwiek. Klient,
  u którego apartamenty są podstronami CMS pod własnymi adresami, wpisuje
  kształt: `d2-booking-link="/apartamenty/{slug}"` na linku albo
  `d2-booking-results-link` na całej liście. `{slug}` i `{id}` wychodzą
  zakodowane, a kształt bez `{…}` dostaje referencję jako zapytanie. Każde
  miejsce w kształcie bierze **swoje** pole: obiekt bez sluga pod kształtem
  `/apartamenty/{slug}` zostaje **bez `href`** i z `d2-booking-empty` — tak jak
  obiekt bez jednej i drugiej referencji — bo `slug` jest w kontrakcie
  nullowalny, a UUID w ścieżce `{slug}` to adres CMS, którego nie ma.
- Stronicowanie to `limit` i `offset`: `[d2-booking-more]` pobiera następną
  stronę i **dopisuje** ją, więc gość nie traci tego, co już czytał, a chowa
  się, gdy odpowiedź mówi `has_more: false`. `[d2-booking-count]` pokazuje
  `count` z odpowiedzi (wszystkie obiekty spełniające warunki, nie te na
  ekranie), a `d2-booking-results-limit="<n>"` zmienia wielkość strony
  (domyślnie 24).
- Strona, której odmówiono, **zostawia offset** tam, gdzie był — następne
  kliknięcie pyta o tę samą stronę jeszcze raz, zamiast ją przeskoczyć — a
  powód trafia do `[d2-booking-results-message]` naszymi słowami (element w
  liście; brakujący moduł dokłada tam sam, z `role="status"`). `400` na tej
  trasie dotyczy tego, o co pytał filtr: terminu (`invalid_stay`), a gdy
  szukanie podało też miasto — terminu i miejsca (`invalid_search`).
- Jedna odmowa **trzyma przycisk**: po `429` `[d2-booking-more]` czeka
  dokładnie tyle sekund, ile powiedział `Retry-After` — tak jak każdy inny
  przycisk tego modułu, który trafi na limit — bo otwarcie go od razu kupuje
  gościowi tylko następne `429`. Kliknięcie, które w tym czasie przejdzie obok
  wyłączonego przycisku, też nie wydaje żadnego zapytania.
- `[d2-booking-results-empty]` pokazuje się **tylko** wtedy, gdy odpowiedź nic
  nie przyniosła: do czasu odpowiedzi jest schowany, a przy **każdej** odmowie —
  także tej, którą moduł wypisuje sam — chowa się z powrotem, bo odmowa to nie
  oferta, w której nic nie ma, i „nic nie znaleźliśmy” nigdy nie stoi obok
  zdania o odmowie. Stan listy czyta się z
  `d2-booking-results-state="loading | ready | empty | error"`.
- Lista **bez wzorca** (`<div d2-booking-results></div>`) dostaje karty, które
  moduł rysuje sam: zdjęcie, nazwa, miasto i cena z jednostką w jednym linku, z
  tego samego wstrzykiwanego arkusza i tych samych zmiennych `--d2-booking-*`,
  co widget. Reguły są zawężone do
  `[d2-booking-results][d2-booking-results-drawn]`, więc lista zbudowana w
  Designerze zostaje przy swoim wyglądzie.
- **Szukanie nad listą.** `<form d2-booking-search>` z polami
  `d2-booking-search-field="check_in | check_out | adults | children |
  location"` zawęża listę **bez przeładowania strony**: każda lista wraca na
  pierwszą stronę z nowym filtrem. Własna wysyłka Webflow się nie wykonuje —
  moduł przejmuje submit.
- Trasa bierze termin, liczbę gości i miasto, więc `guests` to **zawsze suma
  dorosłych i dzieci** (KONTRAKT.md): `adults` i `children` nie jadą w ogóle,
  nic nie może więc sobie przeczyć (sprzeczne `guests` to `422`), a strona,
  która nie pyta o żadne z nich, nie wysyła `guests` wcale.
- Termin można **wpisać** w dwa pola albo **wybrać** kalendarzem
  (`[d2-booking-calendar]`) stojącym w formularzu szukania — to ten sam
  kalendarz co przy rezerwacji i jedyny: szukanie czyta termin, który ten już
  ogłosił. Wpisane pole wygrywa z klikniętym terminem. Wpisana godzina jest
  odrzucana (filtr pyta o dni), a tekst, który nie jest datą, nie zawęża
  niczego. Pół terminu i wyjazd nie późniejszy od przyjazdu **nie pytają API** —
  zostaje jedno krótkie zdanie w `[d2-booking-results-message]`.
- `d2-booking-location="Wrocław"` na formularzu **albo na samej liście**
  przypina miasto i gość go nie zmieni (prośba pilota). Na liście działa też
  bez żadnego szukania — tak powstaje strona jednego miasta — a dwie listy mogą
  mieć przypięte dwa różne miasta. Przypięcie wygrywa z polem `location` i z
  adresem, a pole wyboru miasta dostaje tę wartość i jest `disabled`
  (`d2-booking-pinned`). Wartość czytamy surowym `getAttribute`, bo nazwa
  miejsca może legalnie zawierać `;` albo `@`, które `digi2.attr` by ucięło.
- **Szukanie ląduje w adresie strony**
  (`?check_in=…&check_out=…&adults=2&children=1&location=Wrocław`), więc
  przeładowanie je zachowuje, a link otwiera ten sam wynik: moduł czyta te
  parametry na starcie — przed pierwszą stroną listy — i wpisuje je do pól. W
  adresie zostają dwa pytania, które zadała strona, a nie suma, którą wysyłamy.
  Reszta adresu (`?apartament=`, kampania, język) zostaje nietknięta, a
  przypięte miasto nie wchodzi tam wcale. Wpis jest **podmieniany**, nie
  dokładany (`replaceState`), więc „wstecz” wychodzi ze strony, a nie
  przechodzi przez każde zawężenie filtra.
- Formularz i adres są **łączone**, a nie wykluczające się: pole, które
  formularz ma, odpowiada za swój parametr nawet puste (gość je widzi, więc
  wyczyszczenie go jest odpowiedzią), a parametr, o który formularz nie pyta
  wcale, zostaje taki, jak w adresie. Szukanie zbudowane wokół kalendarza i
  liczby osób nie gubi więc terminu ani miasta z linku — ani na starcie, ani po
  wysyłce.
- **Link z miastem, którego `<select>` nie oferuje, otwiera swój wynik.**
  `<select>` przyjmuje tylko wartość, którą nosi któraś jego własna `<option>`;
  każdą inną przeglądarka kwituje `selectedIndex = -1`, więc pole stoi puste i
  czyta się jako puste. Udostępniony `?location=Gdańsk` nad selectem z dwoma
  miastami gubiłby więc miasto dwa razy — z ekranu i z łączenia z adresem, w
  którym pole odpowiada za swój parametr nawet puste — i gość dostawałby **całą
  ofertę** pod adresem obiecującym jedno miasto. Wygrywa link: moduł dokłada tę
  jedną opcję (`d2-booking-search-option`) i ją zaznacza, więc wynik, pole i
  adres mówią o tym samym mieście, nawet gdy wynik jest pusty. Opcje napisane
  przez stronę zostają tym, z czego gość wybiera; dołożona jest szukaniem, z
  którym przyszedł. Tak samo pokazuje się przypięte miasto, którego select nie
  oferuje. Tekstowego `<input>` to nie dotyczy.
- Szukanie, które **nie może wyjść** (pół terminu), zostawia filtr listy
  nietknięty: wiersze na ekranie i ich `offset` dalej należą do pytania, z
  którego przyszły, więc „pokaż więcej” nie zmiesza dwóch wyników w jednej
  kolumnie.
- Dwa kliknięcia „Szukaj” pytają **raz**: wysyłka powtarzająca pytanie, którego
  pierwsza strona jest jeszcze w drodze, jest pomijana, więc podwójny klik nie
  wydaje dwóch zapytań z limitu klucza. Wysyłka po powrocie odpowiedzi idzie
  zawsze — to ponowna próba.
- Formularz szukania szuka po listach **własnej strony**. Na stronie bez
  `[d2-booking-results]` nic się nie przeładowuje (moduł przejmuje submit) i
  mówi o tym w konsoli, zamiast milczeć pod przyciskiem, który nic nie robi.
- Odpowiedź, która była jeszcze w drodze, gdy poszło nowe szukanie, jest
  **porzucana**: pokazałaby obiekty, o które nikt nie pytał, a jej `offset`
  przesunąłby stronicowanie za wiersze, które gość ma na ekranie — następne
  „pokaż więcej” przeskoczyłoby apartamenty.
- Nowe zdarzenia: `digi2.on('booking:list', fn)` — `{ count, shown, has_more }`
  po każdej stronie listy, a `{ reason, status }` przy odmowie — oraz
  `digi2.on('booking:search', fn)` z `{ search: { check_in, check_out, guests,
  location } }`, plus `message`, gdy szukanie nie wyszło na trasę.

## ma.42 — nowy moduł `d2-booking` (etap 5, kroki A-D: klient API, formularz, kalendarz, cena, wygląd zapasowy, płatność, powrót z płatności i obsługa rezerwacji)

Rezerwacja noclegu z poziomu strony. Moduł rozmawia z publicznym API klucza strony
2destate (`/api/v1/public/sites/{public_key}/…`, kontrakt v1 z
`tests/fixtures/booking-api/`). Te kroki dają cały moduł: szkielet, klienta API,
formularz gościa, kalendarz wolnych terminów, cenę, wygląd rysowany przez moduł,
płatność, podstronę powrotu z płatności i podstronę obsługi rezerwacji z linku
w mailu. (Lista i wyszukiwarka obiektów oraz słowniki językowe to osobne etapy.)

Cały moduł wychodzi jednym tagiem: `v1.9.0-ma.42`.

- Nowa flaga `d2-booking="pk_…"` na tagu loadera dociąga moduł `booking`. Klucz
  strony jest **publiczny** — siedzi w HTML-u strony i tak ma być: backend broni
  się listą domen klucza, limitami i cenami liczonymi po swojej stronie.
  Loader czyta go surowym `getAttribute` (jak `d2-ma`), więc nic z klucza nie
  ucina, i zapisuje w `digi2._bookingKey`.
- `d2-booking-api="<adres>"` zmienia adres API (domyślnie
  `https://api.2destate.com/api/v1`). Tylko `https` (przy pracy lokalnej też
  `http://localhost`); inny adres to ostrzeżenie w konsoli i adres domyślny.
  Czytany surowo, bo może zawierać `;` i `@`. `d2-booking-product="<uuid|slug>"`
  wskazuje obiekt, który strona rezerwuje.
- **Atrybuty `d2-booking-*` to jeden moduł.** Loader zamieniał dotąd każdy
  nieznany atrybut `d2-x` na moduł `x`, więc `d2-booking-api` próbowałby
  dociągnąć nieistniejący plik `booking-api.min.js`. Teraz, jak przy `d2-ma-*`,
  cała rodzina `d2-booking-*` to moduł `booking`.
- `/config` klucza czytany **raz na stronę** (wszystkie formularze dzielą
  odpowiedź). Gdy go nie da się odczytać, formularz zostaje taki, jaki zbudował
  Designer, a o odmowie decyduje backend przy wysyłce — jedno potknięcie API nie
  zamyka strony rezerwacji.
- Formularz: `<form d2-booking-form>` z polami `d2-booking-field="name | email |
  phone | note | adults | children | child_ages | pets | pets_over_threshold"`.
  O które pola formularz pyta, mówi `form_fields` z `/config`: `off` = pole (z
  opakowaniem `d2-booking-field-group`, więc razem z etykietą) znika ze strony i
  nigdy nie jedzie w żądaniu, `optional` = jedzie tylko wypełnione, `required` =
  blokuje wysyłkę komunikatem na polu. `name` i `email` są wymagane zawsze.
- Gdy w jednym `d2-booking-field-group` siedzi kilka pól i pozostałe zostają,
  opakowanie zostaje — ginie tylko wyłączone pole i jego komunikat. Wyłączone
  „dzieci” nie zabiera ze sobą liczby dorosłych.
- Komunikat trafia do `[d2-booking-error="<pole>"]`, a gdy strona takiego
  elementu nie ma — moduł dokłada własny obok pola. `[d2-booking-error="form"]`
  to komunikat całego formularza.
- Sprawdzanie w przeglądarce jest po to, żeby nie męczyć gościa, a nie żeby
  wyrokować: decyduje backend. Odmowa `422 field_required` /
  `validation_error` ląduje na polu, które backend wskazał (a gdy klucz je
  wyłączył — na formularzu).
- `guests` to **zawsze suma dorosłych i dzieci**, więc żądanie nie może sobie
  przeczyć. Przy `children: off` moduł nie wysyła też `adults` — rezerwacja nie
  może twierdzić, że przyjeżdża dwoje dorosłych, skoro policzono ją za inną
  grupę; liczbę niesie `guests`.
- Odmowy rozpoznawane są po `reason` z `errors.json`, nigdy po treści
  `detail.message`: tekst backendu jest do logów, a gość widzi nasze polskie
  zdanie. Nieznany `reason` też dostaje zdanie, nie puste pole. `429` niesie
  `Retry-After` w sekundach. Odmowa z domeny spoza listy klucza nie ma nagłówka
  CORS, więc w przeglądarce wygląda jak brak połączenia — i tak jest pokazywana.
- Podwójne kliknięcie „Zarezerwuj” wysyła jedną rezerwację (`d2-booking-busy`),
  więc niecierpliwy gość nie zakłada dwóch blokad na ten sam termin.
### Kalendarz (krok B)

- `<div d2-booking-calendar></div>` — jeden pusty element. Moduł rysuje w nim
  miesiąc i **nie rusza** tego, co Designer włożył tam wcześniej. Obiekt bierze
  z `d2-booking-product` na kalendarzu albo na tagu loadera.
- Wolne terminy to `GET /products/<ref>/availability`, **jedno okno na miesiąc**,
  pamiętane do końca wizyty: chodzenie tam i z powrotem nie pyta API (ani jego
  limitu) drugi raz o ten sam miesiąc.
- Reguły są z odpowiedzi, nie ze strony: `min_units`, `max_units`,
  `lead_time_hours`, `buffer_minutes` i zajęte okresy — to **całość** tego, co
  odpowiedź `/availability` niesie. Reguły dni przyjazdu w kontrakcie nie ma,
  więc kalendarz nie zamyka żadnego dnia tygodnia: każdy dzień może być
  przyjazdem, a decyduje backend. Zakresu nie da się przeciągnąć przez zajęty
  okres: moduł sprawdza każdą noc między przyjazdem a wyjazdem, nie tylko oba
  końce.
- **`buffer_minutes` poszerza tylko rezerwację.** Każdy zajęty odcinek niesie
  `kind`: `booking` (czyjś pobyt) albo `blackout` (blokada właściciela).
  Rezerwację moduł poszerza o bufor z obu stron, więc przerwa na sprzątanie
  naprawdę zamyka noc obok zajętego terminu. Blokada jest **oknem dokładnym**
  i buforu nie dostaje: „remont do 12:00” znaczy, że o 12:00 lokal jest wolny,
  więc noce obok blokady zostają do wzięcia. Tak liczy backend, a kalendarz,
  który poszerzał każdy odcinek, wyszarzał noce, które backend by przyjął —
  gość widział termin jako zajęty i nie poznawał powodu. Nieznany `kind` moduł
  liczy jak `booking`, z buforem: noc wyszarzoną nadmiarowo da się odzyskać,
  podwójnej rezerwacji nie.
- Zamknięty dzień mówi **swój** powód: „ten termin został właśnie zajęty” w
  rezerwacji, „w tym terminie obiekt nie przyjmuje gości” w blokadzie, a „między
  pobytami musi zostać przerwa” tylko na nocach, które zabrał bufor. Gdy dwa
  okresy sięgają tej samej nocy, wygrywa zajętość nad przerwą.
- Okres zajęty kończący się o **lokalnej północy zostawia swój ostatni dzień
  wolny**: kto wyjeżdża tego ranka, nie spał tam. Dlatego pierwszy dzień
  zajętego okresu wciąż może być czyimś wyjazdem, a dwie noce przed zajętym
  terminem są do wzięcia.
- Kratka kalendarza to **data w strefie obiektu, nie moment**. Zajęte okresy
  moduł przelicza przez `Intl` na daty lokalne i liczy w całych dniach, więc
  zmiana czasu nie przesuwa żadnej nocy.
- Dwa kliknięcia robią pobyt: pierwsze to przyjazd, drugie — wyjazd. Dzień przed
  przyjazdem (albo sam przyjazd) zaczyna wybór od nowa, a dzień, którego reguły
  nie puszczają, mówi dlaczego i **zostawia przyjazd na miejscu** — gość nie musi
  zgadywać, którą połowę zakresu kalendarz skasował.
- **Klawiatura i czytnik ekranu.** Prawdziwe `<button>`-y w siatce `role="grid"`,
  miesiąc to jedno zatrzymanie w Tabie, a po dniach chodzą `←→` (dzień), `↑↓`
  (tydzień), `Home`/`End` (tydzień) i `PageUp`/`PageDown` (miesiąc). `Enter` i
  spacja zostają przeglądarce, bo `<button>` i tak klika. Dzień, którego nie
  można wybrać, ma `aria-disabled="true"`, a **nie** `disabled`: zostaje na
  focusie, powód jest w `aria-label` („11 maja 2027, zajęte”), a kliknięcie
  odpowiada tym powodem. Wybrany termin moduł ogłasza w `[d2-booking-status]`
  (`role="status"`, `aria-live="polite"`) — strona może postawić ten element
  gdzie chce, a bez niego moduł dokłada własny w kalendarzu.
- Nazwy miesięcy, dni tygodnia i pierwszy dzień tygodnia bierze `Intl` w języku
  z `/config` — nic nie jest wpisane na sztywno.
- Do stylowania moduł dokłada atrybuty: `d2-booking-day`,
  `d2-booking-day-busy | -past | -selected | -checkout | -in-range |
  -today | -blank`, `d2-booking-calendar-ready`, `d2-booking-busy` oraz
  `d2-booking-calendar-built | -head | -month | -grid | -prev | -next | -weekdays`.
  Moduł nie wnosi własnego CSS.
- Gdy okna nie da się odczytać, miesiąc zostaje otwarty, a w konsoli jest
  ostrzeżenie: o odmowie i tak decyduje backend przy wycenie albo wysyłce.

### Cena (krok B)

- `<div d2-booking-breakdown>` dostaje po jednym wierszu na linię odpowiedzi,
  a `<strong d2-booking-total>` sumę. Do tego `d2-booking-deposit` (ile teraz)
  i `d2-booking-balance` (ile później).
- Pierwszy `d2-booking-line` w rozbiciu jest **wzorcem**: moduł pamięta go i
  klonuje pod każdą linię, więc rozbicie zostaje w stylu strony. Bez wzorca
  moduł rysuje własne wiersze i oznacza je `d2-booking-built`. W wierszu wypełnia
  `d2-booking-line-label`, `-detail` (ilość i stawka obok siebie) i `-amount`,
  a na samym wierszu zostawia `d2-booking-line-kind` i `-negative`.
- Cena to `POST /products/<ref>/quote`, pytane **raz na ustabilizowaną zmianę**
  (300 ms): kliknięcie zakresu i wpisanie liczby osób to jedna decyzja, nie pięć.
  Wolniejsza odpowiedź na starsze pytanie nie nadpisuje nowszej, a przed pełnym
  zakresem moduł nie pyta w ogóle.
- Kwoty są **przepisane z odpowiedzi, nie przeliczone**: `amount_total` to suma
  (nigdy suma wierszy policzona w przeglądarce — rabaty, dopłaty i zaokrąglenia
  właściciela liczą się na serwerze), a pola `…_minor` dzieli tylko tyle cyfr,
  ile dla tej waluty podaje `Intl` (dwie dla PLN, zero dla JPY, trzy dla TND).
  Formatuje `Intl.NumberFormat` w języku z `/config` i w walucie z odpowiedzi.
  `null` jest pusty (`d2-booking-empty`), a nie „0,00”.
- Nazwa linii: wygrywa `label` z odpowiedzi, inaczej `kind` dostaje polskie
  zdanie, a nieznany rodzaj idzie po swojej nazwie. `length_discount` ma stawkę
  w nazwie tylko wtedy, gdy odpowiedź ją podaje (klucz z `merge_cleaning_fee`
  podaje `null` — wtedy zostaje nazwa bez stawki, a kwota rabatu bez zmian).
- `available: false`, `409 rental_rules` i `400` o terminie **czyszczą** rozbicie
  i sumę, a w komunikacie zostaje jedno krótkie zdanie: cena obok „tego pobytu
  nie da się mieć” byłaby ofertą, której nikt nie dotrzyma. Zdanie powstaje
  z kodów `violations`, z liczbami z reguł obiektu („najkrótszy pobyt to 3 noce”
  mówi 3). Kody to **stałe `VIOLATION_*` backendu**, przypięte przez
  `tests/fixtures/booking-api/errors.json` — wszystkie dziesięć:
  `product_not_bookable`, `unit_not_allowed`, `below_min_units`,
  `above_max_units`, `lead_time_too_short`, `blackout_overlap`, `period_taken`,
  `buffer_conflict`, `no_price_for_unit`, `too_many_guests`. Nieznany kod wraca
  do zdania ogólnego — gość nigdy nie czyta surowego kodu. Kalendarz odmawia
  tymi samymi kodami (plus własne `past`, którego backend nie wysyła), więc
  reguła złapana w przeglądarce i ta sama złapana przez backend czytają się
  jednakowo.
- Nowe metody: `digi2.booking.quote()` (pyta od razu, bez debounce),
  `digi2.booking.price()` (ostatnia odpowiedź), `digi2.booking.money()` i
  `digi2.booking.moneyMinor()` (kwota → tekst dla gościa).
- Nowe zdarzenia: `booking:ready`, `booking:created`, `booking:refused`,
  `booking:stay`, `booking:quote`.

### Wygląd, który moduł rysuje sam (krok C)

- `<div d2-booking-widget></div>` — jeden pusty Div i rezerwacja działa. Moduł
  dorysowuje w nim **wszystko, czego strona nie ma**: kalendarz, komunikat
  o terminie, formularz (skład grupy, pola gościa, miejsce na komunikat
  i przycisk), rozbicie ceny, sumę oraz zaliczkę i resztę. Każdy dorysowany
  element ma `d2-booking-built`, a sam widget `d2-booking-widget-ready`.
- **Designer zawsze wygrywa.** Części, która już jest **gdziekolwiek na
  stronie**, moduł nie rysuje drugi raz: cena, formularz i komunikat są jedne na
  stronę, więc drugi byłby drugim, cichym formularzem. Widget z własnym
  kalendarzem i formularzem dostaje tylko to, czego w nim brakuje. Jedna strona
  rezerwuje jeden pobyt, więc drugi `[d2-booking-widget]` zastaje wszystko
  zajęte, zostaje pusty i mówi o tym w konsoli.
- Formularz pyta tylko o to, o co pyta klucz (`form_fields`), pole wymagane ma
  `*` w etykiecie, a `Dorośli` startują z 2 — grupa, pod którą policzona jest
  większość obiektów; widoczna i do zmiany.
- **Styl to zmienne, nie opinie.** Jeden `<style d2-booking-styles>` wstrzykiwany
  raz i tylko na stronie z widgetem. Każda reguła jest zawężona do
  `[d2-booking-widget]` (nic nie sięga kalendarza stylowanego ręcznie poza nim),
  żadna nie ma `!important`, a każdy kolor i wymiar to zmienna z wartością
  domyślną: `--d2-booking-accent`, `-accent-text`, `-text`, `-muted`, `-bg`,
  `-surface`, `-border`, `-busy`, `-range`, `-error`, `-radius`, `-gap`, `-pad`,
  `-width`, `-font`. Wiersz „Razem” i linia „Teraz … · później …” chowają się,
  dopóki nie ma ceny.
- **Znak digi2.** Widget narysowany przez moduł dostaje na końcu
  `[d2-booking-mark]` — odnośnik do digi2. Strona, która zbudowała swój widget,
  stawia znak tam, gdzie chce (moduł uzupełnia adres i tekst pustego elementu).
  Klucz z `branding_hidden` **nie ma znaku w ogóle** — znika też ten postawiony
  przez stronę.

### Płatność (krok C)

- Wysyłka formularza to cała droga: `POST …/bookings` zakłada rezerwację,
  `POST /bookings/<id>/checkout-session` prosi o płatność (ta trasa nie bierze
  ciała), a potem przeglądarka idzie pod adres z odpowiedzi. Tylko `https`
  (lokalnie `http://localhost`): inny adres to ostrzeżenie w konsoli, zdanie dla
  gościa i brak przekierowania.
- **Rezerwacja powstaje raz na żądanie.** Przycisk (`d2-booking-submit` albo
  zwykły `button[type="submit"]` w formularzu) wyłącza się przy pierwszym
  kliknięciu, a próba jest pamiętana pod kluczem samego żądania. Drugie
  kliknięcie dostaje odpowiedź tej, która już leci; ponowienie po potknięciu
  płatności **płaci rezerwację, która już jest**, zamiast blokować termin drugi
  raz. Zmiana czegokolwiek (termin, skład grupy, dane) to inne żądanie.
- Odmowy po `reason`, nigdy po tekście z ciała: `booking_not_payable`,
  `booking_already_paid`, `stripe_not_connected`, `stripe_account_not_ready` są
  ostateczne (własne zdanie, przycisk zostaje wyłączony,
  `d2-booking-payment="final"`); `payment_provider_unavailable` (502) proponuje
  ponowienie (`retry`); 429 czeka dokładnie tyle sekund, ile podał `Retry-After`
  (`wait`); rezerwacja z `payment_required: false` nie idzie do płatności w ogóle
  (`done` i zdanie, że decyduje właściciel).
- Dobra wiadomość („rezerwacja przyjęta”, „przenosimy do płatności”) trafia do
  tego samego `[d2-booking-error="form"]`, co odmowy — z `d2-booking-ok`, żeby
  CSS nie malował jej na czerwono.
- Powrót z płatności przyciskiem „wstecz” odblokowuje formularz: przeglądarka
  potrafi przywrócić stronę dokładnie taką, jaką zostawiliśmy, czyli z martwym
  przyciskiem pod napisem „przenosimy do płatności”.
- Nowe metody: `digi2.booking.checkout(form, stay)` (to, co robi wysyłka) i
  `digi2.booking.pay(bookingId)`. `digi2.booking.book()` dalej tylko zakłada
  rezerwację. Nowe zdarzenie `booking:payment` leci tuż przed wyjściem na
  stronę płatności.

### Powrót z płatności (krok D)

- `<div d2-booking-return></div>` — jeden pusty element na podstronie, pod którą
  operator płatności odsyła gościa
  (`…?booking=<id>&payment=<success|cancelled|balance_success|balance_cancelled>`).
  Moduł bierze identyfikator z adresu (albo z wartości atrybutu, gdy strona go
  zna), pyta `GET /bookings/<id>/status` i pisze, co się stało.
- **Karta przechodzi, zanim dojdzie webhook**, więc moduł pyta ponownie za
  każdym razem po dłuższej przerwie (1, 2, 3, 5, 8, 8, 8, 8 s — osiem prób przez
  około czterdzieści sekund), a potem przestaje i pisze, że płatność jest
  jeszcze sprawdzana. Anulowaną płatność czyta **raz** i nie odpytuje: nic nie
  jest w drodze, a gość, który zamknął płatność świadomie, nie ma się gapić
  w kręcące się kółko.
- Stany w `d2-booking-return-state`: `loading`, `checking`, `confirmed`, `paid`
  (zapłacone, ale właściciel jeszcze nie przyjął — inne zdanie niż
  „potwierdzona”), `balance_paid`, `cancelled`, `rejected`, `expired`,
  `unknown`, `error`. `expired` moduł orzeka tylko w dwóch przypadkach, które
  kontrakt stawia jasno: status `expired` oraz `awaiting_payment` z
  `hold_open: false`. Statusu, którego nie zna, **nie zgaduje** na wyrok.
- Przy terminie, który przepadł, moduł pokazuje `[d2-booking-return-new]` —
  link do `site_url` z odpowiedzi. `site_url: null` znaczy, że takiej strony nie
  ma, więc link **znika**, zamiast prowadzić pod `null`.
- `[d2-booking-return-message]` (budowany z `role="status"`, gdy strony go nie
  ma) i `[d2-booking-return-balance]` (ile zostało do dopłaty i do kiedy).
  Miejsce zbudowane przez Designera jest zawsze wypełniane — pusto znaczy
  `d2-booking-empty`, nigdy „0,00” — a miejsce nasze powstaje tylko wtedy, gdy
  jest co w nim napisać.

### Obsługa rezerwacji przez gościa (krok D)

- `<div d2-booking-manage></div>` — podstrona z linku w mailu
  (`<manage_url>?booking=<id>#token=<token>&action=<details|balance|refund|change-date>`).
  **Token nigdy nie trafia do paska adresu, do logu ani do komunikatu.** Moduł
  czyta go z fragmentu raz, od razu zdejmuje `history.replaceState` (więc nie
  zostaje nawet wpis w historii) i wysyła wyłącznie w nagłówku
  `X-Booking-Token`. Fragment jest czyszczony także na stronie, która nie ma
  bloku obsługi — żeby pomyłka w konfiguracji nie zostawiła tokenu w adresie na
  całą wizytę. Cena tej uczciwości: odświeżenie strony potrzebuje linku z maila
  jeszcze raz.
- Moduł pokazuje to, co niesie odpowiedź: obiekt, termin (dni kalendarzowe
  **w strefie obiektu**), stan, wpłacone i zwrócone kwoty, dopłatę z terminem
  i telefon alarmowy — przez `d2-booking-manage-field="<nazwa>"`. Skład grupy
  nie wraca w tej odpowiedzi i moduł go nie pokazuje (kontrakt: wiek dziecka nie
  jest dla każdego, kto zna identyfikator rezerwacji).
- Akcje: `d2-booking-manage-action="balance | refund | date_change"`. **Link
  `manage` może prosić, ale nie zapłaci dopłaty, a link `balance` tylko płaci**
  (kontrakt). `balance_payable: true` przy linku `manage` znaczy „da się, ale
  nie tym linkiem” — moduł odsyła wtedy do maila z dopłatą albo do
  `account_url`. Akcji, na którą odpowiedź nie pozwala, moduł **nie zostawia na
  stronie** — także tej, którą postawił Designer.
- `201` na prośbie znaczy „zapisana”: rezerwacja się nie zmienia, pieniądze się
  nie ruszają, decyduje właściciel w panelu. Przycisk znika (jedna czekająca
  prośba zamyka swój rodzaj), a prośba dołącza do listy
  `[d2-booking-manage-requests]` — to jedyne miejsce, w którym gość przeczyta
  decyzję właściciela, bo mail o niej nie przychodzi.
- Datę zmiany terminu moduł wysyła jako **lokalny czas obiektu bez strefy**
  (`2027-05-10T14:00:00`); strefa z pola jest odrzucana, nie przeliczana.
- **Każda odmowa tokenu to ten sam `booking_not_found`** — brak, zły, wygasły,
  o innym celu, z innej rezerwacji albo spoza klucza. Gość czyta więc jedno
  zdanie o nieważnym linku, nie dostaje żadnych danych i ma drogę do
  `account_url`; nazwanie przyczyny byłoby zgadywaniem, a zgadywanie jest tu
  wyrocznią dla kogoś, kto próbuje tokenów. Odmowa, która **nie** dotyczy tokenu
  (brak sieci, limit), mówi o sobie wprost pod `d2-booking-manage-state="error"`.
- **Operator wraca z dopłaty na tę samą podstronę bez tokenu**, więc postaw tam
  też `[d2-booking-return]`: blok obsługi wtedy milczy
  (`d2-booking-manage-state="returned"`), a status czyta blok powrotu. Bez tego
  gość przeczytałby „ten link jest nieważny” obok „dopłata zaksięgowana”.
- Arkusz wyglądu zapasowego obejmuje teraz trzech gospodarzy —
  `[d2-booking-widget]`, `[d2-booking-return]` i `[d2-booking-manage]` — na tych
  samych zmiennych CSS. Znak digi2 dostaje pierwszy z nich i jest dokładany na
  końcu, po tym jak blok się wypełni.
- Nowe metody: `digi2.booking.status(bookingId)`, `digi2.booking.returned()`,
  `digi2.booking.managed()`. Nowe zdarzenia: `booking:return`, `booking:manage`,
  `booking:request`.
- Zmieniło się jedno zdanie dla gościa: `booking_not_found` to teraz „Ten link
  do rezerwacji jest nieważny lub wygasł. Nowy znajdziesz w e-mailu.” — jedna
  odpowiedź na wszystkie odmowy tokenu.

### Poprawki po recenzji #60 (ten sam etap, przed wydaniem)

- **Formularz w Form Block nie wysyła się już do Webflow.** Wysyłka jest
  zatrzymywana na formularzu, więc dane gościa nie trafiają do Webflow Forms, a
  formularz nie chowa się za `.w-form-done`. `d2-forms` dalej blokuje niepoprawny
  formularz. **Uwaga:** listener `submit` na `document`, w tym wyzwalacz formularza
  w GTM, tego nie usłyszy. Rezerwację mierz zdarzeniem `booking:created`.
- **Dziś nie da się wybrać jako przyjazdu**, także przy `lead_time_hours: 0`.
  Pobyt zaczyna się o lokalnej północy, a backend porównuje ją z „teraz plus
  wyprzedzenie”, więc taki dzień i tak dostawał odmowę. Pierwszy dostępny dzień to
  pierwsza północ po tej chwili, w strefie obiektu.
- **Kalendarz zawsze wysyła noce** (`unit: "day"`). Wcześniej brał pierwszą
  jednostkę z `allowed_units`, więc przy `month` 3 noce szły jako 3 miesiące.
  Obiektu bez `day` nie da się zarezerwować kalendarzem.
- **Cena zgadza się z wybranym pobytem.** Pisanie w czasie wyceny nie zostawia
  już starej kwoty ani znacznika `d2-booking-busy`, a spóźniona odpowiedź nie drukuje
  ceny pobytu, który gość porzucił.
- **Po odmowie ostatecznej inny termin albo inny skład grupy oddaje przycisk.**
  Wcześniej zostawał wyłączony do przeładowania strony.
- **Chwilowa awaria nie kończy sprawdzania płatności.** Brak sieci, 429 i 5xx na
  stronie powrotu to kolejna próba, a nie zdanie o błędzie.
- **Nieudane odczytanie produktu i miesiąca jest ponawiane**, a 404 nie.
- **Wybór dnia klawiaturą zostawia fokus na tym dniu.**
- **Poprawiony e-mail trafia do rezerwacji.** Gdy gość po nieudanej płatności
  zmieni imię, e-mail albo telefon, moduł wysyła je do istniejącej rezerwacji przed
  płatnością, więc potwierdzenie idzie na aktualny adres. Wymaga trasy
  `POST /bookings/{id}/contact` po stronie 2destate (w budowie).
- **Rysowany kalendarz i przycisk trzymają wyrównanie na stronie Webflow.** Style
  strony nie dosuwają już numerów dni i napisu do lewej.
- **Moduł nie obiecuje maili, których nie ma.** Gość dostaje wiadomość dopiero po
  potwierdzeniu rezerwacji, a link do pierwszej płatności nie idzie mailem wcale,
  więc zdania o powrocie z płatności mówią tylko to, co działa.
- **Utracona odpowiedź nie blokuje terminu.** `POST /bookings` niesie
  `Idempotency-Key`, więc ponowienie po przekroczeniu czasu odzyskuje rezerwację.

### Poprawki po recenzji #61 (ten sam etap, przed wydaniem)

- **Wyszukiwarka w Form Block nie wysyła się do Webflow** i nie chowa formularza.
- **Lista w Collection List zostaje w siatce Designera.** Wierszem jest cały
  Collection Item, więc kolumny zostają, a puste pozycje znikają.
- **Obrazek z Webflow pokazuje zdjęcie obiektu.** Moduł zdejmuje `srcset` i `sizes`.
- **Karta bez adresu zostaje na liście**, tylko bez linku.
- **Odrzucone wyszukiwanie zabiera stare wiersze** i zostawia przycisk ponowienia,
  a `digi2.booking.apply()` nie zmienia już wyszukiwania w mocy.
- **W czasie czekania po 429 wyszukiwarka czeka razem z listą.**
- **Radio i pola zdublowane.** Radio odpowiada zaznaczoną wartością, a link je
  zaznacza. Pole zbudowane dwa razy odpowiada widoczną kopią, więc można je wyczyścić.
- **Zły termin z linku nie blokuje formularza bez pól dat.**
- **Kalendarz nie czeka na listę obiektów.**

### Po teście na lokalnym backendzie 2destate

- **Niewłączone płatności nie wyglądają jak błąd gościa.** `stripe_not_connected`
  i `stripe_account_not_ready` idą spokojnym stylem `d2-booking-ok`.
- **Długie czekanie po 429 jest podane w minutach.**
- **Bez `pet_fee` pole progu wagi znika z formularza.**

### Poprawki po przeglądzie (ten sam etap, przed wydaniem)

- **Obiekt można podać adresem: `?apartament=<slug>`.** Gdy `d2-booking-product`
  nie stoi ani na elemencie, ani na tagu loadera, moduł czyta slug z adresu —
  tak jedna podstrona rezerwacji obsługuje całą kolekcję CMS
  (`/rezerwacja?apartament=apartament-rynek-wroclaw`). Atrybut zawsze wygrywa
  z adresem; pusty albo brakujący parametr to po prostu brak obiektu.
- **Slug jest rozwiązywany, zanim cokolwiek pójdzie dalej.** `uuid|slug`
  przyjmuje w kontrakcie tylko `GET /products/{ref}`; `availability`, `quote`
  i `bookings` mają w ścieżce `{product_id}`. Moduł pyta o produkt **raz na
  wizytę** i dalej wysyła `id` z tej odpowiedzi. Wcześniej slug szedł prosto na
  trasy `{product_id}` i wracał `404 Product not found`, więc udokumentowany
  zapis `d2-booking-product="<slug>"` nie działał wcale. Gdy odczyt produktu
  się nie uda, moduł to loguje i wysyła referencję tak, jak napisała ją strona.
- **Pytanie o zwierzęta mówi wreszcie, o jaki próg chodzi.** Nowy atrybut
  `d2-booking-hint="pets_over_threshold"`: moduł wpisuje tam `pet_fee` obiektu
  — próg wagi, kwotę i to, czy liczy się za pobyt, czy za noc. Widget rysowany
  przez moduł dokłada to miejsce sam. Brak `pet_fee` zostawia je puste
  i oznaczone `d2-booking-empty`, a `weight_threshold_kg: null` zdejmuje ze
  zdania próg zamiast wypisywać dziurę.
- **502 to „operator płatności nie działa” tylko na dwóch trasach płatności**
  (tak mówi `errors.json`). Dotąd każda brama odpowiadająca 502 — także na
  kalendarzu i na cenie — pokazywała gościowi zdanie o płatności, której
  jeszcze nie dotknął. Teraz gdzie indziej jest to `server_error`.
- **Kliknięcie dnia, który już minął**, odpowiada „ten dzień już minął”, a nie
  „ten termin został właśnie zajęty”: wczoraj nikt nie zajął, a `aria-label`
  tej kratki mówił już to samo. Dni są `aria-disabled`, nie `disabled`, więc
  kliknąć je można — i teraz słyszy się prawdę.
- **Goły `d2-booking-calendar` poza widgetem dostaje swoje siedem kolumn.**
  Arkusz modułu był cały zawężony do `[d2-booking-widget]` i na stronie, której
  całym znacznikiem jest pusty `<div d2-booking-calendar>`, miesiąc renderował
  się jako pionowa kolumna 31 przycisków. Jedna reguła układu (nie wyglądu) jest
  teraz niezawężona i wstrzykiwana także dla samego kalendarza; kolory nadal
  nie sięgają niczego, co napisał Designer.
- **Rezerwacja nie zakłada się drugi raz po poprawce w danych.** Klucz, pod
  którym moduł pamięta założoną rezerwację, to teraz to, na czym stoi blokada —
  `id` obiektu, jednostka, `starts_at`, liczba nocy i skład grupy. Dane
  kontaktowe są z niego wyjęte: gość, który po potknięciu płatności poprawi
  literówkę w uwagach i wyśle jeszcze raz, **płaci rezerwację, którą już ma**,
  zamiast blokować te same noce po raz drugi.
- **Blokada, która wygasła, nie zamyka całego formularza.** `final` dotyczy
  teraz tego pobytu, nie formularza: inny termin to rezerwacja, którą gość
  wciąż ma prawo złożyć, a `booking_not_payable` wyrzuca martwą rezerwację
  z pamięci. Dotąd po takiej odmowie strona była nie do użycia bez odświeżenia.
- **429 na trasie zakładania rezerwacji czeka tyle, ile każe `Retry-After`** —
  tak jak już robiła to płatność. To trasa, którą niecierpliwy gość naciska
  najczęściej, a przycisk wracał na niej od razu, więc każde kliknięcie kupowało
  kolejną odmowę. Wysyłka w czasie czekania dostaje zapamiętaną odmowę.
- **Dopłata odmawia tak samo jak pierwsza płatność.** `no_balance`,
  `balance_already_paid`, `booking_not_payable`, `stripe_not_connected`
  i `stripe_account_not_ready` **zabierają przycisk „Dopłać teraz”**;
  `balance_processing` i 502 od operatora go zostawiają, a 429 wstrzymuje go na
  tyle sekund, ile podał `Retry-After`. Dotąd przycisk wracał po każdej odmowie,
  także po takiej, której żadne kliknięcie nie naprawi.
- **Rezerwacja na zapytanie nie jest już odpytywana w kółko.** `status:
  "pending"` (z `payment_mode: "on_request"`) to stan rozstrzygnięty: blok
  powrotu pisze, że rezerwacja czeka na decyzję obiektu, i przestaje pytać.
  Dotąd czytał to jako „płatność jest jeszcze sprawdzana” i wysyłał osiem
  zapytań przez czterdzieści sekund o płatność, której nie ma.
- **Jedno zapytanie o cenę na jedno pytanie.** Formularz zgłasza każdy wciśnięty
  klawisz, także w polu uwag, które ceny nie zmienia. Moduł pamięta ostatnio
  wysłane ciało i identyczne pytanie zbywa odpowiedzią, którą już trzyma —
  napisanie uwag nie kosztuje już kilku wywołań limitu klucza.
- **`422` z `loc` kończącym się indeksem tablicy** (`["body","child_ages",0]`)
  trafia wreszcie na pole `child_ages`, a nie na cały formularz bez wskazania.
- `booking:created` dostaje **kopię** odpowiedzi, jak pozostałe zdarzenia:
  listener, który przerobi ładunek, nie zmienia już tego, którą rezerwację
  moduł za chwilę opłaci.
- Nowy atrybut w dokumentacji: `d2-booking-hint`. Nowy stan bloku powrotu:
  `d2-booking-return-state="pending"`.

## v1.9.0-ma.41 — 2026-11-04 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.40–ma.16)

Wygląd popupu i podmiana treści, zlecenie 2destate. Szablon bez `design` i bez `action`
działa jak dotąd.

- `templates.popup[].design`: `placement` (`center`, `side-left`, `side-right`,
  `bar-bottom`, `bar-top`, `slide-in`), `colors.*`, `backgroundImage.*`, `typography.*`,
  `radiusPx`, `cta.*`, `imageLayout`, `spacing`, `overlay`, `behavior.*`. Zła wartość to
  ostrzeżenie w konsoli i pominięcie pola, nie szablonu. Esc, fokus i aria zostają w
  każdym układzie.
- `overlay: "none"`: strona pod popupem klika się i przewija dalej.
- `behavior.closeOnOverlay: false` nie wymaga nowej opcji w `popups.js`, więc działa też
  ze starszym modułem popupów. `behavior.closeButton: false` zdejmuje krzyżyk tylko, gdy
  na ekranie stoi przycisk `close`.
- `behavior.delaySeconds`: popup czeka do 120 s, tylko na tej odsłonie. Nowszy wyzwalacz
  zastępuje czekający, a wyjście ze strony oddaje częstotliwość. Kroki za popupem
  wykonują się od razu, nie po czasie.
- W układzie `bar-*` blok obrazu jest miniaturą o wysokości 48 px; w pełnej szerokości
  urósłby ponad ekran.
- `templates.content[].action`: `text`, `html`, `image`, `hide`, `show`, `attr`; cel to
  `selector` szablonu albo `[d2-ma-slot]` kroku, najwyżej 20 elementów, nigdy w popupie
  ani wokół niego. `image` i `attr src` zdejmują z obrazu `srcset` i `sizes`, inaczej
  przeglądarka trzyma stary plik. `html` składa `strong`, `em`, `a`, `br` z danych, nigdy przez
  `innerHTML`. `attr` tylko `alt`, `title`, `aria-label`, `href`, `src`, bez pól `{{…}}`. Selektor nie
  trafi w `body`, `script`, `iframe` itp., także przez klasę (`.body` w Webflow). „Wyczyść”
  i nowa rewizja scenariusza cofają te zmiany, poza zwykłym tekstem w slocie bez selektora. Krok content dalej wymaga pola `slot`, także gdy
  szablon ma selektor.

## v1.9.0-ma.40 — 2026-11-04 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.39–ma.16)

Korekta zlecenia 2destate po wydaniu ma.39. **Strony przypinają ma.40, nie ma.39.**

- `prefer_filters` na 3destate się nie wykonuje: `ma:action` z `status: "skipped"`,
  `reason: "engine_3destate"`, jak `map_mark` i `map_order`, raz na odsłonę, bez
  zużycia częstotliwości; gałąź idzie dalej. Znika ingerencja w `props.unitFilterOverride`
  z ma.39, a zapis `d2ma_3de_filter` z tej wersji jest kasowany przy starcie modułu; razem z nimi powody `engine_3destate_next_load`,
  `_late`, `_no_config`, `_ignored`, `_unconfirmed`, `_no_storage`. Panel 2destate
  blokuje tę akcję dla 3destate. Filtr startowy w demo Nowej Pabianickiej działa jak
  dotąd, poza d2-ma.
- Pobranie koperty: `?s=ma.N`, a `&e=2destate|3destate` tylko, gdy silnik widać. Nie ma
  już `e=none`.

## v1.9.0-ma.39 — 2026-11-04 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.38–ma.16)

Adapter silnika 2destate / 3destate i zgłaszanie wersji, zlecenie 2destate.

- `map_mark` i `map_order` na makiecie 3destate się nie wykonują i mówią dlaczego:
  `ma:action` z `status: "skipped"`, `reason: "engine_3destate"`, raz na odsłonę.
  Gałąź za akcją idzie dalej, `delayMinutes` nie odkłada takiej akcji.
- **Częstotliwość `map_mark` / `map_order` zużywa się dopiero po wykonaniu, także na
  2destate.** Strona bez mapy, mapa w trakcie ładowania, brak pasujących lokali albo
  sortowanie gościa nie zużywają już `once_per_visit`: akcja próbuje przy kolejnym
  wyzwalaczu. To samo przy `delayMinutes` (także `prefer_filters`): częstotliwość po
  wykonaniu, a drugi wyzwalacz nie dokłada kolejki. `markProducts`, które na każdej
  mapie zwraca 0, nie daje już `ma:action`.
- `prefer_filters` na 3destate: filtr zapisany (`localStorage`, `d2ma_3de_filter`)
  zakłada dopiero **następne wczytanie**, przez nieudokumentowane
  `props.unitFilterOverride`. Makieta czyta je tylko przed wyrysowaniem, więc moduł musi
  zdążyć przed nią. Nie ma na to gwarancji: moduł ładuje się asynchronicznie. Wynik
  sprawdza `oa3de__unit-list-filter-init`. Wszedł = zwykłe `ma:action` z `filters`.
  Inaczej `status: "skipped"` i `reason`: `engine_3destate_next_load` (zapisany, na tej
  odsłonie bez zmian), `_late` (makieta już wyrysowana, strona bez zmian), `_no_config`
  (brak `AppLauncher3DEOAConfig`), `_ignored` (makieta nie przyjęła), `_unconfirmed`
  (brak zdarzenia w 30 s), `_no_storage`. Adres `sm-filters-*` i własny filtr strony
  wygrywają. Filtr działa raz, wygasa po 30 dniach, a wycofanie zgody, „Wyczyść” i
  koperta bez tego scenariusza albo z krótszą retencją go kasują. Zakłada się przed
  pobraniem koperty, więc na tym jednym wczytaniu koperta go nie zatrzyma. Sprawdzone 4.11 na makiecie smartmakietabase `1789730517`; po zmianie wersji
  makiety sprawdzić ponownie.
- Pobranie koperty dokleja `?s=ma.N&e=<silnik>` (`2destate`, `3destate`, `none`, gdy
  silnika jeszcze nie widać), także przy `reload()`. Bez identyfikatora gościa i bez
  ciasteczek. **To żądanie idzie przed zgodą**, jak dotąd, bo koperta niesie
  `consentRequired`. Serwer koperty musi przyjąć dodatkowe parametry; starsze wersje
  wysyłają adres bez nich.

## v1.9.0-ma.38 — 2026-11-02 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.37–ma.16)

Porządki po recenzji #53 (architekt-it) i uwaga webflow / 2destate z demo.

- Popup z szablonu koperty: kolory i font z tokenów mają wartość zapasową
  (`var(--surface, #fff)`, tekst i przycisk `#1a1d1c`, font `inherit`). Strona,
  która nie definiuje zmiennych `--surface`, `--on-surface`, `--brand`,
  `--body`, dostaje białą kartę z ciemnym tekstem, a nie przezroczystą.
  Strona, która je definiuje, wygląda jak dotąd.
- Historia źródeł (`touchpoints`, lead, `/visit`): wartość UTM ze znakiem
  niedrukowalnym (nowa linia, tabulator, twarda spacja, znak zerowej
  szerokości) jest pomijana. `referrer_host` dłuższy niż 100 znaków albo
  niebędący zwykłą domeną (IPv6, `_`) jest pomijany zamiast ucinany. Dotąd
  2destate odrzucał wtedy cały wpis; teraz odpada jedno pole. Wpisy zapisane
  wcześniej przechodzą ten sam filtr przy wysyłce.
- Dokumentacja: `visitorId()` / `profile().visitorId` zmienia się po odmowie
  (ma.36), więc strona nie powinna go zapamiętywać; 2destate pomija źródło
  wizyty w projekcie bez zakresu „kontekst leada” (`is_context_allowed`).

## v1.9.0-ma.37 — 2026-11-02 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.36–ma.16)

Przyciski z akcjami w popupie z szablonu panelu (Piotr, 2.11.2026: „tak, zleć
2destate przyciski w kroku popup”; kształt uzgodniony z 2destate).

- Do 2 bloków `cta` w szablonie; trzeci i kolejne są pomijane z ostrzeżeniem.
- Nowe akcje: `filter_rooms` (filtr „N pokoi” z profilu w wyszukiwarce 2destate,
  zamknięcie popupu i przewinięcie do listy; bez preferencji pokoi przycisk się
  nie pokazuje), `scroll_to` z `target: "#id"`, `close`. `open_unit`, `contact`
  i `link` bez zmian; każdy przycisk ma własną akcję (link zostaje przy swoim
  adresie także obok `open_unit`).
- `filter_rooms` wywołuje `setFilters` z `{ source: "user" }`: od ImageMapPro
  2destate 1.7.1 to filtr gościa (wyzwalacz `search_filter`, zdarzenia GA4
  wyszukiwarki). Starsza paczka zapisuje go jak zmianę ze skryptu: bez tych
  zdarzeń, a pole pokoi ustawione wcześniej przez gościa zostaje.
- Przez 5 s po kliku przycisku popupu scenariusze nie otwierają kolejnego popupu
  (pominięty nie zużywa częstotliwości) — `filter_rooms` jako filtr gościa nie
  wywoła od razu popupu z wyzwalacza `search_filter`.
- `contact` w popupie z szablonu panelu zamyka popup i przewija do formularza:
  pierwszy `[d2-ma-contact]`, a bez niego `#kontakt`; bez żadnego tylko zamyka.
  Wbudowane popupy i własny `[d2-ma-popup]` strony bez zmian.
- Klik przycisku z szablonu (i wbudowanego przycisku `promo-filter`): `dataLayer`
  `ma_popup_cta` `{ action }` i `ma:action` `{ do: "popup_cta", action, template }`.
- Strona z własnym `[d2-ma-popup]` bez zmian.
- `/visit` niesie `touchpoint`: wpis historii źródeł (touchpoints v1) wejścia tej
  wizyty — UTM, `click_type`, ścieżka wejścia. Ten sam w każdym POST-cie wizyty;
  nowa kampania w trakcie wizyty go nie zmienia. Bez zgody na historię źródeł
  klucza nie ma. Serwer 2destate przyjmuje pole od 4110bf3e.

## v1.9.0-ma.36 — 2026-11-02 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.35–ma.16)

Token prawdziwego leada (`ma_token` z 2destate). Tylko strona z `d2-ma-hot-lead`;
na razie wyłącznie Osiedle Demo (Piotr, 2.11.2026, akceptacja w czacie 2destate).

- Nowe API `digi2.ma.leadToken(token)` i zdarzenie `window`
  `CustomEvent('d2:lead-token', { detail: { token } })`. Skrypt formularza, który
  sam wysyła zgłoszenie do 2destate (`/webhooks/s/{slug}`), przekazuje tak
  `ma_token` z odpowiedzi. Nigdy przez `dataLayer`.
- Token jest przyjmowany tylko za zgodą (także przy `consentRequired: false`).
  Bez zgody, wygasły, z innego originu niż strona albo w złym formacie: `false`
  i nic nie trafia do magazynu.
- Powrót leada wysyła `/visit` z `{ token }` zamiast `{ visitorId }` (nigdy
  oba). 401 i 403 usuwają token i powiązanie, bez ponawiania. Po `exp` powiązanie
  znika, a token zostaje tylko do `/revoke`. Drugi token zastępuje pierwszy bez
  `/revoke`. Przed otwarciem bazy `leadToken()` zwraca `false` — wołaj po odpowiedzi
  zgłoszenia.
- „Wyczyść”, odmowa i wycofanie zgody wysyłają `/revoke { token }`; gdy formularz
  dostał też `visitorId`, idzie drugi `/revoke { visitorId }`.
- Pole `d2-ma-visitor-id` działa dalej (leady testowe agencji); 2destate nie wiąże
  po nim prawdziwego leada.
- Wygasły token czekający na `/revoke` nie blokuje późniejszego powiązania po
  `visitorId` (lead testowy agencji w tej samej przeglądarce). Znika dopiero z
  retencją profilu albo przy „Wyczyść”.
- Zmiana ma.35: odmowa po oddaniu `visitorId` (`consentRequired: false`) po
  `/revoke` nadaje nowy `visitorId`, reszta profilu zostaje. 2destate nie wiąże
  odwołanego id z nowym leadem, więc bez tego późniejsza zgoda z nowym
  formularzem nigdy nie dałaby działającego powiązania.

## v1.9.0-ma.35 — 2026-11-02 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.34–ma.16)

`visitorId` dla 2destate tylko za zgodą, także przy `consentRequired: false`
(Piotr, 2.11.2026, issue #48). Dotyczy wyłącznie stron z `d2-ma-hot-lead`.

- `digi2.ma.visitorId()` zwraca `null`, a pole `[d2-ma-visitor-id]` zostaje puste,
  dopóki gość nie wyrazi zgody (nieznana zgoda też). Do ma.34 przy
  `consentRequired: false` id szło bez zgody, choć dokumentacja mówiła inaczej.
- Bez oddanego id nie powstaje powiązanie z leadem, więc powrót nie wysyła `/visit`.
- Jawna odmowa po oddaniu id (`consentRequired: false`, baza zostaje): `/revoke`
  w 2destate i koniec powiązania, także gdy odmowa przyszła między wizytami.
  Późniejsza zgoda go nie wskrzesza — potrzebny nowy formularz z leadem.
  Przy `consentRequired: true` bez zmian (odmowa i tak kasuje bazę z `/revoke`).

## v1.9.0-ma.34 — 2026-11-02 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.33–ma.16)

Zdarzenia zachowania wracającego leada w `/visit`. Tylko strona z
`d2-ma-hot-lead`, tylko powiązany lead w wizycie powrotu i tylko przy zgodzie.
Na razie wyłącznie Osiedle Demo (Piotr, 2.11.2026); na stronach klientów MA czeka
na umowę.

- **Serwer najpierw.** `/visit` dostaje nowe pola `visitNo` i `time_on_site_s`.
  Serwer 2destate bez ich obsługi odpowie 422, a moduł wyciszy sygnały do końca
  wizyty.
- Nowe atrybuty: `d2-ma-event="map_view|list_view"` (element w widoku około 1 s,
  raz na wizytę), `d2-ma-event="card_download|price_history_view"` z
  `d2-ma-unit="<uuid>"` (klik), `d2-ma-dwell` z `d2-ma-unit` (czas widoczności
  rzutu lub karty, `plan_dwell`).
- `plan_dwell` wymienia w `units` tylko lokale oglądane co najmniej 180 s; krótsze
  czasy idą w samym `dwell_s`.
- `digi2.ma.event(key, { unitId, seconds })` robi to samo z widżetu; `seconds`
  tylko dla `plan_dwell`. Zwraca `false`, gdy zdarzenie nie zostało przyjęte.
- `list_view` liczy też zmiana filtra przez gościa w wyszukiwarce 2destate.
- Stan, którego serwer nie przyjął (sieć, 429, 503), nie jest ponawiany sam: zdarzenia
  i czas jadą przy następnej próbie, a przepadają, gdy wizyta wcześniej się skończy.
  Zdarzenie tuż przed wyjściem, mniej niż 60 s po ostatniej wysyłce, też przepada.
- `time_on_site_s` liczy sekundy tej wizyty przy widocznej karcie i aktywności w
  ostatnich 5 minutach. To czas aktywny, więc gość czytający bez ruchu wypada niżej.
- W widoku znaczy: co najmniej połowa elementu albo połowa ekranu. Przy kilku
  `d2-ma-dwell` naraz sekunda idzie na największy.
- **Zmiana zachowania:** cały sygnał `/visit` wymaga udzielonej zgody, także przy
  `consentRequired: false` (decyzja Piotra, 2.11.2026). Bez decyzji gościa nic nie
  wychodzi, a sygnał rusza po zgodzie. Jawna odmowa kasuje też liczniki. `/revoke`
  działa jak dotąd.
- Każda wysyłka to stan całej wizyty, nie przyrost. Nowe zdarzenia idą najwyżej co
  5 minut oraz przy ukryciu karty i wyjściu ze strony, co najmniej 60 s po ostatniej
  wysyłce. Sam czas jedzie tylko przy wyjściu, gdy urósł o co najmniej 30 s.
- Do zrobienia na stronie: oznaczyć elementy, inaczej działa tylko `list_view` z
  wyszukiwarki i czas. Strona bez `d2-ma-hot-lead` działa jak dotąd.

## Bez wydania — bramka przed tagiem (bez zmian w `dist/`)

Nic się nie zmienia na stronach klientów. Nowe dla osoby, która wydaje:

- `scripts/release.sh vX.Y.Z "opis"` — bramka → tag → push tagu → purge
  zmienionych plików `dist/`. Gdy bramka jest czerwona, zatrzymuje się przed
  `git tag`.
- `npm run release:check [-- vX.Y.Z]` — sama bramka: build, `dist/` zgodny z
  commitem, `npm test` i kontrola w przeglądarce (Playwright, Chromium bez
  okna) dla forms, popups i datalayer na `sandbox/gate-*.html`, ze zrzutami
  porównywanymi z wzorcem. Ładuje pliki z `dist/`, nic nie wychodzi poza
  localhost. Około 10 s. Szczegóły: README → Build → Release gate.
- Hook `pre-push` (`.githooks/`, włącza go `npm install`) odrzuca push tagu
  `v*` na commit, który nie przeszedł bramki. Ręczne `git tag` i `npm version`
  nie omijają jej już przypadkiem.

## v1.8.3 — 2026-10-31 (poprawka loadera; wydana od v1.8.2, bez linii `ma.N`)

- **Moduł, który rzuci wyjątkiem przy ładowaniu, nie zamraża już strony.** Do
  tej pory wywołanie przez zaślepkę loadera (np. `digi2.popups.create()` w
  `digi2.onReady`, jak w dokumentacji) przy takim module powtarzało się samo w
  nieskończonej pętli: cała karta przestawała odpowiadać, `load` nie
  przychodził. Błąd był od marca (322e618), także w 1.8.2. Wyjątek mógł pochodzić
  z zepsutego wydania, ze starej przeglądarki odwiedzającego albo z konfliktu z
  innym skryptem.
- Teraz taki moduł daje `console.error` z jego nazwą i `module:error`, a
  `digi2.modules.check()` zwraca `false`. Wywołanie się nie wykonuje, a jego
  Promise jest odrzucony. `onReady` rusza dla reszty strony jak dotąd.
- Dwie rzeczy, o których warto wiedzieć, tak samo jak przy module, którego
  nie udało się pobrać:
  - `onReady` przychodzi wtedy **wcześniej**, bo nie czeka na moduły, które
    jeszcze się pobierają. Wywołanie innego modułu w callbacku działa, bo
    zaślepka najpierw go dociągnie. Kod, który od razu czyta stan innego
    modułu albo `digi2.modules.check()`, może jednak trafić przed jego
    załadowaniem.
  - **Nie ma ponownej próby.** Kolejne wywołania tego modułu są od razu
    odrzucane, aż do przeładowania strony.
- Do zrobienia na stronie: nic. Kto łapał wynik `digi2.<moduł>.metoda()` przez
  `.then`, przy zepsutym module dostanie teraz odrzucenie zamiast wiecznie
  wiszącej obietnicy.
- `v1.8.3` jest zbudowana od `v1.8.2` i zawiera tylko tę poprawkę. Zmiany w
  `popups.js` i `lightbox.js` z linii `v1.9.0-ma.N` dalej nie idą na `@latest`.

## v1.9.0-ma.33 — 2026-10-29 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.32–ma.16)

### `d2-ma` — historia źródeł wizyt (touchpoints v1)

- Każda wizyta zapisuje, skąd gość przyszedł: tagi UTM (source, medium,
  campaign, content, term, id), rodzaj identyfikatora kliknięcia (gclid,
  fbclid, ttclid, msclkid, bez jego wartości), domenę strony polecającej
  i stronę wejścia. Przykład: pierwszy raz google, potem meta_ads, potem
  tiktok. Zlecenie Piotra z 29.10.2026.
- Wizyta bez UTM też jest zapisywana (wejście bezpośrednie albo z polecenia).
  W trakcie wizyty nowy wpis daje tylko strona z inną kampanią, a strona bez
  UTM niczego nie nadpisuje. Najwyżej 20 ostatnich wpisów, przechowywanych
  tak długo jak profil.
- Tylko przy wyrażonej zgodzie, także gdy koperta zgody nie wymaga, bo to
  profilowanie. Bez zgody lista jest pusta. Zgoda dana później na tej samej
  stronie dopisuje wpis tej wizyty. Odmowa kasuje historię źródeł.
- Źródło strony liczy się raz na jej załadowanie. Karta otwarta 2 godziny
  i przewinięta nie daje drugiego „kliknięcia w reklamę”. Sam identyfikator
  kliknięcia (np. gclid doklejany do linków wewnętrznych) daje nowy wpis tylko
  wtedy, gdy gość przyszedł z innej strony albo bez strony polecającej.
- Strona wejścia z „@” w ścieżce (np. `/wypisz/jan@x.pl`) nie jest zapisywana,
  wpis zostaje bez niej.
- Wartość UTM z „@” nie trafia do historii źródeł. W `utm_content`
  i `utm_term` nie trafia też wartość wyglądająca na numer telefonu.
  Identyfikatory kampanii (`utm_campaign`, `utm_id`, długie liczby z Google
  i Meta) zostają. Rodzaje kliknięć to gclid, gbraid, wbraid,
  dclid, fbclid, ttclid i msclkid.
- Historia trafia do leada w `d2ma_context_json` (`touchpoints: { v: 1, items }`,
  najwyżej 10 ostatnich; przy przekroczeniu 4 kB obcinane jako pierwsze)
  i do tekstu dla handlowca (`źródła wizyt: google/cpc → meta_ads/paid_social → …`).
  Z JS: `digi2.ma.touchpoints()`. Do użycia w innym skrypcie bez zapisu:
  `digi2.ma.parseTouchpoint(href, referrer)`.
- Jedyna definicja kontraktu jest w README, w sekcji „Touchpoints”. Brak
  pola znaczy pustą wartość.
- Ten tag zawiera też niewydane ma.32 (#41): popup już otwarty nie dostaje
  treści nowego lokalu.

## v1.9.0-ma.32 — 2026-10-29 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.31–ma.16)

### `d2-ma` — popup, który już jest na ekranie

- Gdy popup ze scenariusza jest otwarty, a gość klika kolejny lokal, który
  ma ten sam popup, otwarty popup zostaje z dotychczasową treścią. Wcześniej
  treść podmieniała się na nowy lokal w trakcie czytania, a moduł liczył to
  jako nowe pokazanie: wysyłał `ma:action` i zużywał częstotliwość. Tak samo
  przy popupie, który właśnie się zamyka. Po zamknięciu następne kliknięcie
  pokazuje popup normalnie.
- Komunikat w konsoli przy pominiętym popupie mówi teraz, że na ekranie jest
  inny popup albo galeria (lightbox). Wcześniej wspominał tylko o popupie.

## v1.9.0-ma.31 — 2026-10-28 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.29–ma.16)

Numeru ma.30 nie wydano (szkic PR #37).

### `d2-ma` — zgoda z banera ładowanego przez GTM nie kasuje już profilu

- Decyzja Piotra z 28.10.2026: zgoda ma trzy stany. Wcześniej moduł liczył
  „jeszcze nie wiem” jak odmowę. Baner (np. Cookiebot) ładowany przez GTM
  zgłasza zgodę 30 ms do 5 s po starcie modułu, więc powracający gość ze
  zgodą tracił historię przy każdym wejściu na stronę.
- **Zgoda** otwiera bazę, jak dotąd.
- **Jawna odmowa** (`update` denied w `dataLayer` albo w tagu Google, odmowa
  zapisana przez moduł `google`) kasuje bazę. Teraz także wtedy, gdy przyjdzie,
  zanim baza się otworzyła.
- **Zgoda nieznana** (nic albo samo `default` denied, które szablon banera
  w GTM stawia zawsze) nie otwiera bazy i jej nie kasuje. Moduł czeka na
  `update`.
- Dwa bezpieczniki przy nieznanej zgodzie kasują bazę, która nigdy nie była
  otwarta za zgodą, i bazę nieotwieraną za zgodą dłużej niż retencja
  (90 dni). Bazy sprzed ma.31 nie mają znacznika zgody, więc u gościa, który
  wejdzie bez znanej jeszcze zgody, skasują się jeden raz.
- Wybór zapisany przez moduł `google` (`d2-gtm`) liczy się przed każdym
  `default`, także regionalnym. To decyzja gościa, a moduł odtwarza ją przy
  starcie jako `default`. Zapisana odmowa kasuje bazę, zapisana zgoda ją
  otwiera, nawet gdy strona ma regionalne `default` denied.
- Wejście na stronę, która zgody nie wymaga, zdejmuje znacznik zgody. Po
  powrocie na stronę z wymogiem i z nieznaną zgodą baza się skasuje.
- Koperta bez wymogu zgody kończy czekanie na zgodę.
- `ma:change` podaje nowe powody: `consent denied`,
  `profile not opened with consent`, `consent older than retention`.
  `consent required` już nie występuje.

### `d2-ma` — pusty `d2-ma` czeka na `digi2.ma.load()`

- Strona, która podaje kopertę z JS (pusty `d2-ma=""`), dostawała wizytę
  policzoną bez scenariuszy. Prawdziwy powrót po godzinie nie uruchamiał
  przez to „Powrotu do lokalu”. Teraz moduł czeka z otwarciem bazy na pierwsze
  `digi2.ma.load()`. Kopertę podaną przed startem modułu zachowuje. Bez
  `load()` startuje bez koperty po 10 s, a historia zapisuje się jak dotąd.

## v1.9.0-ma.29 — 2026-10-28 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.28–ma.16)

### `d2-ma` — odmiana w popupie `promo-filter`

- Wbudowany popup po filtrze pokoi mówi „Szukasz mieszkania 2-pokojowego?”
  zamiast „Szukasz mieszkania 2 pokoje?”. Tak samo dla każdej liczby:
  1-pokojowego, 5-pokojowego, 12-pokojowego. Przy filtrze z kilkoma liczbami
  (np. 2 i 3) zdanie bierze pierwszą, jak dotąd. Popup własny strony i szablon
  z koperty o tym id bez zmian.
- Zmiana zachowania: filtr z liczbą pokoi 0 dawał wcześniej popup „Szukasz
  mieszkania 0 pokoi?”. Teraz popup jest wtedy pomijany, tak jak bez liczby
  pokoi w filtrze.

## v1.8.2 — 2026-10-28 (tag z gałęzi release/v1.8.2, na bazie v1.8.1)

### `d2-popups`

- **Automatyczne popupy znów się otwierają na stronach bez `d2-lightbox`.** W
  v1.8.1 popup z `openAfterDelay` (i każdy inny automatyczny: exit intent,
  scroll, bezczynność, krok sekwencji) na stronie bez lightboxa nigdy nie
  wchodził (osiedlebo.pl). Pytanie „czy lightbox jest otwarty” trafiało w
  zaślepkę loadera, która zamiast odpowiedzi zwraca Promise; popup brał to za
  otwartą galerię i czekał na `lightbox:close`, które nie przychodziło. Teraz
  popupy najpierw pytają loader, czy moduł lightbox jest załadowany, i nie
  dociągają go przy okazji. Strony z `d2-lightbox` działają jak w v1.8.1.

## v1.8.1 — 2026-10-23 (tag z gałęzi release/v1.8.1, na bazie v1.8.0)

### `d2-popups` + `d2-lightbox`

- **Strona nie zostaje już zablokowana po zamknięciu popupu i galerii.** Popupy
  i lightbox trzymają jedną wspólną blokadę przewijania (`digi2.scrollLock`).
  Wcześniej każdy z modułów zapamiętywał `overflow` osobno: lightbox otwarty, na
  nim popup (formularz z `d2-show-popup` albo krok sekwencji), zamknięcie galerii,
  potem popupu, i strony nie dało się przewinąć, choć nic nie było otwarte
  (bernardynska.com/galeria). Teraz przewijanie wraca po zamknięciu ostatniego
  okna, w dowolnej kolejności, z wartością `overflow` sprzed pierwszego otwarcia.
- **Popupy automatyczne czekają na zamknięcie lightboxa** (opóźnienie, exit
  intent, scroll, bezczynność, krok sekwencji): wchodzą ~0,6 s po
  `lightbox:close`. Popup otwarty przez odwiedzającego dalej może wejść nad galerię.
- `digi2.popups.destroy()` na otwartym popupie chowa go i zdejmuje blokadę
  przewijania (wcześniej popup zostawał na ekranie bez obsługi zamykania). Nie
  wysyła `popup:close` ani `onClose`; popup odłożony za nim dostaje ekran.
- Nowe API dla własnych nakładek strony: `digi2.scrollLock.acquire(nazwa)` /
  `release(nazwa)` / `isLocked()` / `owners()`. Skrypt strony, który sam
  zapamiętuje i przywraca `overflow` (np. pełnoekranowy tooltip mapy), powinien
  przejść na nie, bo inaczej może przywrócić nieaktualne `hidden`.
- Strony bez lightboxa działają jak dotąd; API, które strony już wywołują, się
  nie zmienia.

### Dokumentacja

- `docs.html`: tabela pól wykrywanych automatycznie podawała dla `MESSAGE`
  `minLength: 30`, którego biblioteka nie ustawia od v1.0.0. `MESSAGE` jest
  domyślnie wymagane, bez minimalnej długości. Kreator formularza w `docs/`
  przestał dopisywać `minLength: 30` przy „Wiadomość wymagana”.

## v1.9.0-ma.28 — 2026-10-22 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.27–ma.16)

### `d2-ma` — numer wersji w konsoli

- `digi2.ma.version` podaje wersję skryptu załadowaną na stronie, np. `"ma.28"`.
  Po podmianie tagu w Webflow wystarczy wpisać to w konsoli, zamiast szukać
  adresu pliku w zakładce Sieć. Format jest ten sam co `minScript` w kopercie.

## v1.9.0-ma.27 — 2026-10-22 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.26–ma.16)

### `d2-ma` — jeden popup na interakcję, popupy na telefonie

- Jedno kliknięcie lokalu daje najwyżej jeden popup ze scenariuszy. Gdy to
  kliknięcie otwierało nową wizytę (`return_visit`) i jednocześnie spełniało
  inny wyzwalacz (np. trzeci 2-pokojowy), pokazywały się dwa popupy: drugi
  ok. 1 s po zamknięciu pierwszego. Teraz drugi czeka do następnej wizyty,
  jak przy zwykłym konflikcie. To samo przy otwarciu strony (CRM, wizyta,
  odłożone akcje) i przy `digi2.ma.simulateReturn()`.
- Popup ze scenariusza nie czeka za innym popupem na ekranie (np. formularzem,
  który gość otworzył sam). Jest pomijany i nie zużywa częstotliwości, więc
  może przyjść przy następnym wyzwalaczu.
- `ma:action` (i dataLayer z niego) dla popupu leci tylko wtedy, gdy popup
  naprawdę wszedł na ekran.
- Telefon: popupy znowu się pokazują. Image Map Pro zostawia klasę
  `is-fullscreen` na zamkniętym dymku mapy, więc moduł uznawał dymek za otwarty
  i po 5 minutach rezygnował z popupu. Teraz liczy się, czy dymek jest widoczny.
  Popup czeka pół sekundy na otwarcie się dymka po stuknięciu i pokazuje się
  po jego zamknięciu.

## v1.9.0-ma.26 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.25–ma.16)

### `d2-ma` — wyszukiwarka z core 2destate 1.7.0

- „Wyczyść” naprawdę zdejmuje filtr ustawiony przez `prefer_filters`. Core
  scala filtry, więc pusty obiekt niczego nie zmieniał. Teraz moduł wysyła
  każde pole jako puste. Pola, które ustawił sam gość, zostają.
- Jeśli core nie przyjął filtra z `prefer_filters` (gość już ruszył to pole
  albo strona nie ma panelu wyszukiwarki), akcja nie liczy się jako wykonana.
  Przy następnej wizycie moduł spróbuje ponownie.
- Strona testowa `sandbox/ma.html` ładuje kopertę dopiero po załadowaniu
  modułów.

## v1.9.0-ma.25 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.24–ma.16)

### `d2-ma` — poprawki z recenzji ma.23

- Adres koperty spoza listy nie jest zapamiętywany. `digi2.ma.reload()` i
  `d2-ma-refresh` nie próbują go ponownie, a zły adres w `digi2.ma.load(url)`
  nie zastępuje wcześniejszego, poprawnego.
- Strona testowa `sandbox/ma.html` ładuje kopertę jako obiekt, więc działa
  także po wprowadzeniu listy hostów.

## v1.9.0-ma.24 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.23–ma.16)

### `d2-ma` — gorący lead (poprawki z recenzji ma.22)

- Sygnał powrotu zawsze zawiera listę obejrzanych lokali, także pustą. Serwer
  2destate wymaga tego pola. Bez niego pierwszy sygnał po powrocie, wysłany
  przed obejrzeniem lokalu, dostawał odmowę i wyciszał całą wizytę.
- Pole `[d2-ma-visitor-id]` dostaje identyfikator także przy kliknięciu
  przycisku wysyłki, a nie tylko przy samym wysłaniu formularza. Działa więc
  tak samo jak kontekst leadu.

## v1.9.0-ma.23 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.22–ma.16)

### `d2-ma` — dozwolone adresy

- Koperta scenariuszy jest pobierana tylko z `https://digi2.app/…` albo
  `https://api.2destate.com/…`, zarówno z atrybutu `d2-ma`, jak i z
  `digi2.ma.load(url)`. Inny adres nie jest pobierany. W konsoli pojawia się
  ostrzeżenie, a strona działa jak bez MA. Plik lokalny do testów podaje się
  jako obiekt: `digi2.ma.load({…})`.
- Gorący lead (`d2-ma-hot-lead`) wysyła `/visit` i `/revoke` tylko do
  `https://api.2destate.com/…`. Inny host, `http`, port albo login oznaczają, że
  nie idzie żadne żądanie (wcześniej skrypt przełączał się wtedy na produkcję).
  Stagingu 2destate z tymi trasami nie ma.

## v1.9.0-ma.22 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.21–ma.16 i gorący lead z ma.15)

### `d2-ma` — gorący lead wraca (MA-D38 etap 1, wariant D′) na aktualnej linii

- Gorący lead z gałęzi `feat/d2-ma-12-2destate-visitor` (ma.12, ma.13, ma.15,
  PR #17) przeniesiony na ma.21: kontekst leadu, wyszukiwarka 2destate,
  `d2ma_consent` i zapis filtra przy wyjściu działają razem z nim.
- Zachowanie gorącego leada bez zmian względem ma.15. Opt-in to atrybut
  `d2-ma-hot-lead` na tagu loadera, tylko dla Osiedla Demo i leadów testowych.
  Pole `[d2-ma-visitor-id]` albo `digi2.ma.visitorId()` przekazuje identyfikator
  do formularza 2destate. Sygnał powrotu `POST {api}/public/ma/visit` idzie
  tylko po oddaniu identyfikatora w wizycie z leadem i tylko po zgodzie, a
  `/revoke` przy „Wyczyść” i wycofaniu zgody.
- ma.15 zostaje bez zmian na swojej gałęzi. Strona dema przechodzi na ma.22
  dopiero po recenzji.

## v1.9.0-ma.21 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.20–ma.16)

### `d2-ma`

- Zdarzenia GA4 wyszukiwarki (`view_item_list`, `select_item`, `view_flat`)
  zawsze mają wszystkie swoje pola. Brak wartości jest wysyłany jako pusty
  (`undefined`), a nie pomijany. Dzięki temu zmienna w GTM nie pokaże wartości
  z poprzedniego zdarzenia, np. ceny innego lokalu albo starego sortowania.

## v1.9.0-ma.20 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.19–ma.16)

### `d2-ma`

- Wyjście ze strony z niezapisaną jeszcze zmianą filtra zapisuje tylko sam
  filtr w profilu. Nie uruchamia akcji scenariusza: żadnego wpisu w dataLayer,
  webhooka ani popupu w chwili wyjścia. Przy następnej odsłonie wyzwalacz nie
  jest odtwarzany, a filtr zostaje w profilu i kontekście leadu.
- Przy wysyłce formularza zmiana filtra dalej trafia do profilu od razu, więc
  akcje scenariusza z wyzwalaczem `search_filter` mogą się wtedy wykonać.

## v1.9.0-ma.19 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.18, ma.17, ma.16)

### `d2-ma`

- Filtr zmieniony w wyszukiwarce tuż przed wysłaniem formularza (w ciągu
  500 ms) trafia już do kontekstu leadu. Zmiana zapisuje się też przy wyjściu
  ze strony, z czasem ostatniej zmiany, a nie chwilą wysyłki.
- Lista ułożona przez nas (`custom`) nie daje zdarzenia `view_item_list`, a
  następne zdarzenie listy idzie bez `item_list_sort`.
- Skrypt zgłasza wersję równą numerowi tagu (`ma.19`) przy porównaniu z
  `minScript` koperty. Wcześniej tag ma.18 zgłaszał 17.

## v1.9.0-ma.18 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.17 i ma.16)

### `d2-ma`

- Przy wysyłce formularza z aktywnym profilem moduł dopisuje ukryte pole
  `d2ma_consent` = `1`. Serwer 2destate zapisuje kontekst leadu tylko z nim.
  Bez zgody pola nie ma, a własne pole strony o tej nazwie jest opróżniane.
- Wyszukiwarka (poprawki z recenzji ma.17): seria zmian filtra w ciągu 500 ms
  (suwak ceny) liczy się jako jedna zmiana w profilu i scenariuszach.
  `item_list_sort` w GA4 tylko dla sortowania po cenie, metrażu i piętrze.
  Zmiana bez `source: "user"` nie jest zachowaniem gościa. „Wyczyść”
  (`digi2.ma.clear()`) zeruje też filtry wyszukiwarki.

## v1.9.0-ma.17 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; zawiera ma.16)

### `d2-ma` — wyszukiwarka 2destate (§13.14, wymaga core 1.7.0)

- Nowy wyzwalacz scenariusza `search_filter` (`rooms`, `floor`, `minCount`):
  gość ustawił w wyszukiwarce filtr z tą liczbą pokoi / piętrem.
- Nowa akcja `prefer_filters` (`by: rooms | floor | both`): przy powrocie
  wyszukiwarka sama ustawia filtr z preferencji gościa — raz na wizytę i tylko,
  jeśli gość jeszcze nie filtrował.
- `map_order` układa też listę wyników i ustępuje sortowaniu wybranemu przez
  gościa do końca wizyty.
- Profil pamięta ostatni filtr; dopóki gość nie obejrzał żadnego lokalu,
  preferencja pokoi / piętra bierze się z filtra. Kontekst leadu dostaje
  „filtrował: 2–3 pokoje, do 700 000 zł, tylko wolne”.
- Wbudowany popup `promo-filter` bez lokalu: „Szukasz mieszkania 2 pokoje?
  Pokażemy wolne lokale i aktualne promocje.”
- Zdarzenia GA4 z wyszukiwarki: `view_item_list` (filtry, liczba wyników,
  sortowanie), `select_item`, `view_flat`. Wyłącznik `d2-ma-search-events="off"`.
- Bez core 2destate 1.7.0 nic się nie zmienia.
- Kontekst leadu: formularz bez `d2-ma-context="json"` nie rusza własnego
  pola `d2ma_context_json` strony (doprecyzowanie z recenzji ma.16).

## v1.9.0-ma.16 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; ma.15 zajął tag na gałęzi hot lead, PR #17)

### `d2-ma` — kontekst leadu w formularzu (§13.13)

- Przy wysyłce **każdego** formularza (poza `d2-ma-ignore`) moduł dopisuje ukryte
  pole `d2ma_context`: zdanie po polsku dla handlowca o tym, co gość robił na
  tej stronie (wizyty z datami, obejrzane lokale z ceną i liczbą obejrzeń,
  preferencja, segmenty, lead, ostatni lokal, bieżąca strona, UTM), ≤ 2000
  znaków. Formularz z `d2-ma-context="json"` dostaje dodatkowo
  `d2ma_context_json` (≤ 4 kB) dla webhooka. Webflow, d2-forms i
  `new FormData(form)` widzą pola jak każde inne; istniejące pole o tej nazwie
  jest nadpisywane, nie dublowane.
- Tylko po zgodzie, tą samą bramką co profil: bez zgody `d2ma_context` =
  „brak kontekstu (brak zgody)”, JSON pominięty. Nigdy wartości pól, IP, UA,
  geolokalizacji.
- Wyłącznik: `d2-ma-context="off"` na tagu loadera. API: `digi2.ma.context()`,
  `digi2.ma.fillContext(form)`.

## v1.9.0-ma.15 — 2026-10-21 (przedpremierowa, tylko gałąź `feat/d2-ma-12-2destate-visitor`, `@latest`: patrz uwaga na górze)

ma.14 (poprawka #16) + gorący lead z ma.12 / ma.13. **Tę wersję przypina strona dema.**

### `d2-ma`

- Zawiera poprawkę wyścigu popupów #16 z ma.14 i gorący lead (MA-D38 etap 1,
  wariant D′) z poprawkami z recenzji, czyli wszystko z ma.12 i ma.13.
- Wycofanie zgody wykryte przy wejściu na stronę, gdy przeglądarka nie ma
  jeszcze bazy `d2ma`, nie zakłada jej tylko po to, żeby ją skasować.

## v1.9.0-ma.14 — 2026-10-21 (przedpremierowa, `@latest`: patrz uwaga na górze; numer ma.13 zajął tag na gałęzi hot lead, PR #17)

### `d2-ma`

- Start d2-ma nie przerywa się już, gdy moduł popupów dociąga się później niż
  koperta scenariuszy (#16): wcześniej `[digi2.ma] start failed TypeError:
  … forEach is not a function` w konsoli, brak `ma:ready`, brak podświetlenia
  lokali gościa na mapie przy wejściu i pusta sekcja profilu do następnego
  zdarzenia. Odłożony popup z warunkiem `d2-ma-show-*` wznawia się, gdy moduł
  popupów już jest; popup załadowany później sam pyta d2-ma przy otwarciu.
- Błąd rzucony przez moduł popupów przy wznawianiu odłożonego popupu nie
  zatrzymuje d2-ma (`console.warn` „popups resume failed”).

## v1.9.0-ma.13 — 2026-10-21 (wydanie gałęzi `feat/d2-ma-12-2destate-visitor` bez poprawki #16 — **nie używać**, zamiast niego ma.15)

Tag `v1.9.0-ma.13` powstał na gałęzi gorącego leada, zanim poprawka #16 (#18) trafiła na main, która
zapowiadała ją jako ma.13; poprawka #16 ostatecznie wyszła jako ma.14. Ten tag ma błąd wyścigu popupów (#16).

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

## v1.9.0-ma.12 — 2026-10-21 (przedpremierowa, tylko gałąź `feat/d2-ma-12-2destate-visitor`, `@latest`: patrz uwaga na górze)

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

## v1.9.0-ma.11 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

### `d2-popups`

- Popup otwarty kliknięciem w link do kotwicy (np. `#profil`) nie traci
  fokusu na rzecz skryptu przewijania Webflow: przez 2 sekundy po otwarciu
  fokus, który strona wyniesie poza okno, wraca do popupu. Fokus w lightboxie
  albo w innym oknie modalnym zostaje tam, gdzie jest.

## v1.9.0-ma.10 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

### `d2-popups`

- `closeOnEsc` działa niezależnie od `manageFocus`, więc Esc zamyka popup także
  przy wyłączonej obsłudze fokusu.
- Po zamknięciu górnego popupu fokus i klawisze wracają do popupu pod spodem.
- Esc nie zatrzymuje już propagacji zdarzenia (`preventDefault` wystarcza),
  więc inne skrypty strony dalej je widzą.

## v1.9.0-ma.8 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

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

## v1.9.0-ma.7 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

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

## v1.9.0-ma.6 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

### `d2-ma` — popup nie zasłania dymku mapy

- Na telefonie stuknięcie lokalu na mapie 2destate otwiera dymek na cały ekran.
  Popup ze scenariusza (np. „Preferencja pokoi”) czeka teraz, aż gość zamknie
  dymek, zamiast nakładać się na niego. Gdy dymek jest otwarty dłużej niż 5
  minut, popup przepada i może pojawić się następnym razem. Obejście z
  `z-index` na stronie demo można zostawić, nie przeszkadza.

## v1.9.0-ma.5 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

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

## v1.9.0-ma.4 — 2026-10-20 (przedpremierowa, `@latest`: patrz uwaga na górze)

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

## v1.9.0-ma.3 — 2026-10-19 (przedpremierowa, `@latest`: patrz uwaga na górze)

### `d2-ma` — zdarzenie przy wycofaniu zgody

- Gdy gość wycofa zgodę w trakcie wizyty (albo koperta zacznie wymagać
  zgody), moduł kasuje bazę i wysyła `ma:change` z
  `{ cleared: true, tracking: false, reason }`. Sekcja „co o Tobie wie
  strona” może na nim pokazać stan „brak zgody”. Wcześniej pola
  `[d2-ma-profile]` czyściły się bez żadnego zdarzenia.

## v1.9.0-ma.2 — 2026-10-19 (przedpremierowa, `@latest`: patrz uwaga na górze)

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

## v1.9.0-ma.1 — 2026-10-19 (przedpremierowa, `@latest`: patrz uwaga na górze)

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

Zgłoszone ze strony klienta: po kliknięciu „Zarezerwuj" w wyszukiwarce i zamknięciu
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
