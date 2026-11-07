# Kontrakt API klucza strony

Przykłady odpowiedzi tras `/api/v1/public/sites/{public_key}/…`. Na tych plikach powstaje moduł `d2-booking`, a repo digi2 Essentials trzyma ich kopię w `tests/fixtures/booking-api/` dla bramki wydania z atrapą API.

Test `backend/app/tests/api/routes/test_public_sites_contract.py` porównuje każdy plik z prawdziwą odpowiedzią trasy, więc plik i kod nie mogą się rozjechać. Sprawdza te same klucze i te same typy JSON na każdym poziomie, a także to, że każda trasa rodziny ma swój plik, a pola `query` i `request` przyjmuje trasa. To ostatnie jest osobnym sprawdzeniem, bo nieznane pole ciała trasa pomija po cichu i wciąż odpowiada 201.

## Format pliku

| Pole | Znaczenie |
|---|---|
| `contract_version` | wersja kontraktu, dziś `1`; przypięta testami po obu stronach |
| `route` | metoda i ścieżka |
| `status` | kod poprawnej odpowiedzi |
| `request` | przykładowe ciało żądania, tylko przy `POST` z ciałem; test wysyła dokładnie je, z datą przesuniętą w przyszłość |
| `headers` | nagłówki, które trasa czyta, z wartością przykładową: `X-Booking-Token` przy trasach gościa (wymagany) i `Idempotency-Key` przy `bookings` (opcjonalny) |
| `query` | parametry zapytania, które trasa przyjmuje; wszystkie opcjonalne |
| `nullable` | ścieżki pól, które mogą być `null`; `data[].city` to pole `city` każdego elementu listy `data` |
| `open_fields` | pola, których zawartość zależy od danych, np. `unit_prices` i `violations`; test sprawdza tylko typ pola |
| `response` | przykład odpowiedzi |

`errors.json` ma odmowy, na które moduł reaguje. Przy `exact` treść jest dosłowna, a w pozostałych `detail` ma ten kształt, ale tekst może się różnić. `reason` jest dosłowny w każdym wpisie, który go ma, bo po nim moduł rozpoznaje odmowę. Wpis `rental_rules` ma ponadto pole `violations`: słownik kod → jednoliniowy opis, komplet kodów, jakie mogą stanąć w `detail.violations`. To spis, a nie przykład odpowiedzi - przykład w `body` zostaje jednoelementowy. `booking_not_payable`, `stripe_not_connected` i `stripe_account_not_ready` wysyłają dwie trasy, pierwsza płatność i dopłata, z różnym `message`, więc moduł czyta tylko `reason`.

## Odmowy

