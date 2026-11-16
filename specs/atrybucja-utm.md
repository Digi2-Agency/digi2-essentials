# Warstwa atrybucji (UTM i identyfikatory kliknięć) w digi2-essentials — DESIGN

> **Status:** decyzje AT-D1…AT-D8 rozstrzygnięte przez Piotra 2026-11-16 (§5.0); format pola ścieżki (§3.5) uzgodniony. Kod: v1.11.0 (#84, wydane 2026-11-17 po „AKCEPTUJĘ na 84”), poprawki z recenzji v1.11.1.
> **Zlecenie:** architekt-it 2026-11-16, kierunek Piotra (czat `wlasciciel`, przekazane): *„Docelowo chcemy używać
> digi2-essentials więc do zweryfikowania dokładnie co tu się dzieje i jak to zrobić aby było skalowane i dobre dla naszej
> firmy biorąc pod uwagę nasz stack technologiczny.”*
> **Powiązane:** silnik `docs/architecture/mailing-personalizacja-strony.md` §5a (MP-D13, MP-D16),
> `docs/architecture/marketing-automation.md` §13 (`d2-ma`), README tego repo („Touchpoints”).
> **Stan kodu:** essentials `main` `a3c346f` (= `origin/main` 2026-11-16, najnowszy tag stabilny `v1.10.0`),
> baner `d2-cookies` 0.1.7 z repo `Digi2-Agency/webflow` `main` (ostatni commit pliku `860f805`),
> `harmonogram.js` z `Digi2-Agency/webflow` `main` `85d1d5c` (blob `75aa685`).
> Inwentarz §2.1–2.4 sprawdzony dodatkowo przez niezależnego agenta (Explore, same pytania bez wniosków), 2026-11-16.
> Oznaczenia: **S** — sprawdzone w kodzie (plik:linia), **W** — wniosek / projekt, **N** — niesprawdzone.

## 1. Streszczenie

Dziś UTM i identyfikatory kliknięć zapisują w przeglądarce **trzy niezależne miejsca** w essentials i co najmniej jeden
skrypt strony, każde po swojemu: `forms.js` (cookie 365 dni, bez zgody), `popups.js` (cookie 365 dni, bez zgody, te same
nazwy co forms), `ma.js` (IndexedDB `d2ma`, tylko za zgodą, historia 20 wizyt) oraz `harmonogram.js` Latawców (cookie
3 dni, bez zgody — ale to cookie popupu, nie atrybucji). Skutki:

1. **Zapis bez zgody.** Cookies `utm_*`, `gclid`, `fbclid`, `msclkid`, `gaclientid` powstają przy pierwszej odsłonie,
   niezależnie od banera `d2-cookies` i Consent Mode (§2.1, §2.2).
2. **Pomieszane kampanie w leadzie.** `forms.js` nadpisuje tylko parametry obecne w adresie, więc `UTM_SOURCE` z nowej
   kampanii łączy się z `UTM_CONTENT` / `UTM_TERM` ze starej (§2.1, pkt „Błąd”). Do Make i Vox idzie zestaw, którego
   nigdy nie było w żadnym linku.
3. **Zgubione źródło.** `forms.js` zapisuje UTM tylko na stronie z formularzem modułu; wejście z kampanii na stronę bez
   formularza (np. landing → podstrona kontaktu) gubi UTM, chyba że przypadkiem zapisał je popup.
4. **Trzy definicje tego samego.** Inna lista parametrów (forms: 5 UTM + 3 click id; ma: 6 UTM + 7 click id), inna
   sanityzacja (tylko ma.js czyści dane osobowe z UTM), inne odczytywanie zgody (tylko ma.js).

Propozycja (§3): **jedna warstwa `digi2.attribution` w loaderze** (ładuje się na każdej stronie z essentials, także bez
modułów), która przechwytuje źródło na każdej odsłonie, trzyma je **w pamięci strony bez zgody** i **zapisuje dopiero po
zgodzie** (Consent Mode / `d2-cookies`), a forms, popups, ma, datalayer i personalizacja czytają wyłącznie z niej.
Migracja (§4) w pięciu krokach, z czego kroki zmieniające zachowanie na `@latest` idą osobnymi wydaniami z wpisem
w CHANGELOG i po akceptacji Piotra.

## 2. Inwentarz — stan dzisiejszy

### 2.1 `forms.js` — ukryte pola do Make / Vox

| Co | Dowód | |
|---|---|---|
| Lista parametrów: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`; click id: `gclid`, `fbclid`, `msclkid` (bez `gbraid`, `wbraid`, `ttclid`, `utm_id`) | `forms.js:294–295` | S |
| Domyślne opcje: `utmTracking: true`, `clickIdTracking: true`, `gaClientId: true`, `cookieDurationDays: 365` | `forms.js:475–480` | S |
| **Kiedy zapisuje:** wyłącznie w `FormManager._init` (`_captureUrlParams()`), czyli tylko gdy strona wywoła `digi2.forms.create(...)` / `createAll(...)` i wywołanie znajdzie prawdziwy `<form>`. Sam loader z `d2-forms` nic nie zapisuje (automatyczny `bootForms` nie przechwytuje UTM) | `forms.js:529–542`, `:1275–1300`, `:1621–1624`, `:2197–2209` | S |
| **Gdzie / jak długo:** cookie pierwszej strony, nazwa = nazwa parametru bez prefiksu (`utm_source`, `gclid`…), `path=/`, `SameSite=Lax`, 365 dni; `gaclientid` (z `_ga`) zapisywane raz | `forms.js:273–281`, `:1281–1298` | S |
| **Zgoda:** brak sprawdzenia — zapis bez względu na Consent Mode i baner | `forms.js:1275–1300` (brak odczytu zgody) | S |
| **Błąd — mieszanie kampanii:** każdy parametr nadpisywany osobno i tylko gdy jest w adresie (`if (val) _setCookie(...)`), więc stare `utm_content` / `utm_term` / `gclid` zostają przy nowym `utm_source` | `forms.js:1282–1285`, `:1288–1291` | S |
| Ukryte pola wypełniane przy inicjalizacji formularza, nie przy wysłaniu; `_getCookie` dekoduje wartość bez `try` (obce `%` w cookie `utm_*` rzuci wyjątek) | `forms.js:282–289`, `:1355–1366` | S |
| **Odczyt do formularza:** ukryte pola `UTM_SOURCE` … `UTM_TERM` z cookies (puste, gdy brak), `GCLID` / `FBCLID` / `MSCLKID` tylko niepuste, `GOOGLE_ANALYTICS_ID`, `PAGE_URL`, `PAGE_TITLE`, `PAGE_REFERRER`; pole już istniejące w formularzu (także alias, np. `GOOGLE_ADS_ID`, `utm_source_hidden`) nie jest dublowane | `forms.js:1318–1333`, `:1355–1402` | S |
| **Pomiar leada (dla `datalayer`):** `leadSource` / `leadMedium` / `leadCampaign` z adresu, a gdy brak — z cookies; `hasGclid` / `hasFbclid` jako wartości logiczne | `forms.js:1834–1845` | S |

Te nazwy pól (`UTM_SOURCE`, `GCLID`, `GOOGLE_ANALYTICS_ID`…) są **kontraktem z Make** (scenariusze mapują je na Vox
i CRM). Każda zmiana warstwy musi je zachować. **N:** pełna lista scenariuszy Make, które je czytają.

### 2.2 `popups.js` — `d2-popup-utm` / `d2-popup-utm-exclude`

| Co | Dowód | |
|---|---|---|
| Opcje `utm`, `utmExclude`, `utmCookie: true`, `utmCookieDays: 365` | `popups.js:496–505` | S |
| **Kiedy zapisuje:** przy tworzeniu popupu z filtrem ruchu, jeśli klucz filtra jest w adresie bieżącej odsłony | `popups.js:818–825` | S |
| **Gdzie / jak długo:** cookie o nazwie klucza filtra (`utm_source` albo dowolny inny, np. `refID`), **te same nazwy co forms.js** — świadomie, „one shared value” (komentarz `popups.js:2034–2042`); 365 dni, `path=/`, `SameSite=Lax`. Nazwa nie jest kodowana (forms koduje), wartość kodowana w obu | `popups.js:2066–2072`, `forms.js:278` | S |
| **Zgoda:** brak sprawdzenia | `popups.js:818–825`, `:2066–2072` | S |
| Odczyt filtra: adres bieżącej odsłony, potem cookie (`_readCookieRaw`, odporne na obce `%`) | `popups.js:2054–2064`, `:2075–2080` | S |
| Inne magazyny popupów (nie atrybucja): cookie zamknięcia `cookieName` (`popups.js:1966–1971`), licznik odsłon w `sessionStorage` `popupPageViews` (`:483`, `:1626–1636`) | jw. | S |

### 2.3 `ma.js` — profil `d2-ma` i touchpoints

| Co | Dowód | |
|---|---|---|
| UTM bieżącej odsłony (`source`, `medium`, `campaign`, ≤ 100 znaków) w zmiennej `pageUtm` — **pamięć strony** | `ma.js:369`, `:3735–3743` | S |
| Stan wizyty: UTM pierwszego wejścia (`state.utm`) i touchpoints v1 (≤ 20 wpisów: 6 UTM, `click_type` — sam rodzaj, nigdy wartość, `referrer_host`, `landing_path`) | `ma.js:753–757`, `:3746–3756`, `:3844–3852` | S |
| **Gdzie:** IndexedDB `d2ma` | `ma.js:227`, `:399–410` | S |
| **Zgoda:** kategoria Consent Mode z `d2-ma-consent` (domyślnie `analytics_storage`), odczyt z `localStorage` `consentModeV2`, komend `gtag('consent', …)` w `dataLayer` i stanu tagu Google; odmowa → kasowanie bazy albo samej historii źródeł | `ma.js:250–251`, `:5340–5342`, `:5344–5374`, `:3622–3633` | S |
| **Jak długo:** `retentionDays` z koperty scenariuszy (panel 2destate), domyślnie 90 dni, liczone od zgody / ostatniej wizyty | `ma.js:236`, `:5766–5769`, `:5850–5859` | S |
| Kolejność źródeł zgody: komenda `gtag('consent','update')` w `dataLayer` → stan tagu Google → `localStorage consentModeV2` → domyślne; wynik `granted` / `denied` / nieznany. Zgoda domyślnie **wymagana**; nieznana → baza nie jest otwierana (czeka) | `ma.js:5238–5243`, `:5313–5338`, `:5735–5771` | S |
| **Wyjątek:** przy `consentRequired:false` baza otwiera się bez zgody i `state.utm` (source / medium / campaign) jest zapisywane bez zgody; touchpoints nadal tylko za zgodą | `ma.js:754`, `:3842`, `:5801` | S |
| Sanityzacja UTM: `@` → null, wzór telefonu w `utm_content` / `utm_term` → null, znaki niedrukowalne → null | `ma.js:3800–3814` (`utmValue`, `PHONE_RE`) | S |
| `parseTouchpoint(href, referrer)` — czysta funkcja bez magazynu i bez zgody, publiczna (`digi2.ma.parseTouchpoint`) | `ma.js:3758–3784`, nagłówek `:209` | S |

`ma.js` to dziś jedyne miejsce, które robi to dobrze (zgoda, sanityzacja, historia). Ładuje się jednak tylko z `d2-ma`
i jest duże (cały silnik scenariuszy), więc nie może być wspólną warstwą dla stron bez `d2-ma`.

### 2.4 `datalayer.js`

Nic nie zapisuje. Do `generate_lead` / `form_submit_success` dokłada `lead_source`, `has_gclid`, `has_fbclid`,
`consent_marketing` z kontekstu `forms.js` (§2.1) — `datalayer.js:376–394`. **S**. Dziedziczy więc błąd mieszania
kampanii i zapis bez zgody po stronie forms.

### 2.5 `google.js` i baner `d2-cookies` — źródło zgody

| Co | Dowód | |
|---|---|---|
| `google.js` (`d2-gtm`): domyślnie wszystko `denied`, odtwarza zapisany stan z `localStorage` `consentModeV2`, `digi2.google.consent.*`, zdarzenie `consent:updated` na busie | `google.js:42`, `:72–87`, `:144–156` | S |
| Baner `d2-cookies` 0.1.7 (repo `webflow`, `baner-zgod/d2-cookies.js`): ten sam klucz `localStorage` `consentModeV2`, `gtag('consent','update', …)` i `dataLayer {event:'d2_consent_update'}`; kategorie: Preferencje = `personalization_storage`, Statystyka = `analytics_storage`, Marketing = `ad_storage` | `d2-cookies.js:5–6`, `:108–117` (`860f805`) | S |

Wniosek **W**: wspólny odczyt zgody = `localStorage consentModeV2` + komendy `gtag('consent', …)` w `dataLayer` — to, co
już robi `ma.js`. Działa z banerem `d2-cookies`, z `google.js` i z każdym banerem mówiącym Consent Mode (Cookiebot,
CookieYes, WP Consent API przez GTM). **N:** banery spoza digi2 na stronach WordPress / Shopify klientów.

### 2.6 `harmonogram.js` (Latawce, Dni Otwarte 2026-11, PR webflow#104)

| Co | Dowód | |
|---|---|---|
| **UTM nie czyta.** Czyta `?d2now` (podgląd czasu) i `?d2open=dni-otwarte` | `harmonogram.js:2`, `:13` | S |
| `d2-show-from` / `d2-show-until` — harmonogram widoczności elementów (klasa `d2_sched_off`) | `:4–10` | S |
| Klik `.hero_cta_do` → `dataLayer select_promotion` (`promotion_id: dni-otwarte-2026-11`, `creative_slot` `hero` / `link`) | `:11–12` | S |
| `?d2open=dni-otwarte` (do 21.11 15:00) → cookie `d2_popup_dni_otwarte_2026_11=true` na 3 dni (`max-age=259200`), bez sprawdzania zgody, i automatyczne otwarcie formularza | `:13–16` | S |

Cookie z `harmonogram.js` to **znacznik popupu** („już otwarty z linku, nie pokazuj popupu promocji drugi raz”), nie
atrybucja — funkcjonalnie bliżej `cookieName` popupów niż UTM. Wchodzi w plan migracji (§4), ale nie w warstwę atrybucji.

### 2.7 Inne

- `ab-tests.js` — `localStorage` / `sessionStorage` z przydziałem wariantu (`ab-tests.js:52–80`); nie atrybucja. **S**
- `promo.js` — `localStorage` z ostatnim stanem promocji (`promo.js:126–139`); nie atrybucja. **S**
- `booking.js`, `cms.js`, loader — UTM nie czytają (grep `utm` w `webflow-scripts/`: tylko forms, popups, ma). **S**
- Skrypty stron poza essentials (WordPress, Shopify, inne pliki w repo `webflow`) — **N**, do inwentarza w kroku M0 (§4).

### 2.8 Gdzie to dziś działa (wpływ zmian)

Z repo `webflow` (`origin/main`, notatki projektów i `projekty/_MAPA.md`, **S** jako zapis w repo, **N** jako stan stron
dziś): na `@latest` m.in. osiedlebo.pl, mapeciaki.pl, szkola-mapeciaki, nightwave (`d2-forms`), osiedle-tu.pl
(`d2-forms`), apartamenty-nowytarg.pl (`d2-forms d2-cms`), bernardynska; na `@main` magicznylukecin.pl
(`d2-forms d2-popups d2-datalayer`) i lukecin; Latawce na `@v1.8.3` (`d2-popups d2-datalayer`). Każda zmiana `forms.js`
w wydaniu stabilnym trafia od razu na formularze leadowe tych stron.

## 3. Projekt — jedna warstwa atrybucji (W)

### 3.1 Gdzie mieszka

**Rdzeń w loaderze** (`digi2-loader.js`), publiczne API `digi2.attribution`. Uzasadnienie:

- źródło trzeba złapać **na stronie wejścia**, a ta często nie ma formularza ani popupu — moduł ładowany tylko
  z `d2-forms` gubi wejście (problem 3 z §1);
- loader jest na każdej stronie z essentials, niezależnie od platformy (Webflow: kod witryny; WordPress: WPCode / motyw;
  Webstudio: custom code; Shopify: `theme.liquid`), bez dodatkowego żądania;
- koszt zmierzony w PR #84 (**S**): loader po terserze 10,9 → 19,5 KB, gzip 3,9 → 7,2 KB, dla każdej strony, także bez flagi. Wcześniejszy szacunek 2–3 kB był zaniżony. Rdzeń to parser (przeniesiony z `ma.js parseTouchpoint` + `utmValue`), odczyt
  zgody (przeniesiony z `ma.js consentState`), magazyn.

Opcja odrzucona: osobny moduł `attribution.js` dociągany przez forms / popups / ma — nie łapie wejścia na stronie bez
tych modułów, chyba że dodamy flagę `d2-attribution` na każdej stronie (dodatkowa konfiguracja na kilkunastu domenach).
To decyzja AT-D1.

### 3.2 Model danych

```js
digi2.attribution.get() // →
{
  v: 1,
  consent: 'granted' | 'denied' | 'unknown',
  page:  Touch,        // ta odsłona (zawsze, także bez zgody)
  last:  Touch | null, // ostatnie wejście z kampanii / kliknięcia / obcego referrera (bez zgody: = page, gdy page ma źródło)
  first: Touch | null, // pierwsze zapisane wejście (tylko po zgodzie)
  clicks: { gclid?, gbraid?, wbraid?, fbclid?, msclkid?, ttclid? } // WARTOŚCI, tylko po zgodzie marketingowej (AT-D4)
}
Touch = { ts, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id,
          click_type, referrer_host, landing_path }   // = touchpoint v1 z ma.js
```

Zasady:

1. **Zestaw jest niepodzielny.** Nowe wejście z kampanii zastępuje cały zestaw UTM (`last`), nigdy pojedyncze pola —
   koniec błędu mieszania kampanii (§2.1).
2. **Co jest „nowym wejściem”:** reguła `ma.js newCampaign` (inne source / medium / campaign; sam nowy click id tylko
   przy obcym albo pustym referrerze). Wejście bezpośrednie i wewnętrzne **nie** kasuje `last` (atrybucja „last
   non-direct”, jak w GA4 i Google Ads).
3. **Sanityzacja z `ma.js`** (dane osobowe w UTM → null) dla wszystkich odbiorców, także ukrytych pól do Make.
4. **Wygasanie:** `last` i `clicks` po `d2-attribution-days` (domyślnie **90**, okno kliknięcia Google Ads; AT-D5).

### 3.3 Zgoda i magazyn

| Stan zgody | Co się dzieje |
|---|---|
| `unknown` / `denied` | tylko pamięć strony: `page` (i `last` = `page`, gdy odsłona ma źródło). Nic w cookie, `localStorage`, `sessionStorage`. Zgodne z MP-D13 (a). |
| `granted` (kategoria z AT-D3, domyślnie `analytics_storage`) | zapis `localStorage` `d2_attribution` (JSON wyżej, bez `clicks`). Zgoda przyszła w trakcie odsłony → zapis od razu, z wpisem tej odsłony (jak `ma.js consentChanged`). |
| `ad_storage` `granted` | dodatkowo `clicks` (wartości click id — potrzebne do importu konwersji offline Google Ads / Meta CAPI przez Make). |
| odmowa / wycofanie | kasowanie `d2_attribution` **i starych cookies** `utm_*`, `gclid`, `fbclid`, `msclkid`, `gaclientid` (sprzątanie po §2.1–2.2). |

Odczyt zgody: wspólna funkcja w loaderze (`digi2.consent.state(category)`), przeniesiona z `ma.js` (§2.5), z której
korzysta też `ma.js` — jedna definicja zamiast dwóch. Zdarzenie busa `attribution:change` po każdej zmianie.

**`localStorage` zamiast cookie (AT-D6):** cookie leci z każdym żądaniem do serwera i ma limit rozmiaru; nikt z naszego
stacku nie czyta UTM po stronie serwera (Make dostaje ukryte pola). Wyjątek do sprawdzenia: przejście między subdomenami
(`www` ↔ `oferta.` ↔ sklep Shopify na innej domenie) — `localStorage` jest per origin. **N:** czy któryś klient ma lejek
przez dwie subdomeny.

### 3.4 Odbiorcy

| Odbiorca | Dziś | Po zmianie |
|---|---|---|
| `forms.js` ukryte pola | cookies, mieszane kampanie, bez zgody | `UTM_*` z `last` (AT-D2), `GCLID` / `FBCLID` / `MSCLKID` z `clicks`, **te same nazwy pól** (kontrakt Make). Nowe, opcjonalne: `FIRST_UTM_SOURCE` / `FIRST_UTM_CAMPAIGN` (flaga) i `ATTRIBUTION_STATUS` = `url` / `stored` / `no-consent` / `none` — żeby w CRM było widać, ile leadów straciło źródło przez brak zgody. `GOOGLE_ANALYTICS_ID` bez zmian (cookie `_ga` istnieje tylko po zgodzie). |
| formularze spoza `d2-forms` (WordPress CF7 / Gravity, Shopify, Webstudio) | brak | `digi2.attribution.fill(form)` albo atrybut `d2-attribution-fill` na `<form>` — wstrzykuje te same ukryte pola. **N:** czy formularze WordPress klientów idą do Make tą samą drogą. |
| `popups.js` `d2-popup-utm` | adres + cookie 365 dni bez zgody | `digi2.attribution.get().last` (adres bez zgody, zapis po zgodzie); opcje `utmCookie` / `utmCookieDays` → bez działania, z ostrzeżeniem w konsoli. Klucz spoza UTM (np. `refID`) — tylko adres bieżącej odsłony (AT-D7). |
| `ma.js` | własny `pageUtm`, `state.utm`, touchpoints | parser i zgoda z loadera; touchpoints i `state.utm` zostają w `d2ma` (kontrakt z 2destate bez zmian). Nowe klucze `d2-ma-show-utm-source` / `-utm-campaign` (MP-D16, PR N1 silnika) czytają `digi2.attribution` — przed zgodą adres odsłony, po zgodzie wizyta = dokładnie MP-D13. |
| `datalayer.js` | kontekst z forms | `lead_source` / `lead_medium` / `lead_campaign` z `last`; `has_gclid` / `has_fbclid` z `last.click_type` (bez wartości). Do GA4 nie wysyłamy UTM osobnym zdarzeniem — GA4 ma własną atrybucję. |

### 3.5 Pole ścieżki w leadzie — uzgodnione z architekt-it 2026-11-16, wdrożone w v1.11.0 / v1.11.1

- **`ATTRIBUTION_PATH`** — jedno ukryte pole tekstowe. Wpisy od najstarszego do najnowszego, separator ` > `.
- **Wpis:** `RRRR-MM-DD source/medium/campaign`, data lokalna przeglądarki, dzień wejścia.
  - Brak UTM: `source` = domena obcego referrera albo `(direct)`, `medium` = `(referral)` / `(none)`,
    `campaign` = `(not set)` (konwencja GA4).
  - Kliknięcie reklamy: dopisek ` [gclid]` / ` [fbclid]` / … — sam rodzaj, nigdy wartość.
  - Kolejne wizyty z tym samym źródłem tego samego dnia sklejone z licznikiem ` xN` (ASCII).
  - W wartościach `/`, `<`, `>` i `:` zamieniane na `-`. Polskie litery tracą ogonki, inne znaki spoza ASCII → `-`. Sanityzacja danych osobowych jak w §3.2. Pole zawiera wyłącznie ASCII (uzgodnione z architekt-it 16.11, recenzje #84 i silnika #2355).
- **Wpis = wizyta** (przerwa 30 min, reguła `d2-ma`), także wejście bezpośrednie.
- **Limit:** ostatnie 10 wpisów i najwyżej 500 znaków. Starsze odcinane od początku, z prefiksem `... > `.
  Magazyn trzyma 20 wizyt (jak touchpoints) przez 13 miesięcy (AT-D5).
- **Bez zgody analitycznej:** tylko wpis bieżącej odsłony, a `ATTRIBUTION_STATUS=no-consent`.
- **`ATTRIBUTION_STATUS`:** `stored` (ścieżka z magazynu), `url` (tylko ta odsłona, zgoda jest), `no-consent`, `none`.
- **Przykład:**
  `2026-10-02 google/cpc/latawce-search [gclid] > 2026-10-09 (direct)/(none)/(not set) x2 > 2026-11-16 newsletter/email/dni-otwarte-2026-11`

### 3.6 Czego warstwa nie robi

- Nie wysyła niczego na serwer i nie łączy wizyt z osobą (to `ma.js` + 2destate, za zgodą).
- Nie zastępuje atrybucji GA4 / Google Ads / Meta — zasila tylko CRM (Make, Vox) i treść strony.
- Nie dokleja UTM do linków wewnętrznych (to robi GTM `url_passthrough`, jeśli w ogóle).

## 4. Plan migracji

Każdy krok = osobny PR i (gdzie zmienia zachowanie) osobne wydanie przez `scripts/release.sh` z wpisem w CHANGELOG.
Strony na `@latest` dostają wydanie stabilne od razu, strony na `@main` — od merge'u.

| Krok | Co | Wpływ na strony | Warunek |
|---|---|---|---|
| **M0** | Inwentarz skryptów stron poza essentials, które zapisują UTM / click id (repo `webflow`, `wordpress`, `shopify`, `webstudio`) — zlecenie do tych sesji, sam odczyt | brak | — |
| **M1** | `digi2.attribution` + `digi2.consent` w loaderze, **tylko odczyt i pamięć/zapis po zgodzie**, nikt jeszcze z nich nie korzysta. Testy (vm + mini-DOM), dokumentacja w 4 miejscach | brak zmiany zachowania; nowy klucz `localStorage` `d2_attribution` po zgodzie | AT-D1, AT-D3, AT-D5, AT-D6 |
| **M2** | `forms.js` czyta z warstwy: koniec mieszania kampanii, nowe pole `ATTRIBUTION_STATUS`; **zapis starych cookies zostaje** (podwójny zapis), żeby wycofanie wersji nie gubiło źródła | leady w Make: poprawne zestawy UTM; nowe pole w payloadzie (Make ignoruje nieznane pola — **N**, sprawdzić 1 scenariusz przed wydaniem) | AT-D2; sprawdzenie Make |
| **M3** | Wyłączenie zapisu bez zgody: forms i popups przestają pisać cookies `utm_*` / click id, sprzątanie starych cookies po odmowie; `utmCookie` bez działania | **zmiana widoczna:** lead od osoby bez zgody, która przeszła na inną podstronę przed wysłaniem, przyjdzie bez UTM (`ATTRIBUTION_STATUS=no-consent`); popup z `d2-popup-utm` na drugiej odsłonie bez zgody się nie pokaże | **AT-D8** (akceptacja Piotra); 2–4 tyg. danych `ATTRIBUTION_STATUS` z M2, żeby znać skalę |
| **M4** | `ma.js` na wspólnym parserze i odczycie zgody; klucze `d2-ma-show-utm-*` (PR N1 silnika) | linia `ma.N` / następne stabilne | MP-D13, MP-D16 (silnik) |
| **M5** | `harmonogram.js` → biblioteka: `d2-show-from` / `d2-show-until` (moduł albo loader), otwarcie popupu z adresu (`?d2open=<nazwa>` w `popups.js`, znacznik w `cookieName` popupu — funkcjonalny, AT-D7), `select_promotion` z `d2-promotion-id` / `d2-creative-slot` w `datalayer.js`. Latawce przechodzą przy następnej akcji (bieżąca kończy się 21.11 15:00 — nie ruszamy) | nowe atrybuty, bez zmian dla istniejących stron | po M1 |

Kolejność M1 → M2 → (dane) → M3 jest celowa: najpierw naprawiamy jakość (mieszanie kampanii), mierzymy, ile leadów
przychodzi bez zgody, i dopiero z tą liczbą Piotr decyduje o wyłączeniu zapisu bez zgody.

## 5. Decyzje Piotra

### 5.0 Rozstrzygnięcia — Piotr, 2026-11-16 (czat `wlasciciel`, przekazane przez architekt-it; cytaty to dowód)

| ID | Rozstrzygnięcie | Cytat |
|---|---|---|
| kierunek | warstwa zbiera **wszystkie** źródła wejść (jak touchpoints `d2-ma`), żeby lead niósł historię ścieżki | *„Chciałbym już żeby to działało w ten sposób jak chcemy zrobić w marketing automation, czyli żeby zbierało wszystko źródła (UTM) po to żeby móc lepiej przeanalizować historię ścieżki tego leada jak wyśle formularz”* |
| start | M2 (naprawa mieszania kampanii) **razem** z historią wejść w leadzie; najpierw jedna strona pilotażowa | *„Od razu ścieżka w leadzie”* |
| AT-D1 | ✅ (a) rdzeń w loaderze | *„W głównym skrypcie digi2-essentials”* |
| AT-D2 | ✅ zastąpione: `UTM_*` = ostatnie źródło + pełna ścieżka wejść w jednym polu (zamiast `FIRST_UTM_*`) | jw. „Od razu ścieżka w leadzie” |
| AT-D3 / AT-D4 | ✅ (a) / (a) | *„UTM i historia za zgodą analityczną, gclid/fbclid za reklamową”* |
| AT-D5 | ✅ **13 miesięcy** (praktyka rynkowa, nie opinia prawna) | *„13 miesięcy”* (wcześniej *„Jak najdłużej się da”*) |
| AT-D6 / AT-D7 | ✅ (a) / (a) | *„localStorage; inne parametry tylko dla bieżącej strony”* |
| AT-D8 | ✅ (b) **od razu** z nową wersją: zapis tylko po zgodzie; przez 2–4 tyg. liczymy skalę z `ATTRIBUTION_STATUS` | *„Od razu z nową wersją”* |
| MP-D16 | zgodne z AT-D1 | — |

**Skutek dla planu (§4):** M2 i M3 łączą się w jeden krok **za flagą opt-in per strona** (atrybut na tagu loadera,
`d2-attribution`); bez flagi zachowanie biblioteki bez zmian (stare cookies forms / popups jak dziś). Flaga włączona =
nowa warstwa, ścieżka w leadzie, zapis wyłącznie po zgodzie, bez starych cookies. Wydanie i włączenie flagi na stronie
pilotażowej — po „AKCEPTUJĘ” Piotra na wypisany zakres. Format pola ścieżki — §3.5 (uzgadniany z architekt-it, silnik
dopisuje pole do standardu maila Vox).

### 5.1 Pierwotne opcje (archiwum, z rekomendacją specu)

| ID | Pytanie | Opcje | Rekomendacja | Dlaczego |
|---|---|---|---|---|
| AT-D1 | Gdzie warstwa | (a) rdzeń loadera; (b) moduł `attribution.js` z flagą `d2-attribution`; (c) zostawić per moduł | **(a)** | łapie wejście na każdej stronie bez konfiguracji; (b) wymaga flagi na każdej domenie; (c) = dzisiejsze trzy definicje |
| AT-D2 | Który kontakt idzie w `UTM_*` do Make / Vox | (a) ostatnie wejście ze źródłem (last non-direct); (b) pierwsze; (c) oba (`UTM_*` = ostatnie, `FIRST_UTM_*` dodatkowo) | **(c)**, `FIRST_*` za flagą | standard reklam (last click), a pierwsze źródło przydaje się przy długich decyzjach mieszkaniowych |
| AT-D3 | Kategoria zgody dla UTM | (a) `analytics_storage`; (b) `ad_storage`; (c) `personalization_storage` | **(a)** | to pomiar; ta sama kategoria co `d2-ma` domyślnie — jedna zgoda, jeden stan |
| AT-D4 | Wartości click id (`gclid`, `fbclid`…) | (a) zapis za `ad_storage`; (b) za tą samą zgodą co UTM; (c) nie zapisywać wartości | **(a)** | wartość służy reklamom (import konwersji offline); bez zgody marketingowej zostaje tylko rodzaj kliknięcia |
| AT-D5 | Jak długo trzymać | (a) 90 dni; (b) 365 dni (dziś); (c) 30 dni | **(a)**, atrybut `d2-attribution-days` | okno kliknięcia Google Ads; 365 dni przypisuje lead kampanii sprzed roku |
| AT-D6 | Magazyn | (a) `localStorage`; (b) cookie pierwszej strony; (c) oba | **(a)** | nic nie czyta UTM po stronie serwera; wyjątek subdomen — po M0 |
| AT-D7 | Klucze spoza UTM w `d2-popup-utm` (np. `refID`) i znacznik `?d2open` | (a) tylko adres bieżącej odsłony, bez zapisu; (b) zapis jak UTM, za zgodą | **(a)**; znacznik „popup już otwarty” jak dziś `cookieName` popupu | nie mieszamy funkcjonalnego znacznika z atrybucją |
| AT-D8 | Wyłączenie zapisu bez zgody (M3) | (a) po M2 i 2–4 tyg. danych `ATTRIBUTION_STATUS`; (b) od razu w M2; (c) nigdy (zapis bez zgody zostaje) | **(a)** | decyzja na liczbach, nie w ciemno; (c) jest sprzeczne z MP-D13 i z banerem `d2-cookies` (domyślnie `denied`). Ocena prawna — **N** (bez opinii prawnej) |

## 6. Ryzyka i otwarte

- **Kontrakt Make** — nazwy pól bez zmian; nowe pole `ATTRIBUTION_STATUS` sprawdzić na jednym scenariuszu (**N**).
- **Strony `@main`** (magicznylukecin, lukecin) dostają każdy merge od razu — przed merge'em M2/M3 przepiąć je na `@latest`
  albo wersję przypiętą (zlecenie do sesji `webflow`).
- **Wycofanie:** M2 zostawia stare cookies, więc powrót do poprzedniej wersji nie gubi źródła; M3 jest nieodwracalny
  dla już skasowanych cookies (dlatego osobna decyzja AT-D8).
- **Dwa tagi loadera na stronie** (mapeciaki: head + body, `popup-mapa/projekty/mapeciaki/notes.md:15`) — rdzeń musi być
  idempotentny (jedna instancja `digi2.attribution`). **W**, test w M1.
- **WordPress / Shopify / Webstudio** — loader działa tam tak samo (czysty JS), ale formularze nie są `d2-forms`; do M0.
