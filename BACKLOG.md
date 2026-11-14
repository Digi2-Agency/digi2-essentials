# Backlog

Prace odłożone świadomie: co, dlaczego nie teraz i kiedy wracamy.
Pozycja podjęta = gałąź + PR; po scaleniu usuń ją stąd (ślad zostaje w CHANGELOG).

## popups: baner zgód wchodzi po otwartym popupie

- **Dodano:** 2026-11-14, recenzja PR #82 (architekt-it, 🟡3).
- **Szacunek:** ok. 1 h po stronie d2-cookies, w repo webflow.
- **Powód:** PR #82 sprawia, że popup czeka na baner. Odwrotnej kolejności
  nie obejmuje: gdy popup jest już otwarty, a baner pojawi się później
  (opóźnione ładowanie d2-cookies), na ekranie są dwa modale.
- **Zakres:** d2-cookies przed pokazaniem banera pyta
  `digi2.popups.isScreenBusy()` i czeka, aż ekran się zwolni. Alternatywa po
  stronie biblioteki to zamknięcie automatycznego popupu, gdy wchodzi baner.
  Odrzucona na razie, bo gubi popup.
- **Warunek startu:** PR #82 wydany (1.10.0), sesja webflow prowadzi d2-cookies.

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

## d2-booking: slot poza listą przerwany w połowie wiązania

- **Dodano:** 2026-11-09, recenzja #77 (architekt-it), do rozważenia przy
  kolejnej zmianie w `applyPlaceBinds`.
- **Problem:** gdy `bindSlot` rzuci w połowie (od ma.48 kończy się to jednym
  ostrzeżeniem w konsoli), slot zostaje z częścią danych obiektu i bez
  `_d2PlaceKey`. Następna porażka odczytu go więc nie przywróci do treści z
  Designera.
- **Pomysł:** przy błędzie `restoreDesigner` na tym slocie (jest zapamiętany
  przez `rememberDesigner` przed wiązaniem).
- **Warunek startu:** pierwsza zmiana w wiązaniu poza listą albo zgłoszenie ze
  strony.
