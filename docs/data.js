/* digi2 essentials — dane dokumentacji (część 1: config, start, cms, filter, forms, popups, toasts) */
window.D2DOCS = {
  cdn: 'https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@main/dist/digi2-loader.min.js',
  version: 'gałąź main · 07.2026',

  categories: [
    { label: 'Start', items: ['start', 'loader'] },
    { label: 'Listy CMS', items: ['cms', 'filter'] },
    { label: 'Formularze', items: ['forms'] },
    { label: 'Komponenty UI', items: ['popups', 'toasts', 'tabs', 'dropdowns', 'sliders', 'interactions'] },
    { label: 'Efekty', items: ['animate', 'scroll', 'lazy'] },
    { label: 'Narzędzia', items: ['format', 'countdown', 'copy', 'cookies'] },
    { label: 'Marketing', items: ['google', 'abtests'] }
  ],

  start: {
    lead: 'Biblioteka modułów dla Webflow sterowana atrybutami <code>d2-*</code>. Wklejasz jeden skrypt, dodajesz atrybuty na elementach w Designerze — sortowanie, filtry, formularze, popupy i animacje działają bez pisania kodu.',
    steps: [
      { t: 'Wklej loader z flagami modułów', d: 'Jeden tag <b>&lt;script&gt;</b> w Site Settings → Custom Code → Head. Flagi (np. <code>d2-cms</code>, <code>d2-forms</code>) mówią loaderowi, które moduły dociągnąć — reszta w ogóle się nie ładuje. Moduł możesz też włączyć tylko na wybranej podstronie elementem <code>&lt;digi2-module&gt;</code> — szczegóły na stronie <a href="#/m/loader">Loader i flagi</a>.' },
      { t: 'Dodaj atrybuty na elementach', d: 'W Designerze zaznacz element → panel Settings (D) → <b>Custom attributes</b> → dodaj atrybut z dokumentacji (np. <code>d2-cms-list="produkty"</code>). Drzewka na stronach modułów pokazują dokładnie, który atrybut idzie na który element.' },
      { t: 'Doszlifuj w JS tylko tam, gdzie trzeba', d: 'Większość modułów działa bez kodu. Popupy, walidacja formularzy czy filtry z opcjami wymagają jednego wywołania <code>digi2.moduł.create(...)</code> w <code>digi2.onReady()</code> — kreator na stronie modułu wygeneruje go za Ciebie.' },
      { t: 'Debugowanie', d: 'Dodaj flagę <code>d2-debug-mode</code> na tagu loadera — każdy moduł zacznie logować swoje akcje w konsoli z prefiksem <code>[digi2.moduł]</code>.' }
    ],
    responsiveNote: '<b>Składnia responsywna</b> — większość atrybutów przyjmuje wartości per breakpoint: <code>wartość;wartość@maxSzerokość</code>, np. <code>d2-animation-direction="left;up@911"</code> = domyślnie <i>left</i>, a od 911 px w dół <i>up</i>. Breakpointów może być kilka: <code>12px;24px@1200;40px@600</code>.',
    builderFlags: [
      { key: 'cms', label: 'CMS — listy', flag: 'd2-cms' },
      { key: 'forms', label: 'Formularze', flag: 'd2-forms' },
      { key: 'popups', label: 'Popupy', flag: 'd2-popups' },
      { key: 'tabs', label: 'Taby / akordeony', flag: 'd2-tabs' },
      { key: 'dropdowns', label: 'Dropdowny', flag: 'd2-dropdowns' },
      { key: 'sliders', label: 'Slidery', flag: 'd2-sliders' },
      { key: 'interactions', label: 'Interakcje', flag: 'd2-interactions' },
      { key: 'animate', label: 'Animacje scroll', flag: 'd2-animate' },
      { key: 'scroll', label: 'Smooth scroll', flag: 'd2-scroll' },
      { key: 'lazy', label: 'Lazy loading', flag: 'd2-lazy' },
      { key: 'format', label: 'Format liczb', flag: 'd2-format' },
      { key: 'countdown', label: 'Countdown', flag: 'd2-countdown' },
      { key: 'filter', label: 'Filtr prosty', flag: 'd2-filter' },
      { key: 'toasts', label: 'Toasty', flag: 'd2-toasts' },
      { key: 'copy', label: 'Kopiowanie', flag: 'd2-copy' },
      { key: 'cookies', label: 'Cookies', flag: 'd2-cookies' },
      { key: 'google', label: 'GTM + Consent', flag: 'd2-gtm' },
      { key: 'abtests', label: 'A/B testy', flag: 'd2-ab-tests="sitemap"' }
    ]
  },

  modules: {

  /* ════════════════════════ START (kafelek w nav) ════════════════════════ */
  start: { name: 'Wprowadzenie', short: 'Wprowadzenie', icon: 'home' },

  /* ════════════════════════ CMS ════════════════════════ */
  cms: {
    name: 'CMS — listy',
    short: 'CMS — listy',
    cat: 'Listy CMS',
    flag: 'd2-cms',
    icon: 'list',
    size: '46,7 KB min',
    auto: true,
    tagline: 'Sortowanie, filtry, suwaki zakresu, liczniki i doładowywanie list Collection List.',
    desc: 'Najmocniejszy moduł biblioteki: sortuje, filtruje i progresywnie ujawnia itemy Webflow Collection List po stronie przeglądarki. Obsługuje sortowanie po dowolnym polu, filtry przyciskami / checkboxami / selectami, suwak zakresu (np. cena od–do), liczniki wyników, przełącznik „ukryj / pokaż”, input liczby widocznych itemów oraz tryby ładowania: przycisk, infinite scroll albo wszystko naraz. Działa w całości na atrybutach — bez JS.',
    installNote: 'Lista rejestruje się sama po atrybucie <code>d2-cms-list</code> (alias: <code>d2-cms-instance</code>). Elementy sterujące spinasz z listą przez <code>d2-cms-target="nazwa"</code> — przy jednej liście na stronie target jest opcjonalny.',

    kreator: {
      fields: [
        { k: 'name', label: 'Nazwa listy', type: 'text', def: 'produkty', hint: 'Ta sama nazwa trafia do d2-cms-target na wszystkich przyciskach.' },
        { k: 'perPage', label: 'Ile itemów na start', type: 'number', def: 8 },
        { k: 'loadMode', label: 'Tryb ładowania', type: 'select', def: 'button', opts: [['button', 'Przycisk „Pokaż więcej”'], ['scroll', 'Infinite scroll'], ['all', 'Wszystko od razu']] },
        { k: 'sort', label: 'Dropdown sortowania', type: 'check', def: true },
        { k: 'sortField', label: 'Pole sortowania', type: 'text', def: 'cena', sub: true, showIf: function(s){ return s.sort; } },
        { k: 'filter', label: 'Filtr przyciskiem', type: 'check', def: true },
        { k: 'filterKey', label: 'Pole filtra', type: 'text', def: 'status', sub: true, showIf: function(s){ return s.filter; } },
        { k: 'filterVal', label: 'Wartość filtra', type: 'text', def: 'Dostępne', sub: true, showIf: function(s){ return s.filter; } },
        { k: 'range', label: 'Suwak zakresu (od–do)', type: 'check', def: false },
        { k: 'rangeField', label: 'Pole zakresu', type: 'text', def: 'cena', sub: true, showIf: function(s){ return s.range; } },
        { k: 'toggle', label: 'Przełącznik „Ukryj / Pokaż”', type: 'check', def: false, hint: 'np. ukrywanie sprzedanych mieszkań' },
        { k: 'toggleKey', label: 'Pole:wartość do ukrycia', type: 'text', def: 'status:Sprzedane', sub: true, showIf: function(s){ return s.toggle; } },
        { k: 'counter', label: 'Licznik wyników', type: 'check', def: true },
        { k: 'empty', label: 'Komunikat braku wyników', type: 'check', def: true }
      ],
      build: function(s){
        var n = s.name || 'produkty';
        var bar = [];
        if (s.sort) bar.push({ l: 'Dropdown (Webflow)', t: 'dropdown', a: [['d2-dropdown']], c: [
          { l: 'Dropdown Toggle', t: 'button', c: [
            { l: 'Text Block — „Sortuj”', t: 'text', a: [['d2-cms-sort-label'], ['d2-cms-target', n]] }
          ]},
          { l: 'Dropdown List', t: 'nav', c: [
            { l: 'Link — „Rosnąco”', t: 'link', a: [['d2-cms-target', n], ['d2-cms-sort', s.sortField || 'cena'], ['d2-cms-sort-dir', 'asc']] },
            { l: 'Link — „Malejąco”', t: 'link', a: [['d2-cms-target', n], ['d2-cms-sort', s.sortField || 'cena'], ['d2-cms-sort-dir', 'desc']] }
          ]}
        ]});
        if (s.filter) bar.push({ l: 'Button — „' + (s.filterVal || 'Dostępne') + '”', t: 'button', a: [['d2-cms-target', n], ['d2-cms-filter', (s.filterKey || 'status') + ':' + (s.filterVal || 'Dostępne')]] });
        if (s.toggle){
          var tk = s.toggleKey || 'status:Sprzedane';
          var val = tk.split(':')[1] || 'Sprzedane';
          bar.push({ l: 'Button — przełącznik', t: 'button', a: [['d2-cms-target', n], ['d2-cms-toggle', tk], ['d2-cms-toggle-hide', 'Ukryj ' + val.toLowerCase()], ['d2-cms-toggle-show', 'Pokaż ' + val.toLowerCase()]] });
        }
        if (s.counter) bar.push({ l: 'Text Block — licznik', t: 'text', a: [['d2-cms-target', n], ['d2-cms-display-format', '{visible} z {matching}']] });

        var itemKids = [];
        var seen = {};
        function fieldNode(f, num){
          if (!f || seen[f]) return; seen[f] = 1;
          var a = [['d2-cms-field', f]];
          if (num) a.push(['d2-cms-field-type', 'number']);
          itemKids.push({ l: 'Text Block — pole „' + f + '”', t: 'text', a: a, n: 'podepnij pole CMS' });
        }
        if (s.sort) fieldNode(s.sortField || 'cena', true);
        if (s.range) fieldNode(s.rangeField || 'cena', true);
        if (s.filter) fieldNode(s.filterKey || 'status', false);
        if (s.toggle) fieldNode((s.toggleKey || 'status:x').split(':')[0], false);

        var listAttrs = [['d2-cms-list', n], ['d2-cms-per-page', String(s.perPage || 8)]];
        if (s.loadMode !== 'all') listAttrs.push(['d2-cms-load-mode', s.loadMode]);
        else listAttrs.push(['d2-cms-load-mode', 'all']);

        var kids = [];
        if (bar.length) kids.push({ l: 'Div Block — pasek sterowania', t: 'div', c: bar });
        if (s.range) kids.push({ l: 'Div Block — suwak zakresu', t: 'div',
          a: [['d2-cms-range'], ['d2-cms-target', n], ['d2-cms-range-field', s.rangeField || 'cena'], ['d2-cms-range-displayformat', 'pln']],
          c: [
            { l: 'Text — min', t: 'text', a: [['d2-cms-range-display', 'min']] },
            { l: 'Div — tor suwaka', t: 'div', a: [['d2-cms-range-track']], c: [
              { l: 'Div — wypełnienie', t: 'div', a: [['d2-cms-range-fill']] },
              { l: 'Div — uchwyt lewy', t: 'div', a: [['d2-cms-range-handle', 'min']] },
              { l: 'Div — uchwyt prawy', t: 'div', a: [['d2-cms-range-handle', 'max']] }
            ]},
            { l: 'Text — max', t: 'text', a: [['d2-cms-range-display', 'max']] }
          ]});
        kids.push({ l: 'Collection List Wrapper', t: 'list', c: [
          { l: 'Collection List', t: 'list', a: listAttrs, c: [
            { l: 'Collection Item', t: 'item', c: itemKids.length ? itemKids : [{ l: 'Twoja karta produktu', t: 'div', n: 'dowolna zawartość' }] }
          ]}
        ]});
        if (s.empty) kids.push({ l: 'Div Block — brak wyników', t: 'div', a: [['d2-cms-target', n], ['d2-cms-empty']], n: 'moduł pokaże go przy 0 wyników' });
        if (s.loadMode === 'button') kids.push({ l: 'Button — „Pokaż więcej”', t: 'button', a: [['d2-cms-target', n], ['d2-cms-load-more']] });

        return {
          tree: [{ l: 'Section', t: 'section', c: [{ l: 'Container', t: 'container', c: kids }] }],
          note: 'Całość działa <b>bez JavaScriptu</b> — moduł sam znajdzie listę po <code>d2-cms-list</code>. Pola (<code>d2-cms-field</code>) podpinasz pod dane CMS fioletową ikonką w Webflow.'
        };
      }
    },

    structures: [
      { title: 'Lista + „Pokaż więcej”', desc: 'Minimalny zestaw: lista z limitem itemów i przycisk doładowania.', tree: [
        { l: 'Collection List', t: 'list', a: [['d2-cms-list', 'produkty'], ['d2-cms-per-page', '8'], ['d2-cms-load-mode', 'button']], c: [
          { l: 'Collection Item', t: 'item', c: [
            { l: 'Text — cena', t: 'text', a: [['d2-cms-field', 'cena'], ['d2-cms-field-type', 'number']] }
          ]}
        ]},
        { l: 'Button — „Pokaż więcej”', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-load-more']] },
        { l: 'Button — „Pokaż +12”', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-loadcount', '12']], n: 'wariant: konkretna liczba lub "all"' }
      ]},
      { title: 'Sortowanie w dropdownie', desc: 'Dropdown Webflow z opcjami sortowania i etykietą pokazującą aktywny wybór.', tree: [
        { l: 'Dropdown (Webflow)', t: 'dropdown', a: [['d2-dropdown']], n: 'd2-dropdown domyka menu po wyborze', c: [
          { l: 'Dropdown Toggle', t: 'button', c: [
            { l: 'Text — „Sortuj według”', t: 'text', a: [['d2-cms-sort-label'], ['d2-cms-target', 'produkty']] }
          ]},
          { l: 'Dropdown List', t: 'nav', c: [
            { l: 'Link — „Cena rosnąco”', t: 'link', a: [['d2-cms-target', 'produkty'], ['d2-cms-sort', 'cena'], ['d2-cms-sort-dir', 'asc'], ['d2-cms-sort-option-label', 'Cena: rosnąco']] },
            { l: 'Link — „Cena malejąco”', t: 'link', a: [['d2-cms-target', 'produkty'], ['d2-cms-sort', 'cena'], ['d2-cms-sort-dir', 'desc'], ['d2-cms-sort-option-label', 'Cena: malejąco']] },
            { l: 'Link — „Nazwa A–Z”', t: 'link', a: [['d2-cms-target', 'produkty'], ['d2-cms-sort', 'nazwa'], ['d2-cms-sort-dir', 'asc']] }
          ]}
        ]}
      ]},
      { title: 'Filtry: checkboxy, radio, select', desc: 'Filtry spinane po polu z itemów; wewnątrz jednego pola wartości łączą się jako LUB, między polami jako I.', tree: [
        { l: 'Div — grupa checkboxów', t: 'div', c: [
          { l: 'Checkbox — „Kawalerki”', t: 'checkbox', a: [['d2-cms-target', 'produkty'], ['d2-cms-filter', 'pokoje:1']] },
          { l: 'Checkbox — „2 pokoje”', t: 'checkbox', a: [['d2-cms-target', 'produkty'], ['d2-cms-filter', 'pokoje:2']] }
        ]},
        { l: 'Select (Form)', t: 'select', a: [['d2-cms-target', 'produkty'], ['d2-cms-filter-field', 'pietro']], n: 'pusta opcja czyści filtr' },
        { l: 'Button — „Wyczyść filtry”', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-clear']] },
        { l: 'Button — „Wyczyść wszystko”', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-clear', 'all']], n: 'czyści też sortowanie' }
      ]},
      { title: 'Suwak zakresu (cena od–do)', desc: 'Dwuuchwytowy slider filtrujący pole liczbowe. Min/max wykrywa sam z itemów albo podajesz na sztywno.', tree: [
        { l: 'Div — suwak', t: 'div', a: [['d2-cms-range'], ['d2-cms-target', 'produkty'], ['d2-cms-range-field', 'cena'], ['d2-cms-range-displayformat', 'pln'], ['d2-cms-range-suffix', ' zł']], c: [
          { l: 'Text — wartość min', t: 'text', a: [['d2-cms-range-display', 'min']] },
          { l: 'Div — tor', t: 'div', a: [['d2-cms-range-track']], c: [
            { l: 'Div — wypełnienie', t: 'div', a: [['d2-cms-range-fill']] },
            { l: 'Div — uchwyt min', t: 'div', a: [['d2-cms-range-handle', 'min']] },
            { l: 'Div — uchwyt max', t: 'div', a: [['d2-cms-range-handle', 'max']] }
          ]},
          { l: 'Text — wartość max', t: 'text', a: [['d2-cms-range-display', 'max']] }
        ]}
      ]},
      { title: 'Przełącznik + licznik + stepper', desc: 'Przycisk „Ukryj sprzedane / Pokaż sprzedane”, licznik wyników i input liczby widocznych itemów.', tree: [
        { l: 'Button — przełącznik', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-toggle', 'status:Sprzedane'], ['d2-cms-toggle-hide', 'Ukryj sprzedane'], ['d2-cms-toggle-show', 'Pokaż sprzedane']] },
        { l: 'Text — licznik', t: 'text', a: [['d2-cms-target', 'produkty'], ['d2-cms-display-format', '{visible} z {matching}']] },
        { l: 'Div — stepper', t: 'div', c: [
          { l: 'Button — „−”', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-count-step', '-1']] },
          { l: 'Input (number)', t: 'input', a: [['d2-cms-target', 'produkty'], ['d2-cms-count'], ['d2-cms-count-min', '1'], ['d2-cms-count-max', '60']] },
          { l: 'Button — „+”', t: 'button', a: [['d2-cms-target', 'produkty'], ['d2-cms-count-step', '1']] }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-cms-list', v: 'nazwa', el: 'Collection List', req: true, d: 'Rejestruje listę pod tą nazwą — punkt zaczepienia dla wszystkich kontrolek.', n: 'alias: <code>d2-cms-instance</code>' },
      { a: 'd2-cms-target', v: 'nazwa lub a|b', el: 'każda kontrolka poza listą', d: 'Wskazuje, którą listą steruje element. Pipe <code>|</code> celuje w kilka list — liczniki śledzą wtedy listę widoczną (np. aktywny tab).', n: 'opcjonalny przy jednej liście na stronie' },
      { a: 'd2-cms-item', v: '', el: 'element itemu', d: 'Jawnie oznacza itemy, gdy nie są bezpośrednimi dziećmi kontenera.' },
      { a: 'd2-cms-field', v: 'nazwaPola', el: 'Text wewnątrz Collection Item', d: 'Tekst tego elementu staje się wartością pola do sortowania i filtrów.' },
      { a: 'd2-cms-field-type', v: 'number | text | date', el: 'element z d2-cms-field', d: 'Wymusza typ porównywania (bez niego autodetekcja).' },
      { a: 'd2-cms-field-*', v: 'wartość', el: 'Collection Item', d: 'Wariant inline: <code>d2-cms-field-cena="399000"</code> — pole z atrybutu zamiast ukrytego spana.', n: 'typ: <code>d2-cms-field-type-cena="number"</code>' },
      { a: 'd2-cms-per-page', v: 'liczba', el: 'Collection List', d: 'Ile itemów widać na start i ile dokłada każde doładowanie.' },
      { a: 'd2-cms-load-mode', v: 'button | scroll | all', el: 'Collection List', d: 'Tryb doładowania: przycisk, infinite scroll (sentinel) albo wszystko od razu.' },
      { a: 'd2-cms-scroll-offset', v: 'px', el: 'Collection List', d: 'Margines wyprzedzenia dla infinite scrolla (domyślnie 200).' },
      { a: 'd2-cms-load-more', v: '', el: 'Button', d: 'Klik dokłada kolejne <i>per-page</i> itemów.' },
      { a: 'd2-cms-loadcount', v: 'liczba | all', el: 'Button', d: 'Klik dokłada konkretną liczbę itemów albo wszystkie.' },
      { a: 'd2-cms-load-more-done', v: '', el: 'przycisk load-more', set: true, d: 'Moduł ustawia, gdy nie ma już czego dokładać (przycisk też znika).' },
      { a: 'd2-cms-sentinel', v: 'nazwa listy', el: 'niewidoczny div', set: true, d: 'Strażnik infinite scrolla — moduł wstawia go sam za listą.' },
      { a: 'd2-cms-sort', v: 'pole', el: 'Button / Link / opcja', d: 'Klik sortuje po polu: 1. klik rosnąco, 2. malejąco, 3. czyści.', n: 'z <code>d2-cms-sort-dir</code> kierunek jest stały' },
      { a: 'd2-cms-sort-dir', v: 'asc | desc', el: 'lista lub przycisk sortowania', d: 'Na liście: domyślny kierunek. Na przycisku: wymusza kierunek bez przełączania.' },
      { a: 'd2-cms-sort-type', v: 'number | text | date', el: 'przycisk sortowania', d: 'Wymusza typ porównywania dla tego pola.' },
      { a: 'd2-cms-sort-by', v: 'pole', el: 'Collection List', d: 'Domyślne sortowanie przy załadowaniu strony.' },
      { a: 'd2-cms-sort-order', v: 'a|b|c', el: 'lista lub przycisk', d: 'Własny ranking wartości (najpierw a, potem b…), zamiast alfabetu.' },
      { a: 'd2-cms-sort-label', v: '', el: 'Text w toggle dropdownu', d: 'Moduł wpisuje tu tekst aktywnej opcji sortowania.' },
      { a: 'd2-cms-sort-option-label', v: 'tekst', el: 'opcja sortowania', d: 'Własny tekst, który trafi do etykiety zamiast treści opcji.' },
      { a: 'd2-cms-sort-scope', v: '', el: 'wrapper', d: 'Ogranicza, które opcje mogą aktualizować etykietę (zamiast .w-dropdown).' },
      { a: 'd2-cms-sort-active', v: 'asc | desc', el: 'przycisk sortowania', set: true, d: 'Obecny na aktywnej opcji — hook do stylowania CSS.' },
      { a: 'd2-cms-direction', v: 'asc | desc | toggle', el: 'Button', d: 'Zmienia kierunek aktywnego sortowania bez zmiany pola.' },
      { a: 'd2-cms-direction-active', v: 'asc | desc', el: 'przycisk kierunku', set: true, d: 'Obecny, gdy sortowanie aktywne — hook CSS.' },
      { a: 'd2-cms-filter', v: 'pole:wartość', el: 'Button / Checkbox / Radio', d: 'Przełącza filtr. Kilka wartości naraz: <code>pole:a|b</code>. Checkboxy i radio synchronizują stan zaznaczenia.' },
      { a: 'd2-cms-filter-field', v: 'pole', el: 'Select (Form)', d: 'Natywny select jako filtr — pusta opcja czyści.' },
      { a: 'd2-cms-filter-match', v: 'AND | OR', el: 'Collection List', d: 'Jak łączyć różne pola filtrów (domyślnie AND; w obrębie pola zawsze OR).' },
      { a: 'd2-cms-filter-label', v: 'pole', el: 'Text', d: 'Moduł wpisuje tu aktywną wartość filtra danego pola.' },
      { a: 'd2-cms-filter-option-label', v: 'tekst', el: 'opcja filtra', d: 'Własny tekst, który opcja wnosi do etykiety filtra (zamiast swojej treści).' },
      { a: 'd2-cms-filter-scope', v: '', el: 'wrapper', d: 'Ogranicza, które opcje mogą aktualizować etykietę filtra (zamiast .w-dropdown).' },
      { a: 'd2-cms-filter-active', v: '', el: 'kontrolka filtra', set: true, d: 'Obecny na aktywnym filtrze — hook do stylowania.' },
      { a: 'd2-cms-clear', v: 'puste | all | pole', el: 'Button / Link', d: 'Czyści filtry (puste), filtry + sortowanie (<code>all</code>) albo jedno pole.' },
      { a: 'd2-cms-empty', v: '', el: 'Div', d: 'Pokazywany, gdy filtry nie zwracają żadnego itemu (w Designerze daj Display: none).' },
      { a: 'd2-cms-display', v: 'visible | matching | total | hidden | remaining', el: 'Text', d: 'Moduł wpisuje tu licznik: widoczne / pasujące / wszystkie / ukryte / pozostałe.' },
      { a: 'd2-cms-display-format', v: 'np. {visible} z {matching}', el: 'Text', d: 'Własny format licznika z tokenami w klamrach.' },
      { a: 'd2-cms-count', v: '', el: 'Input (number)', d: 'Wpisana liczba = dokładnie tyle widocznych itemów; input odzwierciedla stan listy.' },
      { a: 'd2-cms-count-min', v: 'liczba', el: 'input d2-cms-count', d: 'Dolny limit wartości (domyślnie 1).' },
      { a: 'd2-cms-count-max', v: 'liczba', el: 'input d2-cms-count', d: 'Górny limit wartości.' },
      { a: 'd2-cms-count-step', v: '1 | -1 | n', el: 'Button', d: 'Zwiększa / zmniejsza liczbę widocznych itemów (puste = 1).' },
      { a: 'd2-cms-toggle', v: 'pole:wartość', el: 'Button', d: 'Przełącznik ukryj/pokaż dla itemów z tą wartością (filtr wykluczający).' },
      { a: 'd2-cms-toggle-hide', v: 'tekst', el: 'przycisk toggle', d: 'Etykieta, gdy itemy są widoczne (opisuje następną akcję: „Ukryj…”).' },
      { a: 'd2-cms-toggle-show', v: 'tekst', el: 'przycisk toggle', d: 'Etykieta, gdy itemy są ukryte („Pokaż…”).' },
      { a: 'd2-cms-toggle-default', v: 'hidden', el: 'przycisk toggle', d: 'Startuje z aktywnym ukryciem (np. sprzedane schowane od wejścia).' },
      { a: 'd2-cms-toggle-active', v: '', el: 'przycisk toggle', set: true, d: 'Obecny, gdy ukrycie aktywne — hook do stylowania.' },
      { a: 'd2-cms-range', v: '', el: 'Div (wrapper suwaka)', d: 'Kontener dwuuchwytowego suwaka zakresu.' },
      { a: 'd2-cms-range-field', v: 'pole', el: 'wrapper suwaka', req: true, d: 'Które pole liczbowe filtruje suwak.' },
      { a: 'd2-cms-range-min', v: 'liczba', el: 'wrapper suwaka', d: 'Sztywne minimum (bez niego autodetekcja z itemów).' },
      { a: 'd2-cms-range-max', v: 'liczba', el: 'wrapper suwaka', d: 'Sztywne maksimum (bez niego autodetekcja).' },
      { a: 'd2-cms-range-default-min', v: 'liczba', el: 'wrapper suwaka', d: 'Pozycja startowa lewego uchwytu (od razu filtruje).' },
      { a: 'd2-cms-range-default-max', v: 'liczba', el: 'wrapper suwaka', d: 'Pozycja startowa prawego uchwytu.' },
      { a: 'd2-cms-range-step', v: 'liczba', el: 'wrapper suwaka', d: 'Skok dla strzałek klawiatury (domyślnie 1).' },
      { a: 'd2-cms-range-displayformat', v: 'pln | eur | usd | thousands | wzorzec', el: 'wrapper suwaka', d: 'Format wyświetlanych liczb, np. <code>pln</code> → 1 600 000.', n: 'alias: <code>d2-cms-range-format</code>; wzorzec np. <code>0,000 PLN</code>' },
      { a: 'd2-cms-range-prefix', v: 'tekst', el: 'wrapper suwaka', d: 'Tekst przed liczbą (np. waluta z przodu).' },
      { a: 'd2-cms-range-suffix', v: 'tekst', el: 'wrapper suwaka', d: 'Tekst po liczbie (np. „ zł”).' },
      { a: 'd2-cms-range-display', v: 'min | max', el: 'Text w suwaku', d: 'Moduł wpisuje tu bieżącą wartość uchwytu.' },
      { a: 'd2-cms-range-track', v: '', el: 'Div w suwaku', d: 'Tor suwaka (tło uchwytów).' },
      { a: 'd2-cms-range-fill', v: '', el: 'Div w torze', d: 'Wypełnienie między uchwytami (pozycjonowane przez moduł).' },
      { a: 'd2-cms-range-handle', v: 'min | max', el: 'Div w torze', req: true, d: 'Przeciągalny uchwyt — potrzebne oba.' },
      { a: 'd2-cms-range-dragging', v: '', el: 'uchwyt', set: true, d: 'Obecny podczas przeciągania — hook CSS.' },
      { a: 'd2-cms-range-active', v: '', el: 'wrapper suwaka', set: true, d: 'Obecny, gdy filtr zakresu jest zawężony — hook CSS.' },
      { a: 'd2-cms-hidden-class', v: 'klasa', el: 'Collection List', d: 'Ukrywanie klasą CSS zamiast display:none.' },
      { a: 'd2-cms-hide-pagination', v: 'false', el: 'Collection List', d: 'Zostawia natywną paginację Webflow widoczną (domyślnie jest chowana).' },
      { a: 'd2-cms-group-by', v: 'pole', el: 'Collection List', d: 'Trwałe grupowanie — sortowanie użytkownika działa wewnątrz grup.' },
      { a: 'd2-cms-group-order', v: 'a|b|c', el: 'Collection List', d: 'Kolejność grup dla group-by (np. Dostępne przed Sprzedane).' }
    ],

    api: {
      desc: 'JS jest opcjonalny — użyj go, gdy potrzebujesz callbacków albo konfiguracji poza atrybutami.',
      code: "digi2.onReady(function () {\n  var lista = digi2.cms.createList('produkty', {\n    perPage: 12,               // ile itemów na start / na doładowanie\n    loadMode: 'scroll',        // 'button' | 'scroll' | 'all'\n    defaultSort: { field: 'cena', dir: 'asc' },\n    defaultFilters: { status: ['Dostępne'] },\n    filterMatchMode: 'AND',    // jak łączyć pola filtrów\n    groupBy: 'status',         // trwały podział na grupy\n    groupOrder: ['Dostępne', 'Sprzedane'],\n    hiddenClass: '',           // klasa zamiast display:none\n    onChange: function (state) {\n      // { visible, totalMatching, total, sort, filters }\n      console.log(state);\n    }\n  });\n});"
    },

    examples: [
      { title: 'Wyszukiwarka mieszkań (suwak + select + toggle + licznik)', code: '<div d2-cms-list="mieszkania" d2-cms-per-page="12" d2-cms-load-mode="scroll">\n  <!-- Collection Item -->\n  <div>\n    <span d2-cms-field="cena" d2-cms-field-type="number">399000</span>\n    <span d2-cms-field="status">Dostępne</span>\n  </div>\n</div>\n\n<select d2-cms-target="mieszkania" d2-cms-filter-field="pietro">\n  <option value="">Wszystkie piętra</option>\n  <option value="1">1 piętro</option>\n</select>\n\n<button d2-cms-target="mieszkania" d2-cms-toggle="status:Sprzedane"\n        d2-cms-toggle-hide="Ukryj sprzedane"\n        d2-cms-toggle-show="Pokaż sprzedane">Ukryj sprzedane</button>\n\n<div d2-cms-target="mieszkania" d2-cms-display-format="{visible} z {matching} mieszkań"></div>\n<div d2-cms-target="mieszkania" d2-cms-empty>Brak mieszkań dla tych filtrów.</div>' }
    ]
  },

  /* ════════════════════════ FILTER ════════════════════════ */
  filter: {
    name: 'Filter — prosty filtr',
    short: 'Filter',
    cat: 'Listy CMS',
    flag: 'd2-filter',
    icon: 'filter',
    size: '3,6 KB min',
    auto: false,
    tagline: 'Lekki filtr kategorii dla portfolio i galerii — pokaż/ukryj z animacją.',
    desc: 'Prosty filtr kategorii: przyciski pokazują i ukrywają elementy z pasującą kategorią, z animacją fade / zoom / slide. Do prostych portfolio i galerii. Do rozbudowanych list (sortowanie, zakresy, liczniki, doładowywanie) użyj modułu <a href="#/m/cms">CMS</a>.',

    kreator: {
      hasJs: true,
      fields: [
        { k: 'name', label: 'Nazwa grupy', type: 'text', def: 'portfolio' },
        { k: 'cats', label: 'Kategorie (po przecinku)', type: 'text', def: 'web, branding' },
        { k: 'anim', label: 'Animacja', type: 'select', def: 'fade', opts: [['fade', 'Fade'], ['zoom', 'Zoom'], ['slide-up', 'Slide up'], ['none', 'Brak']] }
      ],
      build: function(s){
        var cats = (s.cats || 'web').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
        var btns = [{ l: 'Button — „Wszystko”', t: 'button', a: [['d2-filter', 'all']] }];
        var items = [];
        cats.forEach(function(c){
          btns.push({ l: 'Button — „' + c + '”', t: 'button', a: [['d2-filter', c]] });
          items.push({ l: 'Div — projekt (' + c + ')', t: 'item', a: [['d2-filter-item'], ['d2-filter-category', c]], n: 'w CMS podepnij pole kategorii' });
        });
        return {
          tree: [{ l: 'Div Block — grupa filtra', t: 'div', a: [['d2-filter-group', s.name || 'portfolio']], c: [
            { l: 'Div — przyciski', t: 'div', c: btns },
            { l: 'Div — lista projektów', t: 'div', a: [['d2-filter-list']], c: items }
          ]}],
          js: "digi2.onReady(function () {\n  digi2.filter.create('" + (s.name || 'portfolio') + "', {\n    animation: '" + s.anim + "',\n    animationDuration: 0.3,\n    matchMode: 'any' // element pasuje, gdy ma dowolną z klikniętych kategorii\n  });\n});"
        };
      }
    },

    structures: [
      { title: 'Portfolio z kategoriami', tree: [
        { l: 'Div Block — grupa', t: 'div', a: [['d2-filter-group', 'portfolio']], c: [
          { l: 'Button — „Wszystko”', t: 'button', a: [['d2-filter', 'all']] },
          { l: 'Button — „Web”', t: 'button', a: [['d2-filter', 'web']] },
          { l: 'Button — „Branding”', t: 'button', a: [['d2-filter', 'branding']] },
          { l: 'Div — lista', t: 'div', a: [['d2-filter-list']], c: [
            { l: 'Div — projekt', t: 'item', a: [['d2-filter-item'], ['d2-filter-category', 'web']] },
            { l: 'Div — projekt', t: 'item', a: [['d2-filter-item'], ['d2-filter-category', 'web,branding']], n: 'kilka kategorii po przecinku' }
          ]}
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-filter-group', v: 'nazwa', el: 'Div (wspólny rodzic)', req: true, d: 'Spina przyciski i elementy w jedną grupę filtra.' },
      { a: 'd2-filter', v: 'kategoria | all', el: 'Button / Link', req: true, d: 'Przycisk filtrowania; <code>all</code> pokazuje wszystko.' },
      { a: 'd2-filter-item', v: '', el: 'element listy', req: true, d: 'Oznacza pojedynczy element podlegający filtrowaniu.' },
      { a: 'd2-filter-category', v: 'a lub a,b', el: 'element listy', req: true, d: 'Kategorie elementu — kilka po przecinku.' },
      { a: 'd2-filter-list', v: '', el: 'Div', d: 'Opcjonalny wrapper elementów (porządkowy).' }
    ],

    api: {
      desc: 'Moduł wymaga jednego wywołania create() — reszta dzieje się atrybutami.',
      code: "digi2.onReady(function () {\n  digi2.filter.create('portfolio', {\n    allKeyword: 'all',          // wartość przycisku „wszystko”\n    animation: 'fade',          // none | fade | zoom | slide-up\n    animationDuration: 0.3,\n    activeClass: 'd2-filter-active',\n    hiddenClass: 'd2-filter-hidden',\n    matchMode: 'any',           // any | all\n    onChange: function (aktywny, widoczne) {\n      console.log(aktywny, widoczne);\n    }\n  });\n});"
    }
  },

  /* ════════════════════════ FORMS ════════════════════════ */
  forms: {
    name: 'Forms — formularze',
    short: 'Formularze',
    cat: 'Formularze',
    flag: 'd2-forms',
    icon: 'form',
    size: '22,8 KB min',
    auto: false,
    tagline: 'Walidacja, śledzenie UTM/GCLID, konsenty z „zaznacz wszystkie” i przechwytywanie kontekstu.',
    desc: 'Kombajn do formularzy: walidacja na blur/submit z własnymi komunikatami, automatyczne ukryte pola śledzące (UTM, GCLID/FBCLID, GA4 client ID, URL i tytuł strony, opcjonalnie IP), checkbox „zaznacz wszystkie zgody”, pokazywanie/ukrywanie haseł oraz <i>context capture</i> — klik w kartę produktu wstrzykuje jej dane do formularza (np. w popupie).',
    installNote: 'Pola o standardowych nazwach <code>NAME</code>, <code>EMAIL</code>, <code>PHONE</code>, <code>MESSAGE</code>, <code>CONSENT_GDPR/EMAIL/PHONE</code> dostają reguły walidacji automatycznie. Nazwę pola ustawiasz w Webflow w ustawieniach inputa (pole „Name”).',

    kreator: {
      hasJs: true,
      fields: [
        { k: 'name', label: 'Nazwa formularza', type: 'text', def: 'kontakt' },
        { k: 'bind', label: 'Jak wskazać formularz', type: 'select', def: 'attr', opts: [['attr', 'Atrybut d2-form na wrapperze'], ['selector', 'Selektor CSS (np. #email-form)']] },
        { k: 'selector', label: 'Selektor formularza', type: 'text', def: '#email-form', sub: true, showIf: function(s){ return s.bind === 'selector'; } },
        { k: 'phone', label: 'Pole telefonu (PHONE)', type: 'check', def: true },
        { k: 'message', label: 'Pole wiadomości (MESSAGE)', type: 'check', def: true },
        { k: 'messageReq', label: 'Wiadomość wymagana', type: 'check', def: false, sub: true, showIf: function(s){ return s.message; } },
        { k: 'consents', label: 'Zgody (GDPR / e-mail / telefon)', type: 'check', def: true },
        { k: 'master', label: 'Checkbox „zaznacz wszystkie”', type: 'check', def: true, sub: true, showIf: function(s){ return s.consents; } },
        { k: 'autoErr', label: 'Automatyczne komunikaty błędów', type: 'check', def: true },
        { k: 'errColor', label: 'Kolor błędu', type: 'text', def: '#e11d48', sub: true, showIf: function(s){ return s.autoErr; } },
        { k: 'validateOn', label: 'Kiedy walidować', type: 'select', def: 'both', opts: [['both', 'Blur + submit'], ['blur', 'Tylko blur'], ['submit', 'Tylko submit']] }
      ],
      build: function(s){
        var n = s.name || 'kontakt';
        var formKids = [
          { l: 'Input — imię i nazwisko', t: 'input', n: 'Settings → Name: NAME' },
          { l: 'Input — e-mail', t: 'input', n: 'Settings → Name: EMAIL' }
        ];
        if (s.phone) formKids.push({ l: 'Input — telefon', t: 'input', n: 'Settings → Name: PHONE' });
        if (s.message) formKids.push({ l: 'Textarea — wiadomość', t: 'textarea', n: 'Settings → Name: MESSAGE' });
        if (s.consents){
          if (s.master) formKids.push({ l: 'Checkbox — „Zaznacz wszystkie”', t: 'checkbox', a: [['d2-consent-master', n]], n: 'bez atrybutu name — nie wysyła się' });
          formKids.push({ l: 'Checkbox — zgoda RODO', t: 'checkbox', a: s.master ? [['d2-consent-item', n]] : [], n: 'Name: CONSENT_GDPR' });
          formKids.push({ l: 'Checkbox — zgoda e-mail', t: 'checkbox', a: s.master ? [['d2-consent-item', n]] : [], n: 'Name: CONSENT_EMAIL' });
          formKids.push({ l: 'Checkbox — zgoda telefon', t: 'checkbox', a: s.master ? [['d2-consent-item', n]] : [], n: 'Name: CONSENT_PHONE' });
        }
        formKids.push({ l: 'Submit Button', t: 'button' });

        var wrapAttrs = s.bind === 'attr' ? [['d2-form', n]] : [];
        var tree = [{ l: 'Div Block — wrapper formularza', t: 'div', a: wrapAttrs, n: s.bind === 'selector' ? 'ID formularza: ' + (s.selector || '#email-form').replace('#', '') : null, c: [
          { l: 'Form Block (Webflow)', t: 'form', c: [{ l: 'Form', t: 'form', c: formKids }] }
        ]}];

        var js = "digi2.onReady(function () {\n  digi2.forms.create('" + n + "', {\n";
        if (s.bind === 'selector') js += "    formSelector: '" + (s.selector || '#email-form') + "',\n";
        js += "    validateOn: '" + s.validateOn + "',\n";
        js += "    validation: {\n      NAME:  { required: true, minLength: 2, letters: true },\n      EMAIL: { required: true, email: true }" +
          (s.phone ? ",\n      PHONE: { required: true, phone: true }" : "") +
          (s.message ? ",\n      MESSAGE: { required: " + (s.messageReq ? 'true, minLength: 30' : 'false, minLength: false') + " }" : "") +
          "\n    },\n";
        js += "    errorMessages: {\n      required: 'To pole jest wymagane.',\n      email: 'Podaj poprawny adres e-mail.',\n      phone: 'Podaj poprawny numer telefonu.',\n      letters: 'Dozwolone są tylko litery.',\n      minLength: 'Wpisz co najmniej {param} znaki/-ów.'\n    }";
        if (s.autoErr) js += ",\n    autoErrorElements: true,\n    errorLocation: 'below',\n    errorColor: '" + (s.errColor || '#e11d48') + "',\n    inputOnError: { borderColor: '" + (s.errColor || '#e11d48') + "' },\n    inputOnValid: { borderColor: '' }";
        js += "\n  });\n});";

        var note = s.consents ? 'Czerwona ramka na niezaznaczonych zgodach: moduł dodaje klasę <code>d2-error</code> na label — dodaj w CSS: <code>.d2-error .w-checkbox-input { border-color: ' + (s.errColor || '#e11d48') + ' !important; }</code>' : null;
        return { tree: tree, js: js, note: note };
      }
    },

    structures: [
      { title: 'Formularz kontaktowy ze zgodami', desc: 'Standardowe nazwy pól dostają walidację automatycznie; master-checkbox steruje pozostałymi zgodami.', tree: [
        { l: 'Div Block — wrapper', t: 'div', a: [['d2-form', 'kontakt']], n: 'fallback: data-d2-form', c: [
          { l: 'Form Block', t: 'form', c: [
            { l: 'Input', t: 'input', n: 'Name: NAME' },
            { l: 'Input', t: 'input', n: 'Name: EMAIL' },
            { l: 'Input', t: 'input', n: 'Name: PHONE' },
            { l: 'Textarea', t: 'textarea', n: 'Name: MESSAGE' },
            { l: 'Div — komunikat błędu', t: 'text', a: [['d2-form-error-text']], n: 'opcjonalny — może tworzyć się sam' },
            { l: 'Checkbox — zaznacz wszystkie', t: 'checkbox', a: [['d2-consent-master', 'kontakt']] },
            { l: 'Checkbox — RODO', t: 'checkbox', a: [['d2-consent-item', 'kontakt']], n: 'Name: CONSENT_GDPR' },
            { l: 'Checkbox — e-mail', t: 'checkbox', a: [['d2-consent-item', 'kontakt']], n: 'Name: CONSENT_EMAIL' },
            { l: 'Submit Button', t: 'button' }
          ]}
        ]}
      ]},
      { title: 'Context capture: karta produktu → formularz w popupie', desc: 'Klik gdziekolwiek w kartę wstrzykuje dane do formularza — zanim popup zdąży się otworzyć.', tree: [
        { l: 'Collection Item — karta mieszkania', t: 'item', a: [['d2-form-data-product', 'podepnij pole CMS'], ['d2-form-data-target', 'kontakt']], c: [
          { l: 'Button — „Zapytaj”', t: 'button', a: [['d2-show-popup', 'contact-popup']], n: 'otwiera popup (moduł Popups)' },
          { l: 'Link — „Pobierz rzut”', t: 'link', n: 'bez d2-show-popup — nie otwiera popupu' }
        ]},
        { l: 'Popup z formularzem', t: 'popup', c: [
          { l: 'Div — wrapper', t: 'div', a: [['d2-form', 'kontakt']], n: 'pole „product” wstrzyknie się samo' }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-form', v: 'nazwa', el: 'Div (wrapper formularza)', req: true, d: 'Rejestruje formularz pod tą nazwą (moduł znajdzie <code>&lt;form&gt;</code> w środku).', n: 'fallback: <code>data-d2-form</code>; alternatywa: opcja formSelector w JS' },
      { a: 'd2-form-error-text', v: '', el: 'Div / Text przy inpucie', d: 'Kontener na komunikat błędu pola — moduł wpisuje treść i pokazuje/ukrywa.', n: 'przy autoErrorElements tworzy się sam' },
      { a: 'd2-form-error', v: '', el: 'Div / ikona', d: 'Element stanu „błąd” (bez tekstu) — np. czerwona ikona.' },
      { a: 'd2-form-success', v: '', el: 'Div / ikona', d: 'Element stanu „poprawnie” — pokazywany, gdy pole ma wartość i przechodzi walidację.' },
      { a: 'd2-form-error-required', v: '', el: 'Div przy inpucie', d: 'Wariant per-reguła: pokazywany tylko, gdy pada reguła <code>required</code>.', n: 'analogicznie d2-form-error-email itd.' },
      { a: 'd2-form-summary', v: '', el: 'Div nad przyciskiem', d: 'Kontener na zbiorczą listę błędów (tryb errorDisplay: summary).' },
      { a: 'd2-consent-master', v: 'grupa', el: 'Checkbox', d: 'Checkbox „zaznacz wszystkie” — steruje zgodami z tą samą grupą, pokazuje stan częściowy.', n: 'przy stanie częściowym wizual dostaje klasę <code>d2-consent-indeterminate</code>' },
      { a: 'd2-consent-item', v: 'grupa', el: 'Checkbox zgody', d: 'Zgoda należąca do grupy mastera — zmiany aktualizują master w obie strony.' },
      { a: 'd2-form-data-*', v: 'wartość', el: 'karta / dowolny kontener', d: 'Context capture: klik w kontener wstrzykuje <code>*</code> jako ukryte pole formularza, np. <code>d2-form-data-product="M23"</code>.', n: 'działa w capture phase — przed otwarciem popupu' },
      { a: 'd2-form-data-target', v: 'nazwa formularza', el: 'ten sam kontener', d: 'Do którego formularza trafiają dane (bez niego: do wszystkich).' },
      { a: 'd2-form-data-prefix', v: 'prefiks', el: 'ten sam kontener', d: 'Doklejany do nazw wstrzykiwanych pól.' },
      { a: 'd2-password-toggle', v: 'selektor (opc.)', el: 'Button przy haśle', d: 'Przełącza widoczność pola hasła (bez wartości szuka inputa obok).' },
      { a: 'd2-password-show', v: 'tekst', el: 'ten przycisk', d: 'Etykieta, gdy hasło ukryte.' },
      { a: 'd2-password-hide', v: 'tekst', el: 'ten przycisk', d: 'Etykieta, gdy hasło widoczne.' },
      { a: 'd2-pw', v: 'visible', el: 'input hasła', set: true, d: 'Ustawiany na inpucie, gdy hasło jest odsłonięte — hook CSS i marker dla przełącznika.' }
    ],

    api: {
      desc: 'Reguły wbudowane: <code>required</code>, <code>email</code>, <code>phone</code>, <code>url</code>, <code>number</code>, <code>integer</code>, <code>letters</code>, <code>numbers</code>, <code>alphanumeric</code>, <code>noSpaces</code>, <code>noSpecialChars</code> oraz parametryczne: <code>minLength</code>, <code>maxLength</code>, <code>min</code>, <code>max</code>, <code>pattern</code>, <code>equals</code>, <code>matchField</code>. Auto-wstrzykiwane ukryte pola: UTM_SOURCE/MEDIUM/CAMPAIGN/CONTENT/TERM, GCLID, FBCLID, MSCLKID, GOOGLE_ANALYTICS_ID, PAGE_URL, PAGE_TITLE, PAGE_REFERRER (+ IP_ADDRESS przy ipTracking).',
      code: "digi2.onReady(function () {\n  digi2.forms.create('kontakt', {\n    formSelector: '#email-form',   // albo d2-form=\"kontakt\" na wrapperze\n    validateOn: 'both',            // 'blur' | 'submit' | 'both'\n\n    // śledzenie (domyślnie włączone poza IP)\n    utmTracking: true,\n    clickIdTracking: true,         // gclid / fbclid / msclkid\n    gaClientId: true,\n    ipTracking: false,\n    customFields: { ZRODLO: 'strona-glowna' },\n\n    validation: {\n      NAME:    { required: true, minLength: 2, letters: true },\n      EMAIL:   { required: true, email: true },\n      PHONE:   { required: true, phone: true },\n      MESSAGE: { required: false, minLength: false }\n    },\n    errorMessages: {\n      required: 'To pole jest wymagane.',\n      email: 'Podaj poprawny adres e-mail.'\n    },\n    autoErrorElements: true,\n    errorColor: '#e11d48',\n    inputOnError: { borderColor: '#e11d48' },\n    inputOnValid: { borderColor: '' },\n\n    onSubmit: function (dane, formEl) { /* wszystko poprawne */ }\n  });\n\n  // własna reguła\n  digi2.forms.addRule('nip', function (v) { return /^\\d{10}$/.test(v.replace(/[^0-9]/g, '')); });\n});"
    },

    examples: [
      { title: 'Czerwone ramki na niezaznaczonych zgodach (CSS)', lang: 'html', code: '<style>\n  /* moduł dodaje d2-error na labelu zgody */\n  .d2-error .w-checkbox-input {\n    border-color: #e11d48 !important;\n    box-shadow: none !important;\n  }\n</style>' }
    ]
  },

  /* ════════════════════════ POPUPS ════════════════════════ */
  popups: {
    name: 'Popups — modale',
    short: 'Popupy',
    cat: 'Komponenty UI',
    flag: 'd2-popups',
    icon: 'popup',
    size: '26,1 KB min',
    auto: false,
    tagline: '22 animacje i kilkanaście triggerów: klik, czas, exit intent, scroll, bezczynność…',
    desc: 'System popupów z animacjami (fade, zoom, blur, slide, bounce, elastic…) i bogatym zestawem wyzwalaczy: przycisk, opóźnienie, exit intent, procent scrolla, bezczynność, rage click, przechwycenie linku i inne. Do tego cookie „nie pokazuj ponownie”, harmonogram czasowy i ograniczanie do wybranych podstron. Popup rejestrujesz jednym <code>create()</code> w JS — triggery i harmonogram ogarniasz atrybutami.',

    kreator: {
      hasJs: true,
      fields: [
        { k: 'name', label: 'Nazwa popupu', type: 'text', def: 'contact-popup', hint: 'Używana w d2-show-popup i w create().' },
        { k: 'sel', label: 'ID overlaya (popupSelector)', type: 'text', def: '#contact-popup' },
        { k: 'close', label: 'Klasa przycisku zamykania', type: 'text', def: '.popup__close' },
        { k: 'anim', label: 'Animacja', type: 'select', def: 'fade', opts: [['fade','Fade'],['zoom','Zoom'],['blur','Blur'],['zoom-blur','Zoom + blur'],['slide-up','Slide up'],['slide-down','Slide down'],['slide-left','Slide left'],['slide-right','Slide right'],['bounce','Bounce'],['elastic','Elastic'],['flip','Flip']] },
        { k: 'dur', label: 'Czas animacji (s)', type: 'number', def: 0.4 },
        { k: 'lock', label: 'Blokuj scroll strony', type: 'check', def: true },
        { k: 'trigger', label: 'Wyzwalacz', type: 'select', def: 'click', opts: [['click','Przycisk (d2-show-popup)'],['delay','Po czasie na stronie'],['exit','Exit intent'],['scroll','Po % przescrollowania'],['idle','Po bezczynności']] },
        { k: 'delayS', label: 'Po ilu sekundach', type: 'number', def: 5, sub: true, showIf: function(s){ return s.trigger === 'delay'; } },
        { k: 'scrollPct', label: 'Procent scrolla', type: 'number', def: 50, sub: true, showIf: function(s){ return s.trigger === 'scroll'; } },
        { k: 'idleS', label: 'Sekundy bezczynności', type: 'number', def: 20, sub: true, showIf: function(s){ return s.trigger === 'idle'; } },
        { k: 'cookie', label: 'Nie pokazuj ponownie (cookie)', type: 'check', def: false },
        { k: 'cookieDays', label: 'Przez ile dni', type: 'number', def: 7, sub: true, showIf: function(s){ return s.cookie; } }
      ],
      build: function(s){
        var id = (s.sel || '#contact-popup').replace('#', '');
        var tree = [
          { l: 'Div Block — overlay', t: 'div', a: [['id', id]], n: 'Position: Fixed, pełny ekran, Display: none', c: [
            { l: 'Div — modal', t: 'div', c: [
              { l: 'Button — X', t: 'button', n: 'klasa: ' + (s.close || '.popup__close').replace('.', '') },
              { l: 'Twoja treść / formularz', t: 'form', n: 'np. formularz z modułu Forms' }
            ]}
          ]}
        ];
        if (s.trigger === 'click') tree.push({ l: 'Button — otwiera popup', t: 'button', a: [['d2-show-popup', s.name || 'contact-popup']], n: 'dowolne miejsce na stronie' });

        var js = "digi2.onReady(function () {\n  digi2.popups.create('" + (s.name || 'contact-popup') + "', {\n    popupSelector: '" + (s.sel || '#contact-popup') + "',\n    closeTriggerSelector: '" + (s.close || '.popup__close') + "',\n    animation: '" + s.anim + "',\n    animationDuration: " + (s.dur || 0.4) + ",\n    lockScrollOnShow: " + (s.lock ? 'true' : 'false');
        if (s.trigger === 'delay') js += ",\n    openAfterDelay: " + (s.delayS || 5);
        if (s.trigger === 'exit') js += ",\n    openOnExitIntent: true";
        if (s.trigger === 'scroll') js += ",\n    openAfterScrollPercent: " + (s.scrollPct || 50);
        if (s.trigger === 'idle') js += ",\n    openAfterIdle: " + (s.idleS || 20);
        js += s.cookie ? ",\n    cookieName: '" + (s.name || 'popup') + "_seen',\n    cookieDurationDays: " + (s.cookieDays || 7) : ",\n    cookieName: null // pokazuj przy każdej wizycie";
        js += "\n  });\n});";

        return { tree: tree, js: js, note: 'Klik w tło overlaya zamyka popup automatycznie. <b>ID nadajesz w Element Settings</b> (pole ID), nie w custom attributes.' };
      }
    },

    structures: [
      { title: 'Popup + przycisk otwierający', tree: [
        { l: 'Div Block — overlay', t: 'div', a: [['id', 'contact-popup'], ['d2-popup-schedule', '2026-07-01, 2026-07-31']], n: 'Fixed, inset 0, Display: none; schedule opcjonalny', c: [
          { l: 'Div — modal (wyśrodkowany)', t: 'div', c: [
            { l: 'Button — X', t: 'button', n: 'klasa .popup__close' },
            { l: 'Heading + treść / formularz', t: 'heading' }
          ]}
        ]},
        { l: 'Button — „Zapytaj o mieszkanie”', t: 'button', a: [['d2-show-popup', 'contact-popup']] },
        { l: 'Button — z opóźnieniem', t: 'button', a: [['d2-show-popup', 'contact-popup'], ['d2-show-popup-delay', '3']], n: 'otwiera 3 s po kliku' }
      ]}
    ],

    attrs: [
      { a: 'd2-show-popup', v: 'nazwa', el: 'Button / Link', d: 'Klik otwiera popup o tej nazwie (nazwa z <code>create()</code>).', n: 'fallback: data-d2-show-popup; responsywnie: nazwa;inna@911' },
      { a: 'd2-show-popup-delay', v: 'sekundy', el: 'ten sam przycisk', d: 'Otwiera popup N sekund po kliknięciu.' },
      { a: 'd2-popup-schedule', v: 'od, do', el: 'overlay popupu', d: 'Okno czasowe dostępności, np. <code>2026-07-01 18:00, 2026-07-15 23:59</code>; zakres może być otwarty z jednej strony.' },
      { a: 'd2-popup-exclude', v: 'fragmenty|url', el: 'overlay popupu', d: 'Nie pokazuj na adresach zawierających te fragmenty (rozdzielone <code>|</code>).' },
      { a: 'd2-popup-include', v: 'fragmenty|url', el: 'overlay popupu', d: 'Pokazuj tylko na adresach zawierających te fragmenty.' }
    ],

    api: {
      desc: 'Pełna lista opcji create() — animacje: none, fade, zoom, zoom-in, blur, zoom-blur, slide-up/down/left/right, slide-full-*, flip, flip-y, rotate, bounce, elastic, drop, swing, unfold, reveal.',
      code: "digi2.onReady(function () {\n  digi2.popups.create('newsletter', {\n    popupSelector: '#newsletter-popup',\n    closeTriggerSelector: '.popup__close',\n    animation: 'slide-up',\n    animationDuration: 0.4,\n    lockScrollOnShow: true,\n\n    // wyzwalacze (dowolna kombinacja)\n    openAfterDelay: 5,             // sekundy od wejścia\n    openOnExitIntent: false,       // desktop: mysz poza okno, mobile: szybki scroll w górę\n    openAfterScrollPercent: null,  // 0–100\n    openAfterScrollPastElement: null, // '#cennik'\n    openAfterIdle: null,           // sekundy bezczynności\n    openAfterPageViews: null,      // po N odsłonach w sesji\n    openOnRageClick: null,         // true lub liczba klików\n    interceptLinks: false,         // true | selektor | { device, selector }\n\n    // pokazywanie\n    cookieName: 'nl_seen',         // null = pokazuj zawsze\n    cookieDurationDays: 7,\n    schedule: { from: '2026-07-01 00:00', to: '2026-07-31 23:59' },\n    excludeUrls: ['/kontakt'],\n\n    onOpen: function () {},\n    onClose: function () {}\n  });\n});"
    },

    examples: [
      { title: 'Popup z formularzem i nazwą produktu z karty CMS', desc: 'Współpraca trzech modułów: popups otwiera, forms waliduje i wstrzykuje nazwę klikniętego produktu.', code: '<!-- karta w Collection List -->\n<div d2-form-data-product="{{ Nazwa }}" d2-form-data-target="kontakt">\n  <button d2-show-popup="contact-popup">Zapytaj o mieszkanie</button>\n</div>\n\n<!-- overlay popupu (ID: contact-popup) z formularzem d2-form="kontakt" -->' }
    ]
  },

  /* ════════════════════════ TOASTS ════════════════════════ */
  toasts: {
    name: 'Toasts — powiadomienia',
    short: 'Toasty',
    cat: 'Komponenty UI',
    flag: 'd2-toasts',
    icon: 'toast',
    size: '4,8 KB min',
    auto: false,
    tagline: 'Lekkie powiadomienia: success / error / warning / info, 6 pozycji, auto-znikanie.',
    desc: 'Powiadomienia „toast” generowane w całości z JS — bez struktury w Webflow. Pięć typów (default, success, error, warning, info), sześć pozycji na ekranie, animacja slide lub fade, przycisk zamknięcia i callbacki. Idealne jako potwierdzenie wysłania formularza albo feedback po skopiowaniu.',

    structures: [
      { title: 'Struktura generowana przez moduł', desc: 'Niczego nie budujesz w Designerze — tak wygląda DOM, który tworzy moduł (do stylowania po klasach).', tree: [
        { l: 'Div .d2-toast-container--top-right', t: 'div', n: 'tworzony automatycznie w body', c: [
          { l: 'Div .d2-toast.d2-toast--success', t: 'toast', c: [
            { l: 'Span .d2-toast-icon', t: 'text' },
            { l: 'Span .d2-toast-msg', t: 'text' },
            { l: 'Button .d2-toast-close', t: 'button' }
          ]}
        ]}
      ]}
    ],

    attrs: [],

    api: {
      desc: 'Pozycje: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right. Pozycja przyjmuje składnię responsywną.',
      code: "digi2.onReady(function () {\n  // skróty typów\n  digi2.toasts.success('Wiadomość wysłana!');\n  digi2.toasts.error('Coś poszło nie tak.');\n  digi2.toasts.warning('Sprawdź dane.');\n  digi2.toasts.info('Nowa oferta w sprzedaży.');\n\n  // pełna kontrola\n  var id = digi2.toasts.show('Zapisano zmiany', {\n    type: 'success',\n    duration: 4000,          // 0 = nie znika samo\n    position: 'bottom-center',\n    dismissible: true,\n    animation: 'slide',      // slide | fade\n    onDismiss: function () {}\n  });\n  digi2.toasts.dismiss(id);\n\n  // globalne ustawienia (np. inna pozycja na mobile)\n  digi2.toasts.config({ position: 'top-right;bottom-center@767', duration: 3500 });\n});"
    },

    examples: [
      { title: 'Toast po poprawnym submicie formularza', lang: 'js', code: "digi2.forms.create('kontakt', {\n  onSubmit: function (dane, form) {\n    digi2.toasts.success('Dziękujemy! Odezwiemy się wkrótce.', {\n      position: 'bottom-center',\n      duration: 4000\n    });\n  }\n});" }
    ]
  }

  }
};
