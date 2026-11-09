# Backlog

Prace odłożone świadomie: co, dlaczego nie teraz i kiedy wracamy.
Pozycja podjęta = gałąź + PR; po scaleniu usuń ją stąd (ślad zostaje w CHANGELOG).

## Uwagi z recenzji #75 (ma.46) na ma.47

- **Dodano:** 2026-11-09, recenzja architekt-it, bez blokady dla ma.46.
- **Szacunek:** ok. pół dnia razem.
- **Zakres:**
  - **bind po nieudanym odczycie innego obiektu** (najważniejsze): gdy kalendarz
    wybierze inny obiekt, a jego odczyt się nie uda, sloty zostają z poprzednim
    obiektem, więc gość może zobaczyć zdjęcie innego apartamentu. Mają wrócić do
    stanu z Designera albo dostać `d2-booking-empty`. Test.
  - test ścieżki `_requestedElsewhere` (moduł, który gospodarz już pobiera);
  - zdanie w README o wyścigu z `<digi2-module>`: gość ich nie czyta, więc
    deklaracja przeznaczona dla modułu gościa ładuje się z adresu gospodarza;
  - `placeOf` w README: obiekt z kalendarza wygrywa z jawnym
    `d2-booking-product` na slocie;
  - `applyPlaceBinds` wyjąć z `Promise.all` przed `applyCalendars`, żeby
    wolny odczyt obiektu nie opóźniał kalendarza;
  - nazwy klientów w publicznym repo (np. wpis o stronie klienta w
    CHANGELOG) zamienić na opis bez nazwy.
- **Warunek startu:** następne wydanie ma.47.

## d2-booking: nagłówek ze zdjęciem i opisem w narysowanym widgecie

- **Dodano:** 2026-11-09, reszta pozycji „zdjęcie i opis poza listą”. Samo
  wiązanie `d2-booking-bind` poza listą weszło w ma.46.
- **Szacunek:** ok. 2–3 h z testami i dokumentacją.
- **Zakres:** widget rysowany przez moduł (bez slotów z Designera) dostaje,
  po włączeniu atrybutem (np. `d2-booking-widget-place`), nagłówek: zdjęcie,
  nazwa i opis z `applyPlaceBinds`. Style z tego samego arkusza i tych samych
  zmiennych CSS co reszta widgetu.
- **Warunek startu:** strona, która używa narysowanego widgetu i chce zdjęcia.
  Strona ze slotami w Designerze ma to już od ma.46.

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
