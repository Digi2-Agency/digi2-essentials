/* digi2 essentials — dane dokumentacji (część 2) */
(function(M){

  /* ════════════════════════ TABS ════════════════════════ */
  M.tabs = {
    name: 'Tabs — taby i akordeony',
    short: 'Taby / akordeony',
    cat: 'Komponenty UI',
    flag: 'd2-tabs',
    icon: 'tabs',
    size: '17,9 KB min',
    auto: true,
    tagline: 'Taby i akordeony z animacjami, przełączaniem z dropdownu i eventem tabs:change.',
    desc: 'Zamiennik natywnych tabów Webflow: animacje wejścia/wyjścia (fade, slide, zoom, płynna wysokość), tryb akordeonu z wieloma otwartymi panelami, panele przełączane triggerami spoza grupy (np. opcjami dropdownu ze składnią <code>grupa:panel</code>), etykieta aktywnego widoku i event <code>tabs:change</code>, na który reagują liczniki modułu CMS.',

    kreator: {
      fields: [
        { k: 'name', label: 'Nazwa grupy', type: 'text', def: 'widok' },
        { k: 'mode', label: 'Tryb', type: 'select', def: 'tabs', opts: [['tabs', 'Taby (jeden otwarty)'], ['accordion', 'Akordeon']] },
        { k: 'multiple', label: 'Akordeon: wiele otwartych naraz', type: 'check', def: false, sub: true, showIf: function(s){ return s.mode === 'accordion'; } },
        { k: 'anim', label: 'Animacja', type: 'select', def: 'fade', opts: [['fade', 'Fade'], ['slide-up', 'Slide up'], ['slide-down', 'Slide down'], ['zoom', 'Zoom'], ['height', 'Płynna wysokość'], ['none', 'Brak']] },
        { k: 'dur', label: 'Czas animacji (s)', type: 'number', def: 0.25 },
        { k: 'def', label: 'Panel otwarty na starcie', type: 'text', def: 'lista', ph: 'np. lista lub a|b' },
        { k: 'activeClass', label: 'Własna klasa aktywnych', type: 'text', def: '', ph: 'np. is-active (opcjonalne)' },
        { k: 'dropdown', label: 'Przełączanie z dropdownu', type: 'check', def: false, hint: 'opcje w menu przełączają panele, etykieta pokazuje wybór' }
      ],
      build: function(s){
        var n = s.name || 'widok';
        var groupAttrs = [['d2-tab-group', n]];
        if (s.mode === 'accordion') groupAttrs.push(['d2-tab-mode', 'accordion']);
        if (s.mode === 'accordion' && s.multiple) groupAttrs.push(['d2-tab-multiple']);
        if (s.anim !== 'fade') groupAttrs.push(['d2-tab-animation', s.anim]);
        if (s.dur && s.dur !== 0.25) groupAttrs.push(['d2-tab-duration', String(s.dur)]);
        if (s.def) groupAttrs.push(['d2-tab-default', s.def]);
        if (s.activeClass) groupAttrs.push(['d2-tab-active-class', s.activeClass]);

        var kids = [];
        if (!s.dropdown) kids.push(
          { l: 'Button — „Lista”', t: 'button', a: [['d2-tab-trigger', 'lista']] },
          { l: 'Button — „Siatka”', t: 'button', a: [['d2-tab-trigger', 'siatka']] }
        );
        kids.push(
          { l: 'Div — panel „lista”', t: 'div', a: [['d2-tab-instance', 'lista']] },
          { l: 'Div — panel „siatka”', t: 'div', a: [['d2-tab-instance', 'siatka']], n: 'display grid/flex? dodaj d2-tab-display' }
        );

        var tree = [{ l: 'Div Block — grupa tabów', t: 'tabs', a: groupAttrs, c: kids }];
        if (s.dropdown){
          tree.push({ l: 'Dropdown (Webflow) — może być w innym miejscu', t: 'dropdown', a: [['d2-dropdown']], c: [
            { l: 'Dropdown Toggle', t: 'button', c: [
              { l: 'Text — „Wyświetl”', t: 'text', a: [['d2-tab-label', n]], n: 'pokaże tekst wybranej opcji' }
            ]},
            { l: 'Dropdown List', t: 'nav', c: [
              { l: 'Link — „Lista”', t: 'link', a: [['d2-tab-trigger', n + ':lista']] },
              { l: 'Link — „Siatka”', t: 'link', a: [['d2-tab-trigger', n + ':siatka']] }
            ]}
          ]});
        }
        return { tree: tree, note: 'Trigger spoza grupy używa składni <code>grupa:panel</code>. Moduł ustawia <code>d2-is-active</code> na aktywnym triggerze i panelu — stylujesz po tym w CSS.' };
      }
    },

    structures: [
      { title: 'Proste taby', tree: [
        { l: 'Div Block — grupa', t: 'tabs', a: [['d2-tab-group', 'cennik'], ['d2-tab-default', 'monthly']], c: [
          { l: 'Button — „Miesięcznie”', t: 'button', a: [['d2-tab-trigger', 'monthly']] },
          { l: 'Button — „Rocznie”', t: 'button', a: [['d2-tab-trigger', 'yearly']] },
          { l: 'Div — panel', t: 'div', a: [['d2-tab-instance', 'monthly']] },
          { l: 'Div — panel', t: 'div', a: [['d2-tab-instance', 'yearly']] }
        ]}
      ]},
      { title: 'Akordeon FAQ', desc: 'Dedykowane atrybuty akordeonu z płynnym rozwijaniem wysokości i obracaną ikoną.', tree: [
        { l: 'Div Block — akordeon', t: 'tabs', a: [['d2-accordion'], ['d2-tab-duration', '0.4']], c: [
          { l: 'Div — pozycja', t: 'div', a: [['d2-accordion-item']], c: [
            { l: 'Div — pytanie', t: 'button', a: [['d2-accordion-trigger']] },
            { l: 'Div — odpowiedź', t: 'div', a: [['d2-accordion-body']] },
            { l: 'Div — ikona „+”', t: 'text', a: [['d2-accordion-indicator']], n: 'obraca się przy otwarciu' }
          ]},
          { l: 'Div — pozycja', t: 'div', a: [['d2-accordion-item']], n: '…kolejne pytania' }
        ]}
      ]},
      { title: 'Przełącznik widoku w dropdownie', desc: 'Opcje dropdownu przełączają panele; etykieta pokazuje aktywny wybór. Liczniki CMS z pipe-targetem śledzą widoczny panel.', tree: [
        { l: 'Div — grupa paneli', t: 'tabs', a: [['d2-tab-group', 'widok'], ['d2-tab-default', 'lista']], c: [
          { l: 'Div — panel „lista”', t: 'div', a: [['d2-tab-instance', 'lista']] },
          { l: 'Div — panel „siatka”', t: 'div', a: [['d2-tab-instance', 'siatka']] }
        ]},
        { l: 'Dropdown (Webflow)', t: 'dropdown', a: [['d2-dropdown']], c: [
          { l: 'Dropdown Toggle', t: 'button', c: [
            { l: 'Text — „Wyświetl”', t: 'text', a: [['d2-tab-label', 'widok']] }
          ]},
          { l: 'Dropdown List', t: 'nav', c: [
            { l: 'Link — „Lista”', t: 'link', a: [['d2-tab-trigger', 'widok:lista']] },
            { l: 'Link — „Siatka”', t: 'link', a: [['d2-tab-trigger', 'widok:siatka']] }
          ]}
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-tab-group', v: 'nazwa', el: 'Div (kontener grupy)', req: true, d: 'Grupa tabów — triggery i panele żyją w środku (albo celują z zewnątrz po nazwie).' },
      { a: 'd2-tab-trigger', v: 'panel lub grupa:panel', el: 'Button / Link', req: true, d: 'Klik otwiera panel o tym id; składnia <code>grupa:panel</code> działa spoza grupy.', n: 'alias: <code>d2-tab</code>' },
      { a: 'd2-tab-instance', v: 'id panelu', el: 'Div (panel)', req: true, d: 'Panel z treścią — id musi odpowiadać triggerowi.', n: 'alias: <code>d2-tab-content</code>' },
      { a: 'd2-tab-target', v: 'nazwa grupy', el: 'trigger poza grupą', d: 'Wskazuje grupę dla zewnętrznego triggera — alternatywa dla składni <code>grupa:panel</code>.', n: 'alias: <code>d2-tab-group-trigger</code>' },
      { a: 'd2-tab-mode', v: 'tabs | accordion', el: 'kontener grupy', d: 'Tryb pracy (domyślnie tabs — jeden otwarty).' },
      { a: 'd2-tab-multiple', v: '', el: 'kontener grupy', d: 'Akordeon: pozwala trzymać otwartych kilka paneli.' },
      { a: 'd2-tab-animation', v: 'none | fade | slide-up | slide-down | zoom | height', el: 'kontener grupy', d: 'Animacja przełączania; <code>height</code> = płynne rozwijanie (najlepsze dla akordeonów).' },
      { a: 'd2-tab-duration', v: 'sekundy', el: 'kontener grupy', d: 'Czas animacji (domyślnie 0.25).' },
      { a: 'd2-tab-default', v: 'id lub a|b', el: 'kontener grupy', d: 'Panel(e) otwarte na starcie; bez tego otwiera się pierwszy.' },
      { a: 'd2-tab-active-class', v: 'klasa', el: 'kontener grupy', d: 'Własna klasa dla aktywnego triggera i panelu (obok zawsze ustawianego <code>d2-is-active</code>).' },
      { a: 'd2-tab-display', v: 'block | flex | grid', el: 'panel', d: 'Jakim display pokazać panel (domyślnie block).' },
      { a: 'd2-tab-scroll', v: 'puste | start | center | end', el: 'kontener grupy', d: 'Po otwarciu doscrolluj do panelu (przewidująco, bez skoku).' },
      { a: 'd2-tab-label', v: 'nazwa grupy', el: 'Text (np. w toggle dropdownu)', d: 'Moduł wpisuje tu tekst wybranej opcji; do wyboru użytkownika trzyma placeholder.' },
      { a: 'd2-tab-option-label', v: 'tekst', el: 'trigger', d: 'Własny tekst do etykiety zamiast treści triggera.' },
      { a: 'd2-tab-label-static', v: '', el: 'element z d2-tab-label', d: 'Blokuje podmianę tekstu etykiety na stałe.' },
      { a: 'd2-tab-label-scope', v: '', el: 'wrapper', d: 'Zakres wiązania bezimiennej etykiety z triggerami.' },
      { a: 'd2-is-active', v: '', el: 'trigger + panel', set: true, d: 'Obecny na aktywnych elementach — hook do stylowania.', n: 'moduł dodaje też klasę <code>d2-tab-active</code> (podmienisz przez d2-tab-active-class)' },
      { a: 'd2-accordion', v: '', el: 'Div (kontener)', d: 'Skrót: grupa w trybie akordeonu.' },
      { a: 'd2-accordion-item', v: '', el: 'Div pozycji', d: 'Pojedyncza pozycja akordeonu.' },
      { a: 'd2-accordion-trigger', v: '', el: 'nagłówek pozycji', d: 'Klik otwiera/zamyka tę pozycję.' },
      { a: 'd2-accordion-body', v: '', el: 'treść pozycji', d: 'Zwijana treść.' },
      { a: 'd2-accordion-indicator', v: '', el: 'ikona w pozycji', d: 'Obracana ikona plus/strzałka.' },
      { a: 'd2-accordion-open', v: '', el: 'pozycja', set: true, d: 'Obecny na otwartej pozycji — hook CSS.' }
    ],

    api: {
      desc: 'Auto-inicjalizacja z atrybutów wystarcza; API przydaje się do sterowania programowego. Event <code>tabs:change</code> leci przez digi2.emit.',
      code: "digi2.onReady(function () {\n  var taby = digi2.tabs.get('widok');   // lub digi2.tabs.create('widok', {...})\n  taby.open('siatka');\n  taby.getActive();                      // 'siatka'\n\n  digi2.on('tabs:change', function (e) {\n    // { group: 'widok', tab: 'siatka', panel, trigger, initial }\n    // initial: true przy domyślnym otwarciu (d2-tab-default), nie po kliknięciu\n    console.log('Aktywny tab:', e.group, e.tab);\n  });\n});"
    }
  };

  /* ════════════════════════ DROPDOWNS ════════════════════════ */
  M.dropdowns = {
    name: 'Dropdowns — rozwijane menu',
    short: 'Dropdowny',
    cat: 'Komponenty UI',
    flag: 'd2-dropdowns',
    icon: 'dropdown',
    size: '3,3 KB min',
    auto: true,
    tagline: 'Własne otwieranie/zamykanie dropdownów — w tym domykanie po wyborze opcji.',
    desc: 'Przejmuje sterowanie dropdownami (własnymi i natywnymi Webflow): otwieranie klikiem lub hoverem, zamykanie po kliknięciu opcji, poza menu i na Escape. Rozwiązuje klasyczny problem Webflow — menu zostające otwarte po wyborze opcji (np. triggera tabów albo sortowania CMS).',

    structures: [
      { title: 'Dropdown Webflow z opcjami', tree: [
        { l: 'Dropdown (Webflow)', t: 'dropdown', a: [['d2-dropdown']], c: [
          { l: 'Dropdown Toggle', t: 'button', n: 'wykrywany po .w-dropdown-toggle', c: [
            { l: 'Text — etykieta', t: 'text', a: [['d2-tab-label', 'widok']], n: 'opcjonalnie, z modułem tabs' }
          ]},
          { l: 'Dropdown List', t: 'nav', n: 'wykrywany po .w-dropdown-list', c: [
            { l: 'Link — opcja', t: 'link', a: [['d2-tab-trigger', 'widok:lista']], n: 'klik domyka menu' },
            { l: 'Link — opcja', t: 'link', a: [['d2-tab-trigger', 'widok:siatka']] }
          ]}
        ]}
      ]},
      { title: 'Własna struktura (bez klas Webflow)', tree: [
        { l: 'Div — dropdown', t: 'dropdown', a: [['d2-dropdown']], c: [
          { l: 'Button — toggle', t: 'button', a: [['d2-dropdown-toggle']] },
          { l: 'Div — menu', t: 'nav', a: [['d2-dropdown-list']], c: [
            { l: 'Div — opcja', t: 'text', a: [['d2-dropdown-item']], n: 'a/button liczą się same' }
          ]}
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-dropdown', v: '', el: 'wrapper dropdownu', req: true, d: 'Włącza moduł na tym dropdownie (działa też na .w-dropdown).' },
      { a: 'd2-dropdown-toggle', v: '', el: 'Button / Link', d: 'Element otwierający; bez atrybutu moduł szuka .w-dropdown-toggle.' },
      { a: 'd2-dropdown-list', v: '', el: 'Nav / Div (menu)', d: 'Menu opcji; bez atrybutu moduł szuka .w-dropdown-list.' },
      { a: 'd2-dropdown-item', v: '', el: 'element opcji', d: 'Oznacza opcję domykającą menu, gdy nie jest linkiem/przyciskiem.' },
      { a: 'd2-dropdown-hover', v: '', el: 'wrapper', d: 'Otwieranie hoverem zamiast klikiem (honoruje też data-hover="true" Webflow).' },
      { a: 'd2-dropdown-keep-open', v: '', el: 'wrapper', d: 'Nie zamykaj menu po wyborze opcji.' },
      { a: 'd2-dropdown-open', v: '', el: 'wrapper', set: true, d: 'Obecny, gdy menu otwarte (do tego klasy .is-open i .w--open).' }
    ],

    api: {
      desc: 'Zero konfiguracji — API tylko do sterowania programowego.',
      code: "digi2.dropdowns.open('.menu-sort');\ndigi2.dropdowns.close('.menu-sort');\ndigi2.dropdowns.toggle('.menu-sort');\ndigi2.dropdowns.closeAll();"
    }
  };

  /* ════════════════════════ SLIDERS ════════════════════════ */
  M.sliders = {
    name: 'Sliders — karuzele',
    short: 'Slidery',
    cat: 'Komponenty UI',
    flag: 'd2-sliders',
    icon: 'slider',
    size: '14,6 KB min',
    auto: true,
    tagline: 'Karuzela z drag/touch, autoplay, pętlą nieskończoną i zasilaniem z CMS.',
    desc: 'Lekki slider bez zewnętrznych bibliotek: przeciąganie palcem i myszą, autoplay, pętla zwykła lub nieskończona (z klonami), wiele slajdów naraz z odstępem, strzałki, kropki oraz tryb <i>feed</i> — zasilanie slajdów z ukrytej listy CMS (np. galeria zdjęć produktu).',

    kreator: {
      fields: [
        { k: 'name', label: 'Nazwa slidera', type: 'text', def: 'galeria' },
        { k: 'perView', label: 'Slajdów na widoku', type: 'number', def: 1 },
        { k: 'gap', label: 'Odstęp (px)', type: 'number', def: 16 },
        { k: 'mode', label: 'Pętla', type: 'select', def: 'infinite', opts: [['none', 'Brak (zatrzymuje się na końcu)'], ['loop', 'Loop (przewija na start)'], ['infinite', 'Nieskończona (płynna, z klonami)']] },
        { k: 'autoplay', label: 'Autoplay', type: 'check', def: false },
        { k: 'autoMs', label: 'Interwał (ms)', type: 'number', def: 4000, sub: true, showIf: function(s){ return s.autoplay; } },
        { k: 'arrows', label: 'Strzałki', type: 'check', def: true },
        { k: 'dots', label: 'Kropki nawigacji', type: 'check', def: true }
      ],
      build: function(s){
        var a = [['d2-slider', s.name || 'galeria']];
        if (s.perView && s.perView > 1) a.push(['d2-slider-per-view', String(s.perView)]);
        if (s.gap) a.push(['d2-slider-gap', String(s.gap)]);
        if (s.mode === 'loop') a.push(['d2-slider-loop']);
        if (s.mode === 'infinite') a.push(['d2-slider-infinite']);
        if (s.autoplay) a.push(['d2-slider-autoplay', String(s.autoMs || 4000)]);
        var kids = [
          { l: 'Div — track', t: 'div', a: [['d2-slider-track']], c: [
            { l: 'Div — slajd', t: 'image', a: [['d2-slide']] },
            { l: 'Div — slajd', t: 'image', a: [['d2-slide']] },
            { l: 'Div — slajd', t: 'image', a: [['d2-slide']] }
          ]}
        ];
        if (s.arrows){
          kids.push({ l: 'Button — „‹”', t: 'button', a: [['d2-slider-prev']] });
          kids.push({ l: 'Button — „›”', t: 'button', a: [['d2-slider-next']] });
        }
        if (s.dots) kids.push({ l: 'Div — kropki', t: 'div', a: [['d2-slider-dots']], n: 'kropki generują się same' });
        return { tree: [{ l: 'Div Block — slider', t: 'slider', a: a, c: kids }], note: 'Wszystko działa z atrybutów. Aktywny slajd dostaje <code>d2-slide-active</code>, aktywna kropka <code>d2-dot-active</code>.' };
      }
    },

    structures: [
      { title: 'Galeria zasilana z CMS (feed)', desc: 'Ukryta Collection List jest źródłem slajdów — moduł przenosi jej obrazy do slidera przed startem.', tree: [
        { l: 'Collection List — ukryta', t: 'list', a: [['d2-slider-source', 'galeria-m23']], n: 'Display: none; nazwa np. ze sluga CMS', c: [
          { l: 'Collection Item', t: 'item', c: [{ l: 'Image', t: 'image', n: 'pole multi-image' }] }
        ]},
        { l: 'Div — slider', t: 'slider', a: [['d2-slider'], ['d2-slider-infinite'], ['d2-slider-feed', 'galeria-m23']], c: [
          { l: 'Div — track', t: 'div', a: [['d2-slider-track']] },
          { l: 'Button ‹ / ›', t: 'button', a: [['d2-slider-prev']], n: 'oraz d2-slider-next' },
          { l: 'Div — kropki', t: 'div', a: [['d2-slider-dots']] }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-slider', v: 'nazwa', el: 'Div (kontener slidera)', req: true, d: 'Rejestruje slider (nazwa może być pusta — nada się automatyczna).' },
      { a: 'd2-slider-track', v: '', el: 'Div w sliderze', d: 'Kontener slajdów; bez niego trackiem jest sam kontener.' },
      { a: 'd2-slide', v: '', el: 'każdy slajd', req: true, d: 'Pojedynczy slajd.' },
      { a: 'd2-slider-prev', v: '', el: 'Button', d: 'Strzałka wstecz (chowa się, gdy nie ma czego przewijać).' },
      { a: 'd2-slider-next', v: '', el: 'Button', d: 'Strzałka dalej.' },
      { a: 'd2-slider-dots', v: '', el: 'Div', d: 'Kontener kropek — moduł generuje po jednej na slajd.' },
      { a: 'd2-slider-loop', v: '', el: 'kontener', d: 'Po ostatnim slajdzie wraca na początek.' },
      { a: 'd2-slider-infinite', v: '', el: 'kontener', d: 'Pętla nieskończona z klonami — bez efektu „przewijania na start”.' },
      { a: 'd2-slider-autoplay', v: 'ms (puste = 3000)', el: 'kontener', d: 'Automatyczne przewijanie co N milisekund.' },
      { a: 'd2-slider-per-view', v: 'liczba', el: 'kontener', d: 'Ile slajdów widać naraz.', n: 'alias: d2-slider-slides-per-view' },
      { a: 'd2-slider-gap', v: 'px', el: 'kontener', d: 'Odstęp między slajdami.' },
      { a: 'd2-slider-direction', v: 'horizontal | vertical', el: 'kontener', d: 'Kierunek przewijania.' },
      { a: 'd2-slider-draggable', v: 'true | false', el: 'kontener', d: 'Przeciąganie myszą/palcem (domyślnie włączone).' },
      { a: 'd2-slider-speed', v: 'ms', el: 'kontener', d: 'Czas animacji przejścia (domyślnie 400).' },
      { a: 'd2-slider-feed', v: 'nazwa źródła', el: 'kontener', d: 'Zasila slajdy z listy oznaczonej d2-slider-source o tej nazwie.' },
      { a: 'd2-slider-feed-position', v: 'start | end | N | off', el: 'kontener', d: 'Gdzie wstawić blok z feedu: <code>start</code> (domyślnie), <code>end</code>, liczba <code>N</code> (ile statycznych zostaje PRZED blokiem — przy 3 statycznych <code>"1"</code> = 1 z lewej, feed, 2 na końcu) albo <code>off</code>/<code>none</code> = pomiń feed.', n: 'podepnij pole <b>Number</b> lub <b>Option</b> z CMS (Switch NIE binduje się do atrybutu); jedno pole Option {off, start, 1, end} steruje wszystkim' },
      { a: 'd2-slider-feed-position-N', v: 'true | false (Switch z CMS)', el: 'kontener', d: 'Pozycja wybierana <b>polem Switch z CMS</b> — obejście limitu Webflow (nie da się wstrzyknąć liczby, ale można podpiąć true/false). Suffix <code>N</code> to indeks jak w feed-position; feed ląduje na tym <code>N</code>, którego Switch jest włączony. Wygrywa nad zwykłym feed-position; wszystkie false = feed pominięty dla tego itemu.', n: 'remisy: wygrywa najmniejsze N' },
      { a: 'd2-slider-feed-if', v: 'true | false', el: 'kontener', d: 'Warunek feedu — dorzuca zdjęcia z kolekcji tylko, gdy wartość jest prawdziwa. Podepnij pole Switch z CMS, żeby feed działał tylko dla oznaczonych itemów. Brak atrybutu = feed zawsze.', n: 'fałsz: puste / false / 0 / no / off' },
      { a: 'd2-slider-source', v: 'nazwa', el: 'ukryta Collection List', d: 'Źródło obrazów dla d2-slider-feed.' },
      { a: 'd2-slide-active', v: '', el: 'slajd', set: true, d: 'Obecny na widocznych slajdach — hook CSS.' },
      { a: 'd2-dot-active', v: '', el: 'kropka', set: true, d: 'Obecny na aktywnej kropce.' },
      { a: 'd2-dot', v: 'indeks', el: 'kropka', set: true, d: 'Na generowanych kropkach — wartość to numer slajdu.' },
      { a: 'd2-slider-ready', v: '', el: 'kontener', set: true, d: 'Obecny po inicjalizacji slidera — hook CSS.' },
      { a: 'd2-slide-clone', v: '', el: 'slajd', set: true, d: 'Oznacza klony tworzone dla pętli nieskończonej.' },
      { a: 'd2-slider-feed-done', v: '', el: 'kontener', set: true, d: 'Obecny po przeniesieniu slajdów z listy źródłowej (feed).' }
    ],

    api: {
      desc: 'API przydaje się do sterowania i callbacków; atrybuty załatwiają resztę.',
      desc: 'Feed wstrzykuje slajdy <b>przed</b> inicjalizacją slidera, więc <code>digi2.onReady</code> jest za późno (slider już wstał). Do sterowania pozycją z CMS użyj <b>pre-init kolejki</b> <code>window.digi2.sliderFeeds</code> — moduł czyta ją przy feedzie (race-free). <code>digi2.sliders.feed(nazwa, {...})</code> działa tylko dopóki slider nie wstał.',
      code: "<!-- CMS: embed w Collection Item / na szablonie produktu, PRZED loaderem -->\n<script>\n  window.digi2 = window.digi2 || {};\n  (window.digi2.sliderFeeds = window.digi2.sliderFeeds || []).push({\n    name: \"{{wf:Slug|Dynamo}}\",\n    // wiązania CMS w cudzysłowach → brak błędu składni gdy Switch = puste\n    position: (\"{{wf:Penthouse|Dynamo}}\" === \"true\") ? 2\n            : (\"{{wf:Wykonczone|Dynamo}}\" === \"true\") ? \"start\"\n            : \"end\"\n  });\n</script>\n\n<!-- runtime API (tylko zanim slider wstanie) -->\n<script>\n  digi2.sliders.feed('rzuty', { position: 1 });   // 1 statyczny · feed · reszta\n  digi2.sliders.feed('rzuty', { if: false });      // pomiń feed\n</script>"
    }
  };

  /* ════════════════════════ LIGHTBOX ════════════════════════ */
  M.lightbox = {
    name: 'Lightbox — galeria zdjęć',
    short: 'Lightbox',
    cat: 'Komponenty UI',
    flag: 'd2-lightbox',
    icon: 'lightbox',
    size: '17,5 KB min',
    auto: true,
    tagline: 'Klik w zdjęcie otwiera pełnoekranową galerię — własny modal z Webflow albo wbudowany fallback (licznik lub kwadraciki).',
    desc: 'Kliknięcie elementu z <code>d2-lightbox</code> (alias: <code>d2-lightbox-item</code>) otwiera pełnoekranową galerię ze strzałkami, licznikiem, klawiaturą (Esc / strzałki) oraz przeciąganiem lewo-prawo myszką lub palcem. We wbudowanym modalu zdjęcia jadą jak w karuzeli — sąsiednie kadry realnie wsuwają się z boków (track prev · bieżące · next), a strzałki i klawiatura też animują przesunięcie; poniżej progu obraz wraca na miejsce (nie ma już „podmiany jednego zdjęcia"). Przezroczyste PNG (np. rzuty) dostają białe tło, żeby nie znikały na ciemnym modalu — kolor zmienisz przez <code>d2-lightbox-bg</code> (na modalu / triggerze / przodku), <code>"none"</code> wyłącza. Wbudowany modal ma dwa warianty dołu, wybierane wartością flagi przy imporcie modułu — <code>&lt;script d2-lightbox="thumbs"&gt;</code> = klikalne kwadraciki-miniaturki, <code>"counter"</code> / goła flaga = licznik „1 / 4"; pojedynczą galerię nadpisuje <code>d2-lightbox-variant</code> na triggerze lub przodku. Triggery dostają kursor lupy (zoom-in) i pływającą ikonkę lupy po najechaniu (wyłączana przez <code>d2-lightbox-icon="false"</code>), przyciski pointer; ikony wbudowanego modala (✕, strzałki) to precyzyjnie centrowane SVG. Przy jednym zdjęciu znikają strzałki, licznik i kwadraciki, a przeciąganie jest wyłączone. Wygląd budujesz sam w Designerze jako element <code>d2-lightbox-modal</code> ze slotami (obraz, zamknięcie, nawigacja, licznik, podpis) — a jeśli na stronie nie ma własnego modala, moduł wstrzykuje wbudowany ciemny lightbox z ✕ w prawym górnym rogu i wszystko działa bez konfiguracji. Element z samym <code>d2-lightbox-src="URL"</code> / <code>d2-lightbox-image="URL"</code> też jest klikalny i otwiera ten URL. Natywne lightboxy Webflow (<code>.w-lightbox</code>) są automatycznie przejmowane — otwierają się w d2-lightbox z zachowaniem webflowowych grup, więc wszystkie galerie wyglądają tak samo (wideo zostaje natywne; <code>d2-lightbox-skip</code> wyłącza przejęcie na danym linku). Wewnątrz listy CMS każdy <code>d2-cms-item</code> jest osobną galerią (zero konfiguracji), klony sliderów są pomijane, duplikaty URL sklejane.',

    structures: [
      { title: 'Zdjęcia w rozwiniętym itemie CMS', desc: 'Każdy item Collection List to osobna galeria — klik w miniaturę otwiera zdjęcia tylko tego mieszkania. Pełnowymiarowy plik wskazujesz przez d2-lightbox-src (bind z CMS) albo ukrytego bliźniaka img z d2-lightbox-full.', tree: [
        { l: 'Collection Item', t: 'div', a: [['d2-cms-item']], c: [
          { l: 'Image — miniatura', t: 'img', a: [['d2-lightbox']], n: 'klikalna; src = pełny rozmiar' },
          { l: 'Div — wrapper z bliźniakiem', t: 'div', a: [['d2-lightbox']], c: [
            { l: 'Image — miniatura', t: 'img' },
            { l: 'Image — pełny rozmiar (ukryty)', t: 'img', a: [['d2-lightbox-full']], n: 'display:none — jego src trafia do galerii' }
          ]}
        ]}
      ]},
      { title: 'Własny modal w Designerze', desc: 'Zostaw go widocznego w Designerze — moduł chowa go przy starcie. Wartość d2-lightbox-modal = display po otwarciu (domyślnie flex).', tree: [
        { l: 'Div — modal (fixed, full-screen)', t: 'div', a: [['d2-lightbox-modal', 'flex']], c: [
          { l: 'Div — tło (klik zamyka)', t: 'div', a: [['d2-lightbox-backdrop']] },
          { l: 'Image — aktualne zdjęcie', t: 'img', a: [['d2-lightbox-image']], n: 'wymagany slot' },
          { l: 'Link — zamknij', t: 'link', a: [['d2-lightbox-close']] },
          { l: 'Link — poprzednie', t: 'link', a: [['d2-lightbox-prev']], n: 'auto-ukryty przy 1 zdjęciu' },
          { l: 'Link — następne', t: 'link', a: [['d2-lightbox-next']] },
          { l: 'Text — licznik', t: 'text', a: [['d2-lightbox-counter', '{current} z {total}']] },
          { l: 'Text — podpis', t: 'text', a: [['d2-lightbox-caption']], n: 'ukrywany, gdy pusty' }
        ]}
      ]},
      { title: 'Nazwane galerie', desc: 'Triggery z tą samą nazwą tworzą jedną galerię niezależnie od położenia w DOM.', tree: [
        { l: 'Image — rzut 2D', t: 'img', a: [['d2-lightbox', 'rzuty']] },
        { l: 'Image — rzut 3D', t: 'img', a: [['d2-lightbox', 'rzuty']] }
      ]},
      { title: 'Wariant z kwadracikami (wbudowany modal)', desc: 'd2-lightbox-variant="thumbs" na itemie/sekcji — na dole modala pojawiają się klikalne miniaturki zamiast licznika.', tree: [
        { l: 'Collection Item', t: 'div', a: [['d2-cms-item'], ['d2-lightbox-variant', 'thumbs']], c: [
          { l: 'Image — zdjęcie 1', t: 'img', a: [['d2-lightbox']] },
          { l: 'Image — zdjęcie 2', t: 'img', a: [['d2-lightbox']] }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-lightbox', v: '(puste) lub nazwa galerii', el: 'Image / wrapper', req: true, d: 'Klikalny trigger galerii. Bez wartości grupuje się po kontenerze (<code>d2-lightbox-group</code> → <code>d2-cms-item</code> → cała strona); z wartością — po nazwie.' },
      { a: 'd2-lightbox-item', v: '(puste) lub nazwa galerii', el: 'Image / wrapper', d: 'Alias <code>d2-lightbox</code> — te same zasady; element będący zdjęciem otwiera swój <code>src</code>.' },
      { a: 'd2-lightbox-src', v: 'URL', el: 'trigger / dowolny element', d: 'Pełnowymiarowy plik do pokazania (bindowalny z pola CMS) — ma pierwszeństwo. Działa też SAMODZIELNIE: element z samym tym atrybutem jest klikalny i otwiera ten URL (<code>d2-lightbox-image="URL"</code> poza modalem działa tak samo).' },
      { a: 'd2-lightbox-full', v: '—', el: 'img w triggerze', d: 'Ukryty bliźniak pełnowymiarowy — jego <code>src</code> trafia do galerii zamiast miniatury.' },
      { a: 'd2-lightbox-caption', v: 'tekst', el: 'trigger', d: 'Podpis zdjęcia (fallback: <code>alt</code> obrazka).' },
      { a: 'd2-lightbox-group', v: '—', el: 'kontener', d: 'Zawęża galerię do triggerów wewnątrz tego elementu.' },
      { a: 'd2-lightbox-modal', v: 'flex | grid | block', el: 'modal (własny)', d: 'Własny modal budowany w Designerze; wartość = display po otwarciu (domyślnie flex). Moduł chowa go przy starcie strony.' },
      { a: 'd2-lightbox-image', v: '—', el: 'img w modalu', req: true, d: 'Slot na aktualne zdjęcie (moduł ustawia src + alt, zdejmuje srcset).' },
      { a: 'd2-lightbox-close', v: '—', el: 'w modalu', d: 'Klik zamyka. Klik w tło (<code>d2-lightbox-backdrop</code> lub sam root modala) też zamyka; Esc również.' },
      { a: 'd2-lightbox-prev / -next', v: '—', el: 'w modalu', d: 'Nawigacja; auto-ukrywane przy galerii z 1 zdjęciem. Działają też strzałki klawiatury i przeciąganie myszką / palcem.' },
      { a: 'd2-lightbox-counter', v: 'szablon', el: 'w modalu', d: 'Tekst licznika; szablon z tokenami, np. <code>{current} z {total}</code> (domyślnie <code>{current} / {total}</code>).' },
      { a: 'd2-lightbox-current / -total', v: '—', el: 'w modalu', d: 'Osobne sloty na numer bieżący / liczbę zdjęć.' },
      { a: 'd2-lightbox-backdrop', v: '—', el: 'w modalu', d: 'Jawny obszar tła — klik zamyka galerię.' },
      { a: 'd2-lightbox-loop', v: 'false', el: 'modal', d: 'Wyłącza zapętlenie — nawigacja zatrzymuje się na końcach.' },
      { a: 'd2-lightbox-bg', v: 'kolor CSS | none', el: 'modal / trigger / przodek', d: 'Tło malowane pod zdjęciem (wypełnia przezroczyste PNG, np. rzuty). Domyślnie białe; <code>none</code> = przezroczyste. Czytane z najbliższego przodka triggera lub z modala.' },
      { a: 'd2-lightbox-skip', v: '—', el: 'link .w-lightbox', d: 'Zostawia ten natywny lightbox Webflowowi (bez przejęcia przez moduł).' },
      { a: 'd2-lightbox="thumbs|counter"', v: 'na tagu loadera / <digi2-module>', el: 'import modułu', d: 'Domyślny dół wbudowanego modala dla całej strony: <code>thumbs</code> = klikalne kwadraciki-miniaturki (klik przewija do zdjęcia), <code>counter</code> / goła flaga = licznik „1 / 4". Miniaturki używają małych wariantów obrazków, które triggery już wyświetlają.' },
      { a: 'd2-lightbox-variant', v: 'thumbs | counter', el: 'trigger lub przodek (item CMS, sekcja, body)', d: 'Nadpisuje domyślny wariant strony dla pojedynczej galerii.', n: 'pasek miniaturek to jedna przewijana linia — nie zawija się do kolejnych rzędów, ma własne strzałki po bokach (widoczne tylko gdy jest co przewijać) i jedzie za galerią: zmiana zdjęcia przewija pasek do aktywnej miniaturki' },
      { a: 'd2-lightbox-icon', v: 'false', el: 'trigger lub przodek', d: 'Wyłącza pływającą ikonkę lupy pokazywaną po najechaniu na trigger.' },
      { a: 'd2-lightbox-thumbs', v: '—', el: 'kontener we własnym modalu', d: 'Moduł wypełnia go klikalnymi miniaturkami <code>&lt;img d2-lightbox-thumb="i"&gt;</code>; aktywna dostaje <code>d2-is-active</code> — obie stylujesz w CSS.' }
    ],

    api: {
      desc: 'Eventy: <code>lightbox:open</code>, <code>lightbox:change</code>, <code>lightbox:close</code> (przez <code>digi2.on</code>). Na czas otwarcia galeria trzyma wspólną blokadę scrolla (<code>digi2.scrollLock</code>, tę samą co popupy), więc ona i popup otwarty nad nią zamykają się w dowolnej kolejności. Popupy automatyczne czekają, aż galeria się zamknie. Sąsiednie zdjęcia są preloadowane.',
      code: "digi2.lightbox.open(el);            // otwórz od triggera (jak klik)\ndigi2.lightbox.open('rzuty', 1);    // nazwana galeria, od 2. zdjęcia\ndigi2.lightbox.open([\n  { src: '/a.jpg', caption: 'Taras' },\n  { src: '/b.jpg' }\n]);\ndigi2.lightbox.next();  digi2.lightbox.prev();\ndigi2.lightbox.close();\ndigi2.lightbox.isOpen();            // true / false\n\ndigi2.on('lightbox:change', function (d) {\n  console.log(d.index + 1, '/', d.total, d.src);\n});"
    }
  };

  /* ════════════════════════ INTERACTIONS ════════════════════════ */
  M.interactions = {
    name: 'Interactions — pokaż / ukryj',
    short: 'Interakcje',
    cat: 'Komponenty UI',
    flag: 'd2-interactions',
    icon: 'interactions',
    size: '14,6 KB min',
    auto: true,
    tagline: 'Deklaratywne tooltipów, megamenu i modale: hover/klik → pokaż element z animacją.',
    desc: 'Uniwersalny system „trigger pokazuje target”: tooltipy, megamenu, panele i modale bez Webflow Interactions. Trigger (hover, klik, focus) wskazuje element po jego <code>d2-instance</code>, do tego animacje z kierunkiem i dystansem, grupy wzajemnie wykluczające się, opóźnienia, zamykanie poza elementem / Escape oraz przyciemniane tło (backdrop) z blurem.',

    structures: [
      { title: 'Tooltip na hover', tree: [
        { l: 'Button — trigger', t: 'button', a: [['d2-instance', 'dock:btn:home'], ['d2-interaction-trigger', 'hover'], ['d2-interaction-target', 'dock:tip:home']] },
        { l: 'Div — tooltip', t: 'div', a: [['d2-instance', 'dock:tip:home'], ['d2-animation', 'slide'], ['d2-animation-direction', 'up'], ['d2-interaction-group', 'tooltips']], n: 'grupa: otwarcie jednego chowa inne' }
      ]},
      { title: 'Panel na klik + backdrop', tree: [
        { l: 'Button — otwórz', t: 'button', a: [['d2-interaction-toggle', 'panel:filtry']] },
        { l: 'Div — panel', t: 'div', a: [['d2-instance', 'panel:filtry'], ['d2-animation', 'zoom'], ['d2-interaction-outside-close'], ['d2-interaction-escape-close'], ['d2-interaction-backdrop', 'on'], ['d2-interaction-backdrop-blur', '8px']], c: [
          { l: 'Button — zamknij', t: 'button', a: [['d2-interaction-close']], n: 'puste = zamyka najbliższy target' }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-instance', v: 'unikalny-id', el: 'target (i/lub trigger)', req: true, d: 'Identyfikator elementu — na niego wskazują triggery.' },
      { a: 'd2-interaction-trigger', v: 'hover | click | focus | mouseenter | mouseleave | manual', el: 'trigger', req: true, d: 'Co uruchamia pokazanie targetu.' },
      { a: 'd2-interaction-target', v: 'id instancji', el: 'trigger', req: true, d: 'Który element pokazać/ukryć.' },
      { a: 'd2-interaction-toggle', v: 'id (opc.)', el: 'Button', d: 'Skrót: klik przełącza target (puste = najbliższy przodek z d2-instance).' },
      { a: 'd2-interaction-close', v: 'id (opc.)', el: 'Button w targecie', d: 'Klik zamyka target.' },
      { a: 'd2-animation', v: 'fade | slide | zoom | flip | none', el: 'target lub trigger', d: 'Typ animacji (target ma pierwszeństwo).' },
      { a: 'd2-animation-direction', v: 'up | down | left | right', el: 'target lub trigger', d: 'Kierunek slide/flip; responsywnie: <code>left;up@911</code>.' },
      { a: 'd2-animation-duration', v: 'sekundy', el: 'target lub trigger', d: 'Czas animacji (domyślnie 0.3).' },
      { a: 'd2-animation-distance', v: 'np. 12px', el: 'target lub trigger', d: 'Dystans przesunięcia dla slide; responsywny.' },
      { a: 'd2-animation-easing', v: 'CSS easing', el: 'target lub trigger', d: 'Funkcja przejścia.' },
      { a: 'd2-interaction-group', v: 'nazwa', el: 'target', d: 'Elementy w grupie wykluczają się — otwarcie jednego chowa resztę.' },
      { a: 'd2-interaction-delay', v: 'ms', el: 'trigger', d: 'Opóźnienie przed pokazaniem.' },
      { a: 'd2-interaction-leave-delay', v: 'ms', el: 'trigger', d: 'Opóźnienie przed schowaniem (hover; domyślnie 80).' },
      { a: 'd2-interaction-initial', v: 'hidden | visible', el: 'target', d: 'Stan startowy (domyślnie ukryty).' },
      { a: 'd2-interaction-outside-close', v: '', el: 'trigger lub target', d: 'Klik poza elementem zamyka.' },
      { a: 'd2-interaction-escape-close', v: '', el: 'trigger lub target', d: 'Escape zamyka.' },
      { a: 'd2-interaction-backdrop', v: 'on | off (responsywnie)', el: 'target lub trigger', d: 'Przyciemnione tło pod elementem.' },
      { a: 'd2-interaction-backdrop-blur', v: 'np. 8px', el: 'target lub trigger', d: 'Rozmycie tła.' },
      { a: 'd2-interaction-backdrop-color', v: 'kolor CSS', el: 'target lub trigger', d: 'Kolor przyciemnienia (domyślnie rgba(0,0,0,.3)).' },
      { a: 'data-d2-backdrop', v: '', el: 'element tła', set: true, d: 'Marker automatycznie tworzonego backdropu — hook CSS.' },
      { a: 'data-d2-visible', v: 'true | false', el: 'target', set: true, d: 'Stan widoczności — hook do CSS.' },
      { a: 'd2-active', v: '', el: 'trigger', set: true, d: 'Obecny, gdy target widoczny.' }
    ],

    api: {
      desc: 'Wersja programowa — te same opcje co atrybuty.',
      code: "digi2.onReady(function () {\n  digi2.interactions.create('megamenu', {\n    trigger: '.nav-link-oferta',\n    target: '#megamenu',\n    on: 'hover',\n    animation: 'slide',\n    direction: 'down',\n    leaveDelay: 120,\n    group: 'menu'\n  });\n\n  digi2.interactions.show('megamenu');\n  digi2.interactions.hide('megamenu');\n  digi2.interactions.refresh(); // po dorenderowaniu DOM\n});"
    }
  };

  /* ════════════════════════ FLOATING DOCK ════════════════════════ */
  M.floatingdock = {
    name: 'Floating Dock — pływający dock',
    short: 'Floating dock',
    cat: 'Komponenty UI',
    flag: 'd2-floating-dock',
    icon: 'dock',
    size: '3,9 KB min',
    auto: true,
    tagline: 'Pływający pasek z przyciskami, które wysuwają panele — klik otwiera kartę, klik obok / Esc zamyka.',
    desc: 'Pływający dock: pasek z przyciskami, gdzie każdy przycisk wysuwa przypisaną kartę (panel z treścią, np. kontakt, telefon, mapa). Kliknięcie przycisku otwiera panel o tym samym indeksie, klik poza dockiem lub Esc zamyka, przycisk zamykający w karcie też. To jedyny moduł sterowany <b>klasami CSS</b> (a nie atrybutami <code>d2-*</code>) — dopasowany do konkretnego komponentu Webflow: przyciski i karty rozpoznaje po klasach <code>floating_dock_*</code>, parując je kolejnością. Auto-inicjalizuje każdy <code>.floating_dock</code> na stronie.',
    installNote: 'Moduł nie używa atrybutów <code>d2-*</code> — działa na <b>klasach</b> komponentu (<code>.floating_dock</code>, <code>.floating_dock_btn</code>, <code>.floating_dock_card</code>). Przyciski i karty łączy po <b>kolejności</b>: 1. przycisk → 1. karta, 2. → 2. itd. — musi ich być tyle samo.',

    structures: [
      { title: 'Dock z trzema panelami', desc: 'Struktura klasowa: kontener .floating_dock, w nim rząd przycisków i tyle samo kart. Moduł chowa karty na starcie (wstrzykuje CSS) i wysuwa właściwą po kliknięciu przycisku o tym samym indeksie.', tree: [
        { l: 'Div — .floating_dock', t: 'dock', n: 'Position: Fixed; klasa floating_dock', c: [
          { l: 'Div — rząd przycisków', t: 'div', c: [
            { l: 'Button — .floating_dock_btn', t: 'button', n: 'otwiera kartę 1' },
            { l: 'Button — .floating_dock_btn', t: 'button', n: 'otwiera kartę 2' },
            { l: 'Button — .floating_dock_btn', t: 'button', n: 'otwiera kartę 3' }
          ]},
          { l: 'Div — .floating_dock_card', t: 'div', n: 'karta 1 (np. telefon)', c: [
            { l: 'Treść karty', t: 'text' },
            { l: 'Button — .floating_dock_card_close_btn', t: 'button', n: 'zamyka kartę' }
          ]},
          { l: 'Div — .floating_dock_card', t: 'div', n: 'karta 2 (np. e-mail)' },
          { l: 'Div — .floating_dock_card', t: 'div', n: 'karta 3 (np. formularz)' }
        ]}
      ]}
    ],

    attrs: [
      { a: '.floating_dock', v: '', el: 'kontener docka (klasa, Fixed)', req: true, d: 'Root docka — moduł skanuje każdy taki element na stronie i inicjalizuje osobno.' },
      { a: '.floating_dock_btn', v: '', el: 'Button / Link (klasa)', req: true, d: 'Przycisk otwierający — klik toggluje kartę o tym samym indeksie. Aktywny dostaje klasę <code>is-active</code>.' },
      { a: '.floating_dock_card', v: '', el: 'Div / panel (klasa)', req: true, d: 'Karta z treścią — ukryta na starcie, wysuwana po kliknięciu przypisanego przycisku. Musi być tyle kart, ile przycisków.' },
      { a: '.floating_dock_card_close_btn', v: '', el: 'Button w karcie (klasa)', d: 'Klik zamyka bieżącą kartę (bez przełączania na inną).' },
      { a: 'data-d2-visible', v: 'true | false', el: 'karta', set: true, d: 'Stan widoczności karty ustawiany przez moduł — hook do animacji i CSS (<code>[data-d2-visible="false"]{opacity:0;visibility:hidden}</code>).' },
      { a: 'd2-floating-dock-preload', v: '', el: '<style> w <head>', set: true, d: 'Znacznik stylu wstrzykiwanego przez moduł, który chowa karty zanim JS się uruchomi (bez mignięcia).' }
    ],

    api: {
      desc: 'Auto-init na starcie wystarcza; API do sterowania programowego i własnych opcji. Namespace: <code>digi2.floatingDock</code>.',
      code: "digi2.onReady(function () {\n  // globalne opcje dla wszystkich docków\n  digi2.floatingDock.init({\n    duration: 0.35,                              // czas animacji (s)\n    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',     // krzywa (sprężysta)\n    distance: '60px',                            // dystans wysuwania karty\n    activeClass: 'is-active',                    // klasa aktywnego przycisku\n    closeOnOutside: true,                        // klik poza dockiem zamyka\n    closeOnEscape: true                          // Esc zamyka\n  });\n\n  // sterowanie konkretnym dockiem\n  var dock = digi2.floatingDock.get(document.querySelector('.floating_dock'));\n  dock.open(0);      // otwórz 1. kartę\n  dock.toggle(1);    // przełącz 2. kartę\n  dock.close();      // zamknij otwartą\n  dock.isOpen();     // true / false\n\n  digi2.floatingDock.list();   // wszystkie instancje\n});"
    }
  };

  /* ════════════════════════ ANIMATE ════════════════════════ */
  M.animate = {
    name: 'Animate — animacje scroll',
    short: 'Animacje scroll',
    cat: 'Efekty',
    flag: 'd2-animate',
    icon: 'animate',
    size: '5,3 KB min',
    auto: true,
    tagline: '22 presety animacji wejścia przy scrollu + stagger dla list.',
    desc: 'Animacje pojawiania się elementów przy scrollu na IntersectionObserver: 22 presety (fade, slide, zoom, flip, blur, bounce…), opóźnienie, czas trwania i stagger dla dzieci kontenera (np. kart w gridzie). Szanuje prefers-reduced-motion.',

    kreator: {
      fields: [
        { k: 'preset', label: 'Preset animacji', type: 'select', def: 'fade-up', opts: [['fade','fade'],['fade-up','fade-up'],['fade-down','fade-down'],['fade-left','fade-left'],['fade-right','fade-right'],['zoom','zoom'],['zoom-in','zoom-in'],['slide-up','slide-up'],['slide-down','slide-down'],['slide-left','slide-left'],['slide-right','slide-right'],['flip','flip'],['flip-y','flip-y'],['rotate','rotate'],['blur','blur'],['zoom-blur','zoom-blur'],['bounce','bounce'],['elastic','elastic'],['drop','drop'],['swing','swing'],['unfold','unfold'],['reveal','reveal']] },
        { k: 'delay', label: 'Opóźnienie (ms)', type: 'number', def: 0 },
        { k: 'dur', label: 'Czas trwania (s)', type: 'number', def: 0.5 },
        { k: 'stagger', label: 'Stagger dla listy dzieci', type: 'check', def: true },
        { k: 'staggerMs', label: 'Krok staggera (ms)', type: 'number', def: 100, sub: true, showIf: function(s){ return s.stagger; } }
      ],
      build: function(s){
        var a = [['d2-animate', s.preset]];
        if (s.delay) a.push(['d2-delay', String(s.delay)]);
        if (s.dur && s.dur !== 0.5) a.push(['d2-duration', String(s.dur)]);
        var tree;
        if (s.stagger){
          tree = [{ l: 'Div — grid / lista', t: 'div', a: [['d2-stagger', String(s.staggerMs || 100)]], c: [
            { l: 'Div — karta 1', t: 'item', a: a },
            { l: 'Div — karta 2', t: 'item', a: a, n: '+' + (s.staggerMs || 100) + ' ms' },
            { l: 'Div — karta 3', t: 'item', a: a, n: '+' + 2 * (s.staggerMs || 100) + ' ms' }
          ]}];
        } else {
          tree = [{ l: 'Heading / Div — dowolny element', t: 'heading', a: a }];
        }
        return { tree: tree, note: 'Po nowym renderze CMS wywołaj <code>digi2.animate.refresh()</code>, żeby objąć świeże elementy.' };
      }
    },

    structures: [
      { title: 'Hero ze staggerem', tree: [
        { l: 'Section — hero', t: 'section', c: [
          { l: 'Div — treść', t: 'div', a: [['d2-stagger', '150']], c: [
            { l: 'Heading', t: 'heading', a: [['d2-animate', 'fade-up']] },
            { l: 'Paragraph', t: 'text', a: [['d2-animate', 'fade-up']] },
            { l: 'Button', t: 'button', a: [['d2-animate', 'fade-up'], ['d2-duration', '0.6']] }
          ]}
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-animate', v: 'preset', el: 'dowolny element', req: true, d: 'Animacja przy wejściu w viewport. Presety: fade, fade-up/down/left/right, zoom, zoom-in, slide-up/down/left/right, flip, flip-y, rotate, blur, zoom-blur, bounce, elastic, drop, swing, unfold, reveal.' },
      { a: 'd2-delay', v: 'ms', el: 'element z d2-animate', d: 'Opóźnienie startu; responsywnie: <code>0;200@912</code>.' },
      { a: 'd2-duration', v: 'sekundy', el: 'element z d2-animate', d: 'Czas trwania (domyślnie 0.5).' },
      { a: 'd2-stagger', v: 'ms', el: 'rodzic listy', d: 'Każde kolejne dziecko z d2-animate startuje o tyle później.' },
      { a: 'd2-animated', v: '', el: 'element', set: true, d: 'Obecny po odegraniu animacji.' }
    ],

    api: {
      code: "digi2.onReady(function () {\n  digi2.animate.refresh();      // ponowny skan (po doładowaniu CMS)\n  digi2.animate.trigger(el);    // ręczne odpalenie\n  digi2.animate.init({ once: true, threshold: 0.15 });\n});"
    }
  };

  /* ════════════════════════ SCROLL ════════════════════════ */
  M.scroll = {
    name: 'Scroll — płynne przewijanie',
    short: 'Smooth scroll',
    cat: 'Efekty',
    flag: 'd2-scroll',
    icon: 'scroll',
    size: '2,5 KB min',
    auto: true,
    tagline: 'Płynny scroll do sekcji, scroll-spy w nawigacji i przycisk „do góry”.',
    desc: 'Linki płynnie przewijają do sekcji (z offsetem na sticky header), aktywny link w nawigacji dostaje klasę (scroll-spy), a przycisk „do góry” pojawia się po zjechaniu w dół.',

    structures: [
      { title: 'Nawigacja + sekcje', tree: [
        { l: 'Navbar', t: 'nav', c: [
          { l: 'Link — „O inwestycji”', t: 'link', a: [['d2-scroll', '#o-inwestycji']] },
          { l: 'Link — „Mieszkania”', t: 'link', a: [['d2-scroll', '#mieszkania']] }
        ]},
        { l: 'Section', t: 'section', n: 'ID: o-inwestycji' },
        { l: 'Section', t: 'section', n: 'ID: mieszkania' },
        { l: 'Button — „↑”', t: 'button', a: [['d2-scroll-top']], n: 'pojawia się po 300 px' }
      ]}
    ],

    attrs: [
      { a: 'd2-scroll', v: '#selektor', el: 'Link', req: true, d: 'Klik płynnie przewija do elementu o tym ID; aktywna sekcja podświetla link klasą <code>d2-scroll-active</code>.' },
      { a: 'd2-scroll-top', v: '', el: 'Button', d: 'Przycisk powrotu na górę; widoczność steruje klasą <code>d2-scroll-top-visible</code>.' }
    ],

    api: {
      code: "digi2.onReady(function () {\n  digi2.scroll.init({\n    offset: 80,            // wysokość sticky headera\n    speed: 800,\n    activeClass: 'd2-scroll-active',\n    onChange: function (id) { console.log('Sekcja:', id); }\n  });\n  digi2.scroll.to('#cennik');\n});"
    }
  };

  /* ════════════════════════ LAZY ════════════════════════ */
  M.lazy = {
    name: 'Lazy — leniwe ładowanie',
    short: 'Lazy loading',
    cat: 'Efekty',
    flag: 'd2-lazy',
    icon: 'lazy',
    size: '2,5 KB min',
    auto: true,
    tagline: 'Obrazy, wideo, iframy i tła ładowane dopiero przed wejściem w viewport.',
    desc: 'Lazy loading z efektem blur-up (rozmyta miniatura wyostrza się po załadowaniu) i fade-in. Obsługuje <code>img</code> (z srcset), <code>video</code>, <code>iframe</code> oraz obrazy tła. Ładowanie startuje 200 px przed pojawieniem się elementu.',

    structures: [
      { title: 'Obraz, tło i iframe', tree: [
        { l: 'Image', t: 'image', a: [['d2-lazy', 'https://…/foto.jpg'], ['d2-lazy-srcset', 'foto-480.jpg 480w, foto-1200.jpg 1200w']], n: 'w src zostaw miniaturkę' },
        { l: 'Div — tło hero', t: 'div', a: [['d2-lazy-bg', 'https://…/hero.jpg']] },
        { l: 'Video / Embed YouTube', t: 'video', a: [['d2-lazy', 'https://youtube.com/embed/…']] }
      ]}
    ],

    attrs: [
      { a: 'd2-lazy', v: 'URL', el: 'Image / Video / Iframe', req: true, d: 'Docelowy adres zasobu — ładowany przed wejściem w viewport.' },
      { a: 'd2-lazy-srcset', v: 'srcset', el: 'Image', d: 'Responsywny srcset ładowany razem z src.' },
      { a: 'd2-lazy-bg', v: 'URL', el: 'dowolny blok', d: 'Leniwe tło (background-image).' },
      { a: 'd2-lazy-loaded', v: '', el: 'element', set: true, d: 'Klasa po załadowaniu — hook do zdjęcia blura.' },
      { a: 'd2-lazy-error', v: '', el: 'element', set: true, d: 'Klasa przy błędzie ładowania.' }
    ],

    api: {
      code: "digi2.onReady(function () {\n  digi2.lazy.init({ blur: true, blurAmount: 15, fadeDuration: 0.4 });\n  digi2.lazy.refresh();   // po doładowaniu CMS\n});"
    }
  };

  /* ════════════════════════ FORMAT ════════════════════════ */
  M.format = {
    name: 'Format — liczby i ceny',
    short: 'Format liczb',
    cat: 'Narzędzia',
    flag: 'd2-format',
    icon: 'format',
    size: '3,2 KB min',
    auto: true,
    tagline: 'Surowe liczby z CMS → 199 999,00 zł/m² z niełamliwymi spacjami.',
    desc: 'Formatuje liczby wyciągane z CMS: separatory tysięcy wg locale (domyślnie pl-PL), miejsca dziesiętne, waluta lub jednostka z gwarantowaną spacją (Webflow lubi ją przycinać). Domyślnie używa spacji niełamliwych, żeby cena nigdy nie łamała się w pół.',

    kreator: {
      fields: [
        { k: 'currency', label: 'Waluta', type: 'select', def: 'PLN', opts: [['', 'Brak'], ['PLN', 'PLN'], ['EUR', 'EUR'], ['USD', 'USD']] },
        { k: 'decimals', label: 'Miejsca dziesiętne', type: 'number', def: 0 },
        { k: 'unit', label: 'Jednostka (zamiast waluty)', type: 'text', def: '', ph: 'np. zł/m²' },
        { k: 'brk', label: 'Pozwól łamać liczbę (zwykłe spacje)', type: 'check', def: false }
      ],
      build: function(s){
        var a = [['d2-format-price']];
        if (s.unit) a.push(['d2-format-unit', s.unit]);
        else if (s.currency) a.push(['d2-format-currency', s.currency]);
        if (s.decimals) a.push(['d2-format-decimals', String(s.decimals)]);
        if (s.brk) a.push(['d2-format-break']);
        var d = Math.max(0, Math.min(6, +s.decimals || 0));
        var sample = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(199999);
        var suffix = s.unit ? ' ' + s.unit : (s.currency ? ' ' + s.currency : '');
        return {
          tree: [{ l: 'Collection Item', t: 'item', c: [
            { l: 'Text — cena z CMS', t: 'text', a: a, n: 'w środku surowa liczba, np. 199999' }
          ]}],
          note: 'Podgląd: <b>199999</b> → <b>' + sample + suffix + '</b>'
        };
      }
    },

    structures: [
      { title: 'Cena i cena za m²', tree: [
        { l: 'Text — cena', t: 'text', a: [['d2-format-price'], ['d2-format-currency', 'PLN']], n: '399000 → 399 000 PLN' },
        { l: 'Text — cena za m²', t: 'text', a: [['d2-format-price'], ['d2-format-unit', 'zł/m²'], ['d2-format-decimals', '2']], n: '20500 → 20 500,00 zł/m²' }
      ]}
    ],

    attrs: [
      { a: 'd2-format-price', v: '(opc. waluta)', el: 'Text z liczbą', req: true, d: 'Formatuje zawartość jako cenę; wartość atrybutu może być walutą.', n: 'alternatywy: d2-format-number, klasa .format-price' },
      { a: 'd2-format-currency', v: 'PLN | EUR | …', el: 'ten element', d: 'Waluta doklejana po liczbie.' },
      { a: 'd2-format-decimals', v: 'liczba', el: 'ten element', d: 'Miejsca dziesiętne (domyślnie 0).' },
      { a: 'd2-format-locale', v: 'np. pl-PL', el: 'ten element', d: 'Locale separatorów (domyślnie pl-PL).' },
      { a: 'd2-format-unit', v: 'np. zł/m²', el: 'ten element', d: 'Jednostka z wymuszoną spacją przed nią.' },
      { a: 'd2-format-prefix', v: 'tekst', el: 'ten element', d: 'Tekst przed liczbą.' },
      { a: 'd2-format-suffix', v: 'tekst', el: 'ten element', d: 'Tekst po liczbie.', n: 'gdy Webflow utnie spację — dodaj d2-format-space' },
      { a: 'd2-format-space', v: '', el: 'ten element', d: 'Wymusza spację przed sufiksem.' },
      { a: 'd2-format-break', v: '', el: 'ten element', d: 'Zwykłe spacje zamiast niełamliwych (liczba może się zawinąć).' },
      { a: 'd2-format-sum-1 … -9', v: 'liczba (bind z CMS)', el: 'Text', d: 'Tekst elementu = suma wartości wszystkich atrybutów d2-format-sum-* (np. metraż tarasu + balkonu). Puste/nienumeryczne części są pomijane; gdy żadna nie jest liczbą, zostaje tekst wpisany w Designerze.', n: 'miejsca dziesiętne z najdokładniejszej części — nadpisz przez <code>d2-format-decimals</code>; łączy się z <code>d2-format-unit</code>/<code>-price</code>' }
    ],

    api: {
      code: "digi2.format.price(199999);                          // \"199 999\"\ndigi2.format.price(199999, { currency: 'PLN' });     // \"199 999 PLN\"\ndigi2.format.price(20500, { unit: 'zł/m²', decimals: 2 });\ndigi2.format.number(12345.6, { decimals: 2 });\ndigi2.format.refresh();       // przeformatuj po doładowaniu CMS"
    }
  };

  /* ════════════════════════ COUNTDOWN ════════════════════════ */
  M.countdown = {
    name: 'Countdown — odliczanie',
    short: 'Countdown',
    cat: 'Narzędzia',
    flag: 'd2-countdown',
    icon: 'countdown',
    size: '3,5 KB min',
    auto: false,
    tagline: 'Licznik do daty: dni / godziny / minuty / sekundy + akcja po zakończeniu.',
    desc: 'Odlicza do wskazanej daty i co sekundę aktualizuje elementy dni/godzin/minut/sekund. Po zakończeniu: zatrzymuje się, może podmienić treść na własny tekst i odpala callback (np. pokazanie popupu z nową ofertą).',

    kreator: {
      hasJs: true,
      fields: [
        { k: 'date', label: 'Data końca', type: 'datetime', def: '2026-12-31T23:59' },
        { k: 'days', label: 'Pokazuj dni', type: 'check', def: true },
        { k: 'hours', label: 'Pokazuj godziny', type: 'check', def: true },
        { k: 'mins', label: 'Pokazuj minuty', type: 'check', def: true },
        { k: 'secs', label: 'Pokazuj sekundy', type: 'check', def: true },
        { k: 'expired', label: 'Tekst po zakończeniu', type: 'text', def: 'Oferta zakończona' }
      ],
      build: function(s){
        var kids = [];
        if (s.days) kids.push({ l: 'Span — dni', t: 'text', a: [['d2-countdown-days']] });
        if (s.hours) kids.push({ l: 'Span — godziny', t: 'text', a: [['d2-countdown-hours']] });
        if (s.mins) kids.push({ l: 'Span — minuty', t: 'text', a: [['d2-countdown-minutes']] });
        if (s.secs) kids.push({ l: 'Span — sekundy', t: 'text', a: [['d2-countdown-seconds']] });
        var js = "digi2.onReady(function () {\n  digi2.countdown.create('promo', {\n    padZeros: true" + (s.expired ? ",\n    expiredText: '" + s.expired.replace(/'/g, "\\'") + "'" : "") + ",\n    onComplete: function () { /* np. digi2.popups... */ }\n  });\n});";
        return {
          tree: [{ l: 'Div — licznik', t: 'countdown', a: [['d2-countdown', (s.date || '2026-12-31T23:59') + ':00']], c: kids }],
          js: js
        };
      }
    },

    structures: [
      { title: 'Licznik promocji', tree: [
        { l: 'Div — licznik', t: 'countdown', a: [['d2-countdown', '2026-12-31T23:59:59']], c: [
          { l: 'Span', t: 'text', a: [['d2-countdown-days']], n: '+ tekst „dni”' },
          { l: 'Span', t: 'text', a: [['d2-countdown-hours']] },
          { l: 'Span', t: 'text', a: [['d2-countdown-minutes']] },
          { l: 'Span', t: 'text', a: [['d2-countdown-seconds']] }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-countdown', v: 'data ISO', el: 'Div (kontener)', req: true, d: 'Data docelowa, np. <code>2026-12-31T23:59:59</code>.' },
      { a: 'd2-countdown-days', v: '', el: 'Span / Text w kontenerze', d: 'Tu ląduje liczba dni.' },
      { a: 'd2-countdown-hours', v: '', el: 'Span / Text', d: 'Godziny (0–23).' },
      { a: 'd2-countdown-minutes', v: '', el: 'Span / Text', d: 'Minuty (0–59).' },
      { a: 'd2-countdown-seconds', v: '', el: 'Span / Text', d: 'Sekundy (0–59).' }
    ],

    api: {
      code: "digi2.onReady(function () {\n  digi2.countdown.create('launch', {\n    targetDate: '2026-09-01T10:00:00',  // albo z atrybutu d2-countdown\n    padZeros: true,                      // 05 zamiast 5\n    expiredText: 'Startujemy!',\n    onTick: function (t) { /* {days,hours,minutes,seconds,total} */ },\n    onComplete: function () { }\n  });\n});"
    }
  };

  /* ════════════════════════ COPY ════════════════════════ */
  M.copy = {
    name: 'Copy — kopiowanie do schowka',
    short: 'Kopiowanie',
    cat: 'Narzędzia',
    flag: 'd2-copy',
    icon: 'copy',
    size: '2,1 KB min',
    auto: true,
    tagline: 'Przycisk kopiujący tekst lub zawartość elementu, z feedbackiem „Skopiowano!”.',
    desc: 'Kopiuje do schowka tekst z atrybutu albo treść wskazanego elementu (kod rabatowy, e-mail, numer konta). Po skopiowaniu przycisk na chwilę zmienia etykietę, a jeśli włączony jest moduł toasts — pokazuje też toast.',

    structures: [
      { title: 'Trzy warianty', tree: [
        { l: 'Button — kopiuje tekst', t: 'button', a: [['d2-copy', 'hello@digi2.agency']] },
        { l: 'Text — kod rabatowy', t: 'text', n: 'ID: promo' },
        { l: 'Button — kopiuje element', t: 'button', a: [['d2-copy', '#promo']], n: 'wartość zaczyna się od #' },
        { l: 'Button — osobny target', t: 'button', a: [['d2-copy'], ['d2-copy-target', '#promo']] }
      ]}
    ],

    attrs: [
      { a: 'd2-copy', v: 'tekst lub #selektor', el: 'Button / Link', req: true, d: 'Tekst do skopiowania; wartość od <code>#</code> = kopiuje treść elementu.' },
      { a: 'd2-copy-target', v: '#selektor', el: 'ten przycisk', d: 'Jawne wskazanie elementu do skopiowania (ma pierwszeństwo).' },
      { a: 'd2-copy-original', v: 'tekst', el: 'ten przycisk', set: true, d: 'Moduł przechowuje tu oryginalną etykietę na czas feedbacku „Skopiowano”.' }
    ],

    api: {
      desc: 'Podczas feedbacku przycisk dostaje klasę <code>d2-copy-success</code> (konfigurowalna opcją feedbackClass).',
      code: "digi2.copy.init({\n  feedbackText: '✓ Skopiowano!',\n  feedbackDuration: 1500,\n  showToast: true,             // jeśli moduł toasts aktywny\n  onCopy: function (tekst) { }\n});\ndigi2.copy.text('SAVE20');\ndigi2.copy.fromElement('#email');"
    }
  };

  /* ════════════════════════ COOKIES ════════════════════════ */
  M.cookies = {
    name: 'Cookies — helpery',
    short: 'Cookies',
    cat: 'Narzędzia',
    flag: 'd2-cookies',
    icon: 'cookies',
    size: '1,2 KB min',
    auto: false,
    tagline: 'get / set / remove — czyste API do ciasteczek, bez UI.',
    desc: 'Czyste API JavaScript do ciasteczek (bez atrybutów i bez UI): zapis z czasem życia, odczyt, usuwanie, sprawdzanie istnienia. Używane wewnętrznie przez popupy (cookie „nie pokazuj”) i formularze (cookies UTM) — przydatne też do własnych skryptów.',
    attrs: [],
    api: {
      code: "digi2.cookies.set('lang', 'pl', {\n  days: 30,          // brak = cookie sesyjne\n  path: '/',\n  secure: true,\n  sameSite: 'Lax'    // Lax | Strict | None (None wymaga secure)\n});\n\ndigi2.cookies.get('lang');        // 'pl' albo null\ndigi2.cookies.has('lang');        // true / false\ndigi2.cookies.getAll();           // { lang: 'pl', ... }\ndigi2.cookies.remove('lang', { path: '/' });"
    }
  };

  /* ════════════════════════ GOOGLE ════════════════════════ */
  M.google = {
    name: 'Google — GTM + Consent Mode v2',
    short: 'GTM + Consent',
    cat: 'Marketing',
    flag: 'd2-gtm="GTM-XXXXXXX"',
    icon: 'google',
    size: '2,5 KB min',
    auto: false,
    tagline: 'Wstrzykuje GTM i zarządza zgodami Consent Mode v2 (domyślnie wszystko denied).',
    desc: 'Podajesz ID kontenera na tagu loadera — moduł ustawia Consent Mode v2 (wszystkie kategorie startują jako <i>denied</i>), przywraca zapisane zgody z localStorage i dopiero wtedy ładuje GTM. Zmiany zgód robisz przez API — podpinasz je pod przyciski własnego banera cookie (baner budujesz w Webflow, np. jako popup).',
    install: '<script\n  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@main/dist/digi2-loader.min.js"\n  d2-gtm="GTM-XXXXXXX"\n></script>',
    installNote: 'Kategorie zgód: <code>analytics_storage</code>, <code>ad_storage</code>, <code>ad_user_data</code>, <code>ad_personalization</code>, <code>personalization_storage</code>, <code>functionality_storage</code>, <code>security_storage</code>. Wszystkie tagi (GA4, Ads, Pixel) konfigurujesz już w GTM.',

    structures: [
      { title: 'Baner cookie (własny, spinany API)', desc: 'Baner to zwykłe elementy Webflow — moduł nie narzuca struktury; przyciski podpinasz w JS (przykład niżej).', tree: [
        { l: 'Div — baner cookie', t: 'div', n: 'ID: cookie-banner, Display: none', c: [
          { l: 'Text — treść informacji', t: 'text' },
          { l: 'Button — „Akceptuję”', t: 'button', n: 'ID: cc-accept' },
          { l: 'Button — „Odrzucam”', t: 'button', n: 'ID: cc-reject' },
          { l: 'Button — „Ustawienia”', t: 'button', a: [['d2-show-popup', 'cookie-settings']], n: 'opcjonalnie: popup z checkboxami' }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-gtm', v: 'GTM-XXXXXXX', el: 'tag <script> loadera', req: true, d: 'ID kontenera GTM — włącza moduł i ładowanie kontenera.' },
      { a: 'd2-google', v: '', el: 'tag <script> loadera', d: 'Ładuje moduł bez kontenera GTM — sam Consent Mode (gdy GTM wstrzykujesz w inny sposób).' }
    ],

    api: {
      desc: 'Zgody zapisują się w localStorage i są przywracane przy kolejnych wizytach.',
      code: "digi2.onReady(function () {\n  var banner = document.getElementById('cookie-banner');\n  if (!digi2.cookies.get('cc_done')) banner.style.display = 'block';\n\n  document.getElementById('cc-accept').addEventListener('click', function () {\n    digi2.google.consent.grantAll();\n    digi2.cookies.set('cc_done', '1', { days: 180 });\n    banner.style.display = 'none';\n  });\n\n  document.getElementById('cc-reject').addEventListener('click', function () {\n    digi2.google.consent.denyAll();\n    digi2.cookies.set('cc_done', '1', { days: 180 });\n    banner.style.display = 'none';\n  });\n\n  // granularnie:\n  // digi2.google.consent.grant('analytics_storage');\n  // digi2.google.consent.update({ ad_storage: 'granted' });\n  // digi2.google.consent.get();\n  // digi2.google.dataLayerPush({ event: 'lead_form_sent' });\n});"
    }
  };

  /* ════════════════════════ AB-TESTS ════════════════════════ */
  M.abtests = {
    name: 'A/B Tests — testy wariantów',
    short: 'A/B testy',
    cat: 'Marketing',
    flag: 'd2-ab-tests="sitemap"',
    icon: 'ab',
    size: '6,0 KB min',
    auto: false,
    tagline: 'Przydział do wariantu, redirect z bazowego URL i przepisywanie linków.',
    desc: 'Definiujesz mapę testów w obiekcie globalnym: URL bazowy + warianty (opcjonalnie z wagami). Odwiedzający dostaje trwały przydział (localStorage), wejście na URL bazowy przekierowuje na jego wariant, a wszystkie linki na stronie są przepisywane tak, żeby trzymać go w tym samym wariancie. Eventy przydziału i kliknięć lecą do dataLayer.',
    install: '<script>\n  window.sitemap = {\n    cennik: {\n      base: \'/cennik\',\n      variants: { A: \'/cennik-a\', B: \'/cennik-b\' },\n      weights: { A: 50, B: 50 }\n    }\n  };\n</script>\n<script\n  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@main/dist/digi2-loader.min.js"\n  d2-ab-tests="sitemap"\n></script>',
    installNote: 'Config musi być zdefiniowany <b>przed</b> tagiem loadera. Wejście bezpośrednio na inny wariant nie przekierowuje (wygodne do QA).',

    attrs: [
      { a: 'd2-ab-tests', v: 'nazwaConfigu', el: 'tag <script> loadera', req: true, d: 'Nazwa zmiennej globalnej z mapą testów (window.nazwaConfigu).' },
      { a: 'd2-ab-link', v: 'nazwaTestu', el: 'Link', d: 'Jawnie wiąże link z testem (zamiast dopasowania po URL).' },
      { a: 'd2-ab-ignore', v: '', el: 'Link', d: 'Nie przepisuj tego linku.' }
    ],

    api: {
      desc: 'Eventy dataLayer: <code>digi2_ab_assigned</code> (ab_test, ab_variant) i <code>digi2_ab_click</code> (+ ab_target_url). Przydział trzymany w localStorage pod kluczem <code>d2ab:&lt;test&gt;</code>.',
      code: "digi2.abTests.get('cennik');       // przypisany wariant, np. 'B'\ndigi2.abTests.assign('cennik');    // przypisz (lub zwróć istniejący)\ndigi2.abTests.list();\ndigi2.abTests.rewriteLinks();      // po dorenderowaniu DOM"
    }
  };

  /* ════════════════════════ LOADER ════════════════════════ */
  M.loader = {
    name: 'Loader — instalacja i flagi',
    short: 'Loader i flagi',
    cat: 'Start',
    flag: null,
    icon: 'loader',
    size: '7,0 KB min',
    auto: true,
    tagline: 'Jeden skrypt, flagi modułów, digi2.onReady i składnia responsywna.',
    desc: 'Serce biblioteki: skanuje flagi <code>d2-*</code> na własnym tagu <code>&lt;script&gt;</code> (i na elementach <code>&lt;digi2-module&gt;</code> w treści strony), dociąga tylko potrzebne moduły z CDN i wystawia globalny obiekt <code>digi2</code> z systemem eventów oraz parserem wartości responsywnych.',
    install: '<script\n  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@main/dist/digi2-loader.min.js"\n  d2-cms d2-forms d2-popups\n></script>',
    installNote: '<b>Wersjonowanie:</b> <code>@main</code> zawsze bierze najnowszą wersję (cache jsdelivr ~12 h). Na produkcji przypnij commit: <code>@a6fcd80</code> — pełna kontrola nad tym, co się ładuje.',

    structures: [
      { title: 'Moduły per podstrona', desc: 'Zamiast ładować wszystko globalnie — flagi na stronie dociążą moduł tylko tam, gdzie jest potrzebny.', tree: [
        { l: 'Site Settings → Head', t: 'script', n: 'loader bez flag albo z globalnymi', c: [] },
        { l: 'Page → Custom Code', t: 'embed', c: [
          { l: '<digi2-module>', t: 'embed', a: [['d2-forms'], ['d2-popups']], n: 'flagi tylko dla tej strony' },
          { l: 'Div — alternatywnie', t: 'div', a: [['d2-modules', 'forms popups']] }
        ]}
      ]}
    ],

    attrs: [
      { a: 'd2-cms / d2-forms / d2-popups / …', v: '', el: 'tag <script> loadera lub <digi2-module>', d: 'Flagi modułów — pełna lista w kreatorze na stronie startowej.', n: 'aliasy: <code>d2-accordion</code> → tabs, <code>d2-dropdown</code> → dropdowns, <code>d2-format-*</code> (price/number/sum) → format' },
      { a: 'd2-gtm', v: 'GTM-XXXXXXX', el: 'tag <script> loadera', d: 'Włącza moduł google i ładuje kontener GTM.' },
      { a: 'd2-ab-tests', v: 'nazwaConfigu', el: 'tag <script> loadera', d: 'Włącza moduł A/B testów.' },
      { a: 'd2-debug-mode', v: '', el: 'tag <script> loadera', d: 'Logowanie akcji wszystkich modułów w konsoli.' },
      { a: 'd2-modules', v: 'np. forms popups, cookies', el: '<digi2-module> lub dowolny element', d: 'Deklaracja per podstrona w formie listy — nazwy bez prefiksu <code>d2-</code> (prefiks też przejdzie, a <code>gtm</code> mapuje się na google).', n: 'alias markera elementu: <code>d2-module</code>' },
      { a: 'd2-static-width', v: 'puste | left | center | right', el: 'dowolny element', d: 'Blokuje szerokość elementu na jego naturalnym maksimum (koniec ze skaczącym layoutem). Wartość wybiera krawędź, do której klei się treść krótsza niż zablokowane pudełko (domyślnie lewa).', n: 'wyświetlacz <code>d2-cms-range-display="max"</code> dostaje kotwicę <code>right</code> automatycznie; kotwica przyjmuje wartości per breakpoint — <code>d2-static-width="left;right@728"</code> — a zablokowana szerokość jest mierzona od nowa po zmianie progu, żeby pomiar z desktopu nie ściskał layoutu na mobile' }
    ],

    api: {
      desc: 'Składnia responsywna działa w większości atrybutów: <code>wartość;wartość@maxPx</code> (np. <code>left;up@911</code>).',
      code: "digi2.onReady(function () {\n  // wszystkie moduły załadowane i zainicjalizowane\n});\n\ndigi2.on('module:loaded', function (nazwa) {});\ndigi2.on('responsive:change', function (szerokosc) {});\ndigi2.emit('moj-event', { cokolwiek: 1 });\n\n// Sygnały — momenty, które usłyszy także spóźniony słuchacz.\n// emit() dociera tylko do tych, którzy JUŻ słuchają, a moduły\n// dociągają się asynchronicznie — koniec animacji intro zgłoszony\n// przez emit() potrafi trafić w pustkę. signal() zapamiętuje, że\n// coś się wydarzyło, a when() odpala callback także po fakcie.\ndigi2.signal('intro:done');                     // zgłoś moment\ndigi2.when('intro:done', function () {});       // odpal raz: teraz albo później\ndigi2.signalled('intro:done');                  // true / false\n// Tego używa opcja startOn w popupach — patrz strona modułu Popupy.\n\ndigi2.modules.check('forms');            // true / false\ndigi2.modules.require('forms').then(function () {});  // dociągnij na żądanie\n\n// Przed załadowaniem digi2.popups, digi2.forms… to zaślepki loadera:\n// metoda dociąga moduł, wykonuje wywołanie i zwraca Promise.\n// Moduł, który rzuci wyjątkiem przed rejestracją (zepsuty build, stara\n// przeglądarka) = console.error + module:error, Promise odrzucony,\n// wywołanie się nie wykonuje, onReady i tak rusza (1.8.3; wcześniej\n// zaślepka wołała samą siebie bez końca i zamrażała kartę).\n// Uwaga: onReady przychodzi wtedy WCZEŚNIEJ — nie czeka na moduły, które\n// jeszcze się pobierają. Ponownej próby nie ma: kolejne wywołania tego\n// modułu są od razu odrzucane, aż do przeładowania strony.\n\ndigi2.attr(el, 'd2-animation-direction', 'up'); // odczyt wartości responsywnej"
    },

    examples: [
      { title: 'Moduły tylko na jednej podstronie (<digi2-module>)', desc: 'Loader w Head zostaje bez flag; deklarację wklejasz w Page Settings → Custom Code albo w Embed w treści strony. Loader skanuje deklaracje od razu i ponownie po załadowaniu DOM, więc pozycja w body nie przeszkadza.', code: '<!-- Site Settings → Head (loader bez flag) -->\n<script\n  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@main/dist/digi2-loader.min.js"\n></script>\n\n<!-- Podstrona: element deklaracji z flagami -->\n<digi2-module d2-forms d2-popups></digi2-module>\n\n<!-- to samo w formie listy (nazwy bez prefiksu d2-) -->\n<div d2-modules="forms popups, cookies"></div>\n\n<!-- flagi z wartością też działają -->\n<digi2-module d2-gtm="GTM-XXXXXXX"></digi2-module>' },
      { title: 'Starszy build standalone (dist/digi2.min.js)', desc: 'Jednoplikowy build zawierający rdzeń digi2 (system eventów) i moduł popups — utrzymywany dla starszych wdrożeń. W nowych projektach używaj loadera z flagami.', code: '<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@main/dist/digi2.min.js"></script>' }
    ]
  };

  /* ════════════════════════ DATALAYER ════════════════════════ */
  M.datalayer = {
    name: 'DataLayer — GA4',
    short: 'DataLayer',
    cat: 'Marketing',
    flag: 'd2-datalayer',
    icon: 'chart',
    size: '6,6 KB min',
    auto: true,
    tagline: 'Aktywność modułów trafia do dataLayer pod nazwami zdarzeń GA4 — bez pisania kodu per strona.',
    desc: 'Most między szyną zdarzeń digi2 a <code>dataLayer</code>. Popupy, listy CMS, taby, formularze, lightbox i testy A/B raportują się same, pod nazwami rekomendowanymi przez GA4. Grupy można wyłączać per strona. Osobno konfigurowany jest moment, w którym leci <code>generate_lead</code> — patrz niżej, bo to decyzja, która wpływa na konwersje w Google Ads.',

    attrs: [
      { a: 'd2-datalayer', v: '(puste)', el: 'tag loadera', d: 'Włącza moduł — raportują wszystkie grupy.' },
      { a: 'd2-datalayer-disable', v: 'grupy', el: 'tag loadera', d: 'Wszystko <b>oprócz</b> wymienionych grup, np. <code>"lightbox ab"</code>.' },
      { a: 'd2-datalayer-only', v: 'grupy', el: 'tag loadera', d: '<b>Tylko</b> wymienione grupy. Łączy się z <code>-disable</code>: najpierw zawęża, potem odejmuje.' },
      { a: 'd2-datalayer-disable', v: 'forms-detail', el: 'tag loadera', d: 'Wyłącza sam lejek formularza (<code>form_start</code>, <code>form_field_interaction</code>, <code>form_submit_click</code>), zostawiając zdarzenia konwersji. Grupa jest osobna, bo jest gadatliwa.' },
      { a: 'd2-ab-datalayer', v: 'false', el: 'tag loadera', d: 'Wyłącza własny push modułu <code>ab-tests</code> (<code>digi2_ab_assigned</code> / <code>digi2_ab_click</code>). Bez tego jedno przypisanie wariantu trafia do <code>dataLayer</code> dwa razy — raz z modułu, raz z mostu jako <code>experiment_impression</code>.', n: 'domyślnie oba lecą — klienci mają triggery GTM na nazwach digi2_*' },
      { a: 'd2-datalayer-lead', v: 'submit | success', el: 'tag loadera', d: 'Kiedy leci <code>generate_lead</code>. Domyślnie <code>submit</code> — czyli po walidacji klienckiej, jeszcze zanim Webflow wyśle zgłoszenie. <code>success</code> przepina je na potwierdzenie serwera (<code>.w-form-done</code>), czyli na prawdziwego leada.', n: 'domyślna wartość celowo nie zmienia zachowania istniejących wdrożeń — przełączaj świadomie, po sprawdzeniu kluczowych zdarzeń w GA4 i importu do Ads' }
    ],

    api: {
      desc: 'Grupy: <code>popups</code>, <code>cms</code>, <code>tabs</code>, <code>forms</code>, <code>forms-detail</code>, <code>lightbox</code>, <code>ab</code>. Lejek (<code>forms-detail</code>): <code>form_start</code> raz na wizytę, <code>form_field_interaction</code> przy pierwszej zmianie każdego pola (nazwa i typ, nigdy wartość), <code>form_submit_click</code> przed walidacją. Zdarzenia formularza: <code>form_submit</code> (klik po walidacji), <code>form_error</code> (walidacja odrzuciła), <code>form_submit_success</code> (serwer przyjął), <code>form_submit_error</code> (serwer odrzucił). Rozjazd między <code>form_submit</code> a <code>form_submit_success</code> to darmowy wskaźnik awarii formularza. Rozwinięcie wiersza produktu (tab/akordeon wewnątrz <code>[d2-cms-item]</code>) wysyła <code>select_item</code> z danymi produktu — przykład niżej.',
      code: "<!-- wszystko raportuje, generate_lead na potwierdzeniu serwera -->\n<script src=\"…/digi2-loader.min.js\"\n        d2-forms d2-datalayer d2-datalayer-lead=\"success\"></script>\n\n<!-- albo: bez lightboxa i testów A/B -->\n<script src=\"…/digi2-loader.min.js\"\n        d2-datalayer d2-datalayer-disable=\"lightbox ab\"></script>\n\n// Parametry potwierdzonego leada (form_submit_success / generate_lead):\n//   form_id, form_name        — id elementu i nazwa z create()\n//   form_location             — ścieżka strony\n//   lead_source / _medium / _campaign  — UTM z URL-a albo z cookie\n//   has_gclid / has_fbclid    — BOOLEAN, nigdy sama wartość click id\n//   consent_marketing         — czy zaznaczono wszystkie zgody\n//\n// Do dataLayer nigdy nie trafia treść pól — żadnych maili, telefonów\n// ani treści wiadomości."
    },

    examples: [
      { title: 'Rozwinięcie produktu w wyszukiwarce → select_item z danymi', desc: 'Tab albo akordeon otwarty wewnątrz <code>[d2-cms-item]</code> wysyła <code>select_item</code> z polami tego wiersza — tymi samymi <code>d2-cms-field-*</code>, które czyta moduł CMS (inline na itemie i zagnieżdżone <code>[d2-cms-field]</code>). Tylko przy otwarciu, nie przy zamknięciu; domyślne otwarcie przy ładowaniu (<code>d2-accordion-open</code>) się nie liczy. <code>item_id</code> = pole <code>id</code>, a bez niego <code>name</code>/<code>title</code>; <code>item_list_name</code> = najbliższy <code>d2-cms-list</code>, a bez niego nazwa grupy. Wartości typu <code>52,30 m²</code> czy <code>689 000 zł</code> idą jako liczby; <code>1.250.000 zł</code> zostaje tekstem, chyba że dodasz <code>d2-cms-field-type-price="number"</code>. Zdarzenie jest neutralne branżowo — na <code>view_flat</code> czy Meta <code>ViewContent</code> tłumaczy je GTM. Na stronie musi być flaga <code>d2-datalayer</code>; samo <code>d2-tabs</code> nic nie wysyła.', code: '<script src="…/digi2-loader.min.js" d2-tabs d2-datalayer></script>\n\n<div d2-accordion d2-cms-list="lokale">\n  <div d2-accordion-item d2-cms-item\n       d2-cms-field-name="B.1.05" d2-cms-field-floor="1"\n       d2-cms-field-area="52,30 m²" d2-cms-field-price="689 000 zł"\n       d2-cms-field-status="Dostępne">\n    <div d2-accordion-trigger>…</div>\n    <div d2-accordion-body>…</div>\n  </div>\n</div>\n\n// po rozwinięciu:\n// { event: \'select_item\', interaction: \'expand\',\n//   item_list_id: \'lokale\', item_list_name: \'lokale\',\n//   item_id: \'B.1.05\', item_name: \'B.1.05\',\n//   item_floor: 1, item_area: 52.3, item_price: 689000,\n//   item_status: \'Dostępne\' }' },
      { title: 'Przepięcie generate_lead na potwierdzenie serwera', desc: 'Domyślnie <code>generate_lead</code> leci przy kliknięciu „Wyślij” po walidacji w przeglądarce — czyli zanim Webflow wyśle zgłoszenie. Odrzucenie przez spam guard albo limit planu i tak policzy się jako konwersja, a uczą się na tym algorytmy Google Ads i Meta. Przed przełączeniem sprawdź w GA4 kluczowe zdarzenia i import do Ads.', code: '<script src="…/digi2-loader.min.js"\n        d2-forms d2-datalayer d2-datalayer-lead="success"></script>' }
    ]
  };


  /* ════════════════════════ MARKETING AUTOMATION ════════════════════════ */
  M.ma = {
    name: 'Marketing automation (d2-ma) — demo',
    short: 'Marketing automation',
    cat: 'Marketing',
    flag: 'd2-ma="https://digi2.app/api/ma/scenario/<site>.json"',
    icon: 'chart',
    auto: true,
    tagline: 'Strona pamięta, jakie lokale oglądał odwiedzający, i wykonuje scenariusze z digi2.app: popup z ostatnim lokalem, segment w dataLayer, webhook do Make.',
    desc: '<b>Kontrakt v0 (demo)</b> — format scenariusza opisuje repo silnika, <code>docs/architecture/marketing-automation.md</code> §13, i może się zmienić bez okresu przejściowego. Ładuj przypiętą wersję (<code>@v1.9.0-ma.1</code> albo commit), nigdy <code>@latest</code>. Moduł słucha dwóch wyszukiwarek — 3D Estate (<code>oa3de__unit-open</code> w <code>dataLayer</code>, duplikat <code>oa3de_unit_open</code> pomijany; przy wejściu deep linkiem <code>?sm-unit=</code>) i mapy 2destate (<code>window.d2estate.onProductClick</code>) — i sprowadza je do jednego kształtu <code>unit_view</code>. Ten sam lokal w ciągu 5 s liczy się raz. Adres lokalu to ścieżka strony z samym <code>?sm-unit=</code> / <code>?d2-unit=</code> — <code>gclid</code>, <code>fbclid</code> ani UTM nie trafiają do bazy ani do webhooka. Historia, liczniki i stan scenariuszy leżą w przeglądarce odwiedzającego (IndexedDB <code>d2ma</code>, 90 dni), identyfikator to losowy UUID — bez danych osobowych. Przy <code>storage.consentRequired: true</code> nic nie jest zapisywane bez zgody z Consent Mode (moduł <code>d2-gtm</code>), a jawna odmowa albo wycofanie zgody kasuje bazę. Od ma.31 (decyzja Piotra 28.10.2026: trzy stany zgody) zgoda jeszcze nieznana — nic albo samo <code>default</code> denied, które szablon CMP w GTM stawia przed banerem — bazy nie otwiera i nie kasuje, tylko czeka na <code>update</code>. Dwa bezpieczniki: baza nigdy nie otwarta za zgodą (zebrana bez wymogu albo sprzed ma.31) i baza, której ostatnie otwarcie za zgodą jest starsze niż retencja, są wtedy kasowane. Przy pustym <code>d2-ma</code> moduł czeka z otwarciem bazy na pierwsze <code>digi2.ma.load()</code> (najdłużej 10 s). Profil nieodwiedzany dłużej niż retencja zaczyna się od nowa. Koperta scenariuszy przychodzi z digi2.app; gdy nie da się jej pobrać, strona działa jak bez modułu.',

    structures: [
      { title: 'Popup „ostatnio oglądany" (szablon last-unit)', desc: 'Opcjonalny — bez niego moduł pokaże wbudowany. Wrapper ukryty na starcie (display: none), resztę robi moduł popupów; nie trzeba osadzać create().', tree: [
        { l: 'Div — wrapper (fixed, full-screen)', t: 'div', a: [['d2-ma-popup', 'last-unit']], c: [
          { l: 'Div — karta', t: 'div', c: [
            { l: 'Image — zdjęcie lokalu', t: 'img', a: [['d2-ma-field', 'image']], n: 'ukryte, gdy lokal nie ma zdjęcia' },
            { l: 'Heading — nazwa', t: 'heading', a: [['d2-ma-field', 'name']] },
            { l: 'Text — pokoje · metraż · piętro', t: 'text', a: [['d2-ma-field', 'summary']] },
            { l: 'Text — cena', t: 'text', a: [['d2-ma-field', 'price']], n: '612 000 zł' },
            { l: 'Link — zobacz lokal', t: 'link', a: [['d2-ma-cta']], n: 'open_unit → link do lokalu' },
            { l: 'Link — zamknij', t: 'link', a: [['d2-ma-close']] }
          ]}
        ]}
      ]},
      { title: 'Sekcja „co o Tobie wie strona"', desc: 'Pokaz demo: profil, historia i przyciski.', tree: [
        { l: 'Div — sekcja', t: 'div', c: [
          { l: 'Text — liczba wizyt', t: 'text', a: [['d2-ma-profile', 'visits']] },
          { l: 'Text — preferencja pokoi', t: 'text', a: [['d2-ma-profile', 'pref.rooms']] },
          { l: 'Text — ostatni lokal', t: 'text', a: [['d2-ma-profile', 'last.name']] },
          { l: 'List — historia', t: 'list', a: [['d2-ma-history'], ['d2-ma-history-limit', '10']] },
          { l: 'Button — symuluj powrót', t: 'button', a: [['d2-ma-simulate-return']] },
          { l: 'Button — wyczyść dane', t: 'button', a: [['d2-ma-clear']] }
        ]}
      ]}
    ],

    attrs: [
      { g: 'Tag loadera', a: 'd2-ma', v: 'URL koperty', el: 'tag loadera', req: true, d: 'Koperta scenariuszy z digi2.app (<code>/api/ma/scenario/&lt;site&gt;.json</code>). Pusta wartość = <code>digi2.ma.load()</code> z JS (plik lokalny do testów jako obiekt); od ma.31 moduł czeka z otwarciem bazy i liczeniem wizyty na pierwsze <code>load()</code>, bez niego startuje bez koperty po 10 s. ma.23: tylko <code>https://digi2.app/…</code> albo <code>https://api.2destate.com/…</code>; inny adres (także w <code>digi2.ma.load(url)</code>) nie jest pobierany — <code>console.warn</code>, strona działa bez MA.' },
      { g: 'Tag loadera', a: 'd2-ma-consent-required', v: 'true | false', el: 'tag loadera', d: 'Decyduje <code>storage.consentRequired</code> z koperty; atrybut obowiązuje, gdy koperty nie da się pobrać. <code>true</code> wymusza zgodę bez względu na kopertę. <b>Na stronie klienta zawsze <code>true</code></b> — inaczej koperta z <code>consentRequired: false</code> wyłączy zgodę; <code>false</code> tylko na naszej kopii demo.', n: 'bez atrybutu i bez koperty: zgoda wymagana; jawna odmowa kasuje istniejącą bazę d2ma, zgoda jeszcze nieznana tylko czeka (ma.31)' },
      { g: 'Tag loadera', a: 'd2-ma-consent', v: 'kategoria Consent Mode', el: 'tag loadera', d: 'Kategoria, która odblokowuje zapis. Domyślnie <code>analytics_storage</code>. Zgoda jest czytana z każdego banera Consent Mode: z komend <code>gtag(\'consent\', \'default\'|\'update\', …)</code> w <code>dataLayer</code> (także sprzed startu), ze stanu tagu Google (szablon CMP w GTM) albo z modułu <code>d2-gtm</code>.', n: 'kolejność (ma.31): <code>update</code> z dataLayer → <code>update</code> w stanie tagu Google → zapis modułu <code>d2-gtm</code> (<code>consentModeV2</code>; odmowa kasuje bazę) → <code>default</code> granted w tagu Google → <code>default</code> granted bez <code>region</code>; <code>default</code> denied i <code>default</code> z <code>region</code> nigdy nie dają zgody ani nie kasują — zgoda nieznana, moduł czeka; liczą się tylko prawdziwe komendy <code>gtag()</code>, nie zwykła tablica; <code>update</code> z odmową kasuje bazę; zgoda wymagana, gdy koperta ma <code>consentRequired: true</code> albo atrybut <code>d2-ma-consent-required="true"</code>, a atrybut nigdy jej nie wyłącza' },
      { g: 'Tag loadera', a: 'd2-ma-products-api', v: 'URL', el: 'tag loadera', d: 'Skąd świeży status lokalu przed popupem. Domyślnie <code>https://api.2destate.com/api/v1</code> (domena strony musi być na białej liście projektu).' },
      { g: 'Tag loadera', a: 'd2-ma-highlight', v: '(puste)', el: 'tag loadera', d: 'Podświetla na mapie 2destate dostępne lokale z preferowaną liczbą pokoi — tylko pojedyncze kształty (bez grup i bez tytułów powtórzonych na innym piętrze) na piętrze, które jest na ekranie. Kolejności listy nie zmienia.', n: 'po jednym kształcie na klatkę animacji (seria wywołań gubi kształty); zmiana piętra gasi podświetlenia, moduł nakłada je ponownie' },
      { g: 'Tag loadera', a: 'd2-ma-video-consent', v: 'kategorie Consent Mode (spacja)', el: 'tag loadera', d: 'ma.5: dodatkowe kategorie wymagane przed ramką YouTube / Vimeo w akcji <code>content</code>. <code>ad_storage</code> jest wymagane zawsze — atrybut może tylko dołożyć kategorie (np. <code>ad_storage analytics_storage</code>), nigdy go zastąpić.', n: 'lista bez ad_storage = console.warn i dalej ad_storage' },
      { g: 'Tag loadera', a: 'd2-ma-hot-lead', v: 'URL API 2destate (puste = https://api.2destate.com/api/v1)', el: 'tag loadera', d: 'ma.12 (MA-D38 etap 1, wariant D′): Od ma.34 <code>/visit</code>, a od ma.35 także oddanie <code>visitorId</code> wymaga udzielonej zgody, także przy <code>consentRequired: false</code>; jawna odmowa po oddaniu id (baza zostaje) wysyła <code>/revoke</code>, kończy powiązanie i (od ma.36) nadaje nowy <code>visitorId</code>; późniejsza zgoda starego powiązania nie wskrzesza. Od ma.36 prawdziwy lead: <code>ma_token</code> z odpowiedzi zgłoszenia przez <code>digi2.ma.leadToken(token)</code> albo zdarzenie <code>window</code> <code>d2:lead-token</code> (nigdy <code>dataLayer</code>), tylko za zgodą; powroty wysyłają <code>/visit</code> z <code>{ token }</code> zamiast <code>visitorId</code>, 401/403 usuwają token, „Wyczyść” i odmowa — <code>/revoke { token }</code>. <code>visitorId</code> idzie z formularzem do 2destate (pole <code>d2ma_visitor_id</code>). Gdy w tej samej wizycie był lead, przy powrocie moduł wysyła <code>POST /public/ma/visit</code> <code>{ visitorId, units, pageviews, source: "return_visit" }</code> (ma.37: także <code>touchpoint</code> — wpis touchpoints v1 wejścia tej wizyty, ten sam w każdym POST-cie wizyty; bez zgody na historię źródeł — bez klucza; 2destate pomija źródło w projekcie bez zakresu „kontekst leada”, <code>is_context_allowed</code>; ma.38: UTM ze znakiem niedrukowalnym i <code>referrer_host</code> ponad 100 znaków albo spoza domeny = brak pola, nie cały wpis) (ma.24: <code>units</code> zawsze, także <code>[]</code> — serwer wymaga pola). 401 zrywa powiązanie, 403 i 404 wstrzymują sygnały na dobę, 413/422 — do końca wizyty, 429/503 czeka <code>Retry-After</code>. „Wyczyść” i wycofanie zgody wysyłają <code>/public/ma/revoke</code>, gdy <code>visitorId</code> kiedykolwiek trafił do formularza (także bez leada; zgoda wycofana między wizytami — przy następnej odsłonie). Wartość spoza <code>https://api.2destate.com/…</code> (inny host, http, port, login) = ostrzeżenie i zero żądań /visit i /revoke (ma.23; do ma.22 — API produkcyjne). Przypinaj tagiem <code>@v1.9.0-ma.N</code>, nie <code>@latest</code>.', n: 'tylko demo i leady testowe agencji (od ma.36 także prawdziwe leady Osiedla Demo przez <code>ma_token</code>); ruch anonimowy nie wychodzi z przeglądarki (MA-D30); ma.23: tylko <code>https://api.2destate.com/…</code> — inny host, http, port albo login = zero żądań /visit i /revoke i <code>console.warn</code>' },
      { g: 'Tag loadera', a: 'd2-ma-refresh', v: 'sekundy (≥ 5)', el: 'tag loadera', d: 'Tylko demo. Co ile czytać kopertę ponownie — wynik telefonu wysłany z panelu dociera do otwartej strony.' },
      { g: 'Tag loadera', a: 'd2-ma-search-events', v: 'off', el: 'tag loadera', d: 'ma.17: wyłącza zdarzenia GA4 wyszukiwarki 2destate (<code>view_item_list</code>, <code>select_item</code>, <code>view_flat</code>). Profil i scenariusze działają dalej.' },
      { g: 'Tag loadera', a: 'd2-ma-context', v: 'off', el: 'tag loadera', d: 'ma.16: wyłącza dopisywanie kontekstu leadu do formularzy (patrz <code>d2-ma-context="json"</code> na formularzu).' },
      { g: 'Popup', a: 'd2-ma-popup', v: 'nazwa szablonu', el: 'wrapper popupu', d: 'Własny popup dla szablonu z węzła <code>popup</code> (<code>last-unit</code>, <code>promo-rooms</code>…). Bez niego moduł buduje wbudowany. Rejestrowany na module popupów jako <code>d2-ma-&lt;szablon&gt;</code>, więc działa reguła „jeden popup naraz".' },
      { g: 'Popup', a: 'd2-ma-field', v: 'name | price | pricePerSqm | area | rooms | floor | building | summary | image | promoText | status | unitId', el: 'w popupie / w wierszu historii', d: 'Pole lokalu. <code>price</code> → „612 000 zł", <code>area</code> → „44,6 m²", <code>summary</code> → „2 pok. · 44,6 m² · parter", <code>image</code> na obrazku ustawia <code>src</code> (tylko <code>https:</code>; z 2destate pole rejestru <code>obrazek-popup</code>), <code>promoText</code> → hasło promocji z pola <code>haslo-promocji</code> (tylko przy włączonej promocji). Pole bez wartości jest ukrywane. W wierszu historii także <code>time</code>.' },
      { g: 'Popup', a: 'd2-ma-cta', v: '—', el: 'link w popupie', d: 'Przy <code>cta: "open_unit"</code> dostaje link do lokalu (tylko <code>https:</code> albo ten sam origin); lokal 2destate z mapą na tej samej stronie podświetla na mapie zamiast przechodzić. Przy <code>contact</code> zostaje własny href.' },
      { g: 'Popup', a: 'd2-ma-close', v: '—', el: 'w popupie', d: 'Zamyka popup (klik w tło też).' },
      { g: 'Popup', a: 'd2-ma-map', v: '—', el: 'wrapper mapy', d: 'Dokąd przewinąć stronę, gdy CTA otwiera lokal na mapie.' },
      { g: 'Profil', a: 'd2-ma-profile', v: 'visits | views | lead | pref.rooms | pref.floor | segment | visitorId | last.<pole>', el: 'tekst', d: 'Wartość z profilu; „—", gdy nieznana.' },
      { g: 'Profil', a: 'd2-ma-history', v: '—', el: 'lista', d: 'Obejrzane lokale, od najnowszego. <code>d2-ma-history-limit</code> = ile (domyślnie 20). Dziecko <code>d2-ma-history-item</code> = szablon wiersza z <code>d2-ma-field</code> w środku.' },
      { g: 'Profil', a: 'd2-ma-clear', v: '—', el: 'przycisk', d: 'Kasuje całą bazę <code>d2ma</code>; profil zaczyna się od nowa.' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-event', v: 'map_view | list_view | card_download | price_history_view', el: 'element strony', d: 'ma.34, z <code>d2-ma-hot-lead</code>: zdarzenie zachowania w <code>/visit</code>. <code>map_view</code> i <code>list_view</code>: element w widoku około 1 s, raz na wizytę. <code>card_download</code> i <code>price_history_view</code>: klik, lokal w <code>d2-ma-unit</code>.', n: 'Tylko powiązany lead w wizycie powrotu, po zgodzie. Najpierw wdrożyć serwer 2destate: bez nowych pól odpowie 422.' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-dwell', v: '(puste)', el: 'rzut lub karta lokalu, razem z d2-ma-unit', d: 'ma.34: czas widoczności elementu, wysyłany jako <code>plan_dwell</code> (do 3600 s na lokal).' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-unit', v: 'UUID lokalu', el: 'element z d2-ma-event lub d2-ma-dwell', d: 'ma.34: lokal, którego dotyczy zdarzenie. Inna wartość niż UUID jest pomijana.' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-contact', v: '—', el: 'formularz kontaktu albo jego sekcja', d: 'ma.37: tu przewija przycisk <code>contact</code> z popupu z szablonu panelu (po zamknięciu popupu). Bez tego atrybutu — element <code>#kontakt</code>; bez obu przycisk tylko zamyka.' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-visitor-id', v: '—', el: 'ukryte pole formularza (name="d2ma_visitor_id")', d: 'ma.12, tylko z <code>d2-ma-hot-lead</code>: przy wysłaniu formularza i kliku w jego przycisk wysyłki (ma.24; faza capture, przed handlerem strony) dostaje <code>visitorId</code>; bez zgody puste — od ma.35 także przy <code>consentRequired: false</code> (nieznana zgoda = brak zgody). Moduł nie wysyła ani nie blokuje formularza.' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-slot', v: 'nazwa slotu ([a-z0-9-])', el: 'tekst (np. nagłówek)', d: 'Tekst, który może podmienić akcja <code>content</code> — wyłącznie przez <code>textContent</code>, nigdy HTML.', n: 'oryginał wraca po „Wyczyść” i po wycofaniu zgody' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-ignore', v: '—', el: 'formularz', d: 'Formularz, którego <code>form_abandon</code> nigdy nie liczy; nie dostaje też kontekstu leadu (ma.16).' },
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-context', v: 'json', el: 'formularz', d: 'ma.16 (§13.13): przy wysyłce KAŻDEGO formularza (poza <code>d2-ma-ignore</code>) moduł dopisuje ukryte pole <code>d2ma_context</code> — zdanie po polsku dla handlowca, ≤ 2000 znaków: „3 wizyty (18.10, 20.10, 21.10) · 5 obejrzanych lokali, najczęściej M12 (3 pok., 2 p., 64 m², 689 000 zł) ×3 · lokale: … · preferencja: 3 pokoje, 2 p. · segmenty: … · lead: tak (20.10) · ostatni lokal: M12 · strona: /mieszkania/m12 · źródło: meta / cpc / jesien”. Formularz z <code>d2-ma-context="json"</code> dostaje dodatkowo <code>d2ma_context_json</code> (≤ 4 kB): <code>{ v:1, visits:[{t,path}], units:[{id,name,rooms,floor,area,price,views,last}], pref:{rooms,floor}, segments:[], last_unit:{id,name}, lead, source:{utm_source,utm_medium,utm_campaign} }</code>. Istniejące pole o tej nazwie jest nadpisywane, nie dublowane. Od ma.18 także <code>d2ma_consent</code> = <code>1</code> przy aktywnym profilu (serwer 2destate zapisuje kontekst tylko z nim); bez zgody pola nie ma, a własne pole strony o tej nazwie jest opróżniane.', n: 'tylko po zgodzie — bez niej <code>d2ma_context</code> = „brak kontekstu (brak zgody)”, JSON pominięty; za długi tekst traci najstarsze daty wizyt, potem najstarsze lokale; <code>path</code> tylko dla bieżącej strony; nigdy wartości pól, IP, UA, geolokalizacji; pola wpisywane w fazie przechwytywania na dokumencie (submit i klik w przycisk wysyłki), więc Webflow, d2-forms i <code>new FormData(form)</code> je widzą; skrypt wymieniający pola jawnie musi je dopisać' },
      { g: 'Warunki na stronie (ma.5)', a: 'd2-ma-cond', v: '—', el: 'każdy element z warunkami', req: true, d: 'Znacznik dla CSS strony: <code>[d2-ma-cond]:not([d2-ma-shown]){display:none}</code>. Element z <code>d2-ma-show-*</code> / <code>d2-ma-hide-*</code> bez niego skrypt ukrywa atrybutem <code>hidden</code> z ostrzeżeniem. Bloki <code>d2-ma-variant</code> go nie potrzebują.' },
      { g: 'Warunki na stronie (ma.5)', a: 'd2-ma-show-<klucz>', v: 'visits | views | views-rooms | views-floor | views-unit | segment | lead | pref-rooms | pref-floor', el: 'dowolny element (także nakładka popupu)', d: 'Pokaż, gdy pasuje — kilka atrybutów na elemencie = I, <code>|</code> = LUB w kluczu. Licznik: <code>3+</code> co najmniej, <code>3</code> dokładnie, <code>0..2</code> najwyżej, <code>/30d</code> albo <code>/12h</code> = okno. <code>views-rooms="3:2+"</code>, <code>views-floor="-1:1+"</code>, <code>views-unit="&lt;id&gt;:1+"</code>, <code>segment="2-pokoje|3-pokoje"</code>, <code>lead="false"</code>, <code>pref-rooms="2"</code>. Moduł dokłada <code>d2-ma-shown</code>; ukrycie robi CSS strony (README / docs.html — gotowy blok).', n: 'bez zgody nic nie pasuje (treść domyślna); błędny klucz albo wartość = ukryty + console.warn; po zmianie DOM <code>digi2.ma.apply()</code>; odłożony popup wznawia się dopiero, gdy loader oznaczy moduł popupów jako załadowany (ma.14: wcześniej proxy loadera przerywało start d2-ma), a błąd modułu popupów przy wznawianiu = console.warn, d2-ma idzie dalej' },
      { g: 'Warunki na stronie (ma.5)', a: 'd2-ma-hide-<klucz>', v: 'jak d2-ma-show-*', el: 'dowolny element', d: 'Ukryj, gdy pasuje — wygrywa z <code>show</code>. Moduł dokłada <code>d2-ma-hidden</code>.' },
      { g: 'Warunki na stronie (ma.5)', a: 'd2-ma-variants', v: '—', el: 'kontener bloków alternatywnych', d: 'Dzieci z <code>d2-ma-variant="&lt;nazwa&gt;"</code> i własnymi <code>d2-ma-show-*</code>: pierwszy pasujący wygrywa (<code>d2-ma-shown</code>), kontener dostaje <code>d2-ma-matched</code> i znika blok <code>d2-ma-variant="default"</code>.' },
      { g: 'Warunki na stronie (ma.5)', a: 'd2-ma-variant', v: 'nazwa | default', el: 'dziecko d2-ma-variants', d: 'Blok alternatywny. <code>?d2-ma-preview=&lt;nazwa&gt;</code> w adresie pokazuje ten wariant (albo segment) do sprawdzenia w Webflow — bez zgody, bez zapisu i bez dataLayer.' },
      { g: 'Profil', a: 'd2-ma-simulate-return', v: '—', el: 'przycisk', d: 'Demo: zamyka wizytę tak, jakby minęło najdłuższe <code>afterHours</code> — następne wejście to powrót.' }
    ],

    api: {
      desc: 'Węzły: wyzwalacze <code>unit_view</code> (<code>unitIds</code>, <code>minCount</code>), <code>type_view</code> (<code>rooms</code>/<code>floor</code>, <code>minCount</code>), <code>return_visit</code> (<code>afterHours</code>, liczone od końca poprzedniej wizyty), <code>lead</code> (<code>generate_lead</code> albo <code>oa3de__contact-form-make-inquiry</code>), <code>crm_call_result</code> (demo: <code>demoState.crmCallSeq</code> wzrósł po poprzednim kroku); warunki <code>pref.rooms</code>, <code>pref.floor</code>, <code>lead</code>, <code>visits: { min }</code>; akcje <code>popup</code>, <code>datalayer</code> (<code>ma_segment</code> | <code>ma_segment_exit</code>), <code>webhook</code> (<code>email</code> | <code>sms</code> | <code>ai_call</code>, zawsze <code>testOnly: true</code> — bez tego nie wychodzi). Reguły: trigger → trigger = kolejność w czasie (ta sama milisekunda to nie „po”); action → trigger = czekanie na zdarzenie po akcji; kilka krawędzi = w kolejności <code>edges</code>; <code>frequency</code> (<code>once_per_visit</code> domyślnie, <code>once_per_unit</code>, <code>once_per_days:N</code>) liczone per scenariusz, a akcja pominięta przez frequency nie kończy gałęzi; <code>delayMinutes</code> odkłada akcję w d2ma (ważna 24 h); dwa popupy naraz — wygrywa wcześniejszy scenariusz, drugi czeka do następnej wizyty („naraz” = jedna interakcja: kliknięcie, które otwiera nową wizytę i spełnia wyzwalacz obejrzenia, daje jeden popup — ma.27); inny popup na ekranie (od ma.32 także ten sam popup, widoczny albo w trakcie zamykania — bez podmiany treści) = popup ze scenariusza pominięty, bez kolejki za tamtym, bez <code>ma:action</code> i bez zużycia częstotliwości (ma.27); (ma.6) popup czeka, aż gość zamknie pełnoekranowy dymek mapy 2destate na telefonie, najwyżej 5 min (ma.27: liczy się widoczny dymek — Image Map Pro zostawia klasę <code>is-fullscreen</code> na zamkniętym; po stuknięciu 500 ms na otwarcie dymka); (ma.7) popup z szablonu panelu: gdy strona nie ma własnego <code>[d2-ma-popup]</code>, a koperta ma <code>templates.popup[]</code> — bloki <code>title</code> / <code>text</code> / <code>image</code> / <code>cta</code> (≤ 8), <code>layout</code> i <code>style</code> wyłącznie jako tokeny strony (<code>token:&lt;nazwa&gt;</code>; ma.38: z wartością zapasową — <code>var(--surface, #fff)</code> dla tła, <code>#1a1d1c</code> dla tekstu i przycisku, <code>inherit</code> dla fontu — więc strona bez tych zmiennych CSS ma białą kartę z ciemnym tekstem, nie przezroczystą); tekst przez <code>textContent</code>, nieznane pola pomijane z ostrzeżeniem; (ma.8) zmieniony szablon w nowej rewizji koperty przebudowuje popup; (ma.37) do 2 bloków <code>cta</code> z akcją <code>open_unit</code> | <code>contact</code> (zamyka i przewija do <code>[d2-ma-contact]</code>, a bez niego do <code>#kontakt</code>; bez żadnego tylko zamyka) | <code>link</code> (<code>href</code>) | <code>filter_rooms</code> (filtr <code>pref.rooms</code> w wyszukiwarce 2destate z <code>{ source: "user" }</code> — od ImageMapPro 2destate 1.7.1 filtr gościa (<code>search_filter</code>, GA4), starsza paczka zapisuje zmianę ze skryptu, bez nich; przez 5 s po kliku przycisku żaden popup ze scenariusza, pominięty nie zużywa częstotliwości; zamknięcie i przewinięcie do listy; bez <code>pref.rooms</code> przycisk ukryty) | <code>scroll_to</code> (<code>target: "#id"</code>) | <code>close</code>, klik = <code>ma_popup_cta</code> <code>{ action }</code> w dataLayer i <code>ma:action</code> <code>{ do: "popup_cta" }</code>; fokus, Tab i Esc daje moduł popupów; sprzedanego lokalu popup nie pokazuje; nowa <code>revision</code> = ścieżka od zera; nieznany typ / zdarzenie / akcja = węzeł pominięty z <code>console.warn</code>, a gałąź za nim stoi; nieznany klucz warunku jest pomijany i ścieżka idzie dalej — dlatego nowe filtry są w <code>when</code> nowych wyzwalaczy, nigdy w <code>if</code>; <code>version</code> ≠ "0" = żaden scenariusz; <code>minScript</code> wyższy niż <code>ma.4</code> = <code>console.warn</code>. <code>demoState.timeScale: 60</code> = minuta zamiast godziny (afterHours, delayMinutes, once_per_days i 30-minutowa przerwa między wizytami).<br><br><b>Od ma.4 (§13.8)</b> — nasłuch tylko wtedy, gdy koperta ma taki wyzwalacz, i dopiero po zgodzie. Wyzwalacze: <code>exit_intent</code> (mysz przez górną krawędź, raz na wizytę; <b>na ekranach dotykowych nie działa</b>), <code>engagement</code> (<code>minSeconds</code> aktywnego czasu przy widocznej karcie, <code>minScrollPct</code> największego przewinięcia, filtr <code>utm: { source, medium, campaign }</code> z pierwszego wejścia w wizycie, bez wielkości liter; raz na odsłonę), <code>form_abandon</code> (<code>formIds</code> — lista 1–20 nazw, bez pola = dowolny formularz, pusta lista = błąd; <code>idleSeconds</code> 10–600, domyślnie 60: fokus w polu, brak wysłania i bezczynność albo wyjście ze strony; raz na formularz na wizytę; <b>tylko id formularza i liczba pól, nigdy wartości ani nazwy pól</b>). Przy <code>pagehide</code> <code>form_abandon</code> niczego nie wysyła — zapisuje fakt w d2ma i wykonuje gałąź przy następnej odsłonie (ważne 24 h). Akcje: <code>content</code> (<code>slot</code> + <code>text</code> do 160 znaków albo <code>templateId</code> z <code>templates.content[]</code> koperty, wbudowane <code>pref-rooms</code>, <code>last-unit</code>, <code>last-unit-price</code> tylko jako zapas; pola z listy §13.9.2: <code>{{pref.rooms}}</code>, <code>{{pref.floor}}</code>, <code>{{pref.roomsLabel}}</code>, <code>{{unit.name|rooms|roomsLabel|floor|area|price|pricePerSqm|building}}</code> — <code>roomsLabel</code> = „2 pokoje”, „5 pokoi”; pole spoza listy = węzeł pominięty; tylko <code>textContent</code>; pole bez wartości albo brak slotu = bez zmiany i koniec gałęzi; „Wyczyść” i wycofanie zgody przywracają oryginał), <code>map_mark</code> (<code>by</code>: <code>rooms</code> | <code>floor</code> | <code>both</code>, <code>limit</code> 1–20, <code>className</code> bez <code>imp-</code> i <code>d2-ma-</code>; ranking z profilu bez sprzedanych, w grupie kolejność mapy; <code>d2estate.markProducts</code>, a bez niego piętro + <code>highlightObject</code> najlepszego lokalu, bez dymka), zdarzenia <code>ma_exit_intent</code>, <code>ma_engaged</code> (+ <code>seconds</code>, <code>scroll_pct</code>), <code>ma_form_abandon</code> (+ <code>form_id</code>), <code>ma_content</code> (+ <code>slot</code>, <code>template_id</code>). Na każdej akcji <code>cooldownMinutes</code> (0–10080).<br><br><b>Od ma.5</b>: <code>frequency: "every_time"</code> tylko dla <code>content</code>, <code>map_mark</code>, <code>map_order</code> — stan wraca na każdej odsłonie, gdy ścieżka już do akcji doszła (wymaga <code>minScript: "ma.5"</code>); akcja <code>map_order</code> (<code>by</code>, <code>limit</code> 1–50, domyślnie 20) układa listę 2destate (<code>setProductOrder</code>), bez tej metody pomijana; segmenty profilu z <code>ma_segment</code> (<code>ma_segment_exit</code> zdejmuje ten sam <code>params.segment</code>; retencja jak historia) dla <code>d2-ma-show-segment</code>; <code>content</code> także z <code>image: { src, alt }</code> (https z domeny strony albo <code>media.digi2.app</code>) i <code>video</code> (<code>youtube</code> / <code>vimeo</code> przez ramkę bez ciasteczek tylko po zgodzie marketingowej — wcześniej plakat i „Wideo po zgodzie na ciasteczka”; <code>mp4</code> jako <code>&lt;video&gt;</code>); analityka pól formularza: <code>ma_form_field</code> (<code>form_id</code>, <code>field_name</code>, <code>time_ms</code>, <code>clicks</code>) przy porzuceniu albo wysłaniu, bez wartości, bez haseł, do 20 pól. Kanał z <code>via</code> (§13.10) strona pomija z <code>console.warn</code> — e-mail, SMS ani telefonu nie zleca przeglądarka, tylko lead po naszej stronie (MA-D30); <code>webhook</code> z koperty v0 bez zmian.<br><br><b>Od ma.17 (§13.14, 2destate core 1.7.0)</b> — wyszukiwarka: liczą się tylko zmiany z <code>source: "user"</code> (<code>"api"</code> = skrypt, np. nasze <code>prefer_filters</code>). Wyzwalacz <code>search_filter</code> (<code>when: { rooms?, floor?, minCount? }</code>, klucze jak <code>type_view</code>; filtr gościa zawiera tę liczbę pokoi / piętro; wyzwalacza sortowania nie ma). Akcja <code>prefer_filters</code> (<code>by: rooms | floor | both</code>) — <code>setFilters</code> z preferencji profilu raz na wizytę, pomijana, gdy gość już filtrował w tej wizycie albo brak preferencji; czeka na mapę. <code>map_order</code> układa też listę wyników i ustępuje sortowaniu wybranemu przez gościa do końca wizyty. Profil: stan <code>filters</code> i <code>sort</code>; <code>pref.rooms</code> / <code>pref.floor</code> z ostatniego filtra tylko przy pustej historii obejrzeń. Popup <code>promo-filter</code> wbudowany bez lokalu: „Szukasz mieszkania 2-pokojowego? Pokażemy wolne lokale i aktualne promocje.” (ma.29: <code>N-pokojowego</code> dla każdego N ≥ 1 z <code>pref.rooms</code> — jedna liczba, filtr [2, 3] daje 2; bez <code>pref.rooms</code> pominięty; <code>templates.popup[]</code> o tym id wygrywa; szablon koperty bez <code>{{unit.*}}</code> otwiera się też bez lokalu). Zdarzenia GA4 bez danych gościa: <code>view_item_list</code> (<code>item_list_name: "wyszukiwarka"</code>, <code>filters: "rooms=2|3;floor=1;area=40-60;price=-700000;status=available;building=B"</code>, <code>filter_count</code>, <code>matching</code>, <code>total</code>, <code>item_list_sort: "price_asc"</code>, debounce 500 ms), <code>select_item</code> przy kliku w listę, <code>view_flat</code> (<code>flat_*</code>, <code>view_source: "wyszukiwarka" | "mapa"</code>); wyłącznik <code>d2-ma-search-events="off"</code>. Kontekst leadu dostaje „filtrował: …”. <b>ma.18</b>: zmiana filtra trafia do profilu i scenariuszy raz, po 500 ms ciszy (suwak = jedno <code>search_filter</code>); liczy się tylko <code>source: "user"</code>; <code>item_list_sort</code> tylko dla price / area / floor; <code>digi2.ma.clear()</code> zeruje też filtry wyszukiwarki (ma.26: każde pole jawnie <code>null</code>, bo core scala filtry; pola dotknięte przez gościa zostają); <code>prefer_filters</code>, którego core nie przyjął (pole dotknięte, brak panelu), nie liczy się i wraca przy następnej wizycie (ma.26). <b>ma.19</b>: zmiana czekająca na te 500 ms zapisuje się od razu przy wysyłce formularza (jest w kontekście leadu; akcje <code>search_filter</code> mogą się wtedy wykonać), z czasem ostatniej zmiany; <b>ma.20</b>: przy <code>pagehide</code> tylko fakt w d2ma — bez akcji scenariusza w chwili wyjścia i bez odtwarzania przy następnej odsłonie; <b>ma.21</b>: zdarzenia GA4 wyszukiwarki mają każdy klucz kontraktu, brak wartości = <code>undefined</code> (zmienna DLV w GTM nie bierze wartości z poprzedniego pushu); lista <code>custom</code> nie daje zdarzenia, a następne idzie bez <code>item_list_sort</code>.<br><br><b>Od ma.41</b>: <code>templates.popup[].design</code> (<code>placement</code>, <code>colors.*</code>, <code>backgroundImage.*</code>, <code>typography.*</code>, <code>radiusPx</code>, <code>cta.*</code>, <code>imageLayout</code>, <code>spacing</code>, <code>overlay</code>, <code>behavior.*</code>): tylko wartości z list, zła wartość = <code>console.warn</code> i pominięcie pola; Esc, fokus i aria zostają; <code>overlay: "none"</code> zostawia stronę klikalną i przewijalną; krzyżyk znika tylko przy przycisku <code>close</code> na ekranie; w pasku <code>bar-*</code> obraz to miniatura 48 px. <code>templates.content[].action</code>: <code>text</code>, <code>html</code> (<code>rich[]</code>, nigdy <code>innerHTML</code>), <code>image</code>, <code>hide</code>, <code>show</code>, <code>attr</code> (<code>alt</code>, <code>title</code>, <code>aria-label</code>, <code>href</code>, <code>src</code>); cel: <code>selector</code> szablonu albo <code>[d2-ma-slot]</code>, najwyżej 20 elementów, nigdy w <code>[d2-ma-popup]</code> ani wokół niego, nigdy <code>body</code>, <code>script</code>, <code>iframe</code> itp., także przez klasę; krok dalej wymaga <code>slot</code>; „Wyczyść”, wycofanie zgody i nowa rewizja scenariusza cofają zmiany, poza zwykłym tekstem w slocie bez selektora.<br><br><b>Od ma.39 (silnik strony)</b>: jedno miejsce rozpoznaje <code>2destate</code> i <code>3destate</code>. Na 3destate <code>map_mark</code> i <code>map_order</code> się nie wykonują: <code>ma:action</code> z <code>status: "skipped"</code>, <code>reason: "engine_3destate"</code>, raz na odsłonę, bez zużycia częstotliwości; gałąź idzie dalej. Na obu silnikach częstotliwość tych akcji zużywa się dopiero po wykonaniu. Od ma.40 tak samo <code>prefer_filters</code> na 3destate. Pobranie koperty dokleja <code>?s=ma.N</code>, a <code>&amp;e=2destate|3destate</code> tylko, gdy silnik widać, bez identyfikatora gościa; to żądanie idzie przed zgodą, bo koperta niesie <code>consentRequired</code>.',
      code: "// Wersja skryptu na stronie (ma.28)\ndigi2.ma.version;      // np. \"ma.29\" — sprawdzenie po podmianie tagu\n\n// Zdarzenie zachowania z widżetu (ma.34, d2-ma-hot-lead); false = nieprzyjęte\ndigi2.ma.event('card_download', { unitId: uuid });\ndigi2.ma.event('plan_dwell', { unitId: uuid, seconds: 30 });\n\n// Profil i historia (np. sekcja „co o Tobie wie strona\")\ndigi2.ma.profile();     // { visitorId, visits, lead, views, pref: { rooms, floor }, lastUnit, segment, … }\ndigi2.ma.history();     // obejrzane lokale, od najstarszego\ndigi2.ma.context();     // ma.16: { text, json } do pól d2ma_context / d2ma_context_json, null bez zgody\ndigi2.ma.touchpoints(); // ma.33: { v: 1, items } — źródło każdej wizyty (UTM, click_type, referrer_host, landing_path); tylko przy wyrażonej zgodzie (także gdy niewymagana), inaczej items: []; brak pola = pusta wartość\ndigi2.ma.parseTouchpoint(href, referrer); // ma.33: jeden wpis bez zapisu i bez zgody (bez argumentów: ta strona)\ndigi2.ma.fillContext(form);   // ma.16: wpisz pola teraz (np. przed budową body webhooka)\ndigi2.ma.profile().filters;   // ma.17: ostatni filtr gościa w wyszukiwarce 2destate, .sort — jego sortowanie w tej wizycie\n\n// Inne źródło obejrzeń niż 3D Estate / 2destate\ndigi2.ma.track({ unitId: 'B.1.05', name: 'B.1.05', rooms: 2, floor: 1, area: 52.3, price: 689000 });\ndigi2.ma.lead();        // znacznik lead bez dataLayer\ndigi2.ma.visitorId();   // ma.12, d2-ma-hot-lead: id do formularza 2destate; null bez zgody (ma.35: także przy consentRequired: false); po odmowie nowe id (ma.36) — czytaj na bieżąco, nie zapamiętuj\ndigi2.ma.leadToken(resp.ma_token); // ma.36: token prawdziwego leada z odpowiedzi zgłoszenia 2destate; false = nieprzyjęty (zgoda, format, exp, site)\n// albo: window.dispatchEvent(new CustomEvent('d2:lead-token', { detail: { token: resp.ma_token } })) — nigdy dataLayer\n\n// Koperta\ndigi2.ma.load({ version: '0', … });  // obiekt albo URL z digi2.app / api.2destate.com (ma.23)\ndigi2.ma.reload();                   // nowa rewizja, nowy wynik telefonu\n\n// Pokaz\ndigi2.ma.simulateReturn();           // jak przycisk d2-ma-simulate-return\ndigi2.ma.clear();                    // kasuje bazę d2ma (Promise)\ndigi2.ma.highlight();                // ponowne podświetlenie lokali na mapie\ndigi2.ma.apply();                    // ma.5: warunki d2-ma-show-* od nowa po zmianie DOM\ndigi2.ma.allows(el);                 // ma.5: czy element wolno pokazać\n\n// Zdarzenia\ndigi2.on('ma:action', function (a) { /* { scenarioId, nodeId, do, … }; ma.39: status: \"skipped\" + reason, gdy akcja się nie wykonała (engine_3destate…) */ });\n// także 'ma:ready', 'ma:view', 'ma:change'\n\n// Stan „brak zgody\" — także po wycofaniu zgody w trakcie wizyty\ndigi2.on('ma:change', function (c) {\n  if (c.tracking === false) { /* baza skasowana, profile() === null */ }\n});\n\n// Treść webhooka (POST JSON, bez danych osobowych):\n// { scenarioId, revision, nodeId, channel, template, unit, segment,\n//   visitorId, testOnly: true, ts }"
    },

    examples: [
      { title: 'Strona demo na digi2.agency', desc: 'Przypięta wersja (nie <code>@latest</code>), koperta z digi2.app, baner zgód z Consent Mode (decyzja Piotra z 19.10.2026). Koperta demo ma <code>consentRequired: false</code>, żeby działał <code>demoState</code>, a zgodę wymusza atrybut.', code: '<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@v1.9.0-ma.1/dist/digi2-loader.min.js"\n  d2-ma="https://digi2.app/api/ma/scenario/osiedle-demo.json"\n  d2-ma-consent-required="true"\n  d2-ma-highlight\n  d2-ma-refresh="30"\n  d2-popups></script>' },
      { title: 'Scenariusz „Powrót do lokalu"', desc: 'Obejrzał dowolny lokal → wrócił po godzinie → bez leada → popup z ostatnim lokalem (raz na lokal) i segment do GA4.', code: '{ "scenarioId": "powrot-do-lokalu", "revision": 1, "active": true,\n  "nodes": [\n    { "id": "t1", "type": "trigger", "when": { "event": "unit_view", "unitIds": [] } },\n    { "id": "t2", "type": "trigger", "when": { "event": "return_visit", "afterHours": 1 } },\n    { "id": "c1", "type": "condition", "if": { "lead": false } },\n    { "id": "a1", "type": "action", "do": "popup", "template": "last-unit",\n      "cta": "open_unit", "frequency": "once_per_unit" },\n    { "id": "a2", "type": "action", "do": "datalayer", "event": "ma_segment",\n      "params": { "segment": "powrot-do-lokalu" } }\n  ],\n  "edges": [["t1","t2"], ["t2","c1"], ["c1","a1"], ["c1","a2"]] }' },
      { title: 'Nagłówek według preferencji (ma.4)', desc: 'Po dwóch obejrzanych lokalach 2-pokojowych nagłówek z <code>d2-ma-slot="hero-title"</code> dostaje nowy tekst, a do GA4 idzie <code>ma_content</code>.', code: '{ "scenarioId": "naglowek", "revision": 1, "active": true,\n  "nodes": [\n    { "id": "t1", "type": "trigger", "when": { "event": "type_view", "rooms": 2, "minCount": 2 } },\n    { "id": "a1", "type": "action", "do": "content", "slot": "hero-title", "text": "{{pref.rooms}} pokoje z ogródkiem" },\n    { "id": "a2", "type": "action", "do": "datalayer", "event": "ma_content" }\n  ],\n  "edges": [["t1", "a1"], ["a1", "a2"]] }' },
      { title: 'Zaangażowany z kampanii (ma.4)', desc: 'Minuta aktywnie i połowa strony, wejście z Facebooka albo Instagrama → popup z ostatnim lokalem.', code: '{ "id": "t1", "type": "trigger", "when": { "event": "engagement", "minSeconds": 60, "minScrollPct": 50,\n  "utm": { "source": ["facebook", "instagram"] } } }' },
      { title: 'Strona testowa w repo', desc: 'Fikcyjne lokale, obie wyszukiwarki udawane, webhook nie wychodzi z przeglądarki.', code: 'npx serve -l 5175 .\n# http://localhost:5175/sandbox/ma.html  (koperta: sandbox/ma-koperta.json)' }
    ]
  };

  /* ══════════════════════ BOOKING ══════════════════════ */
  M.booking = {
    name: 'Booking — rezerwacja noclegu',
    short: 'Rezerwacje',
    cat: 'Rezerwacje',
    flag: 'd2-booking="pk_…"',
    icon: 'form',
    size: '65,2 KB min',
    auto: true,
    tagline: 'Rezerwacja noclegu ze strony: formularz gościa, kalendarz wolnych terminów, cena, płatność, powrót z płatności i obsługa rezerwacji z linku w mailu — na publicznym API klucza strony 2destate.',
    desc: 'Moduł rozmawia z <b>publicznym API klucza strony</b> 2destate (<code>/api/v1/public/sites/{public_key}/…</code>, kontrakt v1 z <code>tests/fixtures/booking-api/</code>). Klucz strony (<code>pk_…</code>) jest publiczny — siedzi w HTML-u strony i tak ma być: backend broni się listą domen klucza, limitami i cenami liczonymi po swojej stronie. O to, które pola ma formularz i które są wymagane, pyta <code>/config</code> — <b>raz na stronę</b>. Sprawdzanie w przeglądarce jest po to, żeby nie męczyć gościa, a nie żeby wyrokować: decyduje backend, a odmowa <code>422</code> trafia na pole, które wskazał.',

    structures: [
      { title: 'Formularz gościa', tree: [
        { l: 'Form block', t: 'form', a: [['d2-booking-form']], c: [
          { l: 'Div — pole z etykietą', t: 'div', a: [['d2-booking-field-group']], c: [
            { l: 'Label — „Imię i nazwisko”', t: 'label' },
            { l: 'Input', t: 'input', a: [['d2-booking-field', 'name']] },
            { l: 'Text — komunikat pola', t: 'text', a: [['d2-booking-error', 'name']], n: 'opcjonalny — bez niego moduł dokłada własny' }
          ]},
          { l: 'Div — e-mail', t: 'div', a: [['d2-booking-field-group']], c: [
            { l: 'Input', t: 'input', a: [['d2-booking-field', 'email']] }
          ]},
          { l: 'Div — telefon', t: 'div', a: [['d2-booking-field-group']], c: [
            { l: 'Input', t: 'input', a: [['d2-booking-field', 'phone']] }
          ]},
          { l: 'Div — dorośli / dzieci', t: 'div', a: [['d2-booking-field-group']], c: [
            { l: 'Input — dorośli', t: 'input', a: [['d2-booking-field', 'adults']] },
            { l: 'Input — dzieci', t: 'input', a: [['d2-booking-field', 'children']] },
            { l: 'Input — wiek dzieci', t: 'input', a: [['d2-booking-field', 'child_ages']], n: 'np. „7, 9” — jeden wiek na dziecko' }
          ]},
          { l: 'Text Area — uwagi', t: 'textarea', a: [['d2-booking-field', 'note']] },
          { l: 'Submit button', t: 'button', n: 'własna wysyłka Webflow nie wchodzi — moduł ją zatrzymuje' },
          { l: 'Text — komunikat formularza', t: 'text', a: [['d2-booking-error', 'form']] }
        ]}
      ]},
      { title: 'Kalendarz i cena', tree: [
        { l: 'Div — kalendarz', t: 'div', a: [['d2-booking-calendar']], n: 'pusty — moduł rysuje w nim miesiąc sam' },
        { l: 'Text — komunikat o terminie', t: 'text', a: [['d2-booking-status']], n: 'opcjonalny; bez niego moduł dokłada własny w kalendarzu' },
        { l: 'Div — rozbicie ceny', t: 'div', a: [['d2-booking-breakdown']], c: [
          { l: 'Div — wiersz (wzorzec)', t: 'div', a: [['d2-booking-line']], n: 'opcjonalny; moduł klonuje go pod każdą linię odpowiedzi', c: [
            { l: 'Text — nazwa', t: 'text', a: [['d2-booking-line-label']] },
            { l: 'Text — ile x ile', t: 'text', a: [['d2-booking-line-detail']] },
            { l: 'Text — kwota', t: 'text', a: [['d2-booking-line-amount']] }
          ]}
        ]},
        { l: 'Text — razem', t: 'text', a: [['d2-booking-total']] },
        { l: 'Text — teraz do zapłaty', t: 'text', a: [['d2-booking-deposit']] },
        { l: 'Text — reszta później', t: 'text', a: [['d2-booking-balance']] }
      ]},
      { title: 'Wygląd zapasowy — jeden pusty Div', tree: [
        { l: 'Div — cały widget', t: 'div', a: [['d2-booking-widget']], n: 'pusty; moduł dorysowuje w nim wszystko, czego strona nie ma: kalendarz, komunikat, formularz, rozbicie ceny, sumę, przycisk i znak digi2' }
      ]},
      { title: 'Lista obiektów — wzorzec karty klonowany pod każdy obiekt', tree: [
        { l: 'Div — lista', t: 'div', a: [['d2-booking-results']], c: [
          { l: 'Text — komunikat odmowy', t: 'text', a: [['d2-booking-results-message']], n: 'to jedyna kontrolka, której moduł szuka <b>w środku</b> listy; postawiona obok nie zostanie zapełniona, a moduł dorysuje sobie drugą w liście' },
          { l: 'Link block — karta (wzorzec)', t: 'link', a: [['d2-booking-template'], ['d2-booking-link']], n: 'moduł zabiera go ze strony i klonuje pod każdy obiekt odpowiedzi — z klasami i zagnieżdżeniem, jakie dał Designer; zabiera <b>każdy</b> wzorzec, nie tylko pierwszy', c: [
            { l: 'Image — zdjęcie', t: 'image', a: [['d2-booking-bind', 'image']] },
            { l: 'Heading — nazwa', t: 'heading', a: [['d2-booking-bind', 'name']] },
            { l: 'Text — miasto z kodem', t: 'text', a: [['d2-booking-bind', 'city_line']] },
            { l: 'Text — cena', t: 'text', a: [['d2-booking-bind', 'price']] }
          ]}
        ]},
        { l: 'Button — pokaż więcej', t: 'button', a: [['d2-booking-more']], n: 'obok listy, nie w niej: wiersze są dopisywane na koniec' },
        { l: 'Text — ile obiektów', t: 'text', a: [['d2-booking-count']] },
        { l: 'Div — nic nie znaleziono', t: 'div', a: [['d2-booking-results-empty']], n: 'pokazywany tylko wtedy, gdy odpowiedź jest pusta' }
      ]},
      { title: 'Wyszukiwanie nad listą', tree: [
        { l: 'Form block — szukanie', t: 'form', a: [['d2-booking-search']], n: 'własna wysyłka Webflow nie wchodzi — moduł przejmuje submit i szuka bez przeładowania strony', c: [
          { l: 'Input — przyjazd (type date)', t: 'input', a: [['d2-booking-search-field', 'check_in']] },
          { l: 'Input — wyjazd (type date)', t: 'input', a: [['d2-booking-search-field', 'check_out']] },
          { l: 'Input — dorośli (type number)', t: 'input', a: [['d2-booking-search-field', 'adults']] },
          { l: 'Input — dzieci (type number)', t: 'input', a: [['d2-booking-search-field', 'children']] },
          { l: 'Select — miasto', t: 'select', a: [['d2-booking-search-field', 'location']], n: 'opcje są z Designera; przy <code>d2-booking-location</code> na formularzu albo na liście pole dostaje przypięte miasto i jest wyłączone' },
          { l: 'Submit button — „Szukaj”', t: 'button' }
        ]},
        { l: 'Div — lista', t: 'div', a: [['d2-booking-results']], n: 'ta sama lista co wyżej; szukanie wraca na jej pierwszą stronę' }
      ]},
      { title: 'Podstrony gościa — powrót z płatności i obsługa rezerwacji', tree: [
        { l: 'Div — powrót z płatności', t: 'div', a: [['d2-booking-return']], n: 'pusty; podstrona, pod którą operator odsyła gościa (?booking=…&payment=…)' },
        { l: 'Div — obsługa rezerwacji', t: 'div', a: [['d2-booking-manage']], n: 'pusty; podstrona z linku w mailu (#token=…). Postaw obok niej także d2-booking-return: dopłata wraca tu bez tokenu' }
      ]}
    ],

    attrs: [
      { g: 'Tag loadera', a: 'd2-booking', v: 'pk_…', el: 'tag loadera', req: true, d: 'Klucz strony. <b>Publiczny i nietajny</b> — ma siedzieć w HTML-u: backend broni się listą domen klucza, limitami i cenami po swojej stronie. Loader czyta go surowym <code>getAttribute</code>, nie <code>digi2.attr</code>, bo klucz nie jest wartością responsywną.', n: 'cała rodzina <code>d2-booking-*</code> to jeden moduł <code>booking</code> — jak przy <code>d2-ma-*</code>' },
      { g: 'Tag loadera', a: 'd2-booking-api', v: 'https://…', el: 'tag loadera', d: 'Adres API, domyślnie <code>https://api.2destate.com/api/v1</code>. Tylko <code>https</code> (przy pracy lokalnej też <code>http://localhost</code>); inny adres to ostrzeżenie w konsoli i adres domyślny. Czytany surowo, bo może zawierać <code>;</code> i <code>@</code>.' },
      { g: 'Tag loadera', a: 'd2-booking-product', v: 'uuid | slug', el: 'tag loadera, formularz, kalendarz albo widget', d: 'Obiekt, który strona rezerwuje — uuid albo slug. Kalendarz może wybrać inny. <b>Nieobowiązkowy:</b> gdy atrybutu nie ma nigdzie, moduł czyta <code>?apartament=&lt;slug&gt;</code> z adresu — tak jedna strona rezerwacji obsługuje całą kolekcję CMS (<code>/rezerwacja?apartament=apartament-rynek-wroclaw</code>). Atrybut zawsze wygrywa z adresem.', n: 'referencję (uuid albo slug) moduł rozwiązuje <b>raz na wizytę</b> przez <code>GET /products/&lt;ref&gt;</code> — jedyną trasę kontraktu, której ścieżka bierze referencję — a do <code>/availability</code>, <code>/quote</code> i <code>/bookings</code> wysyła <code>id</code> z tej odpowiedzi, bo wszystkie trzy mają w ścieżce <code>{product_id}</code>. Ta sama odpowiedź niesie <code>pet_fee</code>. Gdy odczyt produktu się nie uda, moduł to loguje i wysyła referencję tak, jak napisała ją strona — decyduje backend' },
      { g: 'Formularz', a: 'd2-booking-form', v: '—', el: 'Form block', req: true, d: 'Formularz rezerwacji. Własna wysyłka Webflow się nie wykonuje — moduł ją zatrzymuje i sam zakłada rezerwację.' },
      { g: 'Formularz', a: 'd2-booking-field', v: 'name | email | phone | note | adults | children | child_ages | pets | pets_over_threshold', el: 'Input / Select / Text Area / Checkbox', req: true, d: 'Pole formularza. O to, które pola są w ogóle pytane, mówi <code>form_fields</code> z <code>/config</code>: <code>off</code> = pole (razem z opakowaniem <code>d2-booking-field-group</code>, więc i etykietą) znika ze strony i nigdy nie jedzie w żądaniu, <code>optional</code> = jedzie tylko wypełnione, <code>required</code> = blokuje wysyłkę komunikatem na polu. <code>name</code> i <code>email</code> są wymagane zawsze, <code>pets_over_threshold</code> idzie za <code>pets</code> (znika z nim, ale samo nie blokuje), <code>child_ages</code> za <code>children</code>, a <code>adults</code> nie wyłącza się nigdy — przy <code>children: off</code> to ono jest liczbą gości.', n: 'nieznana wartość = ostrzeżenie w konsoli i pole nie jedzie w żądaniu' },
      { g: 'Formularz', a: 'd2-booking-field-group', v: '—', el: 'opakowanie pola', d: 'Opcjonalne. Usuwane razem z polem, którego klucz nie pyta — więc etykieta znika z nim. Bez niego ginie samo pole.', n: 'gdy w jednym opakowaniu jest kilka pól i pozostałe zostają, opakowanie zostaje — ginie tylko to jedno pole i jego komunikat, więc wyłączone „dzieci” nie zabiera ze sobą liczby dorosłych' },
      { g: 'Formularz', a: 'd2-booking-error', v: 'nazwa pola | form', el: 'dowolny element w formularzu', d: 'Gdzie wpisać komunikat tego pola; <code>form</code> to komunikat całego formularza. Brakujący moduł dokłada obok pola i oznacza <code>d2-booking-built</code>.' },
      { g: 'Formularz', a: 'd2-booking-hint', v: 'pets_over_threshold', el: 'dowolny element w formularzu', d: 'Gdzie trafia zdanie, o którym decyduje <b>klucz</b>. Dziś jedno: przy <code>pets_over_threshold</code> moduł wpisuje <code>pet_fee</code> obiektu — próg wagi, kwotę i to, czy liczy się za pobyt, czy za noc („Zwierzę powyżej 10 kg: 50,00 zł za pobyt.”). Bez tego zdania na pytanie nie da się odpowiedzieć: nic na stronie nie mówi, jaki jest próg. Widget rysowany przez moduł dokłada takie miejsce sam.', n: 'brak <code>pet_fee</code> (albo kwota, której nie da się sformatować) zostawia miejsce puste i oznaczone <code>d2-booking-empty</code>; <code>weight_threshold_kg: null</code> zdejmuje ze zdania próg zamiast wypisywać dziurę' },
      { g: 'Kalendarz', a: 'd2-booking-calendar', v: '—', el: 'dowolny Div', d: 'Kalendarz. Wystaw pusty element — moduł rysuje w nim miesiąc i nie rusza tego, co Designer włożył tam wcześniej. Obiekt bierze z <code>d2-booking-product</code> na tym elemencie albo na tagu loadera, a bez atrybutu — z <code>?apartament=</code> w adresie. Wolne terminy to <code>GET /products/&lt;ref&gt;/availability</code>, <b>jedno okno na miesiąc</b>, pamiętane do końca wizyty — chodzenie tam i z powrotem nie pyta API (ani jego limitu) drugi raz o ten sam miesiąc.', n: 'reguły są z odpowiedzi, nie ze strony: <code>min_units</code>, <code>max_units</code>, <code>lead_time_hours</code>, <code>buffer_minutes</code> i zajęte okresy — to całość tego, co odpowiedź niesie. <b><code>buffer_minutes</code> poszerza tylko odcinek o <code>kind: "booking"</code></b>; <code>blackout</code> (blokada właściciela) jest oknem dokładnym i nie rośnie o bufor — „remont do 12:00” znaczy, że o 12:00 lokal jest wolny, więc noce obok blokady zostają do wzięcia. Tak liczy backend (<code>rental_violations</code> w <code>services/rental_availability.py</code>), a kalendarz, który poszerzałby każdy odcinek, wyszarzałby noce, które backend przyjmie. Nieznany <code>kind</code> moduł liczy jak <code>booking</code>, z buforem: noc wyszarzoną nadmiarowo da się odzyskać, podwójnej rezerwacji nie. Odmowa nazywa powód: <code>period_taken</code> w rezerwacji, <code>blackout_overlap</code> w blokadzie, <code>buffer_conflict</code> tylko na nocach, które zabrał bufor. Reguły dni przyjazdu w kontrakcie nie ma, więc kalendarz nie zamyka żadnego dnia tygodnia: każdy dzień może być przyjazdem. Kalendarz liczy noce, więc zawsze wysyła <code>unit: "day"</code>, bez względu na kolejność <code>allowed_units</code>; obiektu bez <code>day</code> nie da się zarezerwować kalendarzem i każdy dzień odpowiada <code>unit_not_allowed</code>' },
      { g: 'Kalendarz', a: 'd2-booking-status', v: '—', el: 'dowolny element', d: 'Gdzie moduł wpisuje wybrany termin i każdą odmowę dotyczącą pobytu — dla oczu i dla czytnika ekranu. Gdy strona go nie ma, moduł dokłada własny w kalendarzu (<code>role="status"</code>, <code>aria-live="polite"</code>); strona może postawić swój gdziekolwiek, a zdanie dostają wszystkie.' },
      { g: 'Kalendarz', a: 'd2-booking-day', v: 'YYYY-MM-DD', el: 'budowane przez moduł', set: true, d: 'Jeden dzień — zawsze prawdziwy <code>&lt;button type="button"&gt;</code> w siatce <code>role="grid"</code>. Miesiąc to jedno zatrzymanie w Tabie, a po dniach chodzą strzałki (dzień), <code>↑↓</code> (tydzień), <code>Home/End</code> (tydzień), <code>PageUp/PageDown</code> (miesiąc). <code>Enter</code> i spacja zostawiamy przeglądarce, bo <code>&lt;button&gt;</code> i tak klika.', n: 'dzień, którego nie można wybrać, ma <code>aria-disabled="true"</code>, a nie <code>disabled</code>: dnia, do którego nie można dojechać, nie da się nikomu wytłumaczyć. Zostaje na focusie, powód jest w <code>aria-label</code>, a kliknięcie odpowiada tym powodem' },
      { g: 'Kalendarz', a: 'd2-booking-day-busy', v: '—', el: 'dzień', set: true, d: 'Noc, której nikt nie weźmie: zajęta, zamknięta przez właściciela albo złapana przez bufor rezerwacji. Okres kończący się o lokalnej północy <b>zostawia swój ostatni dzień wolny</b> — kto wyjeżdża tego ranka, nie spał tam — więc pierwszy dzień zajętego okresu wciąż może być czyimś <i>wyjazdem</i>.' },
      { g: 'Kalendarz', a: 'd2-booking-day-past', v: '—', el: 'dzień', set: true, d: 'Dzień przed najbliższym możliwym pobytem: pierwszą lokalną północą po chwili „teraz plus <code>lead_time_hours</code>”, więc <b>nigdy dziś</b>, także przy <code>0</code>.', n: 'kliknięcie takiego dnia odpowiada „ten dzień już minął”, a nie „termin został właśnie zajęty”: wczoraj nikt nie zajął, a <code>aria-label</code> tej kratki mówi to samo' },
      { g: 'Kalendarz', a: 'd2-booking-day-selected', v: '—', el: 'dzień', set: true, d: 'Wybrany przyjazd. Pierwsze kliknięcie to przyjazd, drugie — wyjazd. Dzień przed przyjazdem (albo sam przyjazd) zaczyna wybór od nowa, a dzień, którego reguły nie puszczają, mówi dlaczego i <b>zostawia przyjazd na miejscu</b>.' },
      { g: 'Kalendarz', a: 'd2-booking-day-checkout', v: '—', el: 'dzień', set: true, d: 'Wybrany wyjazd. Dopiero pełny zakres idzie do <code>digi2.booking.select()</code>: pół pobytu to nie pobyt, a brakująca długość nigdy nie staje się po cichu jedną nocą.' },
      { g: 'Kalendarz', a: 'd2-booking-day-in-range', v: '—', el: 'dzień', set: true, d: 'Noc między przyjazdem a wyjazdem.' },
      { g: 'Kalendarz', a: 'd2-booking-day-today', v: '—', el: 'dzień', set: true, d: 'Dziś w strefie obiektu; razem z <code>aria-current="date"</code>.' },
      { g: 'Kalendarz', a: 'd2-booking-calendar-ready', v: '—', el: 'kalendarz', set: true, d: 'Miesiąc narysowany. W trakcie pobierania okna kalendarz ma <code>d2-booking-busy</code>.' },
      { g: 'Kalendarz', a: 'd2-booking-calendar-built', v: '—', el: 'budowane przez moduł', set: true, d: 'Opakowanie rysowanego kalendarza; w środku <code>d2-booking-calendar-head</code>, <code>-month</code>, <code>-prev</code>, <code>-next</code>, <code>-grid</code>, <code>-weekdays</code> i puste kratki <code>d2-booking-day-blank</code> — po tych atrybutach pisz CSS.' },
      { g: 'Cena', a: 'd2-booking-breakdown', v: '—', el: 'dowolny Div', d: 'Gdzie trafiają wiersze ceny. Cenę moduł bierze z <code>POST /products/&lt;ref&gt;/quote</code>, gdy znany jest i termin, i skład grupy — <b>raz na ustabilizowaną zmianę</b> (300 ms), bo kliknięcie zakresu i wpisanie liczby osób to jedna decyzja, nie pięć. Wolniejsza odpowiedź na starsze pytanie nigdy nie nadpisuje nowszej. I <b>jedno zapytanie na pytanie</b>: formularz zgłasza każdy wciśnięty klawisz, także w polach, które ceny nie zmieniają, więc moduł pamięta ostatnio wysłane ciało — ustabilizowana zmiana, której żądanie byłoby co do bajtu tym samym, dostaje odpowiedź, którą już trzymamy, i nie kosztuje wywołania.', n: 'skład grupy moduł bierze z <b>pierwszego <code>[d2-booking-form]</code> na stronie</b> (termin jest jeden na stronę, więc i cena) i wysyła tylko skład: <code>guests</code>, <code>adults</code>, <code>children</code>, <code>child_ages</code>, <code>pets</code>, <code>pets_over_threshold</code>. Imię, e-mail i uwagi nie są sprawą ceny i nie jadą do <code>quote</code> — jadą z rezerwacją. Strona bez formularza dostaje cenę za sam termin' },
      { g: 'Cena', a: 'd2-booking-line', v: '—', el: 'wiersz w rozbiciu', d: 'Opcjonalny <b>wzorzec</b>: pierwszy, który strona ma, moduł pamięta i klonuje pod każdą linię odpowiedzi — rozbicie ceny zostaje w stylu strony. Bez wzorca moduł rysuje własne wiersze i oznacza je <code>d2-booking-built</code>.', n: 'moduł dokłada na wierszu <code>d2-booking-line-kind</code> (<code>base</code>, <code>season</code>, <code>weekend</code>, <code>season_weekend</code>, <code>extra_guest_fee</code>, <code>pet_fee</code>, <code>cleaning_fee</code>, <code>length_discount</code>) i <code>d2-booking-line-negative</code> przy kwocie poniżej zera' },
      { g: 'Cena', a: 'd2-booking-line-label', v: '—', el: 'w wierszu', d: 'Nazwa linii. Wygrywa <code>label</code> z odpowiedzi; inaczej <code>kind</code> dostaje zdanie z jednej tablicy w module, a nieznany rodzaj idzie po swojej nazwie. <code>length_discount</code> ma stawkę w nazwie, gdy odpowiedź ją podaje — a bez niej, gdy podaje <code>null</code> (klucz z <code>merge_cleaning_fee</code>). <code>percent: "10"</code> to dziesięć procent, więc gość czyta „10%”.' },
      { g: 'Cena', a: 'd2-booking-line-detail', v: '—', el: 'w wierszu', d: 'Ilość i stawka z odpowiedzi obok siebie (przy ilości większej od 1). Moduł jednego przez drugie <b>nie mnoży</b>.' },
      { g: 'Cena', a: 'd2-booking-line-amount', v: '—', el: 'w wierszu', d: 'Kwota linii, sformatowana <code>Intl.NumberFormat</code> w języku z <code>/config</code> i w <b>walucie z odpowiedzi</b>.' },
      { g: 'Cena', a: 'd2-booking-total', v: '—', el: 'dowolny element', d: '<code>amount_total</code> z odpowiedzi — <b>nigdy</b> suma wierszy policzona w przeglądarce: każdy rabat, dopłata i zaokrąglenie właściciela liczą się po stronie serwera.' },
      { g: 'Cena', a: 'd2-booking-deposit', v: '—', el: 'dowolny element', d: 'Ile płaci się teraz (<code>deposit_amount_minor</code>). Kwoty w groszach moduł dzieli tylko przez tyle cyfr, ile dla tej waluty podaje <code>Intl</code> (dwie dla PLN, zero dla JPY, trzy dla TND) — nigdy przez wpisane na sztywno 100.' },
      { g: 'Cena', a: 'd2-booking-balance', v: '—', el: 'dowolny element', d: 'Ile zostaje na później (<code>balance_amount_minor</code>).' },
      { g: 'Cena', a: 'd2-booking-empty', v: '—', el: 'element z kwotą albo miejsce w karcie listy', set: true, d: 'Na elemencie kwoty, która nie ma czego pokazać: <code>null</code> jest pusty, a nie „0,00”. Tak samo na miejscu w karcie listy, dla którego odpowiedź nie miała wartości.' },
      { g: 'Lista obiektów', a: 'd2-booking-results', v: '—', el: 'dowolny Div', d: 'Lista obiektów z <code>GET /products</code>, czytana <b>raz na wizytę</b>. Wiersze są <b>dopisywane</b> na koniec, więc przycisk „pokaż więcej”, licznik i komunikat „nic nie znaleziono” stawia się <b>obok</b> listy, nie w niej — tam, gdzie zostawia je układ Webflow. Ten w środku moduł też wypełni i nigdy go nie usunie: wiersze po prostu staną za nim.', n: 'przy jednej liście na stronie sterowanie może stać gdziekolwiek; przy dwóch każda lista musi mieć swoje w środku, bo przycisk między nimi nie należy do żadnej' },
      { g: 'Lista obiektów', a: 'd2-booking-results-limit', v: 'liczba', el: 'lista', d: 'Ile obiektów pobiera jedna strona listy. Domyślnie <code>24</code>; klucz ma własny limit maksymalny.' },
      { g: 'Lista obiektów', a: 'd2-booking-results-link', v: 'adres z <code>{slug}</code> albo <code>{id}</code>', el: 'lista', d: 'Kształt adresu, pod który prowadzą karty tej listy — gdy wszystkie mają prowadzić tam samo. Czytany surowo, bo adres może zawierać <code>;</code> i <code>@</code>.' },
      { g: 'Lista obiektów', a: 'd2-booking-template', v: '—', el: 'dowolny element w liście', d: '<b>Wzorzec karty.</b> Moduł pamięta go, <b>zabiera ze strony</b>, zanim cokolwiek się pokaże, i klonuje pod każdy obiekt odpowiedzi. Klon traci <code>d2-booking-template</code> (także w środku), a dostaje <code>d2-booking-item</code>. Ze strony schodzi <b>każdy</b> wzorzec, nie tylko pierwszy: karta zbudowana w Collection List jest renderowana raz na element kolekcji, więc atrybut ma każda z nich, a moduł mówi w konsoli, ile ich znalazł.', n: 'wzorzec zostawiony na stronie byłby pustą kartą nad każdą prawdziwą — i to taką, której kolejne wczytanie listy nigdy nie usuwa' },
      { g: 'Lista obiektów', a: 'd2-booking-bind', v: 'name | project_name | city | city_line | address_line | rooms | area | floor | beds | max_guests | description | image | price | price_unit | …', el: 'dowolny element w karcie (także sama karta)', d: 'Jedno pole obiektu, jako <b>tekst</b>. Wiąże się <b>każde</b> pole kontraktu po własnej nazwie (<code>rental_kind</code>, <code>timezone</code>, <code>latitude</code>, <code>payment_mode</code>…), więc strona nie jest ograniczona do listy, którą ktoś wpisał w moduł. Cztery czyta się inaczej: <code>image</code> to <code>image_url</code> (na <code>&lt;img&gt;</code> <code>src</code> i <code>alt</code> z nazwy obiektu, na czymkolwiek innym tło), <code>price</code> to cena obiektu w walucie obiektu przez to samo <code>Intl</code>, co wycena (moduł i tu nic nie liczy), <code>price_unit</code> mówi, za co jest ta kwota („za noc”), a lista wartości (<code>amenities</code>, <code>allowed_units</code>, <code>image_urls</code>) jedzie po przecinku.', n: 'brak, <code>null</code>, <code>""</code> i obiekt (<code>pet_fee</code>, <code>prices</code>) zostawiają miejsce puste i oznaczone <code>d2-booking-empty</code> — nigdy słowa „null” ani „[object Object]”; nazwa, której odpowiedź nie ma wcale (literówka albo <code>constructor</code>), też nie wypisuje nic — pole musi być własnym polem obiektu; <code>false</code> (<code>requires_approval</code>) czyści miejsce jak brak wartości, a <code>true</code> zostawia je <b>dokładnie takie, jakie zbudował Designer</b> — tekst i cały układ w środku, razem z ikoną obok „na zapytanie” — i nie oznacza go jako puste; zadeklarowane <code>0</code> (parter) to odpowiedź, nie brak' },
      { g: 'Lista obiektów', a: 'd2-booking-link', v: '— | adres z <code>{slug}</code> albo <code>{id}</code>', el: 'Link block albo sama karta', d: 'Dokąd prowadzi karta. Bez wartości to <code>?apartament=&lt;slug&gt;</code> — dokładnie to zapytanie, które czyta strona rezerwacji, więc lista i rezerwacja pasują do siebie bez ustawiania czegokolwiek. Klient, u którego apartamenty są podstronami CMS pod własnymi adresami, wpisuje kształt: <code>/apartamenty/{slug}</code>. Kształt bez <code>{…}</code> dostaje referencję jako zapytanie (<code>/rezerwacja?apartament=…</code>).', n: '<code>{slug}</code> i <code>{id}</code> to dwie referencje, które strona rezerwacji umie rozwiązać; obie wychodzą zakodowane, a każde miejsce w kształcie bierze <b>swoje</b> pole. Obiekt, który nie ma referencji pod podany kształt — <code>slug</code> jest w kontrakcie nullowalny, a UUID w ścieżce <code>{slug}</code> to adres CMS, którego nie ma — zostaje <b>bez <code>href</code></b> i z <code>d2-booking-empty</code>, zamiast prowadzić pod adres, którego nie ma' },
      { g: 'Lista obiektów', a: 'd2-booking-more', v: '—', el: 'Button', d: 'Pobiera następną stronę listy (<code>limit</code> i <code>offset</code>) i <b>dopisuje</b> ją, więc gość nie traci tego, co już czytał. Chowa się, gdy odpowiedź mówi <code>has_more: false</code>; na czas pobierania jest wyłączony.', n: 'strona, której odmówiono, <b>zostawia offset</b> tam, gdzie był — następne kliknięcie pyta o tę samą stronę jeszcze raz, zamiast ją przeskoczyć; jedna odmowa trzyma przycisk: po <code>429</code> czeka dokładnie tyle sekund, ile powiedział <code>Retry-After</code>, bo otwarcie go od razu kupuje tylko następne <code>429</code>' },
      { g: 'Lista obiektów', a: 'd2-booking-count', v: '—', el: 'dowolny element', d: '<code>count</code> z odpowiedzi: wszystkie obiekty spełniające warunki, a nie te widoczne na ekranie.' },
      { g: 'Lista obiektów', a: 'd2-booking-results-empty', v: '—', el: 'dowolny element', d: 'Pokazywany <b>tylko</b> wtedy, gdy odpowiedź nic nie przyniosła. Do czasu odpowiedzi jest schowany, a przy <b>każdej</b> odmowie — także tej, którą moduł wypisuje sam — chowa się z powrotem: odmowa to nie oferta, w której nic nie ma, i te dwa zdania nigdy nie stoją razem.' },
      { g: 'Lista obiektów', a: 'd2-booking-results-message', v: '—', el: 'dowolny element <b>w liście</b>', d: 'Zdanie odmowy, naszymi słowami. Tekst backendu jest do logów. <code>400</code> na tej trasie dotyczy tego, o co pytał filtr: terminu (<code>invalid_stay</code>), a gdy szukanie podało też miasto — terminu i miejsca (<code>invalid_search</code>). <code>429</code> mówi, ile czekać, z nagłówka <code>Retry-After</code>.', n: 'inaczej niż przycisk, licznik i „nic nie znaleźliśmy” (te mogą stać też obok listy) moduł szuka go <b>w środku</b> listy; gdy go nie ma, dokłada własny z <code>role="status"</code> i <code>aria-live="polite"</code>, oznaczony <code>d2-booking-built</code>' },
      { g: 'Lista obiektów', a: 'd2-booking-item', v: '—', el: 'karta', set: true, d: 'Na każdej wyrenderowanej karcie. Tylko te moduł usuwa, czytając listę od nowa — przycisk i komunikat, które strona włożyła do listy, zostają.' },
      { g: 'Lista obiektów', a: 'd2-booking-results-state', v: 'loading | ready | empty | error', el: 'lista', set: true, d: 'Na czym stoi lista — do CSS-a.' },
      { g: 'Lista obiektów', a: 'd2-booking-results-drawn', v: '—', el: 'lista', set: true, d: 'Ta lista nie miała wzorca, więc karty narysował moduł: zdjęcie, nazwa, miasto i cena z jednostką w jednym linku, z tego samego arkusza i tych samych zmiennych <code>--d2-booking-*</code>, co widget. Reguły są zawężone do <code>[d2-booking-results][d2-booking-results-drawn]</code>, więc lista zbudowana w Designerze zostaje przy swoim wyglądzie.' },
      { g: 'Wyszukiwanie', a: 'd2-booking-search', v: '—', el: 'Form block', d: 'Formularz szukania nad listą. Wysyłka nie przeładowuje strony: każda lista wraca na <b>pierwszą stronę</b> z nowym filtrem, a to, o co gość pytał, ląduje w adresie strony — przeładowanie je zachowuje, a link da się wysłać komuś. Moduł czyta te parametry na starcie, <b>przed</b> pierwszą stroną listy, i wpisuje je do pól.', n: 'własna wysyłka Webflow się nie wykonuje; trasa bierze tylko termin, liczbę gości i miasto — nic więcej z formularza nie jedzie. Formularz i adres są <b>łączone</b>: pole, które formularz ma, odpowiada za swój parametr nawet puste (gość je widzi, więc wyczyszczenie go jest odpowiedzią), a parametr, o który formularz nie pyta wcale, zostaje taki, jak w adresie — więc szukanie zbudowane wokół kalendarza i liczby osób nie gubi miasta z linku. Dwa kliknięcia „Szukaj” pytają <b>raz</b> (wysyłka powtarzająca pytanie, którego pierwsza strona jest w drodze, jest pomijana), a formularz szukania na stronie bez <code>[d2-booking-results]</code> mówi o tym w konsoli: szuka się po listach własnej strony' },
      { g: 'Wyszukiwanie', a: 'd2-booking-search-field', v: 'check_in | check_out | adults | children | location', el: 'Input / Select w formularzu szukania', d: 'Które to pytanie. <b>Termin</b>: oba pola albo żadne — trasa bierze je razem (<code>check_in</code> i <code>check_out</code>); wpisana godzina jest odrzucana (filtr pyta o dni), a tekst, który nie jest datą, nie zawęża niczego. Pół terminu i wyjazd nie późniejszy od przyjazdu <b>nie pytają API</b> — zostaje jedno zdanie w <code>[d2-booking-results-message]</code>, a filtr, na którym lista stoi, zostaje nietknięty: wiersze na ekranie i ich <code>offset</code> dalej należą do tego samego pytania. <b>Goście</b>: <code>guests</code> to zawsze <code>adults + children</code>; trasa nie bierze ani <code>adults</code>, ani <code>children</code>, więc żądanie nie może sobie przeczyć (sprzeczne <code>guests</code> to <code>422</code>), a strona, która nie pyta o żadne z nich, nie wysyła <code>guests</code> wcale. <b>Miasto</b>: wartość pola, chyba że strona przypięła miasto.', n: 'nieznana wartość = ostrzeżenie w konsoli i pole nie jedzie w żądaniu; termin można też wybrać <code>[d2-booking-calendar]</code> stojącym w formularzu — to ten sam kalendarz co przy rezerwacji i jedyny, a wpisane pole wygrywa z klikniętym terminem' },
      { g: 'Wyszukiwanie', a: 'd2-booking-location', v: 'nazwa miasta', el: 'formularz szukania albo lista', d: '<b>Przypina miasto</b> — gość go nie zmieni. Na liście wygrywa dla tej listy, także gdy szukania na stronie nie ma wcale: tak powstaje strona jednego miasta. Przypięte miasto wygrywa z polem <code>location</code> i z adresem, i <b>nie</b> jest wpisywane do adresu: to decyzja strony, a nie pytanie gościa.', n: 'czytane surowym <code>getAttribute</code>, nie <code>digi2.attr</code>: nazwa miejsca może legalnie zawierać <code>;</code> albo <code>@</code>, a składnia responsywna ucięłaby ją w połowie' },
      { g: 'Wyszukiwanie', a: 'd2-booking-pinned', v: '—', el: 'pole location', set: true, d: 'Na polu wyboru miasta pod przypiętym miastem: wartość to przypięte miasto, a pole jest <code>disabled</code> — lista pokazuje jedno miasto, więc select oferujący pięć byłby kłamstwem.' },
      { g: 'Wyszukiwanie', a: 'd2-booking-search-option', v: '—', el: 'opcja dodana w select miasta', set: true, d: 'Na <code>&lt;option&gt;</code>, które moduł dołożył do <code>&lt;select&gt;</code>, bo miasto, które musiał pokazać — z linku albo z przypięcia — nie było wśród opcji strony. <code>&lt;select&gt;</code> przyjmuje tylko wartość, którą nosi <b>któraś jego własna</b> opcja: każdą inną przeglądarka kwituje <code>selectedIndex = -1</code>, więc pole stoi puste i czyta się jako puste. Link z miastem, którego strona nie oferuje (<code>?location=Gdańsk</code> nad selectem z dwoma miastami), zgubiłby je więc dwa razy: z ekranu i z łączenia formularza z adresem, w którym pole odpowiada za swój parametr nawet puste — a gość dostałby całą ofertę pod adresem obiecującym jedno miasto. <b>Wygrywa link</b>: moduł dokłada tę jedną opcję i ją zaznacza, więc wynik, pole i adres mówią o tym samym mieście, nawet gdy wynik jest pusty.', n: 'opcje napisane przez stronę zostają tym, z czego gość wybiera; dołożona jest szukaniem, z którym przyszedł. Tak samo pokazywane jest przypięte miasto, którego select nie oferuje. Tekstowego <code>&lt;input&gt;</code> to nie dotyczy — przyjmuje każdą nazwę' },
      { g: 'Wyszukiwanie', a: 'd2-booking-search-bound', v: '—', el: 'formularz szukania', set: true, d: 'Wysyłka podłączona (drugie wywołanie <code>digi2.booking.apply()</code> jej nie dubluje).' },
      { g: 'Ustawiane przez moduł', a: 'd2-booking-required', v: '—', el: 'pole wymagane', set: true, d: 'Na każdym polu, którego żąda klucz; razem z <code>aria-required="true"</code>.' },
      { g: 'Ustawiane przez moduł', a: 'd2-booking-invalid', v: '—', el: 'pole z komunikatem', set: true, d: 'Na polu, na które wskazuje komunikat; razem z <code>aria-invalid="true"</code>. Zdejmowane przy następnej próbie.' },
      { g: 'Ustawiane przez moduł', a: 'd2-booking-ready', v: '—', el: 'formularz', set: true, d: 'Odpowiedź <code>/config</code> zastosowana do pól.' },
      { g: 'Ustawiane przez moduł', a: 'd2-booking-bound', v: '—', el: 'formularz', set: true, d: 'Wysyłka podłączona (drugie wywołanie <code>digi2.booking.apply()</code> jej nie dubluje).' },
      { g: 'Ustawiane przez moduł', a: 'd2-booking-busy', v: '—', el: 'formularz, kalendarz albo lista', set: true, d: 'Rezerwacja (albo strona listy) w drodze — drugie kliknięcie jest pomijane, więc niecierpliwy gość nie zakłada dwóch blokad na ten sam termin.' },
      { g: 'Ustawiane przez moduł', a: 'd2-booking-built', v: '—', el: 'element zbudowany przez moduł', set: true, d: 'Na każdym elemencie, który moduł dorysował sam — po nim CSS strony pozna, co jest jej, a co nasze.' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-widget', v: '—', el: 'dowolny Div', d: 'Gospodarz wyglądu, który moduł rysuje sam. Pusty element wystarczy: moduł dokłada w nim <b>każdą część, której strona nie ma</b> — kalendarz, komunikat, formularz (skład grupy, pola gościa, miejsce na komunikat i przycisk), rozbicie ceny, sumę oraz zaliczkę i resztę. <b>Designer zawsze wygrywa</b>: części, która jest już gdziekolwiek na stronie, moduł nie rysuje drugi raz. <code>d2-booking-product</code> z widgetu przepisuje na kalendarz i formularz.', n: 'jedna strona rezerwuje jeden pobyt — drugi <code>[d2-booking-widget]</code> zastaje wszystkie części zajęte, zostaje pusty i mówi o tym w konsoli' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-widget-ready', v: '—', el: 'widget', set: true, d: 'Ten widget jest już narysowany — kolejne <code>digi2.booking.apply()</code> go nie rusza.' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-styles', v: '—', el: 'budowane przez moduł', set: true, d: 'Jedyny <code>&lt;style&gt;</code> wyglądu zapasowego, wstrzykiwany <b>raz</b>. Każda reguła o kolorze i odstępie jest zawężona do jednego z trzech gospodarzy modułu (<code>[d2-booking-widget]</code>, <code>[d2-booking-return]</code>, <code>[d2-booking-manage]</code>), żadna nie ma <code>!important</code>, a każdy kolor i wymiar to zmienna CSS z wartością domyślną: <code>--d2-booking-accent</code>, <code>-accent-text</code>, <code>-text</code>, <code>-muted</code>, <code>-bg</code>, <code>-surface</code>, <code>-border</code>, <code>-busy</code>, <code>-range</code>, <code>-error</code>, <code>-radius</code>, <code>-gap</code>, <code>-pad</code>, <code>-width</code>, <code>-font</code>.', n: 'poza arkuszem gospodarzy jest <b>jedna</b> reguła niezawężona, i to układ, nie wygląd: <code>[d2-booking-calendar-grid] [role=row] { display: grid; grid-template-columns: repeat(7, 1fr) }</code>. Miesiąc ma siedem kolumn albo nie jest miesiącem, a ta siatka to znacznik, który moduł sam zbudował — nie sięga niczego, co napisał Designer. Strona, której całym znacznikiem rezerwacji jest goły <code>d2-booking-calendar</code>, dostaje tę jedną regułę; strona z widgetem dostaje cały arkusz, który zaczyna się od tej samej reguły' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-party', v: '—', el: 'budowane przez moduł', set: true, d: 'Wiersz ze składem grupy: <code>adults</code>, <code>children</code>, <code>pets</code>, <code>pets_over_threshold</code>. Rysowane są tylko pola, o które pyta klucz, pole wymagane dostaje <code>*</code> w etykiecie, a <code>adults</code> startuje z 2 — to grupa, pod którą policzona jest większość obiektów, widoczna i do zmiany.' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-summary', v: '—', el: 'budowane przez moduł', set: true, d: 'Wiersz „Razem”. Dopóki nie ma ceny, chowa się — „Razem” nad pustym miejscem czyta się jak zepsuta strona.' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-later', v: '—', el: 'budowane przez moduł', set: true, d: 'Linia „Teraz … · później …”. Chowa się tak samo, dopóki nie ma kwot.' },
      { g: 'Wygląd zapasowy', a: 'd2-booking-mark', v: '—', el: 'dowolny element albo budowane przez moduł', d: 'Znak digi2. Blok narysowany przez moduł — widget, powrót z płatności albo obsługa rezerwacji — dostaje go na końcu (jeden na stronę, w pierwszym z nich); strona, która zbudowała swój widget, stawia go tam, gdzie chce, a moduł uzupełnia adres i tekst (element, który je ma, zostaje nietknięty).', n: 'klucz z <code>branding_hidden</code> nie ma znaku w ogóle — ten postawiony przez stronę też znika, bo atrybut jest nasz i decyduje klucz' },
      { g: 'Powrót z płatności', a: 'd2-booking-return', v: '— | id rezerwacji', el: 'dowolny Div', d: 'Strona, na którą wraca gość po płatności: <code>…?booking=&lt;id&gt;&amp;payment=&lt;success|cancelled|balance_success|balance_cancelled&gt;</code>. Pusty element wystarczy — moduł bierze identyfikator z adresu (albo z wartości tego atrybutu, gdy strona go zna), pyta <code>GET /bookings/&lt;id&gt;/status</code> i mówi, co się z rezerwacją stało.', n: 'karta przechodzi, zanim dojdzie webhook, więc moduł pyta <b>ponownie, za każdym razem po dłuższej przerwie</b> — osiem prób przez około czterdzieści sekund — a potem przestaje i pisze, że płatność jest jeszcze sprawdzana. Anulowaną płatność czyta <b>raz</b> i nie odpytuje: nic nie jest w drodze' },
      { g: 'Powrót z płatności', a: 'd2-booking-return-message', v: '—', el: 'dowolny element', d: 'Zdanie dla gościa. Gdy strona go nie ma, moduł dokłada własne z <code>role="status"</code> — odpowiedź przychodzi po żądaniu, więc czytnik ekranu musi ją usłyszeć.' },
      { g: 'Powrót z płatności', a: 'd2-booking-return-balance', v: '—', el: 'dowolny element', d: 'Ile zostało do dopłaty i do kiedy (<code>balance_due_minor</code>, <code>balance_due_at</code>). Brak dopłaty zostawia miejsce puste i oznaczone <code>d2-booking-empty</code> — nigdy „0,00”.', n: 'miejsce zbudowane przez Designera jest zawsze wypełniane (pusto = <code>d2-booking-empty</code>, układ strony zostaje); miejsce nasze powstaje tylko wtedy, gdy jest co w nim napisać' },
      { g: 'Powrót z płatności', a: 'd2-booking-return-new', v: '—', el: 'Link block', d: 'Droga po nowy termin — adres bierze z <code>site_url</code> odpowiedzi. <b>Usuwany</b>, gdy nie ma dokąd pójść (<code>site_url: null</code>) albo nie ma czego wybierać od nowa: link prowadzący donikąd jest gorszy niż brak linku.' },
      { g: 'Powrót z płatności', a: 'd2-booking-return-state', v: 'loading | checking | confirmed | paid | pending | balance_paid | cancelled | rejected | expired | unknown | error', el: 'blok powrotu', set: true, d: 'Co mówi odpowiedź. <code>confirmed</code> — potwierdzona. <code>paid</code> — zapłacone, ale właściciel jeszcze nie przyjął (inne zdanie niż „potwierdzona”: przyjechać pod zamknięte drzwi jest gorzej niż poczekać na maila). <code>expired</code> — blokada minęła i termin wrócił do oferty (status <code>expired</code> albo <code>awaiting_payment</code> z <code>hold_open: false</code>). <code>pending</code> — rezerwacja jest i czeka na decyzję obiektu; <code>payment_mode</code> odróżnia przedpłatę od rezerwacji na zapytanie, a <code>pending</code> to stan tej drugiej: nie ma czego sprawdzać, więc nie ma czego odpytywać. <code>checking</code> — jeszcze nic nie wiadomo.', n: 'statusu, którego moduł nie zna, <b>nie zgaduje</b> na wyrok: pyta dalej, a potem pisze, że płatność jest sprawdzana. Odmowa to <code>error</code> i nasze zdanie — nigdy stan, który da się wziąć za sukces' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage', v: '— | id rezerwacji', el: 'dowolny Div', d: 'Strona z linku w mailu: <code>&lt;manage_url&gt;?booking=&lt;id&gt;#token=&lt;token&gt;&amp;action=&lt;details|balance|refund|change-date&gt;</code>. Pusty element wystarczy. Token moduł czyta z fragmentu <b>raz</b>, od razu zdejmuje go z paska adresu (<code>replaceState</code>, więc nie zostaje nawet wpis w historii) i wysyła wyłącznie w nagłówku <code>X-Booking-Token</code>.', n: 'token nie trafia na stronę, do adresu, do zdarzenia ani do logu, a moduł nigdy do niego nie zagląda: o tym, do czego służy link, mówi <code>action</code>, nie kształt tokenu. Cena tej uczciwości: odświeżenie strony nie ma już tokenu i potrzebuje linku z maila jeszcze raz' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-field', v: 'booking_id | product_name | dates | starts_at | ends_at | status | paid | outstanding | refunded | balance | balance_due_at | emergency_phone', el: 'dowolny element', d: 'Jedna wartość rezerwacji. Daty to dni kalendarzowe <b>w strefie obiektu</b>, kwoty — grosze z odpowiedzi przez <code>Intl</code> w walucie odpowiedzi. Telefon alarmowy w elemencie <code>&lt;a&gt;</code> dostaje adres <code>tel:</code>.', n: 'skład grupy nie wraca w tej odpowiedzi i moduł go nie pokazuje — wiek dziecka nie jest dla każdego, kto zna identyfikator rezerwacji (kontrakt)' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-action', v: 'balance | refund | date_change', el: 'Button', d: 'O co gość może poprosić. Akcji, na którą odpowiedź nie pozwala, moduł <b>nie zostawia na stronie</b> — także tej, którą postawił Designer: przycisk, który backend i tak odmówi, to zaproszenie do błędu. <code>balance</code> otwiera <code>POST /bookings/&lt;id&gt;/balance-checkout</code> (bez ciała) i przeglądarka wychodzi do operatora — a odmowa, której ponowienie nie naprawi (<code>no_balance</code>, <code>balance_already_paid</code>, <code>booking_not_payable</code>, <code>stripe_not_connected</code>, <code>stripe_account_not_ready</code>), <b>zabiera ten przycisk ze sobą</b>; <code>balance_processing</code> i 502 od operatora przycisk zostawiają, bo tam ponowienie ma sens; <code>refund</code> i <code>date_change</code> idą przez <code>POST …/requests</code>.', n: 'link <code>manage</code> może prosić, ale nie zapłaci dopłaty, a link <code>balance</code> tylko płaci (kontrakt). <code>balance_payable: true</code> przy linku <code>manage</code> znaczy „da się, ale nie tym linkiem” — moduł odsyła wtedy do maila z dopłatą albo do <code>account_url</code>' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-input', v: 'requested_starts_at | requested_units_count | customer_note', el: 'Input / Text Area', d: 'Czym gość wypełnia prośbę. Datę moduł wysyła jako <b>lokalny czas obiektu bez strefy</b> (<code>2027-05-10T14:00:00</code>) — strefa z pola jest odrzucana, nie przeliczana: gość wskazał dzień w obiekcie, a nie moment na osi czasu.' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-requests', v: '—', el: 'dowolny Div', d: 'Lista próśb tej rezerwacji, od najnowszej. To jedyne miejsce, w którym gość czyta decyzję właściciela — mail o niej nie przychodzi.' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-request', v: '—', el: 'wiersz listy', d: 'Opcjonalny <b>wzorzec</b> wiersza, klonowany pod każdą prośbę; w środku <code>d2-booking-manage-request-kind</code>, <code>-status</code>, <code>-date</code> i <code>-note</code>. Bez wzorca moduł rysuje własny wiersz.', n: 'moduł dokłada na wierszu <code>d2-booking-manage-request-state</code> (<code>pending</code>, <code>accepted</code>, <code>rejected</code>, <code>withdrawn</code>)' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-message', v: '—', el: 'dowolny element', d: 'Jedno zdanie: nieważny link, zapisana prośba, odmówiona dopłata.' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-account', v: '—', el: 'Link block', d: 'Droga do <code>account_url</code> z <code>/config</code>. Usuwana, gdy klucz go nie ma (workspace bez sluga).' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-state', v: 'loading | ready | invalid | error | returned', el: 'blok obsługi', set: true, d: '<code>invalid</code> — link nic nie otwiera: jedno zdanie, <b>zero danych</b> i droga do konta. <code>error</code> — odmowa, która nie dotyczy tokenu (brak sieci, limit): mówimy o niej wprost, bo gość z chwiejnym internetem nie może usłyszeć, że jego mail jest nic niewart. <code>returned</code> — gość wrócił z płatności, więc tokenu nie ma i ten blok milczy.', n: 'każda odmowa tokenu to ten sam <code>booking_not_found</code> — brak, zły, wygasły, o innym celu, z innej rezerwacji albo spoza klucza — więc nazwanie przyczyny byłoby zgadywaniem, a zgadywanie jest tu wyrocznią dla kogoś, kto próbuje tokenów' },
      { g: 'Obsługa rezerwacji', a: 'd2-booking-manage-status', v: 'status rezerwacji', el: 'blok obsługi', set: true, d: 'Status wprost z odpowiedzi — do CSS-a.' },
      { g: 'Płatność', a: 'd2-booking-submit', v: '—', el: 'Button w formularzu (albo budowany)', d: 'Przycisk wysyłki. Moduł wyłącza go (<code>disabled</code>) na czas rezerwacji — czyj by nie był. Bez tego atrybutu moduł i tak znajdzie <code>button[type="submit"]</code> w formularzu.' },
      { g: 'Płatność', a: 'd2-booking-payment', v: 'final | retry | wait | done | opening', el: 'formularz', set: true, d: 'Co się stało z płatnością. <code>final</code> — odmowa, której ponowienie nie naprawi (<code>booking_not_payable</code>, <code>booking_already_paid</code>, <code>stripe_not_connected</code>, <code>stripe_account_not_ready</code>): zdanie zostaje, przycisk zostaje wyłączony — ale <b>dla tego pobytu</b>: wybór innego terminu czyści zdanie i oddaje przycisk. Wysyłka tego samego terminu i składu grupy dostaje zapamiętaną odmowę bez pytania API, a <b>inny</b> termin to rezerwacja, którą gość wciąż ma prawo złożyć (<code>booking_not_payable</code> wyrzuca przy okazji martwą rezerwację z pamięci: blokada, która wygasła, to właśnie chwila, w której sięga się po inne daty). <code>retry</code> — można spróbować jeszcze raz (502 od operatora, brak adresu płatności). <code>wait</code> — 429: przycisk czeka dokładnie tyle sekund, ile podał <code>Retry-After</code> — tak samo na trasie zakładania rezerwacji, czyli tej, którą niecierpliwy gość naciska najczęściej; wysyłka w czasie czekania dostaje zapamiętaną odmowę i nic nie wysyła. <code>done</code> — rezerwacja bez płatności (<code>payment_required: false</code>), decyduje właściciel. <code>opening</code> — wychodzimy na stronę płatności.' },
      { g: 'Płatność', a: 'd2-booking-ok', v: '—', el: 'miejsce na komunikat', set: true, d: 'Na komunikacie, który nie jest odmową („rezerwacja przyjęta”, „przenosimy do płatności”) — żeby CSS przestał malować go na czerwono.' }
    ],

    api: {
      desc: 'Odmowy moduł rozpoznaje po <code>reason</code> z <code>errors.json</code>, nigdy po treści <code>detail.message</code>: tekst backendu jest do logów, a gość widzi nasze zdanie. Nieznany <code>reason</code> też dostaje zdanie, nie puste pole. <code>detail.reason</code> / <code>detail.code</code> → ten napis (<code>period_taken</code>, <code>rental_rules</code> z <code>violations</code>, <code>field_required</code> z <code>field</code>, <code>request_too_large</code>…); lista w <code>detail</code> (422 FastAPI) → <code>validation_error</code> i pole z <code>loc</code> (<code>["body","customer_email"]</code> = pole <code>email</code>); napis w <code>detail</code> → po statusie i trasie: 400 <code>invalid_request</code>, 403 <code>origin_not_allowed</code>, 404 <code>site_key_not_found</code> / <code>product_not_found</code> / <code>booking_not_found</code>, 409 <code>request_not_allowed</code> / <code>request_already_waiting</code>, 413 <code>request_too_large</code>, 429 <code>too_many_requests</code> (z <code>retryAfter</code> w sekundach z <code>Retry-After</code>), 502 <code>payment_provider_unavailable</code> <b>tylko na dwóch trasach płatności</b> (tak mówi <code>errors.json</code>) — gdzie indziej 502 to <code>server_error</code>, bo gościowi, który płatności jeszcze nie dotknął, nie mówi się, że operator płatności nie działa, 5xx <code>server_error</code>, odrzucony <code>fetch</code> <code>network_error</code>. Odmowa z domeny spoza listy klucza nie ma nagłówka CORS, więc przeglądarka nie pozwala jej odczytać — wygląda jak brak połączenia i tak jest pokazywana.<br><br><code>guests</code> to <b>zawsze suma dorosłych i dzieci</b> — na tej liczbie stoją <code>max_guests</code> i dopłata za osobę, więc żadne żądanie nie może sobie przeczyć. Przy <code>children: off</code> moduł nie wysyła też <code>adults</code>: rezerwacja nie może twierdzić, że przyjeżdża dwoje dorosłych, skoro policzono ją za inną grupę — liczbę niesie <code>guests</code>. <code>locale</code> to język strony (<code>&lt;html lang&gt;</code>), gdy klucz nim mówi, a inaczej <code>default_language</code>.<br><br>Cena jest <b>przepisana z odpowiedzi, nie przeliczona</b>: <code>amount_total</code> to suma, każda linia to wiersz, a pola <code>…_minor</code> dzieli tylko liczba cyfr, którą dla tej waluty podaje <code>Intl</code>. Odpowiedź z <code>available: false</code>, <code>409 rental_rules</code> i <code>400</code> o terminie <b>czyszczą</b> rozbicie i sumę, a w komunikacie zostaje jedno krótkie zdanie: cena obok „tego pobytu nie da się mieć” byłaby ofertą, której nikt nie dotrzyma. Zdanie powstaje z kodów <code>violations</code> (jedna tablica na górze modułu). Jej klucze to stałe <code>VIOLATION_*</code> backendu (<code>services/rental_availability.py</code>), przypięte przez <code>errors.json</code> — wszystkie dziesięć: <code>product_not_bookable</code>, <code>unit_not_allowed</code>, <code>below_min_units</code>, <code>above_max_units</code>, <code>lead_time_too_short</code>, <code>blackout_overlap</code>, <code>period_taken</code>, <code>buffer_conflict</code>, <code>no_price_for_unit</code>, <code>too_many_guests</code>. Liczby w zdaniu są z reguł obiektu — „najkrótszy pobyt to 3 noce” mówi 3. Nieznany kod i zdanie, do którego brakuje liczby, wracają do zdania ogólnego, więc gość nigdy nie czyta surowego kodu ani nawiasu. Kalendarz odmawia tymi samymi kodami (plus własne <code>past</code>, którego backend nie wysyła), więc reguła złapana w przeglądarce i ta sama reguła złapana przez backend czytają się jednakowo.<br><br>Wysyłka formularza to <b>cała droga</b>: <code>POST …/bookings</code> zakłada rezerwację, <code>POST /bookings/&lt;id&gt;/checkout-session</code> prosi o płatność (ta trasa nie bierze ciała), a potem przeglądarka idzie pod adres z odpowiedzi — tylko <code>https</code> (przy pracy lokalnej <code>http://localhost</code>), bo przekierowanie to jedyna rzecz, którą podmieniona odpowiedź mogłaby wykorzystać. Rezerwacja powstaje <b>raz na żądanie</b>: przycisk wyłącza się przy pierwszym kliknięciu, a próba jest pamiętana pod kluczem tego, na czym stoi blokada: <code>id</code> obiektu, jednostka, <code>starts_at</code>, liczba nocy i skład grupy — drugie kliknięcie dostaje odpowiedź tej, która już leci, a ponowienie po potknięciu płatności <b>płaci rezerwację, która już jest</b>, zamiast blokować termin drugi raz. Dane kontaktowe są z tego klucza świadomie wyjęte: gość, który między odmową a ponowieniem poprawi literówkę, ma zapłacić rezerwację, którą już trzyma, a nie prosić o drugą blokadę na te same noce. <b>Zmienione imię, e-mail albo telefon idą do tej rezerwacji</b> przez <code>POST /bookings/&lt;id&gt;/contact</code> przed płatnością, więc potwierdzenie i link trafiają na adres wpisany jako ostatni. Trasę otwiera <code>contact_token</code> z odpowiedzi; moduł zdejmuje go z obiektu rezerwacji i nie pokazuje w zdarzeniach, w adresie ani w logu. Bez ważnego tokenu moduł nie płaci i mówi, że danych nie da się już zmienić. Każde <code>POST …/bookings</code> niesie <code>Idempotency-Key</code> (UUID v4) związany z dokładną treścią żądania i nie starszy niż 24 h, więc żądanie, które tu przekroczyło czas, a tam doszło, ponowienie odzyskuje zamiast dostać odmowę od własnej blokady gościa. Odzyskana rezerwacja ze statusem <code>expired</code> nie jest płacona. Inny termin albo inny skład grupy to inny pobyt, więc inna rezerwacja. Powrót z płatności przyciskiem „wstecz” odblokowuje formularz, bo przeglądarka potrafi przywrócić stronę dokładnie taką, jaką zostawiliśmy.<br><br><b>Lista obiektów</b> (<code>[d2-booking-results]</code>) to <code>GET /products</code> wpisane we wzorzec karty, który zbudował Designer: moduł pamięta <code>[d2-booking-template]</code>, zabiera go ze strony i klonuje pod każdy obiekt odpowiedzi. Nic z odpowiedzi nie staje się kodem strony: wartość wchodzi przez <code>textContent</code>, adres przez <code>setAttribute</code>, a zdjęcie dopiero wtedy, gdy <code>image_url</code> czyta się jak adres zdjęcia (<code>https:</code>, <code>/…</code> albo <code>data:image/</code>, bez cudzysłowu, nawiasu i odwrotnego ukośnika) — <code>src</code> jest jedno kliknięcie od uruchomienia, a tło wchodzi do właściwości stylu, gdzie jeden cudzysłów zamyka deklarację. Te nazwy pochodzą z CMS-a, którego moduł nie prowadzi. Kwota jest <b>przepisana</b> z <code>price</code> obiektu w walucie obiektu — moduł i tu nic nie liczy. Strony listy to <code>limit</code> i <code>offset</code>: pierwsza podmienia wiersze, każda następna je <b>dopisuje</b>, a strona, której odmówiono, zostawia offset na miejscu, więc następne kliknięcie pyta o tę samą stronę jeszcze raz. Karta prowadzi domyślnie pod <code>?apartament=&lt;slug&gt;</code>, czyli dokładnie to, co czyta strona rezerwacji.<br><br><b>Szukanie</b> (<code>&lt;form d2-booking-search&gt;</code>) zawęża listę bez przeładowania strony: każda lista wraca na pierwszą stronę z nowym filtrem, a pytanie gościa ląduje w adresie (<code>?check_in=…&amp;check_out=…&amp;adults=2&amp;location=Wrocław</code>), więc przeładowanie je zachowuje, link da się wysłać komuś, a moduł czyta te parametry na starcie — <b>przed</b> pierwszą stroną listy — i wpisuje je do pól. W adresie zostają te dwa pytania, które zadała strona, a nie suma, którą wysyłamy: dzięki temu z linku da się odtworzyć formularz. Reszta adresu (<code>?apartament=</code>, kampania, język) zostaje nietknięta, wpis jest <b>podmieniany</b>, nie dokładany (<code>replaceState</code>), więc „wstecz” wychodzi ze strony, a nie przechodzi przez każde zawężenie filtra. Trasa bierze <code>check_in</code>, <code>check_out</code>, <code>guests</code> i <code>location</code> — <code>guests</code> to zawsze suma dorosłych i dzieci, więc żądanie nie może sobie przeczyć, a strona, która o skład grupy nie pyta, nie wysyła go wcale. Termin można wpisać w dwa pola albo wybrać <code>[d2-booking-calendar]</code> stojącym w formularzu — to ten sam kalendarz co przy rezerwacji i jedyny: szukanie tylko czyta to, co już ogłosił. <code>d2-booking-location</code> na formularzu albo na liście <b>przypina miasto</b> i gość go nie zmieni (prośba pilota) — na liście działa też bez żadnego szukania, i tak powstaje strona jednego miasta. Odmowa mówi naszym zdaniem: <code>invalid_stay</code> o terminie, <code>invalid_search</code>, gdy filtr podał też miasto, a <code>429</code> — ile czekać. Odpowiedź, która była jeszcze w drodze, gdy poszło nowe szukanie, jest porzucana: pokazałaby obiekty, o które nikt nie pytał, i przesunęłaby stronicowanie za te, które gość czyta.<br><br><b>Powrót z płatności</b> (<code>[d2-booking-return]</code>) czyta <code>GET /bookings/&lt;id&gt;/status</code> i mówi gościowi, co się stało: potwierdzona, zapłacona i czekająca na właściciela, przyjęta i czekająca na decyzję obiektu (<code>pending</code> — tu nie ma czego odpytywać), jeszcze sprawdzana albo blokada minęła i trzeba wybrać nowy termin (adres z <code>site_url</code>, a <code>null</code> znaczy, że takiej strony nie ma). Karta przechodzi, zanim dojdzie webhook, więc moduł pyta ponownie za każdym razem po dłuższej przerwie — osiem prób przez około czterdzieści sekund — i potem przestaje. Brak sieci, 429 albo 5xx po drodze to kolejna przerwa, nie wyrok: ten gość mógł właśnie zapłacić, a zdanie o błędzie odesłałoby go do ponownej płatności. Pętlę kończy tylko ostatnia próba albo odpowiedź o samej rezerwacji. Statusu, którego nie zna, nie zgaduje na wyrok.<br><br><b>Obsługa rezerwacji</b> (<code>[d2-booking-manage]</code>) bierze token z fragmentu linku w mailu, <b>natychmiast</b> zdejmuje go z paska adresu i wysyła tylko w nagłówku <code>X-Booking-Token</code> — nigdy w adresie, w logu, w zdarzeniu ani na stronie. Pokazuje to, co niesie odpowiedź: obiekt, termin, kwoty, dopłatę i telefon alarmowy — oraz akcje, na które odpowiedź pozwala: dopłatę przez <code>balance-checkout</code> (tylko link <code>balance</code>) i prośbę o zwrot albo zmianę terminu przez <code>requests</code> (tylko link <code>manage</code>). <code>201</code> znaczy „prośba zapisana”: rezerwacja się nie zmienia, pieniądze się nie ruszają, decyduje właściciel — przycisk znika, bo jedna czekająca prośba zamyka swój rodzaj. Każda odmowa tokenu to ten sam <code>booking_not_found</code>, więc gość czyta jedno zdanie o nieważnym linku i nie dostaje żadnych danych; odmowa, która nie dotyczy tokenu, mówi o sobie wprost. Operator wraca z dopłaty na tę samą stronę <b>bez tokenu</b>, więc postaw tam też <code>[d2-booking-return]</code>: blok obsługi wtedy milczy, a status czyta blok powrotu.',
      code: "// /config klucza — czytane raz na stronę, wszystkie formularze dzielą odpowiedź\nawait digi2.booking.config();   // { form_fields, child_max_age, languages, default_language, branding_hidden, account_url }\n\n// Jedno wywołanie API: { ok: true, data } albo typowana odmowa\n// { ok: false, status, reason, message, field?, violations?, retryAfter? }\nawait digi2.booking.request('GET', '/products/' + ref, { notFound: 'product_not_found' });\n\n// Formularz\ndigi2.booking.values(form);     // co ten formularz wysłałby teraz\ndigi2.booking.validate(form);   // true / false; oznacza pola i wpisuje komunikaty\n\n// Termin pobytu — kalendarz woła to sam, a strona może wołać ręcznie\ndigi2.booking.select({ product: ref, unit: 'day', starts_at: '2027-05-01T00:00:00', units_count: 2 });\ndigi2.booking.stay();\n\n// Cena: pytanie o nią jest zdebouncowane (300 ms), to wywołanie pyta od razu\nawait digi2.booking.quote();\ndigi2.booking.price();                  // ostatnia odpowiedź quote, którą moduł wypisał\ndigi2.booking.money('550.00', 'PLN');   // kwota w złotych -> tekst dla gościa\ndigi2.booking.moneyMinor(16500, 'PLN'); // kwota w groszach -> tekst dla gościa\n\nawait digi2.booking.book(form, digi2.booking.stay());      // zak\u0142ada rezerwacj\u0119\nawait digi2.booking.checkout(form, digi2.booking.stay());  // ...i otwiera p\u0142atno\u015b\u0107 (to robi submit)\nawait digi2.booking.pay(bookingId);     // p\u0142atno\u015b\u0107 rezerwacji, kt\u00f3ra ju\u017c istnieje\n\n// Powrót z płatności i obsługa rezerwacji\nawait digi2.booking.status(bookingId);  // jedno odczytanie stanu rezerwacji\ndigi2.booking.returned();               // { state, status } — ostatni stan, który wypisał blok powrotu\ndigi2.booking.managed();                // ostatnia odpowiedź manage (nigdy token)\n\ndigi2.booking.message('period_taken');  // zdanie dla gościa dla tego powodu odmowy\ndigi2.booking.apply();                  // przeczytaj stronę od nowa po zmianie DOM\n\n// Zdarzenia\ndigi2.on('booking:ready',   function (e) { /* { config } */ });\ndigi2.on('booking:stay',    function (e) { /* { stay } — wybrany albo wyczyszczony */ });\ndigi2.on('booking:quote',   function (e) { /* { quote, reason } — cena albo odmowa */ });\ndigi2.on('booking:created', function (e) { /* { booking, form } */ });\ndigi2.on('booking:payment', function (e) { /* { booking_id, url, session, form } \u2014 wychodzimy na p\u0142atno\u015b\u0107 */ });\ndigi2.on('booking:refused', function (e) { /* { reason, status, form } */ });\ndigi2.on('booking:return',  function (e) { /* { booking_id, state, status } */ });\ndigi2.on('booking:list',    function (e) { /* { count, shown, has_more } albo { reason, status } */ });\ndigi2.on('booking:search',  function (e) { /* { search: { check_in, check_out, guests, location } [, message] } */ });\ndigi2.on('booking:manage',  function (e) { /* { booking_id, booking } */ });\ndigi2.on('booking:request', function (e) { /* { booking_id, request } \u2014 pro\u015bba zapisana */ });"
    },

    examples: [
      { title: 'Tag loadera', desc: 'Klucz strony i obiekt, który ta podstrona rezerwuje. Wersję przypnij tagiem, nie <code>@latest</code>.', code: '<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@vX.Y.Z/dist/digi2-loader.min.js"\n  d2-booking="pk_live_…"\n  d2-booking-product="3f2b7c1e-8a44-4c55-9a3e-0d1f6b2a7c10"></script>' },
      { title: 'Jedna strona na całą kolekcję CMS', desc: 'Bez <code>d2-booking-product</code> moduł bierze obiekt z <code>?apartament=&lt;slug&gt;</code> w adresie — linki z listy apartamentów prowadzą na tę samą podstronę rezerwacji, a każdy niesie swój slug. Moduł rozwiązuje go raz przez <code>GET /products/&lt;ref&gt;</code> i dalej posługuje się <code>id</code>.', code: '<!-- link na liście -->\n<a href="/rezerwacja?apartament=apartament-rynek-wroclaw">Rezerwuj</a>\n\n<!-- /rezerwacja: tag loadera bez obiektu -->\n<script src="…/digi2-loader.min.js" d2-booking="pk_live_…"></script>\n<div d2-booking-widget></div>' },
      { title: 'Lista apartamentów we wzorcu Designera', desc: 'Jeden wzorzec karty w liście — moduł zabiera go ze strony i klonuje pod każdy obiekt z <code>GET /products</code>. Przycisk i licznik stoją <b>obok</b> listy, bo wiersze są dopisywane na koniec; komunikat odmowy stoi <b>w</b> liście, bo tam moduł go szuka.', code: '<div d2-booking-results d2-booking-results-limit="12">\n  <a d2-booking-template d2-booking-link class="karta">\n    <img d2-booking-bind="image">\n    <h3 d2-booking-bind="name"></h3>\n    <span d2-booking-bind="city_line"></span>\n    <span d2-booking-bind="price"></span>\n    <span d2-booking-bind="price_unit"></span>\n  </a>\n  <div d2-booking-results-message></div>\n</div>\n\n<button d2-booking-more>Pokaż więcej</button>\n<span d2-booking-count></span>\n<div d2-booking-results-empty>Nic nie znaleźliśmy.</div>' },
      { title: 'Lista prowadząca na podstrony CMS', desc: 'Domyślnie karta prowadzi pod <code>?apartament=&lt;slug&gt;</code> — to samo zapytanie, które czyta strona rezerwacji. Gdy apartamenty są podstronami CMS pod własnymi adresami, wpisz kształt na liście (albo na samym linku).', code: '<div d2-booking-results d2-booking-results-link="/apartamenty/{slug}">\n  <a d2-booking-template d2-booking-link>\n    <h3 d2-booking-bind="name"></h3>\n  </a>\n</div>' },
      { title: 'Lista w jednym pustym Divie', desc: 'Bez wzorca moduł rysuje karty sam — zdjęcie, nazwę, miasto i cenę z jednostką w jednym linku — z tego samego arkusza i tych samych zmiennych, co widget.', code: '<div d2-booking-results></div>\n\n<style>\n  [d2-booking-results-drawn] { --d2-booking-accent: #7a3cff; --d2-booking-radius: 4px; }\n  [d2-booking-results-state="loading"] { opacity: .7; }\n</style>' },
      { title: 'Szukanie nad listą', desc: 'Pola mówią, czym są, a moduł przejmuje wysyłkę: lista wraca na pierwszą stronę z nowym filtrem, strona się nie przeładowuje, a pytanie gościa ląduje w adresie — przeładowanie je zachowuje i link da się wysłać komuś. Trasa bierze tylko termin, liczbę gości (<code>adults + children</code>) i miasto.', code: '<form d2-booking-search>\n  <input type="date" d2-booking-search-field="check_in">\n  <input type="date" d2-booking-search-field="check_out">\n  <input type="number" min="1" value="2" d2-booking-search-field="adults">\n  <input type="number" min="0" d2-booking-search-field="children">\n  <select d2-booking-search-field="location">\n    <option value="">Wszędzie</option>\n    <option>Wrocław</option>\n    <option>Kraków</option>\n  </select>\n  <button type="submit">Szukaj</button>\n</form>\n\n<div d2-booking-results d2-booking-results-limit="12">\n  …\n</div>' },
      { title: 'Strona jednego miasta', desc: 'Przypięte miasto na samej liście — gość go nie zmieni, a szukania nie musi tu być wcale. Gdy formularz stoi obok, jego select dostaje przypięte miasto i jest wyłączony, a w adresie miasto się nie pojawia: to decyzja strony, a nie pytanie gościa.', code: '<div d2-booking-results d2-booking-location="Wrocław">\n  <a d2-booking-template d2-booking-link>\n    <h3 d2-booking-bind="name"></h3>\n    <span d2-booking-bind="city_line"></span>\n  </a>\n</div>' },
      { title: 'Szukanie kalendarzem, bez dwóch pól daty', desc: 'Kalendarz w formularzu szukania to ten sam kalendarz co przy rezerwacji — moduł nie rysuje drugiego, tylko czyta termin, który ten ogłosił. Potrzebuje obiektu (<code>d2-booking-product</code> na tagu loadera albo na sobie), bo wolne terminy są obiektu.', code: '<form d2-booking-search>\n  <div d2-booking-calendar></div>\n  <input type="number" value="2" d2-booking-search-field="adults">\n  <button type="submit">Szukaj</button>\n</form>' },
      { title: 'Pole, o które klucz nie pyta', desc: 'Klucz z <code>form_fields: { note: "off" }</code> — pole uwag znika ze strony razem z etykietą i nigdy nie jedzie w żądaniu. Ten sam formularz na innym kluczu je pokazuje.', code: '<div d2-booking-field-group>\n  <label>Uwagi</label>\n  <textarea d2-booking-field="note"></textarea>\n</div>' },
      { title: 'Komunikat w stylu strony', desc: 'Gdy element komunikatu jest w Designerze, moduł wpisuje tekst do niego i nie dokłada nic swojego.', code: '<div d2-booking-field-group>\n  <input d2-booking-field="phone">\n  <div d2-booking-error="phone" class="form-error"></div>\n</div>' },
      { title: 'Kalendarz i cena', desc: 'Tyle wystarczy: pusty Div na kalendarz, pusty na rozbicie ceny i element na sumę. Reszta to CSS do atrybutów, które moduł dokłada.', code: '<div d2-booking-calendar></div>\n\n<div d2-booking-breakdown></div>\n<strong d2-booking-total></strong>\n<span d2-booking-deposit></span>' },
      { title: 'Wiersz ceny w stylu strony', desc: 'Pierwszy <code>d2-booking-line</code> w rozbiciu jest wzorcem — moduł klonuje go pod każdą linię odpowiedzi, z klasami i zagnieżdżeniem, jakie dał Designer.', code: '<div d2-booking-breakdown>\n  <div d2-booking-line class="cena-wiersz">\n    <span d2-booking-line-label></span>\n    <span d2-booking-line-detail class="cena-stawka"></span>\n    <span d2-booking-line-amount class="cena-kwota"></span>\n  </div>\n</div>' },
      { title: 'Cała rezerwacja w jednym pustym Divie', desc: 'Wygląd zapasowy: moduł rysuje w środku kalendarz, skład grupy, pola gościa, rozbicie ceny, sumę, przycisk i znak digi2. Część, którą zbudował Designer — gdziekolwiek na stronie — wygrywa i nie powstaje drugi raz.', code: '<div d2-booking-widget></div>' },
      { title: 'Przemalowanie wyglądu zapasowego', desc: 'Arkusz modułu jest cały zawężony do <code>[d2-booking-widget]</code> i nie ma w nim <code>!important</code>, więc wystarczy ustawić zmienne — a własny CSS wygrywa i bez nich.', code: '[d2-booking-widget] {\n  --d2-booking-accent: #7a3cff;\n  --d2-booking-radius: 4px;\n  --d2-booking-width: 100%;\n  --d2-booking-font: inherit;\n}' },
      { title: 'Własny przycisk płatności', desc: 'Przycisk w formularzu moduł wyłącza na czas rezerwacji, a po odmowie, której nie da się ponowić, zostawia wyłączony. Stan czyta się z formularza.', code: '<form d2-booking-form>\n  …\n  <div d2-booking-error="form"></div>\n  <button type="submit" d2-booking-submit>Rezerwuję i płacę</button>\n</form>\n\n<style>\n  [d2-booking-submit][disabled] { opacity: .6; }\n  [d2-booking-payment="final"] [d2-booking-submit] { display: none; }\n  [d2-booking-ok] { color: #1f6f5c; }\n</style>' },
      { title: 'Podstrona powrotu z płatności', desc: 'Jeden pusty Div. Identyfikator rezerwacji moduł bierze z <code>?booking=</code> w adresie, pod który wraca operator płatności, i sam odpytuje status aż do rozstrzygnięcia.', code: '<div d2-booking-return></div>\n\n<style>\n  [d2-booking-return-state="checking"] { opacity: .7; }\n  [d2-booking-return-state="expired"] [d2-booking-return-message] { color: #b3261e; }\n</style>' },
      { title: 'Podstrona obsługi rezerwacji', desc: 'Też jeden pusty Div — plus blok powrotu, bo dopłata wraca na tę samą podstronę <b>bez tokenu</b>. Token z <code>#token=</code> moduł zdejmuje z adresu, zanim cokolwiek wyśle.', code: '<div d2-booking-return></div>\n<div d2-booking-manage></div>' },
      { title: 'Rezerwacja w stylu strony, bez rysowania przez moduł', desc: 'Gdy Designer zbuduje miejsca sam, moduł tylko je wypełnia — i usuwa akcje, na które odpowiedź nie pozwala.', code: '<div d2-booking-manage>\n  <h2 d2-booking-manage-field="product_name"></h2>\n  <p d2-booking-manage-field="dates"></p>\n  <p d2-booking-manage-field="balance"></p>\n  <a d2-booking-manage-field="emergency_phone" class="telefon"></a>\n\n  <div d2-booking-manage-requests>\n    <div d2-booking-manage-request class="prosba">\n      <span d2-booking-manage-request-kind></span>\n      <span d2-booking-manage-request-status></span>\n      <p d2-booking-manage-request-note></p>\n    </div>\n  </div>\n\n  <label>Nowa data\n    <input type="date" d2-booking-manage-input="requested_starts_at">\n  </label>\n  <button type="button" d2-booking-manage-action="date_change">Poproś o zmianę</button>\n  <div d2-booking-manage-message></div>\n</div>' },
      { title: 'Zajęty i wybrany termin w CSS', desc: 'Poza <code>[d2-booking-widget]</code> moduł nie wnosi żadnych stylów — maluje atrybutami. To wystarczy, żeby kalendarz wyglądał jak strona.', code: '[d2-booking-day][aria-disabled="true"] { opacity: .45; text-decoration: line-through; }\n[d2-booking-day-busy] { background: #fbe7e4; }\n[d2-booking-day-selected],\n[d2-booking-day-checkout] { background: #1f6f5c; color: #fff; }\n[d2-booking-day-in-range] { background: #e3f1ec; }\n[d2-booking-day]:focus-visible { outline: 2px solid #1f6f5c; }' }
    ]
  };

})(window.D2DOCS.modules);