- Dostępu z domeny spoza listy klucza strona nie odczyta: odpowiedź 403 nie ma `Access-Control-Allow-Origin`, więc w przeglądarce wygląda jak błąd sieci. Ten kształt widzą tylko skrypty poza przeglądarką.
- 400 z napisem w `detail` to wartość, której nie da się użyć: okno kalendarza, data poza zakresem, okres, kanał, imię lub adres (`invalid_request`). `invalid_stay` to ten sam kształt przy filtrze terminu listy. Tekst służy do logów, a nie do pokazania gościowi.
- 422 z listą w `detail` to zwykła odmowa FastAPI (`validation_error`), a z obiektem i `field` to pole, którego wymaga klucz (`field_required`), albo wartość, której klucz nie przyjmuje (`field_invalid`).
- 413 to ciało `quote`, `bookings`, `requests` albo `contact` ponad limit (`request_too_large`). Formularz w takim rozmiarze nie powstaje.
- Odmowa `site_key_required` w tym pliku nie występuje, bo trafia tylko na stare trasy.
- 429 niesie nagłówek `Retry-After` w sekundach, a przeglądarka może go odczytać.
- Każda odpowiedź tras klucza, także odmowa, ma `Cache-Control: no-store` i `Vary: Origin`.
- `violations` to kody z `services/rental_availability.py` (stałe `VIOLATION_*`), niezależne od języka strony. Komplet, z jednoliniowym opisem każdego kodu, stoi we wpisie `rental_rules` w `errors.json`, w polu `violations`; nie przepisujemy go tu drugi raz, żeby nie rozjechał się z plikiem. Test `test_every_violation_code_is_in_the_file` czyta stałe z modułu i porównuje je z tym polem, więc kodu nie da się dodać, usunąć ani przemianować bez wpisu, ani wpisać kodu, którego kod nie zna. Te same kody wracają w polu `violations` wyceny (`quote`), gdzie odpowiedź ma 200 i `available: false`. Nieznany kod moduł pokazuje jako ogólną odmowę terminu, a nie jako błąd: lista będzie rosła.
- Zajęty termin ma dwa kształty, bo powstaje w dwóch miejscach. `rental_rules` z `violations: ["period_taken"]` to wynik sprawdzenia przed zapisem. `period_taken` z `message` dostaje ten, kto przegrał wyścig o termin już przy zapisie. Moduł musi obsłużyć oba.
- Pierwsza płatność odmawia po `reason`: `booking_not_payable` (blokada minęła albo tryb na zapytanie), `booking_already_paid` (płatność już jest), `stripe_not_connected` i `stripe_account_not_ready` (po stronie właściciela, ponawianie nie pomoże), `payment_return_unavailable` (wdrożenie nie ma publicznej strony, na którą Stripe odesłałby gościa; też po stronie właściciela, Stripe nie dostał nic). Tę samą odmowę dostaje `POST …/bookings` rezerwacji przedpłaconej, zanim zajmie termin (pole `routes` wpisu w `errors.json`). `payment_provider_unavailable` to 502 ze Stripe'a, które można ponowić.

## Zajętość w kalendarzu

`availability.json` oddaje każdy zajęty odcinek jako `starts_at`, `ends_at` i `kind`. `kind` to `booking` (rezerwacja) albo `blackout` (blokada właściciela) - dosłownie stałe `BUSY_KIND_*` z `services/rental_availability.py`. Poza tym o odcinku nie wychodzi nic: ani kto go zajął, ani na jakim etapie jest rezerwacja, ani dlaczego właściciel zamknął te dni. Powód blokady zostaje u właściciela.

**`buffer_minutes` dotyczy wyłącznie rezerwacji.** Blokada jest oknem dokładnym: „remont do 12:00" znaczy, że o 12:00 lokal jest wolny. Tak liczy backend (`rental_violations` w `services/rental_availability.py`: poszerzenie o bufor sprawdza tylko odcinek z `kind == "booking"`), więc moduł musi liczyć tak samo. Moduł, który poszerza o bufor każdy odcinek, wyszarza wokół blokady noce, które backend przyjmie - gość widzi termin jako zajęty i nie dowie się, dlaczego.

`kind` jest tylko na trasie klucza. Stara trasa `GET /public/products/{id}/availability` oddaje same granice, bo podział na rezerwacje i blokady to informacja handlowa właściciela (`docs/kalendarz-rezerwacji.md`).

Nieznany `kind` moduł traktuje jak `booking`, czyli ostrożniej: lista rodzajów może urosnąć, a termin pokazany jako wolny, a potem odrzucony przy zapisie, jest gorszy niż noc wyszarzona nadmiarowo.

## Skład grupy i ceny dla gościa

`quote` i `bookings` przyjmują skład grupy: `adults`, `children`, `child_ages`, `pets`, `pets_over_threshold`. Wszystkie są opcjonalne, a żądanie z samym `guests` działa jak dotąd.

