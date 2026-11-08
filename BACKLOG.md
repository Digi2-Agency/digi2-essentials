# Backlog

Prace odłożone świadomie: co, dlaczego nie teraz i kiedy wracamy.
Pozycja podjęta = gałąź + PR; po scaleniu usuń ją stąd (ślad zostaje w CHANGELOG).

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
- **Warunek startu:** zaplanowane na 2026-11-09 razem z poprawką loadera
  (decyzja architekt-it 8.11): jeden PR i jeden tag `ma.N`, więc u klienta
  jedna podmiana przypięcia. Dwa osobne commity, w PR opisane jako dwie zmiany,
  każda z własnym testem. Gdy wiązanie się przeciągnie, wychodzi sam loader:
  błąd pomiaru ma pierwszeństwo.
- **Przypadek:** test 2destate z 8.11 na pierwszej stronie wdrożenia. Widget
  jednego produktu nie pokazuje zdjęcia, choć API zwraca `image_url`.

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
