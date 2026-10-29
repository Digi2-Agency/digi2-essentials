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
      code: "digi2.onReady(function () {\n  // wszystkie moduły załadowane i zainicjalizowane\n});\n\ndigi2.on('module:loaded', function (nazwa) {});\ndigi2.on('responsive:change', function (szerokosc) {});\ndigi2.emit('moj-event', { cokolwiek: 1 });\n\n// Sygnały — momenty, które usłyszy także spóźniony słuchacz.\n// emit() dociera tylko do tych, którzy JUŻ słuchają, a moduły\n// dociągają się asynchronicznie — koniec animacji intro zgłoszony\n// przez emit() potrafi trafić w pustkę. signal() zapamiętuje, że\n// coś się wydarzyło, a when() odpala callback także po fakcie.\ndigi2.signal('intro:done');                     // zgłoś moment\ndigi2.when('intro:done', function () {});       // odpal raz: teraz albo później\ndigi2.signalled('intro:done');                  // true / false\n// Tego używa opcja startOn w popupach — patrz strona modułu Popupy.\n\ndigi2.modules.check('forms');            // true / false\ndigi2.modules.require('forms').then(function () {});  // dociągnij na żądanie\n\ndigi2.attr(el, 'd2-animation-direction', 'up'); // odczyt wartości responsywnej"
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
      { g: 'Tag loadera', a: 'd2-ma-hot-lead', v: 'URL API 2destate (puste = https://api.2destate.com/api/v1)', el: 'tag loadera', d: 'ma.12 (MA-D38 etap 1, wariant D′): <code>visitorId</code> idzie z formularzem do 2destate (pole <code>d2ma_visitor_id</code>). Gdy w tej samej wizycie był lead, przy powrocie moduł wysyła <code>POST /public/ma/visit</code> <code>{ visitorId, units, pageviews, source: "return_visit" }</code> (ma.24: <code>units</code> zawsze, także <code>[]</code> — serwer wymaga pola). 401 zrywa powiązanie, 403 i 404 wstrzymują sygnały na dobę, 413/422 — do końca wizyty, 429/503 czeka <code>Retry-After</code>. „Wyczyść” i wycofanie zgody wysyłają <code>/public/ma/revoke</code>, gdy <code>visitorId</code> kiedykolwiek trafił do formularza (także bez leada; zgoda wycofana między wizytami — przy następnej odsłonie). Wartość spoza <code>https://api.2destate.com/…</code> (inny host, http, port, login) = ostrzeżenie i zero żądań /visit i /revoke (ma.23; do ma.22 — API produkcyjne). Przypinaj tagiem <code>@v1.9.0-ma.N</code>, nie <code>@latest</code>.', n: 'tylko demo i leady testowe agencji; ruch anonimowy nie wychodzi z przeglądarki (MA-D30); ma.23: tylko <code>https://api.2destate.com/…</code> — inny host, http, port albo login = zero żądań /visit i /revoke i <code>console.warn</code>' },
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
      { g: 'Treść i formularze (ma.4)', a: 'd2-ma-visitor-id', v: '—', el: 'ukryte pole formularza (name="d2ma_visitor_id")', d: 'ma.12, tylko z <code>d2-ma-hot-lead</code>: przy wysłaniu formularza i kliku w jego przycisk wysyłki (ma.24; faza capture, przed handlerem strony) dostaje <code>visitorId</code>; bez zgody puste. Moduł nie wysyła ani nie blokuje formularza.' },
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
      desc: 'Węzły: wyzwalacze <code>unit_view</code> (<code>unitIds</code>, <code>minCount</code>), <code>type_view</code> (<code>rooms</code>/<code>floor</code>, <code>minCount</code>), <code>return_visit</code> (<code>afterHours</code>, liczone od końca poprzedniej wizyty), <code>lead</code> (<code>generate_lead</code> albo <code>oa3de__contact-form-make-inquiry</code>), <code>crm_call_result</code> (demo: <code>demoState.crmCallSeq</code> wzrósł po poprzednim kroku); warunki <code>pref.rooms</code>, <code>pref.floor</code>, <code>lead</code>, <code>visits: { min }</code>; akcje <code>popup</code>, <code>datalayer</code> (<code>ma_segment</code> | <code>ma_segment_exit</code>), <code>webhook</code> (<code>email</code> | <code>sms</code> | <code>ai_call</code>, zawsze <code>testOnly: true</code> — bez tego nie wychodzi). Reguły: trigger → trigger = kolejność w czasie (ta sama milisekunda to nie „po”); action → trigger = czekanie na zdarzenie po akcji; kilka krawędzi = w kolejności <code>edges</code>; <code>frequency</code> (<code>once_per_visit</code> domyślnie, <code>once_per_unit</code>, <code>once_per_days:N</code>) liczone per scenariusz, a akcja pominięta przez frequency nie kończy gałęzi; <code>delayMinutes</code> odkłada akcję w d2ma (ważna 24 h); dwa popupy naraz — wygrywa wcześniejszy scenariusz, drugi czeka do następnej wizyty („naraz” = jedna interakcja: kliknięcie, które otwiera nową wizytę i spełnia wyzwalacz obejrzenia, daje jeden popup — ma.27); inny popup na ekranie (od ma.32 także ten sam popup, widoczny albo w trakcie zamykania — bez podmiany treści) = popup ze scenariusza pominięty, bez kolejki za tamtym, bez <code>ma:action</code> i bez zużycia częstotliwości (ma.27); (ma.6) popup czeka, aż gość zamknie pełnoekranowy dymek mapy 2destate na telefonie, najwyżej 5 min (ma.27: liczy się widoczny dymek — Image Map Pro zostawia klasę <code>is-fullscreen</code> na zamkniętym; po stuknięciu 500 ms na otwarcie dymka); (ma.7) popup z szablonu panelu: gdy strona nie ma własnego <code>[d2-ma-popup]</code>, a koperta ma <code>templates.popup[]</code> — bloki <code>title</code> / <code>text</code> / <code>image</code> / <code>cta</code> (≤ 8), <code>layout</code> i <code>style</code> wyłącznie jako tokeny strony (<code>token:&lt;nazwa&gt;</code>); tekst przez <code>textContent</code>, nieznane pola pomijane z ostrzeżeniem; (ma.8) zmieniony szablon w nowej rewizji koperty przebudowuje popup; fokus, Tab i Esc daje moduł popupów; sprzedanego lokalu popup nie pokazuje; nowa <code>revision</code> = ścieżka od zera; nieznany typ / zdarzenie / akcja = węzeł pominięty z <code>console.warn</code>, a gałąź za nim stoi; nieznany klucz warunku jest pomijany i ścieżka idzie dalej — dlatego nowe filtry są w <code>when</code> nowych wyzwalaczy, nigdy w <code>if</code>; <code>version</code> ≠ "0" = żaden scenariusz; <code>minScript</code> wyższy niż <code>ma.4</code> = <code>console.warn</code>. <code>demoState.timeScale: 60</code> = minuta zamiast godziny (afterHours, delayMinutes, once_per_days i 30-minutowa przerwa między wizytami).<br><br><b>Od ma.4 (§13.8)</b> — nasłuch tylko wtedy, gdy koperta ma taki wyzwalacz, i dopiero po zgodzie. Wyzwalacze: <code>exit_intent</code> (mysz przez górną krawędź, raz na wizytę; <b>na ekranach dotykowych nie działa</b>), <code>engagement</code> (<code>minSeconds</code> aktywnego czasu przy widocznej karcie, <code>minScrollPct</code> największego przewinięcia, filtr <code>utm: { source, medium, campaign }</code> z pierwszego wejścia w wizycie, bez wielkości liter; raz na odsłonę), <code>form_abandon</code> (<code>formIds</code> — lista 1–20 nazw, bez pola = dowolny formularz, pusta lista = błąd; <code>idleSeconds</code> 10–600, domyślnie 60: fokus w polu, brak wysłania i bezczynność albo wyjście ze strony; raz na formularz na wizytę; <b>tylko id formularza i liczba pól, nigdy wartości ani nazwy pól</b>). Przy <code>pagehide</code> <code>form_abandon</code> niczego nie wysyła — zapisuje fakt w d2ma i wykonuje gałąź przy następnej odsłonie (ważne 24 h). Akcje: <code>content</code> (<code>slot</code> + <code>text</code> do 160 znaków albo <code>templateId</code> z <code>templates.content[]</code> koperty, wbudowane <code>pref-rooms</code>, <code>last-unit</code>, <code>last-unit-price</code> tylko jako zapas; pola z listy §13.9.2: <code>{{pref.rooms}}</code>, <code>{{pref.floor}}</code>, <code>{{pref.roomsLabel}}</code>, <code>{{unit.name|rooms|roomsLabel|floor|area|price|pricePerSqm|building}}</code> — <code>roomsLabel</code> = „2 pokoje”, „5 pokoi”; pole spoza listy = węzeł pominięty; tylko <code>textContent</code>; pole bez wartości albo brak slotu = bez zmiany i koniec gałęzi; „Wyczyść” i wycofanie zgody przywracają oryginał), <code>map_mark</code> (<code>by</code>: <code>rooms</code> | <code>floor</code> | <code>both</code>, <code>limit</code> 1–20, <code>className</code> bez <code>imp-</code> i <code>d2-ma-</code>; ranking z profilu bez sprzedanych, w grupie kolejność mapy; <code>d2estate.markProducts</code>, a bez niego piętro + <code>highlightObject</code> najlepszego lokalu, bez dymka), zdarzenia <code>ma_exit_intent</code>, <code>ma_engaged</code> (+ <code>seconds</code>, <code>scroll_pct</code>), <code>ma_form_abandon</code> (+ <code>form_id</code>), <code>ma_content</code> (+ <code>slot</code>, <code>template_id</code>). Na każdej akcji <code>cooldownMinutes</code> (0–10080).<br><br><b>Od ma.5</b>: <code>frequency: "every_time"</code> tylko dla <code>content</code>, <code>map_mark</code>, <code>map_order</code> — stan wraca na każdej odsłonie, gdy ścieżka już do akcji doszła (wymaga <code>minScript: "ma.5"</code>); akcja <code>map_order</code> (<code>by</code>, <code>limit</code> 1–50, domyślnie 20) układa listę 2destate (<code>setProductOrder</code>), bez tej metody pomijana; segmenty profilu z <code>ma_segment</code> (<code>ma_segment_exit</code> zdejmuje ten sam <code>params.segment</code>; retencja jak historia) dla <code>d2-ma-show-segment</code>; <code>content</code> także z <code>image: { src, alt }</code> (https z domeny strony albo <code>media.digi2.app</code>) i <code>video</code> (<code>youtube</code> / <code>vimeo</code> przez ramkę bez ciasteczek tylko po zgodzie marketingowej — wcześniej plakat i „Wideo po zgodzie na ciasteczka”; <code>mp4</code> jako <code>&lt;video&gt;</code>); analityka pól formularza: <code>ma_form_field</code> (<code>form_id</code>, <code>field_name</code>, <code>time_ms</code>, <code>clicks</code>) przy porzuceniu albo wysłaniu, bez wartości, bez haseł, do 20 pól. Kanał z <code>via</code> (§13.10) strona pomija z <code>console.warn</code> — e-mail, SMS ani telefonu nie zleca przeglądarka, tylko lead po naszej stronie (MA-D30); <code>webhook</code> z koperty v0 bez zmian.<br><br><b>Od ma.17 (§13.14, 2destate core 1.7.0)</b> — wyszukiwarka: liczą się tylko zmiany z <code>source: "user"</code> (<code>"api"</code> = skrypt, np. nasze <code>prefer_filters</code>). Wyzwalacz <code>search_filter</code> (<code>when: { rooms?, floor?, minCount? }</code>, klucze jak <code>type_view</code>; filtr gościa zawiera tę liczbę pokoi / piętro; wyzwalacza sortowania nie ma). Akcja <code>prefer_filters</code> (<code>by: rooms | floor | both</code>) — <code>setFilters</code> z preferencji profilu raz na wizytę, pomijana, gdy gość już filtrował w tej wizycie albo brak preferencji; czeka na mapę. <code>map_order</code> układa też listę wyników i ustępuje sortowaniu wybranemu przez gościa do końca wizyty. Profil: stan <code>filters</code> i <code>sort</code>; <code>pref.rooms</code> / <code>pref.floor</code> z ostatniego filtra tylko przy pustej historii obejrzeń. Popup <code>promo-filter</code> wbudowany bez lokalu: „Szukasz mieszkania 2-pokojowego? Pokażemy wolne lokale i aktualne promocje.” (ma.29: <code>N-pokojowego</code> dla każdego N ≥ 1 z <code>pref.rooms</code> — jedna liczba, filtr [2, 3] daje 2; bez <code>pref.rooms</code> pominięty; <code>templates.popup[]</code> o tym id wygrywa; szablon koperty bez <code>{{unit.*}}</code> otwiera się też bez lokalu). Zdarzenia GA4 bez danych gościa: <code>view_item_list</code> (<code>item_list_name: "wyszukiwarka"</code>, <code>filters: "rooms=2|3;floor=1;area=40-60;price=-700000;status=available;building=B"</code>, <code>filter_count</code>, <code>matching</code>, <code>total</code>, <code>item_list_sort: "price_asc"</code>, debounce 500 ms), <code>select_item</code> przy kliku w listę, <code>view_flat</code> (<code>flat_*</code>, <code>view_source: "wyszukiwarka" | "mapa"</code>); wyłącznik <code>d2-ma-search-events="off"</code>. Kontekst leadu dostaje „filtrował: …”. <b>ma.18</b>: zmiana filtra trafia do profilu i scenariuszy raz, po 500 ms ciszy (suwak = jedno <code>search_filter</code>); liczy się tylko <code>source: "user"</code>; <code>item_list_sort</code> tylko dla price / area / floor; <code>digi2.ma.clear()</code> zeruje też filtry wyszukiwarki (ma.26: każde pole jawnie <code>null</code>, bo core scala filtry; pola dotknięte przez gościa zostają); <code>prefer_filters</code>, którego core nie przyjął (pole dotknięte, brak panelu), nie liczy się i wraca przy następnej wizycie (ma.26). <b>ma.19</b>: zmiana czekająca na te 500 ms zapisuje się od razu przy wysyłce formularza (jest w kontekście leadu; akcje <code>search_filter</code> mogą się wtedy wykonać), z czasem ostatniej zmiany; <b>ma.20</b>: przy <code>pagehide</code> tylko fakt w d2ma — bez akcji scenariusza w chwili wyjścia i bez odtwarzania przy następnej odsłonie; <b>ma.21</b>: zdarzenia GA4 wyszukiwarki mają każdy klucz kontraktu, brak wartości = <code>undefined</code> (zmienna DLV w GTM nie bierze wartości z poprzedniego pushu); lista <code>custom</code> nie daje zdarzenia, a następne idzie bez <code>item_list_sort</code>.',
      code: "// Wersja skryptu na stronie (ma.28)\ndigi2.ma.version;      // np. \"ma.29\" — sprawdzenie po podmianie tagu\n\n// Profil i historia (np. sekcja „co o Tobie wie strona\")\ndigi2.ma.profile();     // { visitorId, visits, lead, views, pref: { rooms, floor }, lastUnit, segment, … }\ndigi2.ma.history();     // obejrzane lokale, od najstarszego\ndigi2.ma.context();     // ma.16: { text, json } do pól d2ma_context / d2ma_context_json, null bez zgody\ndigi2.ma.touchpoints(); // ma.33: { v: 1, items } — źródło każdej wizyty (UTM, click_type, referrer_host, landing_path); bez zgody items: []\ndigi2.ma.parseTouchpoint(href, referrer); // ma.33: jeden wpis bez zapisu i bez zgody (bez argumentów: ta strona)\ndigi2.ma.fillContext(form);   // ma.16: wpisz pola teraz (np. przed budową body webhooka)\ndigi2.ma.profile().filters;   // ma.17: ostatni filtr gościa w wyszukiwarce 2destate, .sort — jego sortowanie w tej wizycie\n\n// Inne źródło obejrzeń niż 3D Estate / 2destate\ndigi2.ma.track({ unitId: 'B.1.05', name: 'B.1.05', rooms: 2, floor: 1, area: 52.3, price: 689000 });\ndigi2.ma.lead();        // znacznik lead bez dataLayer\ndigi2.ma.visitorId();   // ma.12, d2-ma-hot-lead: id do formularza 2destate; null bez zgody\n\n// Koperta\ndigi2.ma.load({ version: '0', … });  // obiekt albo URL z digi2.app / api.2destate.com (ma.23)\ndigi2.ma.reload();                   // nowa rewizja, nowy wynik telefonu\n\n// Pokaz\ndigi2.ma.simulateReturn();           // jak przycisk d2-ma-simulate-return\ndigi2.ma.clear();                    // kasuje bazę d2ma (Promise)\ndigi2.ma.highlight();                // ponowne podświetlenie lokali na mapie\ndigi2.ma.apply();                    // ma.5: warunki d2-ma-show-* od nowa po zmianie DOM\ndigi2.ma.allows(el);                 // ma.5: czy element wolno pokazać\n\n// Zdarzenia\ndigi2.on('ma:action', function (a) { /* { scenarioId, nodeId, do, … } */ });\n// także 'ma:ready', 'ma:view', 'ma:change'\n\n// Stan „brak zgody\" — także po wycofaniu zgody w trakcie wizyty\ndigi2.on('ma:change', function (c) {\n  if (c.tracking === false) { /* baza skasowana, profile() === null */ }\n});\n\n// Treść webhooka (POST JSON, bez danych osobowych):\n// { scenarioId, revision, nodeId, channel, template, unit, segment,\n//   visitorId, testOnly: true, ts }"
    },

    examples: [
      { title: 'Strona demo na digi2.agency', desc: 'Przypięta wersja (nie <code>@latest</code>), koperta z digi2.app, baner zgód z Consent Mode (decyzja Piotra z 19.10.2026). Koperta demo ma <code>consentRequired: false</code>, żeby działał <code>demoState</code>, a zgodę wymusza atrybut.', code: '<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@v1.9.0-ma.1/dist/digi2-loader.min.js"\n  d2-ma="https://digi2.app/api/ma/scenario/osiedle-demo.json"\n  d2-ma-consent-required="true"\n  d2-ma-highlight\n  d2-ma-refresh="30"\n  d2-popups></script>' },
      { title: 'Scenariusz „Powrót do lokalu"', desc: 'Obejrzał dowolny lokal → wrócił po godzinie → bez leada → popup z ostatnim lokalem (raz na lokal) i segment do GA4.', code: '{ "scenarioId": "powrot-do-lokalu", "revision": 1, "active": true,\n  "nodes": [\n    { "id": "t1", "type": "trigger", "when": { "event": "unit_view", "unitIds": [] } },\n    { "id": "t2", "type": "trigger", "when": { "event": "return_visit", "afterHours": 1 } },\n    { "id": "c1", "type": "condition", "if": { "lead": false } },\n    { "id": "a1", "type": "action", "do": "popup", "template": "last-unit",\n      "cta": "open_unit", "frequency": "once_per_unit" },\n    { "id": "a2", "type": "action", "do": "datalayer", "event": "ma_segment",\n      "params": { "segment": "powrot-do-lokalu" } }\n  ],\n  "edges": [["t1","t2"], ["t2","c1"], ["c1","a1"], ["c1","a2"]] }' },
      { title: 'Nagłówek według preferencji (ma.4)', desc: 'Po dwóch obejrzanych lokalach 2-pokojowych nagłówek z <code>d2-ma-slot="hero-title"</code> dostaje nowy tekst, a do GA4 idzie <code>ma_content</code>.', code: '{ "scenarioId": "naglowek", "revision": 1, "active": true,\n  "nodes": [\n    { "id": "t1", "type": "trigger", "when": { "event": "type_view", "rooms": 2, "minCount": 2 } },\n    { "id": "a1", "type": "action", "do": "content", "slot": "hero-title", "text": "{{pref.rooms}} pokoje z ogródkiem" },\n    { "id": "a2", "type": "action", "do": "datalayer", "event": "ma_content" }\n  ],\n  "edges": [["t1", "a1"], ["a1", "a2"]] }' },
      { title: 'Zaangażowany z kampanii (ma.4)', desc: 'Minuta aktywnie i połowa strony, wejście z Facebooka albo Instagrama → popup z ostatnim lokalem.', code: '{ "id": "t1", "type": "trigger", "when": { "event": "engagement", "minSeconds": 60, "minScrollPct": 50,\n  "utm": { "source": ["facebook", "instagram"] } } }' },
      { title: 'Strona testowa w repo', desc: 'Fikcyjne lokale, obie wyszukiwarki udawane, webhook nie wychodzi z przeglądarki.', code: 'npx serve -l 5175 .\n# http://localhost:5175/sandbox/ma.html  (koperta: sandbox/ma-koperta.json)' }
    ]
  };

})(window.D2DOCS.modules);