- `guests` to **suma dorosłych i dzieci**; na tej liczbie stoją `max_guests` i dopłata za osobę. Gdy moduł wysyła `adults`, backend wyliczy `guests` sam, a `guests` sprzeczne z sumą to 422. Dzieci liczą się do limitu i do dopłaty.
- `children` większe od zera bez `adults` to 422: bez dorosłych nie ma z czego policzyć `guests`. `children: 0` przy samym `guests` przechodzi.
- `child_ages` to jeden wiek na dziecko, od 0 do `child_max_age` z `config`. Wiek powyżej tego progu to 422 `field_invalid` z polem `child_ages`, także w `quote`, chyba że klucz o wiek nie pyta.
- `pets_over_threshold` nie może być większe od `pets`. Z tej liczby wynika linia `pet_fee`. Próg wagi i kwotę moduł czyta z odpowiedzi produktu: `pet_fee` w `GET /products/{ref}` i w `GET /products` to `{amount, weight_threshold_kg, mode}` albo `null` (`product.json`, `products.json`). `null` znaczy też, że klucz ma `pets: off` albo kwota to 0. Waga nie wchodzi do arytmetyki - służy do zdania, które czyta gość („pies powyżej 10 kg: +50 zł”). `mode` to `per_stay` albo `per_night`, a `per_night` liczy noce tylko przy jednostce `day`; przy innej jednostce opłata jest jedna za pobyt. To jedyna reguła cennika w publicznym kontrakcie; sprzątanie, dopłata za osobę i rabaty zostają u właściciela.
- O które pola formularz pyta, mówi `form_fields` z `config`. Pole `off` jest usuwane z żądania i nie zmienia ceny, pole `required` puste to 422 `field_required`. Zadeklarowane zero jest odpowiedzią, nie brakiem.
- `children` na `off` usuwa z zapisu także `adults`, bo `guests` jest sumą obu: rezerwacja nie może twierdzić, że przyjeżdża dwoje dorosłych, skoro policzono ją za cztery osoby. `guests` zostaje nietknięte i cena się nie zmienia.
- Skład grupy **nie wraca** w `status` ani w `manage`: identyfikator rezerwacji jest w adresie strony powrotu, a wiek dziecka nie jest dla każdego, kto go zna.

`line_items` w `quote` i `price_breakdown` w `bookings` to linie **dla gościa**. Klucz z `merge_cleaning_fee` nie pokazuje w nich linii `cleaning_fee`: opłata wchodzi w cenę pobytu, suma zostaje bez zmian, a opis dla Stripe'a powstaje z tych samych linii. Gdy opłata dzieli się przez liczbę nocy, linia zachowuje noce (`2 x 280.00`), a gdy nie - zostaje jedna linia za cały pobyt. Linia `length_discount` traci wtedy `percent` (jest `null`), bo stawka policzona przed wliczeniem opłaty nie zgadza się z kwotą pobytu obok niej; moduł pokazuje w takim wypadku etykietę bez stawki, a kwota rabatu zostaje bez zmian. Właściciel widzi w panelu pełne rozbicie z osobną linią sprzątania. Linie gościa są zamrażane przy zakładaniu rezerwacji, więc późniejsza zmiana klucza nie zmienia tego, co widzi gość istniejącej rezerwacji.

Rodzaje linii: `base`, `season`, `weekend`, `season_weekend`, `extra_guest_fee`, `pet_fee`, `cleaning_fee`, `length_discount`. Nieznany rodzaj moduł pokazuje po `label`.

## Język gościa

Trasy `GET /products`, `GET /products/{ref}`, `GET /products/{product_id}/availability` i `POST /products/{product_id}/bookings` przyjmują parametr `?lang=`. To jedno pole języka w całym kontrakcie: w przeglądarce nie ma po naszej stronie sesji, w której dałoby się zapamiętać wybór, a moduł zna język z `d2-booking-lang` albo z `<html lang>`.

