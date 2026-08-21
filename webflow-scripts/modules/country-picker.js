/**
 * digi2 — Country Picker Module
 * Loaded automatically by digi2-loader.js when d2-country-picker is present.
 *
 * Put one attribute on a phone field and it gets a country selector that writes
 * the dialing code into the number — no config, no init call:
 *
 *   <input type="tel" name="PHONE" d2-country-picker>          <!-- domyślnie PL -->
 *   <input type="tel" name="PHONE" d2-country-picker="DE">     <!-- inny kraj startowy -->
 *
 * What it does:
 *   - shows a flag + dialing code inside the field (absolutely positioned, so
 *     the field keeps every style it has in the Designer),
 *   - opens a searchable list of 245 countries with Polish names,
 *   - prefixes the typed number on blur and again on submit, so the form always
 *     sends "+48 601 234 567" — nothing else is added to the payload,
 *   - follows what the visitor types: paste "+49…" and the flag switches to
 *     Germany by itself,
 *   - drops the national trunk zero when prefixing ("0601…" → "+48 601…").
 *
 * Options (attributes on the input):
 *   d2-country-picker="PL"                  country selected on load
 *   d2-country-picker-preferred="PL|DE|CZ"  pinned to the top of the list
 *   d2-country-picker-only="PL|DE|CZ"       restrict the list to these
 *   d2-country-picker-search="false"        hide the search box
 *   d2-country-picker-flags="false"         dialing codes only, no emoji flags
 *   d2-country-picker-lang="en"             list language (pl / en). Without it the
 *                                           URL decides (/en), then <html lang>
 *   d2-country-picker-layout="split"        flag as its own box next to the field
 *                                           (default: inside the field)
 *   d2-country-picker-mode="separate"       keep the field digits-only and put
 *                                           the code in a hidden input instead
 *   d2-country-picker-dial-field="PHONE_DIAL"      hidden field name (separate)
 *   d2-country-picker-country-field="PHONE_COUNTRY"     …and the country one
 *
 * Styling: everything carries .d2-cp-* classes and the injected CSS has no
 * !important — override freely. The open list is [d2-cp-open]; the selected
 * option carries [d2-is-active].
 *
 * API: digi2.countryPicker.create(input, opts) / .get(input) / .destroy(input)
 *      picker.setCountry('DE') / .getCountry() / .getNumber()
 *      digi2.countryPicker.countries()   → [{ iso, dial, name }]
 * Event: digi2.on('country-picker:change', ({ iso, dial, input }) => {})
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function attr(el, name) {
    if (!el) return null;
    if (window.digi2 && typeof window.digi2.attr === 'function') return window.digi2.attr(el, name, null);
    return el.getAttribute(name);
  }

  function _log(action, data) { if (window.digi2.log) window.digi2.log('country-picker', action, data); }

  function _emit(name, data) {
    try {
      if (window.digi2 && typeof window.digi2.emit === 'function') window.digi2.emit(name, data || {});
    } catch (e) { /* a listener must never break the field */ }
  }

  // ---------------------------------------------------------------------------
  // Country data — "ISO:dial:nazwa" packed into one string, parsed once on first
  // use. Dialing codes come from libphonenumber, names from ICU (pl), both baked
  // in at build time so the module needs no network and no runtime Intl support.
  // ---------------------------------------------------------------------------
  var PACKED = 'AF:93:Afganistan|AL:355:Albania|DZ:213:Algieria|AD:376:Andora|AO:244:Angola|AI:1:Anguilla|AG:1:Antigua i Barbuda|SA:966:Arabia Saudyjska|AR:54:Argentyna|AM:374:Armenia|AW:297:Aruba|AU:61:Australia|AT:43:Austria|AZ:994:Azerbejdżan|BS:1:Bahamy|BH:973:Bahrajn|BD:880:Bangladesz|BB:1:Barbados|BE:32:Belgia|BZ:501:Belize|BJ:229:Benin|BM:1:Bermudy|BT:975:Bhutan|BY:375:Białoruś|BO:591:Boliwia|BA:387:Bośnia i Hercegowina|BW:267:Botswana|BR:55:Brazylia|BN:673:Brunei|IO:246:Brytyjskie Terytorium Oceanu Indyjskiego|VG:1:Brytyjskie Wyspy Dziewicze|BG:359:Bułgaria|BF:226:Burkina Faso|BI:257:Burundi|CL:56:Chile|CN:86:Chiny|HR:385:Chorwacja|CI:225:Côte d’Ivoire|CW:599:Curaçao|CY:357:Cypr|TD:235:Czad|ME:382:Czarnogóra|CZ:420:Czechy|DK:45:Dania|CD:243:Demokratyczna Republika Konga|DM:1:Dominika|DO:1:Dominikana|DJ:253:Dżibuti|EG:20:Egipt|EC:593:Ekwador|ER:291:Erytrea|EE:372:Estonia|SZ:268:Eswatini|ET:251:Etiopia|FK:500:Falklandy|FJ:679:Fidżi|PH:63:Filipiny|FI:358:Finlandia|FR:33:Francja|GA:241:Gabon|GM:220:Gambia|GH:233:Ghana|GI:350:Gibraltar|GR:30:Grecja|GD:1:Grenada|GL:299:Grenlandia|GE:995:Gruzja|GU:1:Guam|GG:44:Guernsey|GY:592:Gujana|GF:594:Gujana Francuska|GP:590:Gwadelupa|GT:502:Gwatemala|GN:224:Gwinea|GW:245:Gwinea Bissau|GQ:240:Gwinea Równikowa|HT:509:Haiti|ES:34:Hiszpania|NL:31:Holandia|HN:504:Honduras|IN:91:Indie|ID:62:Indonezja|IQ:964:Irak|IR:98:Iran|IE:353:Irlandia|IS:354:Islandia|IL:972:Izrael|JM:1:Jamajka|JP:81:Japonia|YE:967:Jemen|JE:44:Jersey|JO:962:Jordania|KY:1:Kajmany|KH:855:Kambodża|CM:237:Kamerun|CA:1:Kanada|QA:974:Katar|KZ:7:Kazachstan|KE:254:Kenia|KG:996:Kirgistan|KI:686:Kiribati|CO:57:Kolumbia|KM:269:Komory|CG:242:Kongo|KR:82:Korea Południowa|KP:850:Korea Północna|XK:383:Kosowo|CR:506:Kostaryka|CU:53:Kuba|KW:965:Kuwejt|LA:856:Laos|LS:266:Lesotho|LB:961:Liban|LR:231:Liberia|LY:218:Libia|LI:423:Liechtenstein|LT:370:Litwa|LU:352:Luksemburg|LV:371:Łotwa|MK:389:Macedonia Północna|MG:261:Madagaskar|YT:262:Majotta|MW:265:Malawi|MV:960:Malediwy|MY:60:Malezja|ML:223:Mali|MT:356:Malta|MP:1:Mariany Północne|MA:212:Maroko|MQ:596:Martynika|MR:222:Mauretania|MU:230:Mauritius|MX:52:Meksyk|FM:691:Mikronezja|MM:95:Mjanma (Birma)|MD:373:Mołdawia|MC:377:Monako|MN:976:Mongolia|MS:1:Montserrat|MZ:258:Mozambik|NA:264:Namibia|NR:674:Nauru|NP:977:Nepal|BQ:599:Niderlandy Karaibskie|DE:49:Niemcy|NE:227:Niger|NG:234:Nigeria|NI:505:Nikaragua|NU:683:Niue|NF:672:Norfolk|NO:47:Norwegia|NC:687:Nowa Kaledonia|NZ:64:Nowa Zelandia|OM:968:Oman|PK:92:Pakistan|PW:680:Palau|PA:507:Panama|PG:675:Papua-Nowa Gwinea|PY:595:Paragwaj|PE:51:Peru|PF:689:Polinezja Francuska|PL:48:Polska|PR:1:Portoryko|PT:351:Portugalia|ZA:27:Republika Południowej Afryki|CF:236:Republika Środkowoafrykańska|CV:238:Republika Zielonego Przylądka|RE:262:Reunion|RU:7:Rosja|RO:40:Rumunia|RW:250:Rwanda|EH:212:Sahara Zachodnia|KN:1:Saint Kitts i Nevis|LC:1:Saint Lucia|VC:1:Saint Vincent i Grenadyny|BL:590:Saint-Barthélemy|MF:590:Saint-Martin|PM:508:Saint-Pierre i Miquelon|SV:503:Salwador|WS:685:Samoa|AS:1:Samoa Amerykańskie|SM:378:San Marino|SN:221:Senegal|RS:381:Serbia|SC:248:Seszele|SL:232:Sierra Leone|SG:65:Singapur|SX:1:Sint Maarten|SK:421:Słowacja|SI:386:Słowenia|SO:252:Somalia|HK:852:SRA Hongkong (Chiny)|MO:853:SRA Makau (Chiny)|LK:94:Sri Lanka|US:1:Stany Zjednoczone|SD:249:Sudan|SS:211:Sudan Południowy|SR:597:Surinam|SJ:47:Svalbard i Jan Mayen|SY:963:Syria|CH:41:Szwajcaria|SE:46:Szwecja|TJ:992:Tadżykistan|TH:66:Tajlandia|TW:886:Tajwan|TZ:255:Tanzania|PS:970:Terytoria Palestyńskie|TL:670:Timor Wschodni|TG:228:Togo|TK:690:Tokelau|TO:676:Tonga|TA:290:Tristan da Cunha|TT:1:Trynidad i Tobago|TN:216:Tunezja|TR:90:Turcja|TM:993:Turkmenistan|TC:1:Turks i Caicos|TV:688:Tuvalu|UG:256:Uganda|UA:380:Ukraina|UY:598:Urugwaj|UZ:998:Uzbekistan|VU:678:Vanuatu|WF:681:Wallis i Futuna|VA:39:Watykan|VE:58:Wenezuela|HU:36:Węgry|GB:44:Wielka Brytania|VN:84:Wietnam|IT:39:Włochy|CX:61:Wyspa Bożego Narodzenia|IM:44:Wyspa Man|SH:290:Wyspa Świętej Heleny|AC:247:Wyspa Wniebowstąpienia|AX:358:Wyspy Alandzkie|CK:682:Wyspy Cooka|VI:1:Wyspy Dziewicze Stanów Zjednoczonych|CC:61:Wyspy Kokosowe|MH:692:Wyspy Marshalla|FO:298:Wyspy Owcze|SB:677:Wyspy Salomona|ST:239:Wyspy Świętego Tomasza i Książęca|ZM:260:Zambia|ZW:263:Zimbabwe|AE:971:Zjednoczone Emiraty Arabskie';

  // English names, same order as PACKED — only the names, the codes are shared.
  var NAMES_EN = 'Afghanistan|Albania|Algeria|Andorra|Angola|Anguilla|Antigua & Barbuda|Saudi Arabia|Argentina|Armenia|Aruba|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belgium|Belize|Benin|Bermuda|Bhutan|Belarus|Bolivia|Bosnia & Herzegovina|Botswana|Brazil|Brunei|British Indian Ocean Territory|British Virgin Islands|Bulgaria|Burkina Faso|Burundi|Chile|China|Croatia|Côte d’Ivoire|Curaçao|Cyprus|Chad|Montenegro|Czechia|Denmark|Congo - Kinshasa|Dominica|Dominican Republic|Djibouti|Egypt|Ecuador|Eritrea|Estonia|Eswatini|Ethiopia|Falkland Islands|Fiji|Philippines|Finland|France|Gabon|Gambia|Ghana|Gibraltar|Greece|Grenada|Greenland|Georgia|Guam|Guernsey|Guyana|French Guiana|Guadeloupe|Guatemala|Guinea|Guinea-Bissau|Equatorial Guinea|Haiti|Spain|Netherlands|Honduras|India|Indonesia|Iraq|Iran|Ireland|Iceland|Israel|Jamaica|Japan|Yemen|Jersey|Jordan|Cayman Islands|Cambodia|Cameroon|Canada|Qatar|Kazakhstan|Kenya|Kyrgyzstan|Kiribati|Colombia|Comoros|Congo - Brazzaville|South Korea|North Korea|Kosovo|Costa Rica|Cuba|Kuwait|Laos|Lesotho|Lebanon|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Latvia|North Macedonia|Madagascar|Mayotte|Malawi|Maldives|Malaysia|Mali|Malta|Northern Mariana Islands|Morocco|Martinique|Mauritania|Mauritius|Mexico|Micronesia|Myanmar (Burma)|Moldova|Monaco|Mongolia|Montserrat|Mozambique|Namibia|Nauru|Nepal|Caribbean Netherlands|Germany|Niger|Nigeria|Nicaragua|Niue|Norfolk Island|Norway|New Caledonia|New Zealand|Oman|Pakistan|Palau|Panama|Papua New Guinea|Paraguay|Peru|French Polynesia|Poland|Puerto Rico|Portugal|South Africa|Central African Republic|Cape Verde|Réunion|Russia|Romania|Rwanda|Western Sahara|St. Kitts & Nevis|St. Lucia|St. Vincent & Grenadines|St. Barthélemy|St. Martin|St. Pierre & Miquelon|El Salvador|Samoa|American Samoa|San Marino|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Sint Maarten|Slovakia|Slovenia|Somalia|Hong Kong SAR China|Macao SAR China|Sri Lanka|United States|Sudan|South Sudan|Suriname|Svalbard & Jan Mayen|Syria|Switzerland|Sweden|Tajikistan|Thailand|Taiwan|Tanzania|Palestinian Territories|Timor-Leste|Togo|Tokelau|Tonga|Tristan da Cunha|Trinidad & Tobago|Tunisia|Türkiye|Turkmenistan|Turks & Caicos Islands|Tuvalu|Uganda|Ukraine|Uruguay|Uzbekistan|Vanuatu|Wallis & Futuna|Vatican City|Venezuela|Hungary|United Kingdom|Vietnam|Italy|Christmas Island|Isle of Man|St. Helena|Ascension Island|Åland Islands|Cook Islands|U.S. Virgin Islands|Cocos (Keeling) Islands|Marshall Islands|Faroe Islands|Solomon Islands|São Tomé & Príncipe|Zambia|Zimbabwe|United Arab Emirates';

  var STRINGS = {
    pl: { search: 'Szukaj kraju…', empty: 'Brak wyników', choose: 'Wybierz kraj', country: 'Kraj' },
    en: { search: 'Search country…', empty: 'No results', choose: 'Choose country', country: 'Country' },
  };

  /**
   * Which language the list speaks. An explicit attribute wins; otherwise the
   * URL decides — a site with /en pages switches on its own — then <html lang>,
   * and Polish is the fallback.
   */
  function detectLang(el) {
    var explicit = (el && attr(el, 'd2-country-picker-lang'))
      || (document.documentElement && attr(document.documentElement, 'd2-country-picker-lang'));
    if (explicit) return normalizeLang(explicit);

    try {
      var segments = (window.location.pathname || '').split('/');
      for (var i = 0; i < segments.length; i++) {
        var found = normalizeLang(segments[i]);
        if (found) return found;
      }
    } catch (e) { /* exotic environments */ }

    var htmlLang = document.documentElement && document.documentElement.getAttribute('lang');
    return normalizeLang(htmlLang) || 'pl';
  }

  function normalizeLang(value) {
    var v = String(value || '').trim().toLowerCase();
    if (/^en(-|$)/.test(v)) return 'en';
    if (/^pl(-|$)/.test(v)) return 'pl';
    return null;
  }

  function strings(lang) { return STRINGS[lang] || STRINGS.pl; }

  var _all = null;
  function allCountries() {
    if (_all) return _all;
    _all = [];
    var rows = PACKED.split('|');
    var namesEn = NAMES_EN.split('|');
    for (var i = 0; i < rows.length; i++) {
      var parts = rows[i].split(':');
      if (parts.length < 3) continue;
      _all.push({ iso: parts[0], dial: parts[1], pl: parts[2], en: namesEn[i] || parts[2], name: parts[2] });
    }
    return _all;
  }

  // One sorted copy per language — sorting has to follow the names on screen.
  var _sorted = {};
  function countriesIn(lang) {
    lang = lang === 'en' ? 'en' : 'pl';
    if (_sorted[lang]) return _sorted[lang];
    _sorted[lang] = allCountries().map(function (c) {
      return { iso: c.iso, dial: c.dial, pl: c.pl, en: c.en, name: c[lang] };
    }).sort(function (a, b) {
      return a.name.localeCompare(b.name, lang);
    });
    return _sorted[lang];
  }

  function byIso(iso, lang) {
    if (!iso) return null;
    var list = countriesIn(lang || 'pl');
    iso = String(iso).toUpperCase();
    for (var i = 0; i < list.length; i++) if (list[i].iso === iso) return list[i];
    return null;
  }

  // Codes shared by several countries, and who owns them ("1:US|44:GB|…").
  // Without this, "+44…" would land on Guernsey and "+1…" on Anguilla — the
  // first names alphabetically — instead of the country people mean.
  var PRIMARY = '1:US|7:RU|39:IT|44:GB|47:NO|61:AU|212:MA|262:RE|290:SH|358:FI|590:GP|599:CW';

  var _primary = null;
  function primaryFor(dial) {
    if (!_primary) {
      _primary = {};
      PRIMARY.split('|').forEach(function (pair) {
        var parts = pair.split(':');
        if (parts.length === 2) _primary[parts[0]] = parts[1];
      });
    }
    return _primary[dial] || null;
  }

  // Longest dialing code first: +1 (US) must not win over +1242 (Bahamas).
  var _byDial = null;
  function dialIndex() {
    if (_byDial) return _byDial;
    _byDial = allCountries().slice().sort(function (a, b) {
      if (b.dial.length !== a.dial.length) return b.dial.length - a.dial.length;
      return a.name.localeCompare(b.name);
    });
    return _byDial;
  }

  // "+48601234567" → the PL entry. Shared codes (+1, +7) resolve to the first
  // match in the sorted index, which is good enough for prefixing a number.
  function countryForNumber(value) {
    var digits = String(value || '').replace(/[^\d+]/g, '');
    if (digits.charAt(0) !== '+') return null;
    digits = digits.slice(1);
    if (!digits) return null;
    var index = dialIndex();
    for (var i = 0; i < index.length; i++) {
      if (digits.indexOf(index[i].dial) !== 0) continue;
      var owner = primaryFor(index[i].dial);
      return (owner && byIso(owner)) || index[i];
    }
    return null;
  }

  // 🇵🇱 from "PL" — two regional indicator letters, no image files at all.
  function flagEmoji(iso) {
    if (!iso || iso.length !== 2) return '';
    var base = 127397; // 0x1F1E6 - 'A'.charCodeAt(0)
    return String.fromCodePoint(base + iso.charCodeAt(0), base + iso.charCodeAt(1));
  }

  function stripDiacritics(text) {
    var s = String(text || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s;
  }

  // ---------------------------------------------------------------------------
  // Styles — injected once. No !important anywhere.
  // ---------------------------------------------------------------------------
  var CSS = '' +
    '.d2-cp{position:relative;display:block;}' +
    '.d2-cp-toggle{position:absolute;top:0;bottom:0;left:0;display:flex;align-items:center;gap:.35em;' +
    'padding:0 .6em;margin:0;border:0;background:none;font:inherit;color:inherit;line-height:1;cursor:pointer;}' +
    '.d2-cp-flag{font-size:1.15em;line-height:1;}' +
    '.d2-cp-dial{opacity:.75;}' +
    '.d2-cp-caret{width:.5em;height:.5em;border-right:1px solid currentColor;border-bottom:1px solid currentColor;' +
    'transform:rotate(45deg) translate(-.1em,-.1em);opacity:.6;}' +
    '[d2-cp-open] .d2-cp-caret{transform:rotate(225deg) translate(-.15em,-.15em);}' +
    // The author's own element: cursor only. Position is decided in JS, and only
    // when the author left it static — their own class must win over ours.
    '.d2-cp-external{cursor:pointer;}' +
    // Layout "split": the flag becomes its own box to the left of the field
    // instead of sitting inside it. Placed after the base rules so it wins.
    '.d2-cp-split{display:flex;align-items:stretch;gap:.5rem;}' +
    '.d2-cp-split>input{flex:1 1 auto;min-width:0;}' +
    '.d2-cp-split .d2-cp-toggle{position:static;flex:0 0 auto;padding:0 .75em;' +
    'border:1px solid rgba(0,0,0,.15);border-radius:.5rem;}' +
    '.d2-cp-list{position:absolute;z-index:60;top:100%;left:0;min-width:min(20rem,100%);max-height:16rem;overflow:auto;' +
    'display:none;margin-top:.25rem;padding:.25rem;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;' +
    'background:#fff;color:#111;box-shadow:0 12px 32px rgba(0,0,0,.18);}' +
    '[d2-cp-open]>.d2-cp-list{display:block;}' +
    '.d2-cp-search{width:100%;box-sizing:border-box;margin-bottom:.25rem;padding:.5rem .6rem;' +
    'border:1px solid rgba(0,0,0,.15);border-radius:.375rem;font:inherit;color:inherit;}' +
    '.d2-cp-option{display:flex;align-items:center;gap:.5rem;width:100%;padding:.45rem .6rem;border:0;border-radius:.375rem;' +
    'background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;}' +
    '.d2-cp-option:hover,.d2-cp-option[d2-cp-cursor]{background:rgba(0,0,0,.06);}' +
    '.d2-cp-option[d2-is-active]{font-weight:600;}' +
    '.d2-cp-option-name{flex:1;}' +
    '.d2-cp-option-dial{opacity:.6;}' +
    '.d2-cp-empty{padding:.6rem;opacity:.6;}';

  var _cssInjected = false;
  function injectCSS() {
    if (_cssInjected) return;
    var parent = document.head || document.body;
    if (!parent || !document.createElement) return;
    _cssInjected = true;
    var style = document.createElement('style');
    style.setAttribute('d2-country-picker-styles', '');
    style.textContent = CSS;
    parent.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Picker
  // ---------------------------------------------------------------------------
  var registry = [];   // [{ input, picker }]

  function pickerFor(input) {
    for (var i = 0; i < registry.length; i++) if (registry[i].input === input) return registry[i].picker;
    return null;
  }

  function parseList(raw) {
    if (!raw) return [];
    return String(raw).split(/[|,\s]+/).map(function (c) { return c.toUpperCase(); }).filter(Boolean);
  }

  function addClass(el, name) {
    if (!el || !el.className && el.className !== '') return;
    var current = String(el.className || '');
    if ((' ' + current + ' ').indexOf(' ' + name + ' ') === -1) {
      el.className = current ? current + ' ' + name : name;
    }
  }

  /**
   * The author's own toggle: [d2-country-picker-toggle="PHONE"] anywhere on the
   * page, matched against the field's name or id. An empty value takes the
   * nearest one — the same form, or the same label.
   */
  function findToggleFor(input) {
    var key = input.getAttribute('name') || input.getAttribute('id') || '';
    var all = document.querySelectorAll('[d2-country-picker-toggle]');
    var free = [];
    for (var i = 0; i < all.length; i++) {
      if (!all[i].hasAttribute('d2-cp-taken')) free.push(all[i]);
    }

    var take = function (el) { el.setAttribute('d2-cp-taken', ''); return el; };
    var owns = function (el) {
      // The label wins over the form: two forms on one page routinely repeat the
      // same field name (a section form and the one inside a popup), and then
      // "first matching name in the DOM" pairs a field with the other form's box.
      var scope = el.closest ? (el.closest('label') || el.closest('form')) : null;
      return !!(scope && scope.contains && scope.contains(input));
    };
    var named = function (el) {
      var target = (el.getAttribute('d2-country-picker-toggle') || '').trim();
      return target && key && target === key;
    };

    var i2;
    for (i2 = 0; i2 < free.length; i2++) if (named(free[i2]) && owns(free[i2])) return take(free[i2]);
    for (i2 = 0; i2 < free.length; i2++) if (owns(free[i2])) return take(free[i2]);
    for (i2 = 0; i2 < free.length; i2++) if (named(free[i2])) return take(free[i2]);
    return null;
  }

  function isOff(value) {
    var v = String(value == null ? '' : value).toLowerCase();
    return v === 'false' || v === 'off' || v === '0' || v === 'no';
  }

  function Picker(input, options) {
    this.input = input;
    this.options = options || {};
    this._build();
  }

  Picker.prototype._build = function () {
    var self = this;
    var input = this.input;
    var opts = this.options;

    injectCSS();

    this.lang = normalizeLang(opts.lang) || detectLang(input);
    this.t = strings(this.lang);

    // Which countries, and in what order.
    var only = opts.only && opts.only.length ? opts.only : null;
    var list = countriesIn(this.lang).filter(function (c) { return !only || only.indexOf(c.iso) !== -1; });
    if (!list.length) list = countriesIn(this.lang).slice();

    var preferred = opts.preferred && opts.preferred.length ? opts.preferred : [];
    if (preferred.length) {
      var top = [];
      preferred.forEach(function (iso) {
        var found = null;
        for (var i = 0; i < list.length; i++) if (list[i].iso === iso) { found = list[i]; break; }
        if (found && top.indexOf(found) === -1) top.push(found);
      });
      list = top.concat(list.filter(function (c) { return top.indexOf(c) === -1; }));
    }
    this.list = list;

    // Three shapes: the author's own element as the toggle ("custom"), a button
    // beside the field ("split"), or one inside it ("inside", the default).
    var external = findToggleFor(input);
    this.layout = external ? 'custom' : (String(opts.layout || '').toLowerCase() === 'split' ? 'split' : 'inside');

    var wrap, toggle;

    if (external) {
      // Nothing is wrapped or moved: the element built in the Designer IS the
      // toggle, and the list hangs off it.
      wrap = toggle = external;
      wrap.setAttribute('d2-cp-layout', 'custom');
      addClass(wrap, 'd2-cp-external');
      if (toggle.tagName === 'BUTTON') toggle.type = 'button';
      else {
        // A div or a Link Block still has to answer to keyboard and screen readers.
        if (!toggle.getAttribute('role')) toggle.setAttribute('role', 'button');
        if (!toggle.getAttribute('tabindex')) toggle.setAttribute('tabindex', '0');
      }
      toggle.setAttribute('aria-haspopup', 'listbox');
      toggle.setAttribute('aria-expanded', 'false');

      // The list hangs off this element, so it needs a positioning context —
      // but only if the author left one to take. A box they placed themselves
      // (absolute icon slot, fixed bar) keeps exactly the position they gave it.
      try {
        if (typeof getComputedStyle === 'function' && getComputedStyle(toggle).position === 'static') {
          toggle.style.position = 'relative';
        }
      } catch (e) { toggle.style.position = 'relative'; }

      // Slots the author marked, or spans prepended so their caret/icon survives.
      this.flagEl = opts.flags === false ? null : toggle.querySelector('[d2-country-picker-flag]');
      this.dialEl = toggle.querySelector('[d2-country-picker-dial]');
      if (!this.flagEl && opts.flags !== false) {
        this.flagEl = document.createElement('span');
        this.flagEl.className = 'd2-cp-flag';
        toggle.insertBefore(this.flagEl, toggle.firstChild || null);
      }
      if (!this.dialEl) {
        this.dialEl = document.createElement('span');
        this.dialEl.className = 'd2-cp-dial';
        if (this.flagEl && this.flagEl.nextSibling) toggle.insertBefore(this.dialEl, this.flagEl.nextSibling);
        else toggle.appendChild(this.dialEl);
      }
    } else {
      wrap = document.createElement('div');
      wrap.className = this.layout === 'split' ? 'd2-cp d2-cp-split' : 'd2-cp';
      wrap.setAttribute('d2-cp-layout', this.layout);
      if (input.parentNode) input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      toggle = document.createElement('button');
      toggle.type = 'button';                       // never submits the form
      toggle.className = 'd2-cp-toggle';
      toggle.setAttribute('aria-haspopup', 'listbox');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', this.t.choose);
      if (opts.flags !== false) {
        this.flagEl = document.createElement('span');
        this.flagEl.className = 'd2-cp-flag';
        toggle.appendChild(this.flagEl);
      }
      this.dialEl = document.createElement('span');
      this.dialEl.className = 'd2-cp-dial';
      toggle.appendChild(this.dialEl);
      var caret = document.createElement('span');
      caret.className = 'd2-cp-caret';
      toggle.appendChild(caret);
      // Split layout: the button goes BEFORE the field in the DOM, so flex puts
      // it on the left and Tab reaches the country before the number.
      if (this.layout === 'split') wrap.insertBefore(toggle, input);
      else wrap.appendChild(toggle);
    }

    this.wrap = wrap;
    this.toggle = toggle;

    var menu = document.createElement('div');
    menu.className = 'd2-cp-list';
    menu.setAttribute('role', 'listbox');
    wrap.appendChild(menu);
    this.menu = menu;

    if (opts.search !== false && list.length > 8) {
      var search = document.createElement('input');
      search.type = 'text';
      search.className = 'd2-cp-search';
      search.setAttribute('placeholder', this.t.search);
      search.setAttribute('autocomplete', 'off');
      menu.appendChild(search);
      this.search = search;
      search.addEventListener('input', function () { self._renderOptions(search.value); });
      search.addEventListener('keydown', function (e) { self._onMenuKey(e); });
    }

    this.optionsBox = document.createElement('div');
    menu.appendChild(this.optionsBox);
    this._renderOptions('');

    // "prefix" (default) writes the code into the number; "separate" keeps the
    // field digits-only and puts the code in a hidden input instead — that is
    // the shape forms with pattern="\d+" or their own E.164 assembly expect.
    this.mode = String(opts.mode || '').toLowerCase() === 'separate' ? 'separate' : 'prefix';
    if (this.mode === 'separate') this._ensureHiddenFields();

    // Starting country: attribute → whatever the field already holds → PL.
    var detected = countryForNumber(input.value);
    var start = (detected && byIso(detected.iso, this.lang)) || byIso(opts.country, this.lang)
      || byIso('PL', this.lang) || list[0];
    this.setCountry(start.iso, { silent: true, rewrite: false });

    // --- wiring -------------------------------------------------------------
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      self.isOpen() ? self.close() : self.open();
    });

    if (this.layout === 'custom' && toggle.tagName !== 'BUTTON') {
      toggle.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        if (e.preventDefault) e.preventDefault();
        self.isOpen() ? self.close() : self.open();
      });
    }

    this._onDocClick = function (e) {
      if (!self.isOpen()) return;
      if (wrap.contains && wrap.contains(e.target)) return;
      self.close();
    };
    document.addEventListener('click', this._onDocClick);

    this._onKey = function (e) {
      if (!self.isOpen()) return;
      if (e.key === 'Escape' || e.key === 'Esc') { self.close(); self.toggle.focus(); }
    };
    document.addEventListener('keydown', this._onKey);

    // Typing "+49…" moves the flag; blur writes the prefix into the value.
    this._onInput = function () {
      var found = countryForNumber(input.value);
      if (found && found.iso !== self.country.iso) self.setCountry(found.iso, { rewrite: false });
    };
    input.addEventListener('input', this._onInput);

    this._onBlur = function () { self.normalize(); };
    input.addEventListener('blur', this._onBlur);

    // Capture phase so the number carries its prefix before d2-forms validates
    // the field on submit.
    this.form = input.form || (input.closest ? input.closest('form') : null);
    if (this.form) {
      this._onSubmit = function () { self.normalize(); };
      this.form.addEventListener('submit', this._onSubmit, true);
    }

    this._padInput();
    _log('created', { field: input.name || input.id || '(bez nazwy)', country: this.country.iso });
  };

  // Leave room for the flag/dial button inside the field.
  Picker.prototype._padInput = function () {
    var self = this;
    if (this.layout !== 'inside') {        // the flag has its own box; the field keeps its padding
      this.input.style.paddingLeft = '';
      return;
    }
    var apply = function () {
      var width = self.toggle.offsetWidth;
      if (!width) return;
      self.input.style.paddingLeft = (width + 4) + 'px';
    };
    apply();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(apply);

    // The button's width is not ours alone: site CSS restyles it (bigger flag,
    // more padding, a divider), a webfont lands late, a longer code arrives
    // (+1 → +380). Measuring once leaves the number sliding under the flag, so
    // watch the button and re-pad whenever it actually changes size.
    if (!this._sizeWatch && typeof ResizeObserver === 'function') {
      this._sizeWatch = new ResizeObserver(apply);
      this._sizeWatch.observe(this.toggle);
    }
  };

  Picker.prototype._renderOptions = function (query) {
    var self = this;
    var box = this.optionsBox;
    box.innerHTML = '';

    var q = stripDiacritics(query).trim();
    var matches = this.list.filter(function (c) {
      if (!q) return true;
      // Both name sets, whichever language is on screen: someone typing
      // "Germany" on a Polish page still means Niemcy.
      return stripDiacritics(c.name).indexOf(q) !== -1
        || stripDiacritics(c.pl).indexOf(q) !== -1
        || stripDiacritics(c.en).indexOf(q) !== -1
        || c.iso.toLowerCase().indexOf(q) !== -1
        || ('+' + c.dial).indexOf(q) === 0
        || c.dial.indexOf(q.replace(/^\+/, '')) === 0;
    });

    if (!matches.length) {
      var empty = document.createElement('div');
      empty.className = 'd2-cp-empty';
      empty.textContent = self.t.empty;
      box.appendChild(empty);
      return;
    }

    matches.forEach(function (c) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'd2-cp-option';
      option.setAttribute('role', 'option');
      option.setAttribute('d2-cp-iso', c.iso);
      if (self.country && c.iso === self.country.iso) option.setAttribute('d2-is-active', '');

      if (self.options.flags !== false) {
        var flag = document.createElement('span');
        flag.className = 'd2-cp-flag';
        flag.textContent = flagEmoji(c.iso);
        option.appendChild(flag);
      }
      var name = document.createElement('span');
      name.className = 'd2-cp-option-name';
      name.textContent = c.name;
      option.appendChild(name);
      var dial = document.createElement('span');
      dial.className = 'd2-cp-option-dial';
      dial.textContent = '+' + c.dial;
      option.appendChild(dial);

      option.addEventListener('click', function (e) {
        e.preventDefault();
        self.setCountry(c.iso);
        self.close();
        if (self.input.focus) self.input.focus();
      });

      box.appendChild(option);
    });
  };

  // ArrowDown / ArrowUp / Enter inside the search box.
  Picker.prototype._onMenuKey = function (e) {
    var options = this.optionsBox.querySelectorAll('.d2-cp-option');
    if (!options.length) return;
    var current = this.optionsBox.querySelector('[d2-cp-cursor]');
    var index = -1;
    for (var i = 0; i < options.length; i++) if (options[i] === current) index = i;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (e.preventDefault) e.preventDefault();
      index = e.key === 'ArrowDown'
        ? (index + 1) % options.length
        : (index <= 0 ? options.length - 1 : index - 1);
      if (current) current.removeAttribute('d2-cp-cursor');
      options[index].setAttribute('d2-cp-cursor', '');
      if (options[index].scrollIntoView) options[index].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (e.preventDefault) e.preventDefault();
      (current || options[0]).click();
    }
  };

  Picker.prototype.isOpen = function () { return this.wrap.hasAttribute('d2-cp-open'); };

  Picker.prototype.open = function () {
    this.wrap.setAttribute('d2-cp-open', '');
    this.toggle.setAttribute('aria-expanded', 'true');
    if (this.search) { this.search.value = ''; this._renderOptions(''); this.search.focus(); }
    _emit('country-picker:open', { input: this.input, iso: this.country && this.country.iso });
  };

  Picker.prototype.close = function () {
    this.wrap.removeAttribute('d2-cp-open');
    this.toggle.setAttribute('aria-expanded', 'false');
    var cursor = this.optionsBox.querySelector('[d2-cp-cursor]');
    if (cursor) cursor.removeAttribute('d2-cp-cursor');
  };

  /**
   * Select a country. Rewrites the number's prefix when the field already holds
   * one, so switching PL → DE turns "+48 601…" into "+49 601…".
   */
  Picker.prototype.setCountry = function (iso, opts) {
    opts = opts || {};
    var country = byIso(iso, this.lang);
    if (!country) return false;

    var previous = this.country;
    this.country = country;

    if (this.flagEl) this.flagEl.textContent = flagEmoji(country.iso);
    this.dialEl.textContent = '+' + country.dial;
    this.toggle.setAttribute('aria-label', this.t.country + ': ' + country.name + ' (+' + country.dial + ')');

    var active = this.optionsBox.querySelector('[d2-is-active]');
    if (active) active.removeAttribute('d2-is-active');
    var next = this.optionsBox.querySelector('[d2-cp-iso="' + country.iso + '"]');
    if (next) next.setAttribute('d2-is-active', '');

    if (this.mode === 'separate') {
      this._syncHiddenFields();
    } else if (opts.rewrite !== false && previous && previous.iso !== country.iso) {
      var value = String(this.input.value || '').trim();
      if (value) {
        var local = value.charAt(0) === '+'
          ? value.replace(/^\+\s*\d+/, '').trim()          // drop the old dialing code
          : value;
        this.input.value = ('+' + country.dial + ' ' + local).trim();
      }
    }

    this._padInput();
    if (!opts.silent) {
      _emit('country-picker:change', { iso: country.iso, dial: country.dial, name: country.name, input: this.input });
      _log('country', country.iso + ' +' + country.dial);
    }
    return true;
  };

  Picker.prototype.getCountry = function () { return this.country; };

  Picker.prototype.getNumber = function () {
    this.normalize();
    return this.input.value;
  };

  /**
   * Put the dialing code in front of the typed number. An empty field stays
   * empty — pre-filling it would make "required" think the visitor answered.
   */
  Picker.prototype.normalize = function () {
    var value = String(this.input.value || '').trim();

    if (this.mode === 'separate') {
      // Someone pasted a full international number into a digits-only field:
      // move the code to the picker (and the hidden input), keep the rest here.
      if (value.charAt(0) === '+') {
        var found = countryForNumber(value);
        if (found) {
          this.setCountry(found.iso, { rewrite: false });
          // Digits only — a value this module writes itself must never be the
          // reason a pattern="\d+" field refuses to submit.
          this.input.value = value.slice(1 + found.dial.length).replace(/\D/g, '');
        }
      }
      this._syncHiddenFields();
      return;
    }

    if (!value) return;
    if (value.charAt(0) === '+') return;                  // already carries a code

    var local = value.replace(/^0+/, '');                 // national trunk zero
    if (!local) return;
    this.input.value = '+' + this.country.dial + ' ' + local;
  };

  // --- separate mode: the hidden inputs that carry the country ---------------
  //
  // Reuses fields the author already built in the Designer (matched by name) and
  // only creates its own when there are none — so a Webflow form that declares
  // PHONE_DIAL in an Embed keeps that exact field in its submissions.
  Picker.prototype._hiddenName = function (kind) {
    var explicit = kind === 'dial' ? this.options.dialField : this.options.countryField;
    if (explicit) return explicit;
    var base = this.input.name || this.input.id || 'PHONE';
    return base + (kind === 'dial' ? '_DIAL' : '_COUNTRY');
  };

  Picker.prototype._findOrCreateHidden = function (name) {
    var scope = this.form || document;
    var existing = scope.querySelector ? scope.querySelector('[name="' + name + '"]') : null;
    if (existing) return existing;

    var field = document.createElement('input');
    field.type = 'hidden';
    field.name = name;
    field.setAttribute('type', 'hidden');                  // attribute too: [name=…] lookups
    field.setAttribute('name', name);
    field.setAttribute('d2-country-picker-created', '');   // destroy() only removes its own
    (this.form || this.wrap).appendChild(field);
    return field;
  };

  Picker.prototype._ensureHiddenFields = function () {
    this.form = this.form || this.input.form || (this.input.closest ? this.input.closest('form') : null);
    this.dialField = this._findOrCreateHidden(this._hiddenName('dial'));
    this.countryField = this._findOrCreateHidden(this._hiddenName('country'));
  };

  Picker.prototype._syncHiddenFields = function () {
    if (this.mode !== 'separate' || !this.country) return;
    if (!this.dialField || !this.countryField) this._ensureHiddenFields();
    this.dialField.value = '+' + this.country.dial;
    this.countryField.value = this.country.iso;
  };

  Picker.prototype.destroy = function () {
    var self = this;
    var input = this.input;
    if (this._sizeWatch) { this._sizeWatch.disconnect(); this._sizeWatch = null; }
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKey);
    input.removeEventListener('input', this._onInput);
    input.removeEventListener('blur', this._onBlur);
    if (this.form && this._onSubmit) this.form.removeEventListener('submit', this._onSubmit, true);

    [this.dialField, this.countryField].forEach(function (field) {
      if (field && field.hasAttribute('d2-country-picker-created') && field.parentNode) {
        field.parentNode.removeChild(field);
      }
    });

    input.style.paddingLeft = '';
    if (this.layout === 'custom') {
      if (this.menu.parentNode) this.menu.parentNode.removeChild(this.menu);
      ['d2-cp-open', 'd2-cp-layout', 'd2-cp-taken', 'aria-haspopup', 'aria-expanded']
        .forEach(function (name) { self.wrap.removeAttribute(name); });
    } else if (this.wrap.parentNode) {
      this.wrap.parentNode.insertBefore(input, this.wrap);
      this.wrap.parentNode.removeChild(this.wrap);
    }
    input.removeAttribute('d2-country-picker-ready');
    registry = registry.filter(function (entry) { return entry.input !== input; });
    _log('destroyed', input.name || input.id || '(bez nazwy)');
  };

  // ---------------------------------------------------------------------------
  // Auto-init
  // ---------------------------------------------------------------------------
  function optionsFromAttributes(input) {
    return {
      country: attr(input, 'd2-country-picker') || '',
      preferred: parseList(attr(input, 'd2-country-picker-preferred')),
      only: parseList(attr(input, 'd2-country-picker-only')),
      search: !isOff(attr(input, 'd2-country-picker-search')),
      flags: !isOff(attr(input, 'd2-country-picker-flags')),
      lang: attr(input, 'd2-country-picker-lang') || '',
      mode: attr(input, 'd2-country-picker-mode') || 'prefix',
      layout: attr(input, 'd2-country-picker-layout') || 'inside',
      dialField: attr(input, 'd2-country-picker-dial-field') || '',
      countryField: attr(input, 'd2-country-picker-country-field') || '',
    };
  }

  function create(input, options) {
    if (typeof input === 'string') input = document.querySelector(input);
    if (!input || input.tagName !== 'INPUT') {
      console.warn('[digi2.countryPicker] create() needs an <input> — got', input);
      return null;
    }
    var existing = pickerFor(input);
    if (existing) return existing;

    var opts = optionsFromAttributes(input);
    if (options) for (var key in options) if (Object.prototype.hasOwnProperty.call(options, key)) opts[key] = options[key];

    var picker = new Picker(input, opts);
    input.setAttribute('d2-country-picker-ready', '');
    registry.push({ input: input, picker: picker });
    return picker;
  }

  // Any d2-country-picker* attribute switches the field on — writing only
  // d2-country-picker-mode="separate" and getting nothing would be a trap.
  var INIT_SELECTOR = [
    'd2-country-picker',
    'd2-country-picker-mode',
    'd2-country-picker-lang',
    'd2-country-picker-layout',
    'd2-country-picker-only',
    'd2-country-picker-preferred',
    'd2-country-picker-search',
    'd2-country-picker-flags',
    'd2-country-picker-dial-field',
    'd2-country-picker-country-field',
  ].map(function (name) { return '[' + name + ']:not([d2-country-picker-ready])'; }).join(', ');

  function autoInit(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var found = scope.querySelectorAll(INIT_SELECTOR);
    var made = 0;
    for (var i = 0; i < found.length; i++) {
      // The loader tag and a <digi2-module> declaration carry d2-country-picker
      // as a module flag, not as a field. Only inputs are fields.
      if (found[i].tagName !== 'INPUT') continue;
      if (create(found[i])) made++;
    }
    return made;
  }

  window.digi2.countryPicker = {
    create: create,
    get: function (input) {
      if (typeof input === 'string') input = document.querySelector(input);
      return pickerFor(input);
    },
    destroy: function (input) {
      var picker = this.get(input);
      if (picker) picker.destroy();
    },
    list: function () { return registry.map(function (entry) { return entry.input; }); },
    countries: function (lang) { return countriesIn(normalizeLang(lang) || 'pl').slice(); },
    language: function (el) { return detectLang(el || null); },
    init: autoInit,
  };

  var _mo = null;
  function boot() {
    autoInit();
    // CMS rows and popup markup can arrive later — pick those fields up too.
    if (typeof MutationObserver !== 'undefined' && document.body && !_mo) {
      var pending = null;
      _mo = new MutationObserver(function () {
        if (pending) return;
        pending = setTimeout(function () { pending = null; autoInit(); }, 50);
      });
      _mo.observe(document.body, { childList: true, subtree: true });
    }
    _log('init', registry.length + ' pól');
  }

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
