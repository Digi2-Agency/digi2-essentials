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
- **Obejście u klienta do czasu poprawki:** strażnik „raz” w callbackach
  `onReady` kodu strony.
- **Wydanie:** nowy tag `v1.9.0-ma.N` przez `scripts/release.sh` i podmiana
  przypiętego tagu w Embedach z d2-booking.

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