- Wartość to sam kod języka (`pl`, `en`, `de`, `uk`), bez regionu. `de-AT` i `de_DE` liczą się jako `de`.
- Backend zawęża żądanie do listy `languages` z `config`. Język poza listą, pusty, bezsensowny (`?lang=klingon`) albo absurdalnie długi nie jest odmową: odpowiedź przychodzi w `default_language` klucza, a w ostatniej kolejności po polsku. Parametr nie ma limitu długości właśnie dlatego, że odmowa byłaby tu gorsza od zignorowania wartości.
- **Bez parametru odpowiedź idzie w `default_language` klucza.** `Accept-Language` backend czyta celowo **nie**: to ta sama kolejność, którą ma moduł (`d2-booking-lang`, `<html lang>`, `default_language`), więc strona nie może wyjść w dwóch językach naraz, a rezerwacja nie zapamięta języka, którego gość nie widział. Odpowiedzi mają `Vary: Origin`. **Moduł, który chce innego języka niż domyślny klucza, musi wysyłać `?lang=`.**
- Co zmienia język w odpowiedzi: `name` i `description` miejsca (na liście, w jednym miejscu i w `product_name` dostępności) pochodzą z tłumaczenia tego języka, a **każde pole osobno** wraca do wartości bazowej. Tłumaczenie z nazwą, ale bez opisu, nie zeruje opisu. Zdjęcia nie zależą od języka. Tłumaczenie należy do języka po kodzie podstawowym (`de`, także wiersz zapisany kiedyś jako `de-DE`).
- Wartość bazowa nazwy to nazwa własna mieszkania. Opisu własnego produkt nie ma, więc wartością bazową opisu jest pierwsze tłumaczenie po regule „polski najpierw, potem po kodzie języka" - i ta reguła zapasowa nie jest zawężona listą `languages`.
- `POST …/bookings` zapisuje wybrany język na rezerwacji, bo w nim są pisane maile tej rezerwacji, a linki do naszego portalu w tych mailach otwierają go w tym samym języku (`?lang=`). Pole `locale` w ciele żądania działa jak dotąd i jest brane pod uwagę, gdy w adresie nie ma `lang`; klucz zawęża je tak samo.
- `POST …/bookings/{booking_id}/contact` parametru nie ma: poprawka adresu nie zmienia języka rezerwacji, a odpowiedź nie niesie żadnego tekstu zależnego od języka.
- `GET /bookings/{booking_id}/manage` parametru nie ma: `product_name` idzie tam za językiem tej rezerwacji, czyli za językiem maila, z którego gość kliknął link.
- Lista miejsc nie zależy od języka: ta sama strona po niemiecku pokazuje te same mieszkania.
## Powtórzenie rezerwacji (`Idempotency-Key`)

`POST .../bookings` przyjmuje opcjonalny nagłówek `Idempotency-Key`: UUID v4 w zwykłym zapisie, wielkość liter bez znaczenia. Inna wartość to 400 `invalid_request`. Moduł generuje klucz raz na próbę założenia rezerwacji i powtarza go, gdy nie dostał odpowiedzi.

| Żądanie | Odpowiedź |
|---|---|
| pierwsze | 201 |
| ten sam klucz, to samo ciało i ten sam produkt | 200, ta sama rezerwacja w obecnym stanie, także wygasła; bez maila i bez wpisu w dzienniku |
| ten sam klucz, inne ciało albo inny produkt | 409 `idempotency_key_reused`; pole puste i pole pominięte to to samo ciało |
| klucz po odmowie (400, 409, 422) | odmowa niczego nie zapisuje, więc można spróbować ponownie, także z poprawionym ciałem |

Oba powodzenia mają ten sam kształt. Powtórka niesie świeży `contact_token`, gdy trasa `contact` przyjęłaby poprawkę, a `null`, gdy nie: rezerwacja opłacona, wygasła albo taka, która nie czeka już na płatność. Moduł nie musi odróżniać 200 od 201, ale musi czytać `status` i `hold_expires_at` z odpowiedzi, bo powtórka może przyjść po wygaśnięciu. Powtórka po zmianie adresu pasuje dalej i oddaje nowy adres. Klucz nie wygasa, a powtórki liczą się do limitów. Dwa równoczesne żądania z jednym kluczem dostają tę samą rezerwację, 201 i 200.

Odcisk żądania bierze produkt i ciało, a `?lang=` do niego nie należy: powtórka z innym `?lang=` oddaje tę samą rezerwację w języku zapisanym za pierwszym razem, bo w tym języku poszły już jej maile. Pole `locale` jest w ciele, więc jego zmiana to inne żądanie (409).

Klucz należy do klucza strony: ta sama wartość na innej stronie to inne żądanie. Stare trasy nagłówka nie czytają.

