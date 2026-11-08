# Backlog

Prace odłożone świadomie: co, dlaczego nie teraz i kiedy wracamy.
Pozycja podjęta = gałąź + PR; po scaleniu usuń ją stąd (ślad zostaje w CHANGELOG).

## Błąd — loader: dwa loadery na stronie wykonują callbacki `onReady` dwa razy

- **Dodano:** 2026-11-08, decyzja architekt-it: poprawiamy w bibliotece,
  gałąź z poprawką 2026-11-09
- **Priorytet:** przed kolejnym wdrożeniem d2-booking na innej stronie
- **Szacunek:** ok. pół dnia z testami i dokumentacją
- **Objaw:** strona z loaderem witryny (`@latest`) i drugim loaderem z
  d2-booking (`@v1.9.0-ma.N` w Embedzie) wykonuje każdy callback
  `digi2.onReady` zarejestrowany po drugim tagu dwa razy. `forms.create` i
  `popups.create` są idempotentne (ostrzeżenie „already exists”, zwracają
  istniejącą instancję), ale kod strony, który przy okazji dokłada listenery,
  robi to dwa razy. Przykład: zdarzenie `select_promotion` trafia do dataLayer
  2× na jeden klik. To błąd pomiaru.
- **Przyczyna:** oba loadery dzielą `window.digi2`. Drugi nadpisuje
  `on`/`emit`/`onReady` własnymi (własna lista listenerów). Każdy loader na
  koniec woła `window.digi2.emit('loaded')`, czyli emit drugiego, więc lista
  drugiego dostaje `'loaded'` dwa razy.
- **Poprawka:** loader, który zastanie działający loader (flaga w
  `window.digi2`), nie nadpisuje `on`/`emit`/`onReady`. Ładuje swoje moduły
  swoją bazą URL i nie ogłasza `'loaded'` drugi raz. Wystarczy poprawiony
  drugi loader, bo pierwszy (`@latest`) zostaje bez zmian. Test: dwa loadery na
  jednej stronie, callback `onReady` raz, moduły obu loaderów załadowane.
- **Kolejność (uwaga z recenzji #74):** jeśli drugi loader nie ogłasza
  `'loaded'`, callback, który czeka na jego moduł (np. d2-booking), może ruszyć
  po `'loaded'` pierwszego loadera, zanim ten moduł się załaduje. Test ma to
  sprawdzić. Rozwiązanie jest jedno z dwóch: `'loaded'` czeka też na moduły
  drugiego loadera albo moduł ma osobne, opisane w dokumentacji zdarzenie
  gotowości (`module:loaded` / `booking:ready`).
- **Opcja u klienta do czasu poprawki (nie domyślna):** strażnik „raz” w
  callbackach `onReady` kodu strony. Na rajska77 architekt-it rekomendował
  Piotrowi czekać na poprawkę biblioteki. Decyzja należy do Piotra.
- **Wydanie:** nowy tag `v1.9.0-ma.N` przez `scripts/release.sh` i podmiana
  przypiętego tagu w Embedach z d2-booking.

## d2-booking: zdjęcie i opis produktu poza listą wyników (UX)

- **Dodano:** 2026-11-08, zgłoszenie webflow (po decyzji 2destate z 8.11), bez
  wydania teraz
- **Szacunek:** ok. pół dnia z testami i dokumentacją
- **Powód:** `d2-booking-bind="<pole>"` wypełnia się dziś tylko w wierszach
  listy wyników (`[d2-booking-results]`). Strona rezerwacji jednego lokalu
  chce nad widgetem albo w nim zdjęcia i opisu tego lokalu. Na pierwszej
  stronie wdrożenia zdjęcie wstawiono statycznie. Moduł i tak pobiera produkt
  raz na wizytę (`GET /products/{ref}`, z `?lang=`), a odpowiedź ma
  `image_url`, `image_urls` i `description`. Dane już są, brakuje tylko
  wiązania.
- **Zakres:** `d2-booking-bind` działa też poza listą, w obrębie
  `[d2-booking-widget]` / formularza albo na elemencie z `d2-booking-product`.
  Wypełnia się z produktu rozwiązanego dla tej strony, ten sam zestaw pól co w
  wierszu (`image`, `name`, `description`, `city_line`…). Po zmianie produktu
  w kalendarzu pola też się zmieniają. Narysowany widget może dostać opcjonalny
  nagłówek ze zdjęciem i opisem, włączany atrybutem. Testy i dokumentacja w
  czterech miejscach.
- **Warunek startu:** zlecenie (2destate, webflow) albo kolejne wdrożenie
  strony jednego lokalu.

## d2-booking: zmiana języka w locie (`setLanguage` + przerysowanie)

- **Dodano:** 2026-11-08, decyzja architekt-it (nie teraz)
- **Szacunek:** ok. 1–1,5 dnia z testami i dokumentacją
- **Powód:** w v1.9.0-ma.43 język widgetu ustala się raz, przy starcie
  (`d2-booking-lang` na tagu loadera, `pageLanguage()`). Widgety rysują się raz
  (`d2-booking-widget-ready`), więc zmiana atrybutu po starcie nic nie daje.
  Strona bez Webflow Localization robi dziś przełącznik języka przeładowaniem:
  skrypt zaraz po tagu loadera ustawia `d2-booking-lang` z `?lang=` albo z
  localStorage, a przyciski przeładowują stronę z `?lang=xx`. **Przeładowanie
  gubi to, co gość wpisał w formularz.** Daty, liczba osób i `?apartament=`
  zostają, bo są w adresie. Dlatego przełącznik stoi nad formularzem.
- **Warunek powrotu:** sygnał od klienta albo z testu, że utrata wpisanych
  danych przy zmianie języka przeszkadza.
- **Zakres:**
  - `digi2.booking.setLanguage(code)`: tylko język z `cfg.languages` i ze
    słownikiem w module, inaczej odmowa z ostrzeżeniem w konsoli. Do tego
    obserwacja zmiany `d2-booking-lang` na elemencie konfiguracyjnym.
  - Przerysowanie tekstów: narysowane widgety, pola formularza (etykiety,
    podpowiedzi, błędy), kalendarz (miesiące, dni tygodnia, początek tygodnia),
    lista miejsc, wycena (formaty Intl), blok powrotu i zarządzania, znak digi2.
  - Wyczyszczenie zapamiętanych odpowiedzi zależnych od `?lang=` (`/products`,
    `/products/{ref}`, availability) i ponowne pobranie.
  - Wartości wpisane przez gościa zostają.
  - Zdarzenie `booking:language` na busie.
  - Testy (sprawdzić, że padają bez poprawki) i dokumentacja w czterech
    miejscach (docs.html, docs/data2.js, README, CHANGELOG).
- **Wydanie:** nowy tag `v1.9.0-ma.N` przez `scripts/release.sh`, potem podmiana
  przypiętego tagu na stronach, które tego chcą. To druga zmiana u klienta.