## Poprawa adresu przed płatnością

Odpowiedź `bookings` na trasie klucza niesie `contact_token`, tekst albo `null`. `null` znaczy, że poprawki nie ma po co oferować: nic nie czeka na płatność, jak przy rezerwacji potwierdzonej od razu. Stara trasa pola nie ma. Token otwiera tylko `POST .../bookings/{id}/contact` (`contact.json`), w nagłówku `X-Booking-Token`. Moduł trzyma go w pamięci: token nie trafia do adresu, do maila ani do `status`, a modułowi nie wolno zgadywać jego budowy.

Token żyje 14 dni dłużej niż `hold_expires_at` z chwili wydania, a przy rezerwacji bez terminu 14 dni. To tylko górna granica: akceptacja właściciela przesuwa termin już po wydaniu tokenu, więc o tym, czy poprawka przejdzie, decyduje stan rezerwacji. Działa wielokrotnie, więc gość może poprawić literówkę w poprawce. Tokeny `manage` i `balance` tej trasy nie otwierają, a `contact` nie otwiera ich tras.

`customer_email` jest wymagany. `customer_name` i `customer_phone` są opcjonalne: pole pominięte zostaje bez zmian. Imienia nie da się wyczyścić, a telefon `null` albo pusty czyści, o ile pozwala `form_fields`.

| Odmowa | Kiedy |
|---|---|
| 404 `booking_not_found` | brak tokenu, zły, wygasły, o innym celu, z innej rezerwacji, rezerwacja spoza klucza |
| 409 `booking_already_paid` | płatność już wpłynęła, także w trakcie tego żądania |
| 409 `booking_not_payable` | rezerwacja nie czeka na płatność |
| 400 `invalid_request` | adres albo imię, te same reguły co przy `bookings`; adres ponad 320 znaków jest odmową, a nie jest ucinany |
| 422 `field_required` | `phone` wymagany przez klucz, a gość próbuje go wyczyścić |
| 422 `field_invalid` | `phone` wysłany do klucza, który o telefon nie pyta |
| 429 `too_many_requests` | 10 na godzinę na rezerwację, 20 na godzinę z adresu IP |

Po `hold_expires_at` moduł dostanie 409 `booking_not_payable`: termin przepadł, a stan pokaże `status`. 404 po terminie przyjdzie dopiero wtedy, gdy minie też życie tokenu.

Zmiana nie wysyła żadnego maila, a Stripe adresu nie dostaje, więc otwarta już płatność działa dalej. Kolejne maile idą na nowy adres, a portal pokazuje rezerwację nowemu adresowi. Linki `manage` i `balance` wydane przed zmianą adresu przestają działać (ta sama odmowa `booking_not_found`). Unieważnia je tylko inna skrzynka: poprawa imienia, telefonu albo wielkości liter w adresie zostawia je ważne. Wysłanie tych samych danych niczego nie zmienia i niczego nie unieważnia.

## Stan rezerwacji

`status.json` po zaliczce podaje `balance_due_minor` (grosze, razem z `currency`) i `balance_due_at`. Oba są `null`, gdy nic nie zostało do zapłaty. `site_url` to strona klienta, na której gość może wybrać nowy termin, a `null` znaczy brak takiej strony.

## Obsługa rezerwacji przez gościa

Trzy trasy działają tylko z tokenem z maila. `manage.json` to odczyt, `request.json` to prośba, `balance-checkout.json` to dopłata. Dostają klucz, domenę, limity i CORS jak pozostałe trasy, a ponadto token w nagłówku `X-Booking-Token`. Token w adresie zapytania nie działa.

Link z maila ma postać `<manage_url>?booking=<id>#token=<token>&action=<details|balance|refund|change-date>`. Moduł czyta fragment, usuwa go z paska i wysyła token w nagłówku. Token jest dla modułu nieprzejrzysty, więc modułowi nie wolno zgadywać jego budowy.

| Cel tokenu | Link | `manage` | `requests` | `balance-checkout` |
|---|---|---|---|---|
| `manage` | `details`, `refund`, `change-date` | tak | tak | nie |
| `balance` | `balance` | tak | nie | tak |

Czwarty cel, `contact`, nie pochodzi z maila i otwiera jedną inną trasę (sekcja „Poprawa adresu przed płatnością”).

`balance_payable` to ta sama reguła, którą odmawia `balance-checkout`, razem ze stanem konta Stripe właściciela. `balance_due_at` jest `null`, gdy nic nie zostało do zapłaty, tak jak w `status`. `balance_payable: true` przy tokenie `manage` znaczy, że dopłata jest możliwa, ale tym linkiem jej nie otworzymy. Moduł odsyła wtedy gościa do maila z dopłatą albo do `account_url`.

Każda odmowa tokenu to ten sam `booking_not_found`, tak jak dla rezerwacji, której nie ma: brak tokenu, zły, wygasły, o innym celu, z innej rezerwacji, wydany przed zmianą adresu gościa albo rezerwacja spoza klucza. Moduł nie pozna powodu, więc pokazuje jeden komunikat o nieważnym linku i prowadzi do `account_url`. Gdy `account_url` jest `null` (workspace bez sluga), zostaje sam komunikat.

Link do strony klienta dostaje tylko rezerwacja, którą klucz wciąż obsługuje. Po odpięciu projektu od klucza nowe maile prowadzą na portal, a stare linki dostają tę samą odmowę.

`emergency_phone` to telefon alarmowy klucza. `null` znaczy, że klucz go nie ma albo że rezerwacja nie jest w stanie `paid` ani `confirmed`. Numer jest tylko w tej odpowiedzi, a nie w `config` ani `status`, bo te czyta każdy, kto zna klucz albo identyfikator rezerwacji.

`amount_outstanding_minor` to 0 dla rezerwacji odrzuconej, anulowanej i wygasłej. `amount_paid_minor` to wpłaty, a `amount_refunded_minor` to zwroty: pierwsze pole nie maleje po zwrocie.

`refund_available` i `date_change_available` mówią, czy trasa przyjęłaby teraz taką prośbę. Prośba, która czeka na decyzję, zamyka swój rodzaj. `requests` to prośby rezerwacji, od najnowszej, z `kind`, `status` (`pending`, `accepted`, `rejected`, `withdrawn`), `resolution_note` i `created_at`. Z tej listy moduł pokazuje, że prośba czeka, i przekazuje decyzję właściciela. Gość nie dostaje o niej maila. Odpowiedź 201 znaczy „prośba zapisana”: rezerwacja się nie zmienia, pieniądze się nie ruszają, a decyzję podejmuje właściciel w panelu.

`kind` przyjmuje `refund` albo `date_change`. Inna wartość to `validation_error`. `requested_starts_at` i `requested_units_count` idą tylko z `date_change`. Data bez strefy to czas lokalny obiektu. 400 z napisem w `detail` to prośba źle wypełniona (`invalid_request`), także data dalej niż 10 lat od dziś, `requested_units_count` powyżej 1000 i znak NUL w notatce, a 409 to `request_not_allowed` (rezerwacja zamknięta, nie ma czego zwrócić, już zwrócona) albo `request_already_waiting`. Te dwa 409 mają `detail` jako napis, a `reason` stoi obok niego na najwyższym poziomie ciała, nie w `detail`: pole doszło bez zmiany typu `detail`.

Dopłata odmawia po `reason`: `no_balance`, `balance_already_paid`, `booking_not_payable`, `balance_processing` (płatność jest w drodze, trzeba poczekać) oraz `stripe_not_connected` i `stripe_account_not_ready`. Stripe wraca na `manage_url` z `?booking=<id>&payment=balance_success` albo `balance_cancelled`, bez tokenu, więc strona powrotu czyta `status`.

## Kiedy zmienić wersję

Dopisanie nowego pola do odpowiedzi to zmiana pliku i kopii w Essentials, bez zmiany wersji. Usunięcie pola, zmiana jego typu lub znaczenia podnosi `contract_version` we wszystkich plikach, w teście i po stronie Essentials.
