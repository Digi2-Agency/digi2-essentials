/**
 * digi2 Booking — booking a rental straight from the page: the guest's form,
 * the stay, the price and the payment, all answered by the 2destate public
 * site API. Loaded automatically by digi2-loader.js when d2-booking is present.
 *
 * Contract (source of truth): tests/fixtures/booking-api/ — one file per route
 * of /api/v1/public/sites/{public_key}/… plus errors.json and KONTRAKT.md.
 * Contract version 1.
 *
 * ─── Setup ──────────────────────────────────────────────────────────────────
 *
 *   <script src=".../digi2-loader.min.js"
 *     d2-booking="pk_live_…"                        <!-- the site key -->
 *     d2-booking-api="https://api.2destate.com/api/v1"   <!-- optional -->
 *     d2-booking-product="<uuid|slug>"              <!-- optional, page default -->
 *   ></script>
 *
 *   d2-booking="pk_…"            Site key. A public, non-secret string: the
 *                                backend protects itself with the key's domain
 *                                allowlist, rate limits and server-side prices.
 *                                Read raw (a key is not a responsive value).
 *   d2-booking-api="<base>"      Base address of the API, default
 *                                https://api.2destate.com/api/v1. https only
 *                                (http is allowed for localhost while building).
 *                                Read raw: an address may contain ';' and '@'.
 *   d2-booking-product="<ref>"   Product (apartment) this page books — a uuid
 *                                or a slug, on the loader tag or on the form.
 *                                The calendar may pick another one. With no
 *                                attribute anywhere the module reads
 *                                ?apartament=<slug> off the address, which is
 *                                how one booking page serves a whole CMS
 *                                collection. An attribute always wins.
 *
 * A reference is resolved once per visit through GET /products/<ref> — the
 * only route of the contract whose path takes a reference — and the id of
 * that answer is what availability, quote and bookings are asked with, since
 * all three are spelled {product_id}. A product that cannot be read is not a
 * dead page: the reference goes out as the page wrote it.
 *
 * On start the module reads GET /config once and keeps the answer for the whole
 * page: which fields the form asks for, the languages, the oldest child age.
 * A /config that cannot be read never closes the form — the backend decides.
 *
 * ─── The form ───────────────────────────────────────────────────────────────
 *
 *   <form d2-booking-form>
 *     <div d2-booking-field-group>            optional wrapper: label + field
 *       <label>…</label>
 *       <input d2-booking-field="name">
 *       <div d2-booking-error="name"></div>   optional: where the message goes
 *     </div>
 *   </form>
 *
 *   d2-booking-field="…"         name | email | phone | note | adults |
 *                                children | child_ages | pets |
 *                                pets_over_threshold
 *   d2-booking-field-group       Wrapper removed together with its field when
 *                                the key does not ask for it (so the label goes
 *                                too). Without it only the field is removed, and
 *                                a group holding several fields that stay keeps
 *                                its place — only the one field goes.
 *   d2-booking-error="<field>"   Where the message for that field is written;
 *                                "form" is the message for the whole form.
 *                                Missing ones are built next to the field.
 *   d2-booking-hint="<field>"    Where a sentence the key decides goes. Today
 *                                one: pets_over_threshold gets the pet_fee of
 *                                the product (the weight threshold, the amount
 *                                and whether it is per stay or per night), so
 *                                the guest can answer the question. A slot
 *                                with nothing to say is emptied and marked
 *                                d2-booking-empty.
 *
 * Required-ness comes from /config form_fields:
 *   off        the field (and its group) is removed from the page and never sent
 *   optional   sent when the guest filled it
 *   required   submit is blocked with a message on the field
 * name and email are always required; adults is never switched off, because
 * with children off it is the guest count. child_ages goes off with children.
 *
 * The browser check is there to be kind, not to be the judge: the backend
 * decides, and a 422 field_required / validation_error is shown on the field it
 * names. guests is always adults + children, so no request ever contradicts
 * itself (KONTRAKT.md, the group composition section); with children off,
 * adults is left out of the request and guests carries the count.
 *
 * ─── The calendar ───────────────────────────────────────────────────────────
 *
 *   <div d2-booking-calendar></div>      the module draws the month inside
 *
 * One window per month from GET /products/<ref>/availability, kept for the
 * visit. The answer carries the rules and the calendar honours them: min_units,
 * max_units, lead_time_hours, buffer_minutes and the busy periods — the whole
 * of what the answer carries. Nothing is computed about price here — only
 * about which squares a guest may click.
 *
 * A square is a date in the rental's timezone, never an instant: busy periods
 * are converted with Intl and the arithmetic runs on day numbers, so no
 * daylight saving change can move a night. A period that ends at local midnight
 * leaves its last date free — the guest who leaves that morning never slept
 * there, so the first day of a taken period is still someone else's departure.
 *
 * buffer_minutes widens a booking, and only a booking. Every busy period comes
 * with a kind: a blackout (the owner closing the days) is an exact window, so
 * "renovation until 12:00" leaves the flat free at 12:00 and the nights beside
 * it bookable. The backend counts it the same way, and a calendar that widened
 * every period would grey out nights it would have taken. A kind the module
 * does not know is counted as a booking — a night refused for nothing can be
 * won back, a double booking cannot. A blocked square says which of the three
 * it is: taken, closed by the owner, or the gap between two stays.
 *
 * Keyboard and screen readers: real <button>s inside role="grid", one tab stop
 * for the month (roving tabindex) and the arrows, Home/End and PageUp/PageDown
 * between days; Enter and Space are left to the browser, which clicks a button
 * on its own. A day a guest may not pick carries aria-disabled, never the
 * disabled property: a day that cannot be reached is a day nobody can be told
 * about. Every day says its full date and its state in aria-label, and the
 * chosen range is announced in [d2-booking-status] (role="status").
 *
 * ─── The price ──────────────────────────────────────────────────────────────
 *
 *   <div d2-booking-breakdown>
 *     <div d2-booking-line>                 optional template, cloned per line
 *       <span d2-booking-line-label></span>
 *       <span d2-booking-line-detail></span>
 *       <span d2-booking-line-amount></span>
 *     </div>
 *   </div>
 *   <strong d2-booking-total></strong>
 *   <span d2-booking-deposit></span>  <span d2-booking-balance></span>
 *
 * Once the period and the party are known, POST /products/<ref>/quote answers
 * the price — once per settled change (a 300 ms debounce), and a slower answer
 * to an older question never overwrites a newer one. The module prints what the
 * answer says and computes nothing: amount_total is the total, each line is one
 * row, and the …_minor fields are divided only by the number of digits Intl
 * says that currency has. Formatting is Intl.NumberFormat in the language of
 * /config with the currency of the answer.
 *
 * An answer with available: false, a 409 rental_rules and a 400 about the
 * period all clear the price and leave one short sentence in the live region:
 * a price beside "this stay cannot be had" would be an offer nobody can keep.
 *
 * ─── The list of places ─────────────────────────────────────────────────────
 *
 *   <div d2-booking-results>
 *     <a d2-booking-template d2-booking-link>      the row, cloned per place
 *       <img d2-booking-bind="image">
 *       <h3 d2-booking-bind="name"></h3>
 *       <span d2-booking-bind="city_line"></span>
 *       <span d2-booking-bind="price"></span>
 *     </a>
 *   </div>
 *   <button d2-booking-more>Pokaż więcej</button>
 *   <span d2-booking-count></span>
 *   <div d2-booking-results-empty>Nic nie znaleźliśmy.</div>
 *
 * GET /products answers the list, and the row the page built is the row the
 * guest reads: [d2-booking-template] is remembered, taken off the page before
 * anything shows and cloned once per entry — markup, classes and nesting as
 * the Designer wrote them. A page that brought no template gets cards the
 * module draws itself, out of the same stylesheet and the same CSS variables
 * as the drawn widget.
 *
 *   d2-booking-results            The list. Its rows are appended, so a button
 *                                 or a count belongs NEXT to it.
 *   d2-booking-results-limit="n"  How many places one page asks for (24).
 *   d2-booking-results-link="…"   The address shape every card of this list
 *                                 leads to (below).
 *   d2-booking-template           The row. Never shown itself; EVERY one of
 *                                 them leaves the page (a Collection List
 *                                 renders the card once per CMS item).
 *   d2-booking-item               Set by the module on every rendered row.
 *   d2-booking-bind="<field>"     One field of the entry, as text.
 *   d2-booking-link[="…"]         The card's own address.
 *   d2-booking-more               Asks for the next page and appends it;
 *                                 hidden when has_more says there is none.
 *   d2-booking-count              The count the answer carries.
 *   d2-booking-results-empty      Shown only when the answer has nothing.
 *   d2-booking-results-state      Set: loading | ready | empty | error
 *   d2-booking-results-message    The sentence of a refusal (role="status")
 *   d2-booking-results-drawn      Set when the module drew the cards itself.
 *
 * Every field of the contract binds by its own name — name, project_name,
 * city, city_line, address_line, rooms, area, floor, beds, max_guests,
 * description, rental_kind, timezone, latitude… — so a page is never limited
 * to a list somebody hardcoded. Four fields read differently: `image` takes
 * image_url (the src and the alt of an <img>, the background of anything
 * else), `price` is the entry's price in the entry's currency through the same
 * Intl formatting as the quote (the module computes no amount here either),
 * `price_unit` says what that amount is the price of, and a field whose value
 * is a list of scalars (amenities) is joined with commas. A missing or null
 * field leaves the element empty and marked d2-booking-empty — never the word
 * "null" — a flag that is false does the same, a name the answer does not
 * carry at all does too (the field has to be the entry's own, or "constructor"
 * would render JavaScript into the card), and an object (pet_fee, prices) says
 * nothing rather than "[object Object]". A flag that is true leaves the slot
 * exactly as the Designer built it, markup inside and all.
 *
 * Nothing out of the answer is ever markup: a value goes in with textContent,
 * an address with setAttribute, and a picture only once its address reads as
 * one — a src is one click from running and a background goes into a style
 * property, where a single quote ends the declaration. These names come out of
 * a CMS this module does not own.
 *
 * A card leads to ?apartament=<slug>, which is the query this module reads on
 * the booking page, so the list and the booking page fit together with nothing
 * written. A client whose apartments are CMS pages under their own addresses
 * writes the shape instead — d2-booking-link="/apartamenty/{slug}" on the link
 * or d2-booking-results-link on the whole list; {slug} and {id} are the two
 * references the booking page can resolve, both escaped on the way out and
 * each one the field it names. An entry with no reference for the shape it is
 * given — a null slug under /apartamenty/{slug} — leaves the card without an
 * href rather than pointing at a page that is not there.
 *
 * Paging is limit and offset: [d2-booking-more] asks for the next page and
 * appends it, so the guest keeps what they were already reading, and goes when
 * the answer says has_more is false. A page that was refused keeps the button
 * and its offset — the next click asks for that same page again instead of
 * skipping it — and says why in [d2-booking-results-message], in the module's
 * own words, with the empty state taken down: a refusal is not an offer with
 * nothing in it. One refusal holds the button: a 429 waits exactly
 * Retry-After seconds, because opening it at once buys the next 429.
 *
 * ─── The search above the list ──────────────────────────────────────────────
 *
 *   <form d2-booking-search>
 *     <input type="date"   d2-booking-search-field="check_in">
 *     <input type="date"   d2-booking-search-field="check_out">
 *     <input type="number" d2-booking-search-field="adults">
 *     <input type="number" d2-booking-search-field="children">
 *     <select d2-booking-search-field="location">…</select>
 *     <button type="submit">Szukaj</button>
 *   </form>
 *
 * A submit searches without leaving the page: every list goes back to its
 * first page with the new filter, and the search goes into the page address
 * (replaceState), so a reload keeps it and the link is worth sharing. The
 * module reads those parameters on start — before the first page of any list —
 * and fills the form with them. The form and the address are merged: a key the
 * form has no field for keeps what the address said, so a search survives a
 * form that asks about only half of it. A submit repeating a question whose
 * first page is still in flight is ignored, and a search form on a page with
 * no list says so in the console.
 *
 *   d2-booking-search             The form. Its submit is the module's.
 *   d2-booking-search-field="…"   check_in | check_out | adults | children |
 *                                 location
 *   d2-booking-location="<city>"  Pins the city, on the form or on a list; the
 *                                 guest cannot change it. Read raw.
 *   d2-booking-pinned             Set on a location field under a pin, which
 *                                 is also disabled.
 *   d2-booking-search-option      Set on an <option> the module added to a
 *                                 <select> for a city the page does not offer.
 *   d2-booking-search-bound       Set when the submit is taken.
 *
 * A <select> takes only a value one of its own <option>s carries: a browser
 * answers anything else with selectedIndex -1, so the field stands blank and
 * reads back empty — and a field answers for its own key even when it is
 * empty, so the city of a shared link would be lost off the screen AND out of
 * the merge, serving the whole offer under an address promising one city. The
 * link wins: the module adds the one option it needs and selects it, so the
 * result, the field and the address name the same city even when that result
 * is empty. The same repair shows a pinned city a select does not offer.
 *
 * GET /products takes a period, a guest count and a city, so guests is ALWAYS
 * the sum of adults and children (KONTRAKT.md): adults and children are never
 * sent, nothing can contradict the sum, and a page that asks about neither
 * sends no guests at all. The period is both dates or none — half a period, or
 * a departure that is not after the arrival, asks the API nothing and leaves
 * one sentence in [d2-booking-results-message], because the route answers
 * those with a 400 whose text is for logs — and it leaves the filter in force
 * exactly as it was, so the rows on screen and the next page they will be
 * paged with still belong to the same question.
 *
 * The period may be typed or picked in a [d2-booking-calendar] standing in the
 * form — the same calendar the booking form uses, and the only one: the search
 * reads the stay it already announced. A typed field wins over it.
 *
 * A pinned city beats the field and the address alike and is never written
 * into the address: it is the page's decision, not the guest's search. A list
 * may carry a pin with no search form anywhere near it, which is how a page of
 * one city is built. An answer still in flight when a new search goes out is
 * dropped: it would show places nobody asked about and move the paging past
 * the rows on screen.
 *
 * ─── The look the module draws itself ───────────────────────────────────────
 *
 *   <div d2-booking-widget></div>        an empty one is enough
 *
 * Inside a widget the module draws every part the page does not have: the
 * calendar, the live region, the form (party row, guest fields, message slot
 * and the submit button), the breakdown, the total and the deposit/balance.
 * The Designer always wins: a part that already exists ON THE PAGE is never
 * drawn a second time, and a widget holding the Designer's own calendar and
 * form only gets what they left out. One widget per page books one stay, so a
 * second widget finds every part taken, stays empty and says so in the console.
 *
 * The look is styled through CSS variables with a d2-booking- prefix, every
 * rule scoped to [d2-booking-widget] and none of them !important — so the site
 * CSS wins on sight, and a page that only wants other colours sets:
 *
 *   --d2-booking-accent, --d2-booking-accent-text, --d2-booking-text,
 *   --d2-booking-muted, --d2-booking-bg, --d2-booking-surface,
 *   --d2-booking-border, --d2-booking-busy, --d2-booking-range,
 *   --d2-booking-error, --d2-booking-radius, --d2-booking-gap,
 *   --d2-booking-pad, --d2-booking-width, --d2-booking-font
 *
 * The digi2 mark sits at the end of a drawn widget. A page that built its own
 * widget carries the mark where it put [d2-booking-mark], and the module fills
 * in its address and text. A key whose /config says branding_hidden has no
 * mark at all — the one the page built is removed too.
 *
 * ─── Payment ────────────────────────────────────────────────────────────────
 *
 * Submit creates the booking and then opens the payment: POST …/bookings, then
 * POST /bookings/<id>/checkout-session, then the browser goes to the address
 * the answer carries. Only an https address is followed (http is allowed for
 * localhost while building), because a redirect is the one thing a tampered
 * answer could use.
 *
 * A booking is created once. The submit button goes down on the first click and
 * the flight is kept under the key of the request itself, so a double submit
 * gets the answer of the attempt already running — and a retry after a payment
 * hiccup pays the booking that already exists instead of holding the period
 * twice. Changing the dates or the party is a new request and a new booking.
 * Changing the contact is not: the booking keeps its hold and goes to
 * POST /bookings/{id}/contact first, so what the guest is told reaches the
 * address they typed last. Its contact_token lives only in this module, never
 * on the booking object, in an event or in the address.
 *
 * Every POST /bookings carries an Idempotency-Key tied to the exact body, so a
 * request that timed out here but landed there is recovered by the retry
 * instead of being refused by the guest's own hold.
 *
 * Every payment refusal is answered by its reason (contract: the module reads
 * reason, never the message):
 *   booking_not_payable, booking_already_paid, stripe_not_connected,
 *   stripe_account_not_ready   final — its own sentence, and the button stays
 *                              down, because no retry can mend them
 *   payment_provider_unavailable (502)  a retry: the button opens again and the
 *                              next submit pays the same booking
 *   too_many_requests (429)    the button waits exactly Retry-After seconds
 *   payment_required: false    nothing is paid: the booking is in and the guest
 *                              reads that the owner decides
 *
 * ─── The return page ────────────────────────────────────────────────────────
 *
 *   <div d2-booking-return></div>        an empty one is enough
 *
 * The page Stripe sends the guest back to: …?booking=<id>&payment=<success|
 * cancelled|balance_success|balance_cancelled>. The block reads the id out of
 * the address (or out of its own value when the page knows it), asks
 * GET /bookings/<id>/status and says what became of the booking: confirmed,
 * paid and waiting for the owner, still being checked, or the hold is gone and
 * a new period is needed — and then the answer's site_url is the way to pick
 * one (null means the key has no such page, so there is no link).
 *
 * The card goes through before the webhook lands, so the status is asked again
 * after a longer wait each time — eight tries over about forty seconds — and
 * then the block stops and says the payment is still being checked. A
 * cancelled payment is read once and never polled: nothing is on its way.
 *
 *   d2-booking-return[="<id>"]   The block; its value is the booking id when
 *                                the page knows it without the address.
 *   d2-booking-return-state      Set by the module: loading | checking |
 *                                confirmed | paid | balance_paid | cancelled |
 *                                rejected | expired | unknown | error
 *   d2-booking-return-message    The sentence (role="status")
 *   d2-booking-return-balance    What is left to pay, and by when
 *   d2-booking-return-new        <a> to the answer's site_url
 *
 * ─── The manage page ────────────────────────────────────────────────────────
 *
 *   <div d2-booking-manage></div>        an empty one is enough
 *
 * The link from the e-mail: <manage_url>?booking=<id>#token=<token>&action=
 * <details|balance|refund|change-date>. The token is read out of the fragment
 * once, taken off the address bar at once (replaceState, so no history entry
 * keeps it) and sent only in the X-Booking-Token header. It is never written
 * to the page, to the address, to an event or to the log, and the module never
 * looks inside it: what the link is for comes from `action`, never from the
 * token's shape. The price of that is honest: a reload has no token any more
 * and needs the link from the e-mail again.
 *
 * The block shows what the answer carries — the place, the dates as civil days
 * in the rental's timezone, the amounts, the balance when there is one and the
 * emergency phone when the answer has one — and the actions the answer allows:
 * the balance through balance-checkout (a balance link only) and a refund or a
 * date change through requests (a manage link only). An action the answer does
 * not allow is taken off the page, the Designer's own one included. A 201 on a
 * request means "saved": nothing changes, no money moves, the owner decides in
 * the panel — so the button goes and the request joins the list.
 *
 * Every refusal of a token is the same booking_not_found — missing, wrong,
 * expired, for another purpose, from another booking or outside the key — so
 * the block shows one sentence about an invalid link, no data at all and the
 * way to account_url. A refusal that is NOT about the token (a dead network, a
 * rate limit) says that instead: telling that guest their e-mail is worthless
 * would send them looking for a link they already have.
 *
 *   d2-booking-manage[="<id>"]        The block
 *   d2-booking-manage-state           Set: loading | ready | invalid | error |
 *                                     returned (came back from a payment, so
 *                                     there is no token and nothing to say)
 *   d2-booking-manage-status          Set: the booking status from the answer
 *   d2-booking-manage-message         The sentence (role="status")
 *   d2-booking-manage-field="<name>"  booking_id | product_name | dates |
 *                                     starts_at | ends_at | status | paid |
 *                                     outstanding | refunded | balance |
 *                                     balance_due_at | emergency_phone
 *   d2-booking-manage-action="<kind>" balance | refund | date_change
 *   d2-booking-manage-input="<name>"  requested_starts_at |
 *                                     requested_units_count | customer_note
 *   d2-booking-manage-requests        The list of the guest's own requests
 *   d2-booking-manage-request         One row, cloned from the page's template
 *                                     (+ …-kind, …-status, …-date, …-note)
 *   d2-booking-manage-account         <a> to account_url from /config
 *
 * Stripe comes back from the balance to the same manage page WITHOUT a token,
 * so a manage page should also carry a <div d2-booking-return>: the manage
 * block then stays quiet and the return block reads the status.
 *
 * ─── Module API ─────────────────────────────────────────────────────────────
 *
 *   digi2.booking.config()           Promise of /config (read once per page)
 *   digi2.booking.request(m, p, o)   One API call → { ok: true, data } or a
 *                                    typed refusal { ok: false, reason, status,
 *                                    message, field?, violations?, retryAfter? }
 *   digi2.booking.values(form)       What this form would send right now
 *   digi2.booking.validate(form)     Browser-side check, marks the fields
 *   digi2.booking.book(form, stay)   Validate and POST the booking
 *   digi2.booking.checkout(f, stay)  Book and open the payment (what submit does)
 *   digi2.booking.pay(bookingId)     Open the payment of a booking that exists
 *   digi2.booking.select(stay)       The stay the page's form books
 *   digi2.booking.stay()             The stay chosen right now
 *   digi2.booking.quote()            Ask for the price now (skips the debounce)
 *   digi2.booking.price()            The last quote answer the module printed
 *   digi2.booking.money(a, cur)      Amount in whole currency → guest text
 *   digi2.booking.moneyMinor(n, cur) Amount in minor units → guest text
 *   digi2.booking.message(reason)    Human sentence for a refusal reason
 *   digi2.booking.status(bookingId)  Read the status of a booking once
 *   digi2.booking.returned()         The last status the return block printed
 *   digi2.booking.managed()          The last manage answer (never the token)
 *   digi2.booking.apply()            Re-read the page after a DOM change
 *
 *   digi2.on('booking:ready', fn)    /config answered — fn({ config })
 *   digi2.on('booking:stay', fn)     Stay chosen or cleared — fn({ stay })
 *   digi2.on('booking:quote', fn)    Price answered — fn({ quote, reason? })
 *   digi2.on('booking:created', fn)  Booking created — fn({ booking, form })
 *   digi2.on('booking:payment', fn)  Leaving for the checkout — fn({ booking_id,
 *                                    url, session, form })
 *   digi2.on('booking:refused', fn)  Refusal — fn({ reason, status, form })
 *   digi2.on('booking:return', fn)   Status read — fn({ booking_id, state,
 *                                    status })
 *   digi2.on('booking:list', fn)     List answered — fn({ count, shown,
 *                                    has_more }) or fn({ reason, status })
 *   digi2.on('booking:search', fn)   Search performed — fn({ search }) or
 *                                    fn({ search, message }) when it could
 *                                    not go out
 *   digi2.on('booking:manage', fn)   Manage read — fn({ booking_id, booking })
 *   digi2.on('booking:request', fn)  Request saved — fn({ booking_id, request })
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  var CONTRACT_VERSION = 1;
  var DEFAULT_API = 'https://api.2destate.com/api/v1';
  var FETCH_TIMEOUT_MS = 10000;
  var DEFAULT_CHILD_MAX_AGE = 12;
  // One quote per settled change: clicking a range and typing the guest count
  // is one decision, not five.
  var QUOTE_DEBOUNCE_MS = 300;
  var DAY_MS = 86400000;

  // Every field the form may carry, and the request key it becomes.
  var TEXT_KEY = {
    name: 'customer_name',
    email: 'customer_email',
    phone: 'customer_phone',
    note: 'customer_note'
  };
  var NUMBER_FIELD = { adults: 1, children: 1, pets: 1, pets_over_threshold: 1 };
  var FIELDS = {
    name: 1, email: 1, phone: 1, note: 1,
    adults: 1, children: 1, child_ages: 1, pets: 1, pets_over_threshold: 1
  };
  // Fields the key does not list in form_fields but which still have a say.
  var ALWAYS_REQUIRED = { name: 1, email: 1 };
  // Which form_fields entry governs a field that has no entry of its own.
  var CONFIG_KEY = { pets_over_threshold: 'pets' };
  var STATES = { off: 1, optional: 1, required: 1 };

  // Where the mark points. The only address the module ever puts on the page
  // besides the API, so it is a constant and not an attribute.
  var MARK_URL = 'https://digi2.agency';
  // Balance refusals no retry can mend, on top of PAYMENT_FINAL: there is
  // nothing left to pay, so the button has nothing left to do.
  var BALANCE_FINAL = { no_balance: 1, balance_already_paid: 1 };
  // Payment refusals no retry can mend (contract: by reason, never by message).
  var PAYMENT_FINAL = {
    booking_not_payable: 1,
    booking_already_paid: 1,
    stripe_not_connected: 1,
    stripe_account_not_ready: 1
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var INT_RE = /^\d{1,6}$/;
  // A key sits in the URL path: no whitespace and nothing that would end it.
  var KEY_RE = /^[^\s\/?#]{1,200}$/;
  var HTTPS_BASE_RE = /^https:\/\/[^\s@\/?#]+(\/[^\s?#]*)?$/;
  var LOCAL_BASE_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s?#]*)?$/;
  // The checkout address, which may carry a query — the only address the module
  // ever sends the browser to, so it is checked before it is followed.
  var CHECKOUT_URL_RE = /^https:\/\/[^\s"'<>]+$/;
  var LOCAL_CHECKOUT_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s"'<>]*)?$/;

  // The address of a picture the answer carries. It goes into src and into a
  // style property, so it is read as an address first: a quote, a bracket or a
  // backslash inside url(…) ends the declaration and starts whatever came with
  // the answer, and a javascript: address in a src is one click from running.
  var IMAGE_URL_RE = /^(https?:\/\/|\/|data:image\/)[^\s"'()<>\\]*$/;
  // One page of GET /products. The key has its own maximum; this is only what
  // the module asks for when the page did not say.
  var DEFAULT_LIST_LIMIT = 24;
  // The query the booking page reads its product out of, and so the address a
  // card of the list leads to when the page spelled no shape of its own.
  var LIST_PARAM = 'apartament';
  // What a search form may ask about. GET /products takes a period, a guest
  // count and a city; adults and children are the page's own two questions and
  // only their sum goes out.
  var SEARCH_FIELDS = { check_in: 1, check_out: 1, adults: 1, children: 1, location: 1 };
  // The same names in the page address, so a reload keeps the search and the
  // link opens the same result. The party stays as the two questions the page
  // asked: a shared link has to be able to put them back in the form.
  var SEARCH_PARAMS = ['check_in', 'check_out', 'adults', 'children', 'location'];
  // A day as the filter spells one (products.json: check_in "2027-05-01").
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  // The guest-facing copy lives in one table; stage 8 swaps it for dictionaries.
  var MESSAGES = {
    required: 'Wypełnij to pole.',
    email: 'Podaj adres e-mail w postaci jan@przyklad.pl.',
    number: 'Podaj liczbę.',
    form_invalid: 'Popraw zaznaczone pola.',
    stay_required: 'Wybierz termin pobytu.',
    key_missing: 'Rezerwacja nie jest tu jeszcze skonfigurowana.',
    network_error: 'Brak połączenia z systemem rezerwacji. Sprawdź internet i spróbuj ponownie.',
    bad_response: 'Coś poszło nie tak. Spróbuj ponownie za chwilę.',
    server_error: 'Coś poszło nie tak po naszej stronie. Spróbuj ponownie za chwilę.',
    request_refused: 'Nie udało się dokończyć rezerwacji. Spróbuj ponownie.',
    site_key_not_found: 'Rezerwacja online jest niedostępna. Skontaktuj się z obiektem.',
    origin_not_allowed: 'Rezerwacja online nie działa na tej stronie. Skontaktuj się z obiektem.',
    product_not_found: 'Tego obiektu nie ma już w ofercie.',
    booking_not_found: 'Ten link do rezerwacji jest nieważny lub wygasł. Nowy znajdziesz w e-mailu.',
    field_required: 'To pole jest wymagane.',
    field_invalid: 'Popraw tę odpowiedź.',
    validation_error: 'Popraw zaznaczone pola.',
    invalid_request: 'Nie możemy użyć tych danych. Sprawdź termin i dane, potem spróbuj ponownie.',
    invalid_stay: 'Sprawdź daty pobytu.',
    // The same 400, on a search that also named a city: the route's own
    // sentence is for logs, and the guest cannot tell which half it was about.
    invalid_search: 'Sprawdź daty i miejsce pobytu.',
    request_too_large: 'Wiadomość jest za długa. Skróć uwagi i spróbuj ponownie.',
    rental_rules: 'Tego pobytu nie można zarezerwować. Wybierz inny termin lub długość pobytu.',
    period_taken: 'Ten termin został właśnie zajęty. Wybierz inny.',
    too_many_requests: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    booking_not_payable: 'Ta rezerwacja nie czeka już na płatność.',
    hold_expired: 'Czas na opłacenie tej rezerwacji minął. Wyślij formularz jeszcze raz, żeby zarezerwować ten termin od nowa.',
    idempotency_key_reused: 'Dane formularza się zmieniły. Wyślij go jeszcze raz.',
    contact_locked: 'Nie możemy już zmienić danych kontaktowych tej rezerwacji. Przywróć poprzednie dane albo zacznij od początku.',
    booking_already_paid: 'Ta rezerwacja jest już opłacona.',
    balance_already_paid: 'Dopłata jest już zaksięgowana.',
    balance_processing: 'Płatność jest w drodze. Odśwież stronę za chwilę.',
    no_balance: 'Nie ma teraz nic do dopłaty.',
    stripe_not_connected: 'Płatności nie są włączone w tym obiekcie. Skontaktuj się z nim.',
    stripe_account_not_ready: 'Płatności nie są jeszcze gotowe w tym obiekcie. Skontaktuj się z nim.',
    payment_provider_unavailable: 'Operator płatności jest chwilowo niedostępny. Spróbuj ponownie za chwilę.',
    request_not_allowed: 'Tej prośby nie można teraz złożyć — rezerwacja jest zamknięta albo prośba już czeka na decyzję.',
    request_already_waiting: 'Taka prośba już czeka na decyzję właściciela.',
    // The pets question, explained. The threshold and the amount come from the
    // product's pet_fee: the weight never enters the arithmetic, it is only the
    // sentence the guest reads (KONTRAKT.md, the group composition section).
    pet_fee_over: 'Zwierzę powyżej {kg} kg: {amount} za pobyt.',
    pet_fee_over_night: 'Zwierzę powyżej {kg} kg: {amount} za każdą noc.',
    pet_fee_flat: 'Dopłata za zwierzę: {amount} za pobyt.',
    pet_fee_flat_night: 'Dopłata za zwierzę: {amount} za każdą noc.',
    // Payment
    payment_opening: 'Przenosimy Cię do płatności…',
    booking_received: 'Rezerwacja zapisana. Wyślemy potwierdzenie, gdy zostanie przyjęta.',
    checkout_url_missing: 'Rezerwacja jest zapisana, ale nie udało się otworzyć płatności. Spróbuj ponownie.',
    // The return page — what became of the booking the guest just paid for
    return_loading: 'Sprawdzamy Twoją rezerwację…',
    return_checking: 'Płatność jest jeszcze sprawdzana. Gdy rezerwacja zostanie potwierdzona, napiszemy na Twój e-mail.',
    return_pending: 'Rezerwacja przyjęta i czeka na decyzję obiektu. Po jej akceptacji napiszemy na Twój e-mail.',
    return_confirmed: 'Rezerwacja potwierdzona. Do zobaczenia!',
    return_paid: 'Płatność zaksięgowana. Czekamy jeszcze na potwierdzenie od obiektu.',
    return_rejected: 'Obiekt nie przyjął tej rezerwacji. Możesz wybrać inny termin.',
    return_cancelled: 'Płatność nie została dokończona, więc ten termin wrócił do oferty.',
    return_cancelled_hold: 'Płatność nie została dokończona. Termin trzymamy jeszcze chwilę.',
    return_expired: 'Czas na opłacenie tej rezerwacji minął i termin wrócił do oferty.',
    return_balance_paid: 'Dopłata zaksięgowana. Dziękujemy!',
    return_balance_cancelled: 'Dopłata nie została dokończona. Możesz wrócić do niej tym samym linkiem.',
    return_balance: 'Do dopłaty {amount} — termin: {date}.',
    return_new_period: 'Wybierz nowy termin',
    return_unknown: 'Nie wiemy, o którą rezerwację chodzi. Otwórz link z e-maila jeszcze raz.',
    // The manage page — the booking through the token from the e-mail
    manage_loading: 'Wczytujemy rezerwację…',
    manage_account: 'Przejdź do swoich rezerwacji',
    manage_balance: '{amount} — termin: {date}',
    manage_balance_elsewhere: 'Dopłatę otworzysz linkiem „Dopłata” z e-maila.',
    manage_pay_balance: 'Dopłać teraz',
    manage_refund: 'Poproś o zwrot',
    manage_change_date: 'Poproś o zmianę terminu',
    manage_request_sent: 'Prośba zapisana. Decyzję podejmie obiekt i odezwie się do Ciebie.',
    manage_date_required: 'Podaj nową datę przyjazdu.',
    manage_label_product: 'Obiekt',
    manage_label_dates: 'Termin',
    manage_label_status: 'Stan rezerwacji',
    manage_label_paid: 'Wpłacono',
    manage_label_outstanding: 'Do zapłaty',
    manage_label_refunded: 'Zwrócono',
    manage_label_balance: 'Dopłata',
    manage_label_phone: 'Telefon alarmowy',
    manage_label_requests: 'Twoje prośby',
    manage_label_new_date: 'Nowa data przyjazdu',
    manage_label_nights: 'Liczba nocy',
    manage_label_note: 'Uwagi dla obiektu',
    // The look the module draws itself
    submit_label: 'Zarezerwuj',
    total_label: 'Razem',
    deposit_label: 'Teraz:',
    balance_label: '· później:',
    child_ages_hint: 'np. 7, 10',
    // What the price of a place is the price of. The contract's only unit is a
    // day, and a day of a rental is a night (allowed_units, products.json); a
    // unit this table does not know shows nothing rather than a bare code.
    unit_day: 'za noc',
    mark: 'Rezerwacje: digi2',
    // The calendar, said out loud: every one of these reaches the guest
    // through the live region or an aria-label.
    calendar_loading: 'Sprawdzamy wolne terminy…',
    calendar_pick: 'Wybierz datę przyjazdu.',
    calendar_arrival: 'Przyjazd {date}. Teraz wybierz datę wyjazdu.',
    calendar_range: 'Wybrany termin: {from} – {to}, {count} {nights}.',
    calendar_prev: 'Poprzedni miesiąc',
    calendar_next: 'Następny miesiąc',
    day_busy: 'zajęte',
    day_past: 'termin już niedostępny',
    day_arrival: 'wybrany przyjazd',
    day_departure: 'wybrany wyjazd',
    day_in_range: 'w wybranym terminie',
    day_can_depart: 'możliwy wyjazd',
    day_today: 'dziś',
    nights_one: 'noc',
    nights_few: 'noce',
    nights_many: 'nocy'
  };
  var GENERIC_MESSAGE = 'Nie udało się dokończyć rezerwacji. Spróbuj ponownie lub skontaktuj się z obiektem.';
  /**
   * Availability codes (services/rental_availability.py), the language-
   * independent part of a rental_rules refusal. The calendar refuses with the
   * same codes, so the sentence a guest reads is the same whether the browser
   * or the backend caught the rule.
   *
   * Every key is a literal from the backend's VIOLATION_* constants
   * (services/rental_availability.py) and is pinned by
   * tests/fixtures/booking-api/errors.json — never guessed from the names of
   * the fields the availability answer carries. A code this table does not know
   * — and a sentence whose {placeholder} has no value — falls back to the
   * generic rental_rules sentence, so no guest ever reads a raw code or a
   * leftover brace.
   *
   * `past` is the module's own, never the backend's: a day behind today is not
   * a period somebody took, and telling the guest it was just taken would
   * contradict the same square's aria-label.
   */
  var VIOLATION_MESSAGES = {
    past: 'Ten dzień już minął. Wybierz późniejszą datę.',
    product_not_bookable: 'Ten obiekt nie przyjmuje teraz rezerwacji.',
    unit_not_allowed: 'Taki pobyt nie jest tu dostępny.',
    below_min_units: 'Najkrótszy pobyt to {min} {min_nights}.',
    above_max_units: 'Najdłuższy pobyt to {max} {max_nights}.',
    lead_time_too_short: 'Ten termin jest już za blisko. Wybierz późniejszy.',
    blackout_overlap: 'W tym terminie obiekt nie przyjmuje gości.',
    period_taken: MESSAGES.period_taken,
    buffer_conflict: 'Między pobytami musi zostać przerwa. Wybierz termin dzień dalej.',
    no_price_for_unit: 'Nie da się wycenić tego pobytu. Wybierz inny termin lub długość pobytu.',
    too_many_guests: 'Za dużo osób na ten obiekt. Zmniejsz liczbę gości.'
  };
  // One row of the price, by kind (contract: base, season, weekend,
  // season_weekend, extra_guest_fee, pet_fee, cleaning_fee, length_discount).
  // A `label` in the answer always wins, and an unknown kind is shown by it.
  var LINE_LABELS = {
    base: 'Pobyt',
    season: 'Pobyt w sezonie',
    weekend: 'Weekend',
    season_weekend: 'Weekend w sezonie',
    extra_guest_fee: 'Dopłata za osobę',
    pet_fee: 'Zwierzę',
    cleaning_fee: 'Sprzątanie',
    length_discount: 'Rabat za długość pobytu'
  };
  /**
   * The booking state, as the guest reads it. Only the states the contract
   * names (fixtures and KONTRAKT.md) are in here; a state we do not know shows
   * no label at all, because the dates and the amounts beside it already say
   * what matters and an English code says nothing.
   */
  var STATUS_LABELS = {
    awaiting_payment: 'Czeka na płatność',
    pending: 'Czeka na decyzję obiektu',
    paid: 'Opłacona',
    confirmed: 'Potwierdzona',
    rejected: 'Odrzucona',
    cancelled: 'Anulowana',
    expired: 'Wygasła'
  };
  // A guest request: its kind and where it stands (contract: refund |
  // date_change, pending | accepted | rejected | withdrawn).
  var REQUEST_KINDS = { refund: 'Zwrot', date_change: 'Zmiana terminu' };
  var REQUEST_STATES = {
    pending: 'czeka na decyzję',
    accepted: 'przyjęta',
    rejected: 'odrzucona',
    withdrawn: 'wycofana'
  };

  // The label over each field of the form the module draws itself. A Designer
  // who builds the form writes their own labels and never sees these.
  var FIELD_LABELS = {
    name: 'Imię i nazwisko',
    email: 'E-mail',
    phone: 'Telefon',
    adults: 'Dorośli',
    children: 'Dzieci',
    child_ages: 'Wiek dzieci',
    pets: 'Zwierzęta',
    pets_over_threshold: 'Powyżej progu wagi',
    note: 'Uwagi'
  };
  // The order the drawn form asks in, and which of them share the party row.
  var DRAWN_FIELDS = ['adults', 'children', 'pets', 'pets_over_threshold',
    'child_ages', 'name', 'email', 'phone', 'note'];
  var PARTY_ROW = { adults: 1, children: 1, pets: 1, pets_over_threshold: 1 };
  // Two adults is the party nearly every rental is priced for, and the field
  // shows it, so nobody is booked for a group they cannot see.
  var DEFAULT_ADULTS = '2';

  var FALLBACK_CONFIG = {
    form_fields: {},
    child_max_age: DEFAULT_CHILD_MAX_AGE,
    languages: [],
    default_language: 'pl',
    branding_hidden: false,
    account_url: null
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('booking', action, data);
  }

  function _warn(msg, data) {
    if (data !== undefined) console.warn('[digi2.booking] ' + msg, data);
    else console.warn('[digi2.booking] ' + msg);
  }

  function _emit(name, data) {
    try {
      if (typeof window.digi2.emit === 'function') window.digi2.emit(name, data || {});
    } catch (e) {}
  }

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  // {name} in a guest sentence. A placeholder with no value answers null, so
  // the caller falls back to a sentence that needs none.
  function fill(text, vars) {
    var missing = false;
    var out = String(text).replace(/\{(\w+)\}/g, function (all, name) {
      var v = vars ? vars[name] : undefined;
      if (v === undefined || v === null || v === '') { missing = true; return all; }
      return String(v);
    });
    return missing ? null : out;
  }

  // 1 noc, 2 noce, 5 nocy — Polish counts the thing it counts.
  function nightsWord(n) {
    var count = Math.abs(Number(n) || 0);
    var last = count % 10;
    var teen = count % 100;
    if (count === 1) return MESSAGES.nights_one;
    if (last >= 2 && last <= 4 && (teen < 12 || teen > 14)) return MESSAGES.nights_few;
    return MESSAGES.nights_many;
  }

  // ---------------------------------------------------------------------------
  // Civil dates — a calendar square is a date in the rental's own timezone, not
  // an instant. Day numbers (days since 1970-01-01) make the arithmetic exact:
  // no hour survives it, so no daylight saving change can move a square.
  // ---------------------------------------------------------------------------

  function pad(n, len) {
    var s = String(Math.abs(n));
    while (s.length < len) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }

  function dayNumber(y, m, d) {
    return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
  }

  function civilOf(day) {
    var dt = new Date(day * DAY_MS);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  function dayKey(day) {
    var c = civilOf(day);
    return pad(c.y, 4) + '-' + pad(c.m, 2) + '-' + pad(c.d, 2);
  }

  // What the API calls a date: local time of the rental, with no zone on it.
  function naiveOf(day) {
    return dayKey(day) + 'T00:00:00';
  }

  function dayOfKey(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text || ''));
    return m ? dayNumber(Number(m[1]), Number(m[2]), Number(m[3])) : null;
  }

  // 0 = Sunday, as in Date#getDay.
  function weekdayOf(day) {
    return new Date(day * DAY_MS).getUTCDay();
  }

  function startOfMonth(day) {
    var c = civilOf(day);
    return dayNumber(c.y, c.m, 1);
  }

  function addMonths(day, count) {
    var c = civilOf(day);
    var months = (c.y * 12) + (c.m - 1) + count;
    return dayNumber(Math.floor(months / 12), (months % 12) + 1, 1);
  }

  function daysInMonth(firstDay) {
    return addMonths(firstDay, 1) - firstDay;
  }

  var _zoneWarned = {};
  /**
   * The instant the API gave us, as a date (and a time of day) in the rental's
   * timezone. A string with no zone marker is already local time, so its own
   * digits are the answer. shiftMinutes moves the instant first — that is how
   * buffer_minutes widens a booking.
   */
  function zoneParts(iso, timezone, shiftMinutes) {
    var text = String(iso || '');
    var zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(text);
    if (!zoned) {
      var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(text);
      if (!m) return null;
      var day = dayNumber(Number(m[1]), Number(m[2]), Number(m[3]));
      var mins = (Number(m[4] || 0) * 60) + Number(m[5] || 0) + (shiftMinutes || 0);
      return { day: day + Math.floor(mins / 1440), minutes: ((mins % 1440) + 1440) % 1440 };
    }
    var t = Date.parse(text);
    if (!isFinite(t)) return null;
    return instantParts(t + ((shiftMinutes || 0) * 60000), timezone);
  }

  function instantParts(ms, timezone) {
    var dt = new Date(ms);
    if (timezone && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        var fmt = formatter('date', 'en-US', {
          timeZone: timezone, hourCycle: 'h23',
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        if (!fmt) throw new Error('no formatter for ' + timezone);
        var parts = fmt.formatToParts(dt);
        var got = {};
        for (var i = 0; i < parts.length; i++) got[parts[i].type] = parts[i].value;
        if (got.year && got.month && got.day) {
          return {
            day: dayNumber(Number(got.year), Number(got.month), Number(got.day)),
            minutes: (Number(got.hour) % 24 * 60) + Number(got.minute || 0)
          };
        }
      } catch (e) {
        if (!_zoneWarned[timezone]) {
          _zoneWarned[timezone] = true;
          _warn('this browser cannot read the timezone ' + timezone + ' — the calendar uses the visitor\'s own');
        }
      }
    }
    // No Intl and no timezone: the visitor's own clock is the best guess, and
    // it is only ever a day off at the very edge of midnight.
    return {
      day: dayNumber(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()),
      minutes: (dt.getHours() * 60) + dt.getMinutes()
    };
  }

  function todayIn(timezone, shiftHours) {
    return instantParts(Date.now() + ((shiftHours || 0) * 3600000), timezone).day;
  }

  // ---------------------------------------------------------------------------
  // Money and dates for the guest — Intl in the language of /config, never our
  // own arithmetic: amounts are printed exactly as the answer gave them.
  // ---------------------------------------------------------------------------

  // Building an Intl formatter costs far more than using one, and drawing a
  // month asks for the same handful over and over (one "is this today" per
  // square). They are immutable, so one of each is enough for the page.
  var _formatters = {};
  function formatter(kind, lang, options) {
    var key = kind + '|' + (lang || '') + '|' + JSON.stringify(options);
    if (!_formatters.hasOwnProperty(key)) {
      try {
        _formatters[key] = kind === 'number'
          ? new Intl.NumberFormat(lang || undefined, options)
          : new Intl.DateTimeFormat(lang || undefined, options);
      } catch (e) {
        _formatters[key] = null;
      }
    }
    return _formatters[key];
  }

  function numberFormat(lang, options) {
    if (typeof Intl === 'undefined' || !Intl.NumberFormat) return null;
    return formatter('number', lang, options);
  }

  // A decimal string ("550.00") is an amount in whole currency, as the contract
  // writes it. Parsed once for Intl and never added to anything.
  function money(amount, currency, lang) {
    if (amount === null || amount === undefined || amount === '') return '';
    var n = typeof amount === 'number' ? amount : parseFloat(String(amount));
    if (!isFinite(n)) return '';
    var fmt = currency ? numberFormat(lang, { style: 'currency', currency: currency }) : null;
    if (fmt) return fmt.format(n);
    var plain = numberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (plain ? plain.format(n) : String(amount)) + (currency ? ' ' + currency : '');
  }

  // …_minor fields are integers in the currency's smallest unit. How many digits
  // that is comes from Intl, not from a hard-coded 100: JPY has none, TND three.
  function moneyMinor(minor, currency, lang) {
    if (minor === null || minor === undefined || minor === '') return '';
    var n = Number(minor);
    if (!isFinite(n)) return '';
    var digits = 2;
    var fmt = currency ? numberFormat(lang, { style: 'currency', currency: currency }) : null;
    if (fmt && typeof fmt.resolvedOptions === 'function') {
      var got = fmt.resolvedOptions().maximumFractionDigits;
      if (isFinite(got)) digits = got;
    }
    return money(n / Math.pow(10, digits), currency, lang);
  }

  function percentText(percent, lang) {
    var n = parseFloat(String(percent));
    if (!isFinite(n)) return '';
    var fmt = numberFormat(lang, { style: 'percent', maximumFractionDigits: 2 });
    return fmt ? fmt.format(n / 100) : n + '%';
  }

  function dateFormat(lang, options) {
    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) return null;
    options.timeZone = 'UTC';
    return formatter('date', lang, options);
  }

  // A day number as the guest reads it. The Date is UTC midnight of that civil
  // date and the formatter is told so, which is why no zone can shift it.
  function dayText(day, lang, options) {
    var fmt = dateFormat(lang, options || { day: 'numeric', month: 'long', year: 'numeric' });
    return fmt ? fmt.format(new Date(day * DAY_MS)) : dayKey(day);
  }

  /**
   * An instant the answer carries, as the day the guest reads. The day is the
   * civil date in the rental's own timezone, so a check-out at 10:00 local is
   * never yesterday for a visitor one zone to the west. An answer with no
   * timezone of its own (/status has none) is read on the visitor's clock,
   * which is only ever a day off within hours of midnight.
   */
  function instantText(iso, timezone, lang, options) {
    var parts = zoneParts(iso, timezone || null, 0);
    return parts ? dayText(parts.day, lang, options) : '';
  }

  // Monday in most of Europe, Sunday in the US — from the language, when the
  // browser knows it.
  function firstWeekday(lang) {
    try {
      var loc = new Intl.Locale(lang || 'pl');
      var info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
      if (info && isFinite(info.firstDay)) return Number(info.firstDay) % 7;
    } catch (e) {}
    return 1;
  }

  // Responsive reader for ordinary values.
  function attr(el, name) {
    if (!el) return null;
    if (typeof window.digi2.attr === 'function') return window.digi2.attr(el, name, null);
    var v = el.getAttribute(name);
    return v === null ? el.getAttribute('data-' + name) : v;
  }

  // Raw reader for values that may legally contain ';' or '@' (key, address).
  function raw(el, name) {
    if (!el) return null;
    var v = el.getAttribute(name);
    return v === null ? el.getAttribute('data-' + name) : v;
  }

  var _cfgEl;
  function cfgEl() {
    if (_cfgEl === undefined) {
      try { _cfgEl = document.querySelector('[d2-booking], [data-d2-booking]'); } catch (e) { _cfgEl = null; }
    }
    return _cfgEl;
  }

  var _keyWarned = false;
  function siteKey() {
    var k = window.digi2._bookingKey || raw(cfgEl(), 'd2-booking') || '';
    k = String(k).trim();
    if (k && KEY_RE.test(k)) return k;
    if (!_keyWarned) {
      _keyWarned = true;
      _warn(k ? 'the site key in d2-booking cannot be used: ' + k
        : 'no site key — put d2-booking="pk_…" on the loader tag');
    }
    return '';
  }

  var _base;
  function apiBase() {
    if (_base !== undefined) return _base;
    var given = raw(cfgEl(), 'd2-booking-api');
    given = given === null ? '' : String(given).trim().replace(/\/+$/, '');
    if (!given) { _base = DEFAULT_API; return _base; }
    if (HTTPS_BASE_RE.test(given) || LOCAL_BASE_RE.test(given)) { _base = given; return _base; }
    _warn('d2-booking-api must be an https address — using ' + DEFAULT_API + ' instead of ' + given);
    _base = DEFAULT_API;
    return _base;
  }

  function pageLanguage(cfg) {
    var fallback = (cfg && cfg.default_language) || FALLBACK_CONFIG.default_language;
    var langs = (cfg && isArray(cfg.languages)) ? cfg.languages : [];
    var html = null;
    try { html = document.documentElement; } catch (e) { html = null; }
    var tag = html ? String(html.getAttribute('lang') || '') : '';
    var code = tag.split('-')[0].toLowerCase();
    if (!code) return fallback;
    for (var i = 0; i < langs.length; i++) {
      if (String(langs[i]).toLowerCase() === code) return code;
    }
    return fallback;
  }

  // ---------------------------------------------------------------------------
  // The address — what the e-mail link and the return from Stripe carry
  // ---------------------------------------------------------------------------

  // One parameter out of a query or a fragment, by hand: the module has no
  // dependencies and URLSearchParams is not everywhere yet.
  function paramOf(text, name) {
    var parts = String(text || '').replace(/^[?#]/, '').split('&');
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if ((eq < 0 ? parts[i] : parts[i].slice(0, eq)) !== name) continue;
      // Percent-escapes are undone; a literal '+' is NOT turned into a space.
      // That substitution belongs to form encoding, and a token is opaque: a
      // plus sign inside one is part of it, not a space somebody escaped.
      var value = eq < 0 ? '' : parts[i].slice(eq + 1);
      try { return decodeURIComponent(value); } catch (e) { return value; }
    }
    return null;
  }

  function locationOf() {
    try { return window.location || null; } catch (e) { return null; }
  }

  function queryParam(name) {
    var loc = locationOf();
    return loc ? paramOf(loc.search, name) : null;
  }

  /**
   * The fragment off the address bar. A token must never sit there: it would
   * go out in every referrer, into the history, into a screenshot and into
   * whatever the guest pastes to a friend — and that link reads their booking.
   * replaceState leaves no history entry to go back to it.
   */
  function stripFragment(loc) {
    try {
      var past = window.history;
      if (past && typeof past.replaceState === 'function') {
        past.replaceState(null, '', (loc.pathname || '') + (loc.search || ''));
        return;
      }
    } catch (e) {}
    try { loc.hash = ''; } catch (e) {}
  }

  /**
   * The e-mail link: <manage_url>?booking=<id>#token=<token>&action=<what>.
   * Read once, kept here and taken off the address at once. The token is
   * opaque — the module never looks inside it and never writes it anywhere
   * but the X-Booking-Token header. What the link is for comes from `action`,
   * not from the token: guessing a token's purpose from its shape is exactly
   * what "opaque" forbids.
   */
  var _link = null;
  function emailLink() {
    if (_link) return _link;
    _link = { token: '', action: '' };
    var loc = locationOf();
    var hash = loc ? String(loc.hash || '') : '';
    if (hash.indexOf('token=') < 0) return _link;
    _link.token = paramOf(hash, 'token') || '';
    _link.action = String(paramOf(hash, 'action') || '').toLowerCase();
    stripFragment(loc);
    return _link;
  }

  // The booking this block is about: the element's own value when the page
  // knows it, otherwise ?booking= from the address Stripe or the e-mail sent
  // the guest to.
  function bookingIdOf(el, name) {
    var given = attr(el, name);
    given = given === null ? '' : String(given).trim();
    if (given) return given;
    var asked = queryParam('booking');
    return asked ? String(asked).trim() : '';
  }

  // What the API calls a date and a time: the rental's own local clock, with
  // no zone on it (KONTRAKT.md). A zone marker on the input is dropped, not
  // converted — the guest typed a day at the rental, not an instant.
  function naiveStamp(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(text || ''));
    if (!m) return null;
    return m[1] + '-' + m[2] + '-' + m[3] + 'T' + (m[4] || '00') + ':' + (m[5] || '00')
      + ':' + (m[6] || '00');
  }

  function copy(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
  }

  // ---------------------------------------------------------------------------
  // API client — adds no credentials, sends JSON, answers data or a reason
  // ---------------------------------------------------------------------------

  // The rental rules the last availability answer carried; the sentences about
  // a refused stay take their numbers from here.
  var lastRules = null;

  /**
   * The sentence for one availability code. The numbers in it come from the
   * rental's own rules (the availability answer), so "the shortest stay is 3
   * nights" says 3 and not a guess. A code we do not know, or a sentence whose
   * number we do not have, answers null — the caller then uses the generic
   * rental_rules sentence.
   */
  function violationText(code, rules) {
    var text = VIOLATION_MESSAGES[String(code)];
    if (!text) return null;
    var r = rules || lastRules || {};
    return fill(text, {
      min: r.min > 1 ? r.min : null,
      min_nights: r.min > 1 ? nightsWord(r.min) : null,
      max: r.max > 0 ? r.max : null,
      max_nights: r.max > 0 ? nightsWord(r.max) : null
    });
  }

  function message(reason, extra) {
    if (extra && isArray(extra.violations)) {
      for (var i = 0; i < extra.violations.length; i++) {
        var said = violationText(extra.violations[i], extra.rules);
        if (said) return said;
      }
    }
    var text = MESSAGES[reason];
    if (!text) return GENERIC_MESSAGE;
    if (reason === 'too_many_requests' && extra && extra.retryAfter > 0) {
      // Nobody reads "2976 s": past two minutes the wait is said in minutes.
      return 'Zbyt wiele prób. Spróbuj ponownie za ' + (extra.retryAfter >= 120
        ? Math.ceil(extra.retryAfter / 60) + ' min.' : extra.retryAfter + ' s.');
    }
    return text;
  }

  function refusal(reason, status, extra) {
    var out = { ok: false, status: status || 0, reason: reason };
    if (extra) {
      if (extra.field) out.field = extra.field;
      if (extra.violations) out.violations = extra.violations;
      if (extra.retryAfter) out.retryAfter = extra.retryAfter;
    }
    out.message = message(reason, out);
    return out;
  }

  // The reason behind a refusal whose body is a plain sentence: the status plus
  // what the caller knows about its own route. The sentence itself is for logs,
  // never for the guest (KONTRAKT.md, the refusals section).
  function statusReason(status, opts) {
    if (status === 400) return opts.badRequest || 'invalid_request';
    if (status === 403) return 'origin_not_allowed';
    if (status === 404) return opts.notFound || 'site_key_not_found';
    if (status === 409) return opts.conflict || 'request_not_allowed';
    if (status === 413) return 'request_too_large';
    if (status === 422) return 'validation_error';
    if (status === 429) return 'too_many_requests';
    // errors.json gives 502 → payment_provider_unavailable to the two payment
    // routes only. A gateway having a bad minute on the calendar or the price
    // is not Stripe, so only the routes that ask for it get that sentence.
    if (status === 502 && opts.badGateway) return opts.badGateway;
    return status >= 500 ? 'server_error' : 'request_refused';
  }

  /**
   * FastAPI's own 422: ["body", "customer_email"] names the request key, which
   * the form knows as a field of its own. A loc may end in an array index —
   * ["body", "child_ages", 0] — so the walk keeps going instead of answering
   * "no field" on the index, and a detail entry that names nothing we know
   * leaves the next entry its chance.
   */
  function fieldFromLoc(detail) {
    for (var i = 0; i < detail.length; i++) {
      var loc = detail[i] && detail[i].loc;
      if (!isArray(loc)) continue;
      for (var j = loc.length - 1; j >= 0; j--) {
        var part = String(loc[j]);
        if (part === 'body' || part === 'query' || part === 'path') continue;
        var got = fieldOfKey(part);
        if (got) return got;
      }
    }
    return null;
  }

  function fieldOfKey(key) {
    for (var name in TEXT_KEY) {
      if (TEXT_KEY.hasOwnProperty(name) && TEXT_KEY[name] === key) return name;
    }
    return FIELDS[key] ? key : null;
  }

  function retryAfterSeconds(r) {
    var given = r && r.headers && typeof r.headers.get === 'function' ? r.headers.get('Retry-After') : null;
    var s = parseInt(given, 10);
    return isFinite(s) && s > 0 ? s : 0;
  }

  function timeoutFetch(url, init, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
      try {
        fetch(url, init).then(
          function (r) { clearTimeout(timer); resolve(r); },
          function (e) { clearTimeout(timer); reject(e); }
        );
      } catch (e) { clearTimeout(timer); reject(e); }
    });
  }

  function readBody(r) {
    if (!r || typeof r.json !== 'function') return Promise.resolve(null);
    try {
      return Promise.resolve(r.json()).then(function (b) { return b; }, function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /**
   * One call to the public site API.
   *   method  'GET' | 'POST'
   *   path    everything after /public/sites/<key>, e.g. '/config'
   *   opts    body, token (X-Booking-Token), query, timeout and the reason a
   *           plain-sentence 400 / 404 / 409 means on this route.
   * Never rejects: a refusal is a value.
   */
  function request(method, path, opts) {
    opts = opts || {};
    var key = siteKey();
    if (!key) return Promise.resolve(refusal('key_missing', 0));

    var url = apiBase() + '/public/sites/' + encodeURIComponent(key) + path;
    if (opts.query) url += (url.indexOf('?') < 0 ? '?' : '&') + opts.query;

    var headers = { Accept: 'application/json' };
    var init = { method: method, credentials: 'omit', mode: 'cors', cache: 'no-store' };
    if (opts.body !== undefined && opts.body !== null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    // Guest routes carry the token from the e-mail link in a header; the token
    // is opaque to this module.
    if (opts.token) headers['X-Booking-Token'] = opts.token;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    init.headers = headers;

    return timeoutFetch(url, init, opts.timeout || FETCH_TIMEOUT_MS).then(function (r) {
      return readBody(r).then(function (body) {
        if (r.ok) return { ok: true, status: r.status, data: body };

        var detail = body && typeof body === 'object' ? body.detail : null;
        var extra = {};
        var reason;
        if (detail && typeof detail === 'object' && !isArray(detail)) {
          reason = String(detail.reason || detail.code || '') || statusReason(r.status, opts);
          if (detail.field) extra.field = fieldOfKey(String(detail.field)) || String(detail.field);
          if (isArray(detail.violations)) {
            extra.violations = detail.violations.map(function (v) { return String(v); });
          }
        } else if (isArray(detail)) {
          reason = 'validation_error';
          extra.field = fieldFromLoc(detail);
        } else {
          reason = statusReason(r.status, opts);
        }
        if (r.status === 429) extra.retryAfter = retryAfterSeconds(r);
        _log('refused', { status: r.status, reason: reason });
        return refusal(reason, r.status, extra);
      });
    }, function () {
      // A dead network and a 403 from a domain outside the key's allowlist look
      // the same here: that refusal carries no CORS header, so the page cannot
      // read it.
      _log('network refusal', { path: path });
      return refusal('network_error', 0);
    });
  }

  // ---------------------------------------------------------------------------
  // /config — read once, kept for the page
  // ---------------------------------------------------------------------------

  function normalizeConfig(data) {
    var src = data && typeof data === 'object' ? data : {};
    var fields = {};
    var given = src.form_fields && typeof src.form_fields === 'object' ? src.form_fields : {};
    for (var k in given) {
      if (given.hasOwnProperty(k)) {
        var v = String(given[k]);
        fields[k] = STATES[v] ? v : 'optional';
      }
    }
    var age = Number(src.child_max_age);
    return {
      form_fields: fields,
      child_max_age: isFinite(age) && age >= 0 ? age : DEFAULT_CHILD_MAX_AGE,
      languages: isArray(src.languages) ? src.languages.map(String) : [],
      default_language: src.default_language ? String(src.default_language) : FALLBACK_CONFIG.default_language,
      branding_hidden: !!src.branding_hidden,
      account_url: src.account_url ? String(src.account_url) : null,
      refused: null
    };
  }

  var configPromise = null;
  var lastConfig = null;

  function config() {
    if (configPromise) return configPromise;
    configPromise = request('GET', '/config', { notFound: 'site_key_not_found' }).then(function (res) {
      if (res.ok) {
        lastConfig = normalizeConfig(res.data);
      } else {
        // The page is never held hostage by the API: the form stays as the
        // Designer built it and the backend decides on submit.
        _warn('/config could not be read (' + res.reason + ') — the form stays open as it is');
        lastConfig = normalizeConfig(FALLBACK_CONFIG);
        lastConfig.refused = res.reason;
      }
      return lastConfig;
    });
    return configPromise;
  }

  function currentConfig() {
    return lastConfig || normalizeConfig(FALLBACK_CONFIG);
  }

  // ---------------------------------------------------------------------------
  // The product — the only route of the contract that takes a reference
  // ---------------------------------------------------------------------------

  /**
   * GET /products/{ref} is the one route whose path parameter is spelled
   * {ref}: availability, quote and bookings are all {product_id}. So the
   * reference the page gave — a uuid or a slug — is resolved here once per
   * visit and the id of that answer is what the other three are asked with.
   *
   * The same answer carries pet_fee, the only pricing rule in the public
   * contract, which is where the sentence beside the pets question comes from.
   *
   * A product that cannot be read never kills the page: the reference goes out
   * as the page wrote it and the backend decides.
   */
  var productAsked = {};
  var productSeen = {};

  function productSlot(ref) {
    // Prefixed, so a slug called "constructor" is a key and not a method.
    return '#' + (ref === null || ref === undefined ? '' : String(ref).trim());
  }

  function product(ref) {
    var key = productSlot(ref);
    if (key === '#') return Promise.resolve(null);
    if (productAsked[key]) return productAsked[key];
    productAsked[key] = request('GET', '/products/' + encodeURIComponent(key.slice(1)), {
      notFound: 'product_not_found'
    }).then(function (res) {
      var data = res.ok && res.data && typeof res.data === 'object' ? res.data : null;
      if (!data) {
        _warn('the product "' + key.slice(1) + '" could not be read (' + res.reason
          + ') — the reference goes to the API as the page wrote it');
        // A blip is not an answer: the next caller asks again instead of
        // sending a slug for the rest of the visit. A 404 is an answer, and a
        // 429 said how long the question has to wait.
        if (res.retryAfter > 0) {
          setTimeout(function () { delete productAsked[key]; }, res.retryAfter * 1000);
        } else if (res.reason !== 'product_not_found') {
          delete productAsked[key];
        }
      }
      productSeen[key] = data;
      return data;
    });
    return productAsked[key];
  }

  // The {product_id} the other three routes take: the resolved id when we have
  // it, and otherwise the reference exactly as it came.
  function productId(ref) {
    var key = productSlot(ref);
    var got = productSeen[key];
    return got && got.id ? String(got.id) : key.slice(1);
  }

  /**
   * The sentence beside pets_over_threshold. The contract file is explicit
   * that the weight is never arithmetic: it is the line the guest reads, so a
   * dog over the threshold costs the amount the product carries. No pet_fee at
   * all, or an amount we cannot format, means no sentence rather than an empty
   * label; a null weight_threshold_kg drops the threshold wording and keeps
   * the amount.
   */
  function petFeeText(data, cfg) {
    var fee = data && data.pet_fee && typeof data.pet_fee === 'object' ? data.pet_fee : null;
    if (!fee) return '';
    var amount = money(fee.amount, data.currency ? String(data.currency) : null, pageLanguage(cfg));
    if (!amount) return '';
    var kg = parseFloat(String(fee.weight_threshold_kg));
    var perNight = String(fee.mode) === 'per_night';
    var over = isFinite(kg) && kg > 0;
    var text = over
      ? (perNight ? MESSAGES.pet_fee_over_night : MESSAGES.pet_fee_over)
      : (perNight ? MESSAGES.pet_fee_flat_night : MESSAGES.pet_fee_flat);
    return fill(text, { kg: over ? String(kg) : null, amount: amount }) || '';
  }

  // ---------------------------------------------------------------------------
  // Fields
  // ---------------------------------------------------------------------------

  function fieldsOf(form) {
    return form.querySelectorAll('[d2-booking-field], [data-d2-booking-field]');
  }

  function fieldName(el) {
    var n = attr(el, 'd2-booking-field');
    return n === null ? '' : String(n).trim().toLowerCase();
  }

  function fieldState(name, cfg) {
    if (ALWAYS_REQUIRED[name]) return 'required';
    var fields = (cfg && cfg.form_fields) || {};
    // adults is never switched off: with children off it is the guest count.
    if (name === 'adults') return 'optional';
    // The ages question only exists while children are asked about.
    if (name === 'child_ages' && fields.children === 'off') return 'off';
    var key = CONFIG_KEY[name] || name;
    var state = fields.hasOwnProperty(key) ? fields[key] : 'optional';
    if (!STATES[state]) state = 'optional';
    // "How many of them are over the weight?" is a sub-question, so it only
    // disappears with pets — it never blocks a submit on its own.
    if (name === 'pets_over_threshold' && state === 'required') state = 'optional';
    return state;
  }

  function closestGroup(el, form) {
    for (var node = el; node && node !== form; node = node.parentNode) {
      if (node.getAttribute && (node.getAttribute('d2-booking-field-group') !== null
        || node.getAttribute('data-d2-booking-field-group') !== null)) return node;
    }
    return null;
  }

  // The group goes with its field, so the label goes too — unless the Designer
  // put several fields in one group and the others stay. Then only this field
  // and its own message slot go, and the neighbours keep their place.
  function removeField(el, form, cfg) {
    var group = closestGroup(el, form);
    var target = group || el;
    if (group && groupKeepsOthers(group, el, cfg)) {
      target = el;
      var name = fieldName(el);
      var slot = group.querySelector('[d2-booking-error="' + name + '"], [data-d2-booking-error="' + name + '"]');
      if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
    }
    if (target.parentNode) target.parentNode.removeChild(target);
  }

  function groupKeepsOthers(group, el, cfg) {
    var inside = group.querySelectorAll('[d2-booking-field], [data-d2-booking-field]');
    for (var i = 0; i < inside.length; i++) {
      if (inside[i] === el) continue;
      var name = fieldName(inside[i]);
      if (FIELDS[name] && fieldState(name, cfg) !== 'off') return true;
    }
    return false;
  }

  function readValue(el) {
    if (!el) return '';
    var type = String(el.type || '').toLowerCase();
    if (type === 'checkbox') return el.checked ? '1' : '';
    if (type === 'radio' && !el.checked) return '';
    var v = el.value;
    return v == null ? '' : String(v).trim();
  }

  function intOf(text) {
    if (!INT_RE.test(text)) return null;
    var n = parseInt(text, 10);
    return isFinite(n) ? n : null;
  }

  function parseAges(text) {
    var parts = String(text).split(/[\s,;|]+/);
    var ages = [];
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var n = intOf(parts[i]);
      if (n === null) return null;
      ages.push(n);
    }
    return ages;
  }

  // Every field of one form, with the state the key gave it.
  function collect(form, cfg) {
    var els = fieldsOf(form);
    var items = [];
    for (var i = 0; i < els.length; i++) {
      var name = fieldName(els[i]);
      if (!FIELDS[name]) {
        _warn('unknown d2-booking-field="' + name + '" — it is not sent; use one of: '
          + Object.keys(FIELDS).join(', '));
        continue;
      }
      items.push({ name: name, el: els[i], state: fieldState(name, cfg), value: readValue(els[i]) });
    }
    return items;
  }

  function itemOf(items, name) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].name === name && items[i].state !== 'off') return items[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Messages on the page
  // ---------------------------------------------------------------------------

  function errorSlot(form, name, build) {
    var sel = '[d2-booking-error="' + name + '"], [data-d2-booking-error="' + name + '"]';
    var el = form.querySelector(sel);
    if (el || !build) return el;
    el = document.createElement('div');
    el.setAttribute('d2-booking-error', name);
    // Marked so the fallback look can style it and the page can tell it apart
    // from a slot the Designer made.
    el.setAttribute('d2-booking-built', '');
    el.setAttribute('role', 'alert');
    var field = name === 'form' ? null
      : form.querySelector('[d2-booking-field="' + name + '"], [data-d2-booking-field="' + name + '"]');
    var host = field && field.parentNode ? field.parentNode : form;
    host.appendChild(el);
    return el;
  }

  /**
   * The one sentence this slot carries. `good` marks a sentence that is not a
   * refusal ("the booking is in", "taking you to the payment") — the slot is
   * the same, so a guest reads the answer in the place they already look, but
   * d2-booking-ok lets CSS stop painting it red.
   */
  function showMessage(form, name, text, good) {
    var el = errorSlot(form, name, !!text);
    if (!el) return;
    el.textContent = text || '';
    if (el.style) el.style.display = text ? '' : 'none';
    if (text && good) el.setAttribute('d2-booking-ok', '');
    else el.removeAttribute('d2-booking-ok');
  }

  function clearMessages(form, cfg) {
    var slots = form.querySelectorAll('[d2-booking-error], [data-d2-booking-error]');
    for (var i = 0; i < slots.length; i++) {
      slots[i].textContent = '';
      slots[i].removeAttribute('d2-booking-ok');
      if (slots[i].style) slots[i].style.display = 'none';
    }
    var items = collect(form, cfg || currentConfig());
    for (var j = 0; j < items.length; j++) {
      items[j].el.removeAttribute('d2-booking-invalid');
      items[j].el.removeAttribute('aria-invalid');
    }
  }

  function markInvalid(form, name, el, text) {
    if (el) {
      el.setAttribute('d2-booking-invalid', '');
      el.setAttribute('aria-invalid', 'true');
    }
    showMessage(form, name, text);
  }

  // ---------------------------------------------------------------------------
  // Browser-side check — kindness, not judgement
  // ---------------------------------------------------------------------------

  function checkItems(items, cfg) {
    var errors = [];
    var numbers = {};
    var ages;
    var agesItem = null;

    function fail(item, text) {
      errors.push({ name: item.name, el: item.el, text: text });
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.state === 'off') continue;
      if (!item.value) {
        // An empty ages list is only a problem once there are children.
        if (item.name === 'child_ages') agesItem = item;
        else if (item.state === 'required') fail(item, MESSAGES.required);
        continue;
      }
      if (item.name === 'email' && !EMAIL_RE.test(item.value)) { fail(item, MESSAGES.email); continue; }
      if (NUMBER_FIELD[item.name]) {
        var n = intOf(item.value);
        if (n === null) { fail(item, MESSAGES.number); continue; }
        numbers[item.name] = n;
        continue;
      }
      if (item.name === 'child_ages') {
        agesItem = item;
        ages = parseAges(item.value);
        if (ages === null) { fail(item, MESSAGES.number); ages = undefined; }
      }
    }

    var children = numbers.children;
    var adultsItem = itemOf(items, 'adults');
    if (children > 0 && adultsItem && !(numbers.adults > 0)) {
      // guests is the sum of both, so children alone cannot be priced
      // (the contract: children without adults is 422).
      fail(adultsItem, 'Podaj liczbę dorosłych — dzieci liczą się razem z nimi.');
    }
    if (agesItem && agesItem.state !== 'off') {
      var maxAge = cfg.child_max_age;
      if (ages) {
        for (var a = 0; a < ages.length; a++) {
          if (ages[a] > maxAge) {
            fail(agesItem, 'Wiek dziecka nie może być większy niż ' + maxAge + ' lat.');
            ages = undefined;
            break;
          }
        }
      }
      if (ages && children > 0 && ages.length !== children) {
        fail(agesItem, 'Podaj wiek każdego dziecka — ' + children + ' razem.');
      } else if (!agesItem.value && agesItem.state === 'required' && children > 0) {
        fail(agesItem, MESSAGES.required);
      }
    }
    var over = itemOf(items, 'pets_over_threshold');
    if (over && numbers.pets_over_threshold > (numbers.pets || 0)) {
      fail(over, 'Nie może być więcej zwierząt powyżej progu wagi niż zwierząt.');
    }

    return { errors: errors, numbers: numbers, ages: ages };
  }

  function validate(form, cfg) {
    cfg = cfg || currentConfig();
    clearMessages(form, cfg);
    var items = collect(form, cfg);
    var checked = checkItems(items, cfg);
    for (var i = 0; i < checked.errors.length; i++) {
      var e = checked.errors[i];
      markInvalid(form, e.name, e.el, e.text);
    }
    return checked.errors;
  }

  // ---------------------------------------------------------------------------
  // What the form sends
  // ---------------------------------------------------------------------------

  function values(form, cfg) {
    cfg = cfg || currentConfig();
    var items = collect(form, cfg);
    var checked = checkItems(items, cfg);
    var numbers = checked.numbers;
    var body = {};

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.state === 'off' || !item.value) continue;
      if (TEXT_KEY[item.name]) body[TEXT_KEY[item.name]] = item.value;
    }

    var childrenAsked = fieldState('children', cfg) !== 'off';
    var adults = numbers.hasOwnProperty('adults') ? numbers.adults : null;
    var children = childrenAsked && numbers.hasOwnProperty('children') ? numbers.children : null;

    // guests is the number max_guests and the extra-guest fee stand on, and it
    // is always the sum — nothing contradicts it.
    var guests = (adults || 0) + (children || 0);
    if (guests > 0) body.guests = guests;

    // With children off, adults is left out of the request as well: a booking
    // must not claim two adults for a stay priced for a different group.
    if (childrenAsked && adults !== null) {
      body.adults = adults;
      if (children !== null) body.children = children;
      if (children > 0 && checked.ages && checked.ages.length) body.child_ages = checked.ages;
    }

    if (fieldState('pets', cfg) !== 'off') {
      if (numbers.hasOwnProperty('pets')) body.pets = numbers.pets;
      if (numbers.hasOwnProperty('pets_over_threshold')) body.pets_over_threshold = numbers.pets_over_threshold;
    }

    body.locale = pageLanguage(cfg);
    return body;
  }

  // ---------------------------------------------------------------------------
  // The stay the form books
  // ---------------------------------------------------------------------------

  var stayState = null;

  function select(stay) {
    stayState = stay && typeof stay === 'object' ? {
      product: stay.product ? String(stay.product) : null,
      unit: stay.unit ? String(stay.unit) : null,
      starts_at: stay.starts_at ? String(stay.starts_at) : null,
      units_count: Number(stay.units_count) || null
    } : null;
    if (stayState) reopenClosed();
    _emit('booking:stay', { stay: stayState });
    // A new stay is a new price: asked for once the clicking has settled.
    scheduleQuote();
    return stayState;
  }

  // Another period or another party is the way out of a `final` refusal, so
  // either has to bring the button back. The state stays on the form: send()
  // still refuses the very request that earned it, and lets any other through.
  function reopenForm(form) {
    if (form.getAttribute('d2-booking-payment') !== 'final') return;
    var stay = stayFor(form);
    if (!stay || !stay.product || !stay.starts_at) return;
    var body = values(form);
    body.unit = stay.unit || 'day';
    body.starts_at = stay.starts_at;
    body.units_count = stay.units_count || 1;
    if (requestKey(stay.product, body) === form._d2BookingClosedKey) return;
    showMessage(form, 'form', '');
    lock(form, false);
  }

  function reopenClosed() {
    var forms = formsOf();
    for (var i = 0; i < forms.length; i++) reopenForm(forms[i]);
  }

  function stayFor(form) {
    var out = {
      product: stayState && stayState.product ? stayState.product : null,
      unit: stayState && stayState.unit ? stayState.unit : null,
      starts_at: stayState && stayState.starts_at ? stayState.starts_at : null,
      units_count: stayState && stayState.units_count ? stayState.units_count : null
    };
    if (!out.product) out.product = productOf(form);
    return (out.product && out.starts_at) ? out : null;
  }

  // ---------------------------------------------------------------------------
  // The look the module draws itself
  // ---------------------------------------------------------------------------

  function create(tag, attrs) {
    var el = document.createElement(tag);
    for (var name in attrs) {
      if (attrs.hasOwnProperty(name)) el.setAttribute(name, attrs[name]);
    }
    return el;
  }

  function clearEl(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function allOf(name) {
    try {
      return document.querySelectorAll('[' + name + '], [data-' + name + ']');
    } catch (e) {
      return [];
    }
  }

  function firstIn(el, name) {
    return el ? el.querySelector('[' + name + '], [data-' + name + ']') : null;
  }

  function pageHas(name) {
    return allOf(name).length > 0;
  }

  /**
   * The stylesheet of the drawn look. Every rule is scoped to
   * [d2-booking-widget] — nothing here can reach a calendar the Designer
   * styled themselves — every value is a CSS variable with a sensible default,
   * and nothing is !important: the site's own CSS wins without a fight.
   */
  /**
   * The one rule that is NOT scoped to [d2-booking-widget]. A month is seven
   * columns or it is nothing, and the grid it applies to is markup this module
   * built itself — it can reach nothing the Designer wrote. Colours and
   * spacing stay inside the widget, where the Designer did not ask for a look.
   */
  var CALENDAR_CSS = '[d2-booking-calendar-grid] [role=row]'
    + '{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}';

  var WIDGET_CSS = CALENDAR_CSS
    + '[d2-booking-widget]{box-sizing:border-box;display:flex;flex-direction:column;'
    + 'gap:var(--d2-booking-gap,12px);max-width:var(--d2-booking-width,420px);'
    + 'padding:var(--d2-booking-pad,16px);font-family:var(--d2-booking-font,inherit);'
    + 'color:var(--d2-booking-text,#1a1d1c);background:var(--d2-booking-bg,#fff);'
    + 'border:1px solid var(--d2-booking-border,#e0ded9);border-radius:var(--d2-booking-radius,12px)}'
    + '[d2-booking-widget] *{box-sizing:border-box}'
    + '[d2-booking-widget] [d2-booking-calendar-head]{display:flex;align-items:center;'
    + 'justify-content:space-between;gap:8px;margin-bottom:8px}'
    + '[d2-booking-widget] [d2-booking-calendar-month]{font-weight:600}'
    + '[d2-booking-widget] [d2-booking-calendar-prev],[d2-booking-widget] [d2-booking-calendar-next]'
    + '{width:32px;height:32px;font:inherit;color:inherit;cursor:pointer;'
    + 'background:var(--d2-booking-bg,#fff);border:1px solid var(--d2-booking-border,#e0ded9);'
    + 'border-radius:var(--d2-booking-radius,10px)}'
    + '[d2-booking-widget] [role=columnheader]{padding:4px 0;font-size:.75em;text-align:center;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-widget] [d2-booking-day]{width:100%;padding:8px 0;font:inherit;color:inherit;text-align:center;'
    + 'cursor:pointer;background:var(--d2-booking-surface,#f6f5f3);border:1px solid transparent;'
    + 'border-radius:var(--d2-booking-radius,10px)}'
    + '[d2-booking-widget] [d2-booking-day][aria-disabled=true]{cursor:default;background:transparent;'
    + 'color:var(--d2-booking-muted,#6b6f6d);text-decoration:line-through}'
    + '[d2-booking-widget] [d2-booking-day-busy]{background:var(--d2-booking-busy,#fbe7e4)}'
    + '[d2-booking-widget] [d2-booking-day-in-range]{background:var(--d2-booking-range,#e9f2ef)}'
    + '[d2-booking-widget] [d2-booking-day-selected],[d2-booking-widget] [d2-booking-day-checkout]'
    + '{background:var(--d2-booking-accent,#1f6f5c);color:var(--d2-booking-accent-text,#fff)}'
    + '[d2-booking-widget] [d2-booking-day-today]{border-color:var(--d2-booking-accent,#1f6f5c)}'
    + '[d2-booking-widget] [d2-booking-day]:focus-visible{outline:2px solid var(--d2-booking-accent,#1f6f5c);'
    + 'outline-offset:1px}'
    + '[d2-booking-widget] [d2-booking-status]{min-height:1.4em;font-size:.875em;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-widget] [d2-booking-form]{display:flex;flex-direction:column;'
    + 'gap:var(--d2-booking-gap,12px)}'
    + '[d2-booking-widget] [d2-booking-party]{display:flex;flex-wrap:wrap;gap:var(--d2-booking-gap,12px)}'
    + '[d2-booking-widget] [d2-booking-party] [d2-booking-field-group]{flex:1 1 90px}'
    + '[d2-booking-widget] [d2-booking-field-group]{display:flex;flex-direction:column;gap:4px}'
    + '[d2-booking-widget] label{font-size:.8125em;color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-widget] input,[d2-booking-widget] textarea{width:100%;padding:8px 10px;font:inherit;'
    + 'color:inherit;background:var(--d2-booking-bg,#fff);'
    + 'border:1px solid var(--d2-booking-border,#e0ded9);border-radius:var(--d2-booking-radius,10px)}'
    + '[d2-booking-widget] [d2-booking-invalid]{border-color:var(--d2-booking-error,#b3261e)}'
    + '[d2-booking-widget] [d2-booking-error]{font-size:.8125em;color:var(--d2-booking-error,#b3261e)}'
    + '[d2-booking-widget] [d2-booking-ok]{color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-widget] [d2-booking-line]{display:flex;justify-content:space-between;gap:8px;'
    + 'font-size:.9375em}'
    + '[d2-booking-widget] [d2-booking-line-detail]{margin-left:auto;padding-right:8px;'
    + 'color:var(--d2-booking-muted,#6b6f6d);font-size:.8125em}'
    + '[d2-booking-widget] [d2-booking-summary]{display:flex;justify-content:space-between;gap:8px;'
    + 'padding-top:8px;font-weight:600;border-top:1px solid var(--d2-booking-border,#e0ded9)}'
    + '[d2-booking-widget] [d2-booking-later]{display:flex;flex-wrap:wrap;gap:4px;font-size:.8125em;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    // No price yet, no row: "Razem" over nothing and a bare "Teraz:" read as a
    // broken page. A browser without :has simply shows the empty row.
    + '[d2-booking-widget] [d2-booking-summary]:has([d2-booking-total][d2-booking-empty]){display:none}'
    + '[d2-booking-widget] [d2-booking-later]:has([d2-booking-deposit][d2-booking-empty]){display:none}'
    + '[d2-booking-widget] [d2-booking-submit]{padding:12px 16px;font:inherit;font-weight:600;text-align:center;'
    + 'cursor:pointer;border:0;border-radius:var(--d2-booking-radius,10px);'
    + 'background:var(--d2-booking-accent,#1f6f5c);color:var(--d2-booking-accent-text,#fff)}'
    + '[d2-booking-widget] [d2-booking-submit][disabled]{opacity:.6;cursor:default}'
    + '[d2-booking-widget] [d2-booking-busy]{opacity:.7}'
    + '[d2-booking-widget] [d2-booking-hint]{font-size:.8125em;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-widget] [d2-booking-hint][d2-booking-empty]{display:none}'
    + '[d2-booking-widget] [d2-booking-mark]{align-self:flex-end;font-size:.75em;text-decoration:none;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    // The list of places, when the page gave no template and the module drew
    // the cards itself. Every rule starts at the drawn list, so a list the
    // Designer built keeps its own look down to the last card.
    + '[d2-booking-results][d2-booking-results-drawn]{display:grid;gap:var(--d2-booking-gap,12px);'
    + 'grid-template-columns:repeat(auto-fill,minmax(220px,1fr));'
    + 'font-family:var(--d2-booking-font,inherit);color:var(--d2-booking-text,#1a1d1c)}'
    + '[d2-booking-results][d2-booking-results-drawn] [d2-booking-item]{display:flex;'
    + 'flex-direction:column;gap:4px;padding:var(--d2-booking-pad,16px);text-decoration:none;'
    + 'color:inherit;background:var(--d2-booking-bg,#fff);'
    + 'border:1px solid var(--d2-booking-border,#e0ded9);border-radius:var(--d2-booking-radius,12px)}'
    + '[d2-booking-results][d2-booking-results-drawn] img{width:100%;height:160px;'
    + 'object-fit:cover;background:var(--d2-booking-surface,#f6f5f3);'
    + 'border-radius:var(--d2-booking-radius,10px)}'
    + '[d2-booking-results][d2-booking-results-drawn] [d2-booking-bind=city_line]'
    + '{font-size:.875em;color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-results][d2-booking-results-drawn] [d2-booking-item] > div{display:flex;'
    + 'align-items:baseline;gap:4px;font-weight:600}'
    + '[d2-booking-results][d2-booking-results-drawn] [d2-booking-bind=price_unit]'
    + '{font-size:.8125em;font-weight:400;color:var(--d2-booking-muted,#6b6f6d)}'
    // A slot with nothing in it is a hole in a card we drew ourselves: no
    // picture, no grey box where one would have been.
    + '[d2-booking-results][d2-booking-results-drawn] [d2-booking-empty]:not([d2-booking-item]){display:none}'
    // The return page and the manage page: the same box, the same variables.
    + '[d2-booking-return],[d2-booking-manage]{box-sizing:border-box;display:flex;'
    + 'flex-direction:column;gap:var(--d2-booking-gap,12px);max-width:var(--d2-booking-width,420px);'
    + 'padding:var(--d2-booking-pad,16px);font-family:var(--d2-booking-font,inherit);'
    + 'color:var(--d2-booking-text,#1a1d1c);background:var(--d2-booking-bg,#fff);'
    + 'border:1px solid var(--d2-booking-border,#e0ded9);border-radius:var(--d2-booking-radius,12px)}'
    + '[d2-booking-return] *,[d2-booking-manage] *{box-sizing:border-box}'
    + '[d2-booking-return] [d2-booking-return-message],[d2-booking-manage] [d2-booking-manage-message]'
    + '{font-weight:600}'
    + '[d2-booking-return] [d2-booking-return-balance]{font-size:.875em;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-return] [d2-booking-return-new]{align-self:flex-start;padding:10px 14px;'
    + 'font-weight:600;text-decoration:none;border-radius:var(--d2-booking-radius,10px);'
    + 'background:var(--d2-booking-accent,#1f6f5c);color:var(--d2-booking-accent-text,#fff)}'
    // The way to the account is an offer, not the thing to do: it must not
    // look like the button that asks for a refund next to it.
    + '[d2-booking-manage] [d2-booking-manage-account]{align-self:flex-start;font-size:.875em;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-manage] [d2-booking-manage-row]{display:flex;justify-content:space-between;'
    + 'gap:12px;padding-bottom:6px;border-bottom:1px solid var(--d2-booking-border,#e0ded9)}'
    + '[d2-booking-manage] [d2-booking-manage-row] span:first-child{font-size:.8125em;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-manage] [d2-booking-manage-request]{display:flex;flex-wrap:wrap;gap:8px;'
    + 'font-size:.875em}'
    + '[d2-booking-manage] [d2-booking-manage-request-note]{flex:1 1 100%;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-manage] label{font-size:.8125em;color:var(--d2-booking-muted,#6b6f6d)}'
    + '[d2-booking-manage] input,[d2-booking-manage] textarea{width:100%;padding:8px 10px;'
    + 'font:inherit;color:inherit;background:var(--d2-booking-bg,#fff);'
    + 'border:1px solid var(--d2-booking-border,#e0ded9);border-radius:var(--d2-booking-radius,10px)}'
    + '[d2-booking-manage] [d2-booking-manage-action]{padding:12px 16px;font:inherit;'
    + 'font-weight:600;cursor:pointer;border:0;border-radius:var(--d2-booking-radius,10px);'
    + 'background:var(--d2-booking-accent,#1f6f5c);color:var(--d2-booking-accent-text,#fff)}'
    + '[d2-booking-manage] [d2-booking-manage-action][disabled]{opacity:.6;cursor:default}'
    + '[d2-booking-return] [d2-booking-mark],[d2-booking-manage] [d2-booking-mark]'
    + '{align-self:flex-end;font-size:.75em;text-decoration:none;'
    + 'color:var(--d2-booking-muted,#6b6f6d)}';

  var _stylesIn = false;
  function injectStyles(css) {
    if (_stylesIn || pageHas('d2-booking-styles')) { _stylesIn = true; return; }
    var parent = document.head || document.body;
    if (!parent) return;
    var el = create('style', { 'd2-booking-styles': '' });
    el.textContent = css;
    parent.appendChild(el);
    _stylesIn = true;
  }

  function injectWidgetStyles() {
    injectStyles(WIDGET_CSS);
  }

  // A calendar the Designer placed on their own page gets the seven columns
  // and nothing else: the grid is our markup, the colours are their business.
  // A page that also has a widget gets the whole sheet instead, because the
  // widget's own look runs first.
  function injectCalendarStyles() {
    injectStyles(CALENDAR_CSS);
  }

  function textEl(tag, text, attrs) {
    var el = create(tag, attrs || {});
    el.textContent = text;
    return el;
  }

  // What the drawn input is: a number is a number, a phone is a phone, and the
  // browser's own keyboard and autofill follow from that.
  function fieldAttrs(name, id) {
    var out = { 'd2-booking-field': name, id: id };
    if (name === 'note') { out.rows = '3'; return out; }
    if (name === 'email') { out.type = 'email'; out.autocomplete = 'email'; return out; }
    if (name === 'phone') { out.type = 'tel'; out.autocomplete = 'tel'; return out; }
    if (name === 'name') { out.type = 'text'; out.autocomplete = 'name'; return out; }
    if (NUMBER_FIELD[name]) {
      out.type = 'number';
      out.min = name === 'adults' ? '1' : '0';
      out.step = '1';
      out.inputmode = 'numeric';
      return out;
    }
    out.type = 'text';
    if (name === 'child_ages') {
      out.inputmode = 'numeric';
      out.placeholder = MESSAGES.child_ages_hint;
    }
    return out;
  }

  var fieldSeq = 0;

  // The fields the key asks for, in one party row and one column below it. A
  // field the key switched off is never drawn, so applyFields has nothing to
  // remove afterwards.
  function drawFields(form, cfg) {
    var party = create('div', { 'd2-booking-party': '', 'd2-booking-built': '' });
    form.appendChild(party);
    for (var i = 0; i < DRAWN_FIELDS.length; i++) {
      var name = DRAWN_FIELDS[i];
      var state = fieldState(name, cfg);
      if (state === 'off') continue;
      fieldSeq += 1;
      var id = 'd2-booking-' + name + '-' + fieldSeq;
      var group = create('div', { 'd2-booking-field-group': '', 'd2-booking-built': '' });
      group.appendChild(textEl('label', FIELD_LABELS[name] + (state === 'required' ? ' *' : ''), { 'for': id }));
      var input = create(name === 'note' ? 'textarea' : 'input', fieldAttrs(name, id));
      input.setAttribute('d2-booking-built', '');
      if (name === 'adults') {
        input.value = DEFAULT_ADULTS;
        input.setAttribute('value', DEFAULT_ADULTS);
      }
      group.appendChild(input);
      // "How many of them are over the threshold?" is unanswerable without
      // the threshold, so the question carries a slot for it; what goes in
      // comes from the product's pet_fee, once it has answered.
      if (name === 'pets_over_threshold') {
        group.appendChild(create('div', {
          'd2-booking-hint': name, 'd2-booking-built': '', 'd2-booking-empty': ''
        }));
      }
      (PARTY_ROW[name] ? party : form).appendChild(group);
    }
  }

  /**
   * Everything this widget is missing. A part is looked for on the WHOLE page,
   * not only inside the widget: the price, the form and the live region are one
   * per page in this module, so a second one would be a second, silent form.
   * Answers how many parts were drawn.
   */
  function drawWidget(widget, cfg) {
    var product = raw(widget, 'd2-booking-product');
    var drawn = 0;

    if (!pageHas('d2-booking-calendar')) {
      var calendar = create('div', { 'd2-booking-calendar': '', 'd2-booking-built': '' });
      if (product) calendar.setAttribute('d2-booking-product', product);
      widget.appendChild(calendar);
      drawn += 1;
    }
    if (!pageHas('d2-booking-status')) {
      widget.appendChild(create('div', {
        'd2-booking-status': '', 'd2-booking-built': '', role: 'status', 'aria-live': 'polite'
      }));
      drawn += 1;
    }

    // The price belongs with the button that charges it, so it goes inside the
    // form when the form is ours.
    var host = widget;
    if (!pageHas('d2-booking-form')) {
      var form = create('form', { 'd2-booking-form': '', 'd2-booking-built': '' });
      if (product) form.setAttribute('d2-booking-product', product);
      drawFields(form, cfg);
      widget.appendChild(form);
      host = form;
      drawn += 1;
    }
    if (!pageHas('d2-booking-breakdown')) {
      host.appendChild(create('div', { 'd2-booking-breakdown': '', 'd2-booking-built': '' }));
      drawn += 1;
    }
    if (!pageHas('d2-booking-total')) {
      var sum = create('div', { 'd2-booking-summary': '', 'd2-booking-built': '' });
      sum.appendChild(textEl('span', MESSAGES.total_label));
      sum.appendChild(create('strong', {
        'd2-booking-total': '', 'd2-booking-built': '', 'd2-booking-empty': ''
      }));
      host.appendChild(sum);
      drawn += 1;
    }
    if (!pageHas('d2-booking-deposit') && !pageHas('d2-booking-balance')) {
      var later = create('div', { 'd2-booking-later': '', 'd2-booking-built': '' });
      later.appendChild(textEl('span', MESSAGES.deposit_label));
      later.appendChild(create('span', {
        'd2-booking-deposit': '', 'd2-booking-built': '', 'd2-booking-empty': ''
      }));
      later.appendChild(textEl('span', MESSAGES.balance_label));
      later.appendChild(create('span', {
        'd2-booking-balance': '', 'd2-booking-built': '', 'd2-booking-empty': ''
      }));
      host.appendChild(later);
      drawn += 1;
    }
    if (host !== widget) {
      // The message above the button: a guest reads it before trying again.
      if (!firstIn(host, 'd2-booking-error')) {
        host.appendChild(create('div', {
          'd2-booking-error': 'form', 'd2-booking-built': '', role: 'alert'
        }));
      }
      host.appendChild(textEl('button', MESSAGES.submit_label, {
        type: 'submit', 'd2-booking-submit': '', 'd2-booking-built': ''
      }));
    }
    widget.setAttribute('d2-booking-widget-ready', '');
    return drawn;
  }

  /**
   * The hints a page asks for by name. A slot the Designer built is filled
   * where it stands; a slot with nothing to say is emptied and marked
   * d2-booking-empty, so their CSS can hide the row.
   */
  function hintSlots(name) {
    var out = [];
    var all = allOf('d2-booking-hint');
    for (var i = 0; i < all.length; i++) {
      var said = attr(all[i], 'd2-booking-hint');
      if (said !== null && String(said).trim() === name) out.push(all[i]);
    }
    return out;
  }

  function writeHint(name, text) {
    var slots = hintSlots(name);
    for (var i = 0; i < slots.length; i++) {
      slots[i].textContent = text || '';
      if (text) slots[i].removeAttribute('d2-booking-empty');
      else slots[i].setAttribute('d2-booking-empty', '');
    }
  }

  /**
   * The pets sentence, from the product the page books. Asked for only when
   * the page has somewhere to put it — a key whose form never mentions pets
   * must not spend a request on a sentence nobody reads.
   */
  function thresholdFields() {
    var out = [];
    var forms = formsOf();
    for (var i = 0; i < forms.length; i++) {
      var el = forms[i].querySelector('[d2-booking-field="pets_over_threshold"], '
        + '[data-d2-booking-field="pets_over_threshold"]');
      if (el) out.push({ el: el, form: forms[i] });
    }
    return out;
  }

  function dropThresholdField(cfg) {
    var found = thresholdFields();
    for (var i = 0; i < found.length; i++) removeField(found[i].el, found[i].form, cfg);
  }

  function applyPetFee(cfg) {
    if (!hintSlots('pets_over_threshold').length && !thresholdFields().length) {
      return Promise.resolve(null);
    }
    // The form knows its product (the widget copies the attribute onto the one
    // it draws); the loader tag and the address are the fallbacks productOf
    // already walks.
    var ref = productOf(priceForm() || allOf('d2-booking-widget')[0] || null);
    if (!ref) return Promise.resolve(null);
    return product(ref).then(function (data) {
      writeHint('pets_over_threshold', petFeeText(data, cfg));
      // No pet_fee means no threshold anywhere on the page, so the question
      // cannot be answered. Only an answer says so: a failed lookup keeps it.
      if (data && !data.pet_fee) dropThresholdField(cfg);
      return data;
    });
  }

  // ---------------------------------------------------------------------------
  // The digi2 mark — shown unless the key paid for a page without it
  // ---------------------------------------------------------------------------

  function fillMark(el) {
    if (!el.getAttribute('href')) el.setAttribute('href', MARK_URL);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
    if (!String(el.textContent || '').trim()) el.textContent = MESSAGES.mark;
  }

  /**
   * branding_hidden takes the mark off the page — the one the Designer placed
   * too, because the attribute is ours and the key decides. Otherwise the mark
   * the page placed is filled in where it stands, and a widget we drew
   * ourselves gets one at its end.
   */
  function applyMark(cfg, widget) {
    var marks = allOf('d2-booking-mark');
    var i;
    if (cfg.branding_hidden) {
      for (i = 0; i < marks.length; i++) {
        if (marks[i].parentNode) marks[i].parentNode.removeChild(marks[i]);
      }
      return;
    }
    if (!marks.length) {
      if (!widget) return;
      var made = create('a', { 'd2-booking-mark': '', 'd2-booking-built': '' });
      widget.appendChild(made);
      marks = [made];
    }
    for (i = 0; i < marks.length; i++) fillMark(marks[i]);
  }

  // The block the mark goes at the end of: the booking widget first, and on a
  // page that only shows a return or a manage block, that block instead.
  function markHost() {
    return allOf('d2-booking-widget')[0]
      || allOf('d2-booking-return')[0]
      || allOf('d2-booking-manage')[0]
      || null;
  }

  function applyWidgets(cfg) {
    var widgets = allOf('d2-booking-widget');
    for (var i = 0; i < widgets.length; i++) {
      if (widgets[i].getAttribute('d2-booking-widget-ready') !== null) continue;
      injectWidgetStyles();
      if (!drawWidget(widgets[i], cfg) && i > 0) {
        _warn('a second d2-booking-widget found every part taken and stays empty'
          + ' — one page books one stay');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // The live region — what a screen reader hears about the stay and the price
  // ---------------------------------------------------------------------------

  function announce(text) {
    var slots = allOf('d2-booking-status');
    for (var i = 0; i < slots.length; i++) slots[i].textContent = text || '';
  }

  function statusSlot(host) {
    // The page may have put one anywhere — inside the calendar or next to the
    // price. Only a page with none at all gets one built.
    var el = firstIn(host, 'd2-booking-status') || allOf('d2-booking-status')[0];
    if (el) return el;
    el = create('div', {
      'd2-booking-status': '',
      'd2-booking-built': '',
      role: 'status',
      'aria-live': 'polite'
    });
    host.appendChild(el);
    return el;
  }

  // ---------------------------------------------------------------------------
  // Availability — the rental's rules and the nights it already has
  // ---------------------------------------------------------------------------

  function wholeOr(value, fallback) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }

  function rulesOf(data) {
    var units = isArray(data.allowed_units) ? data.allowed_units : [];
    var lead = Number(data.lead_time_hours);
    var buffer = Number(data.buffer_minutes);
    return {
      timezone: data.timezone ? String(data.timezone) : null,
      currency: data.currency ? String(data.currency) : null,
      // What the calendar sends is always nights. units_count is counted in
      // `unit`, so the first allowed unit would book 3 nights as 3 months.
      unit: 'day',
      nights: !units.length || units.indexOf('day') >= 0,
      min: wholeOr(data.min_units, 1),
      // No max_units means no cap, and 0 reads as "no cap" everywhere below.
      max: wholeOr(data.max_units, 0),
      leadHours: isFinite(lead) && lead > 0 ? lead : 0,
      buffer: isFinite(buffer) && buffer > 0 ? buffer : 0
    };
  }

  // The one busy kind the buffer never touches (contract: BUSY_KIND_BLACKOUT).
  // Every other kind — booking, and anything the contract gains later — is
  // widened, which is the cautious direction: a night greyed out for nothing is
  // recoverable, a double booking is not.
  var BUSY_KIND_BLACKOUT = 'blackout';

  // Why a night is not free, strongest reason first. An overlap always beats
  // the gap a buffer asks for, so a night inside one period and merely next to
  // another reads as taken (or closed) rather than as a missing gap.
  var BUSY_RANK = { buffer_conflict: 1, blackout_overlap: 2, period_taken: 3 };

  function takeNights(into, from, to, code) {
    if (!from || !to) return;
    // A period ending exactly at midnight leaves its last date free: the guest
    // who leaves that morning never slept there.
    var last = to.minutes === 0 ? to.day - 1 : to.day;
    for (var day = from.day; day <= last; day++) {
      if (!into[day] || BUSY_RANK[code] > BUSY_RANK[into[day]]) into[day] = code;
    }
  }

  /**
   * Every night the answer's busy periods take, as day numbers in the rental's
   * timezone, each one carrying the availability code that explains it. A
   * period ending exactly at midnight leaves its last date free, which is why
   * the first day of a taken period can still be someone else's departure.
   *
   * buffer_minutes is the gap between stays, so it widens a booking only — a
   * blackout is an exact window, and "renovation until 12:00" means the flat is
   * free at 12:00. That is how the backend reads it (rental_violations in
   * services/rental_availability.py checks the widened period against periods
   * with kind == "booking" and nothing else), so the calendar reads it the same
   * way; widening a blackout would grey out nights the backend would take, and
   * the guest would never learn why.
   */
  function markBusy(into, busy, rules) {
    if (!isArray(busy)) return;
    for (var i = 0; i < busy.length; i++) {
      var period = busy[i] || {};
      var blackout = String(period.kind || '') === BUSY_KIND_BLACKOUT;
      // The period itself: a real overlap, refused by its own code.
      takeNights(
        into,
        zoneParts(period.starts_at, rules.timezone, 0),
        zoneParts(period.ends_at, rules.timezone, 0),
        blackout ? 'blackout_overlap' : 'period_taken'
      );
      if (blackout || !rules.buffer) continue;
      // And the gap around a booking, refused as the gap it is.
      takeNights(
        into,
        zoneParts(period.starts_at, rules.timezone, -rules.buffer),
        zoneParts(period.ends_at, rules.timezone, rules.buffer),
        'buffer_conflict'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // The calendar
  // ---------------------------------------------------------------------------

  var captionSeq = 0;

  function makeCalendar(el) {
    var state = {
      el: el,
      product: null,
      wrap: null,
      caption: null,
      captionId: '',
      grid: null,
      month: 0,          // the 1st of the month on screen
      focusDay: 0,       // the only day in the tab order
      from: 0,           // chosen arrival, 0 = none
      to: 0,             // chosen departure, 0 = none
      rules: null,
      windows: {},       // 'YYYY-MM' → asked for already
      busy: {}           // day number → a night someone has
    };

    function rules() {
      return state.rules
        || { min: 1, max: 0, leadHours: 0, buffer: 0, timezone: null, unit: 'day', nights: true };
    }

    function lang() {
      return pageLanguage(currentConfig());
    }

    // The first day a stay can start on. A stay starts at local midnight and
    // the backend holds that moment against now + lead time, so the day that
    // moment falls in is already too late: today is never on offer, and a lead
    // of 24 h at 15:00 opens the day after tomorrow.
    function earliest() {
      return todayIn(rules().timezone, rules().leadHours) + 1;
    }

    // Why a stay cannot start here: an availability code, or null when it can.
    function arrivalBlock(day) {
      // A calendar counts nights, so a product that does not rent by the day
      // cannot be booked here at all: nothing else it could send means nights.
      // After that, a day behind us is `past`, and one still ahead of us but
      // too close is what the backend would call it.
      if (rules().nights === false) return 'unit_not_allowed';
      if (day < todayIn(rules().timezone, 0)) return 'past';
      if (day < earliest()) return 'lead_time_too_short';
      // The code markBusy left on the night: taken, closed by the owner, or
      // the gap a buffer asks for. Each one reads as a different sentence.
      if (state.busy[day]) return state.busy[day];
      return null;
    }

    // Why a stay that started on `from` cannot end here.
    function departureBlock(from, day) {
      if (day <= from) return 'invalid_order';
      var nights = day - from;
      if (nights < rules().min) return 'below_min_units';
      if (rules().max && nights > rules().max) return 'above_max_units';
      for (var n = from; n < day; n++) {
        if (state.busy[n]) return state.busy[n];
      }
      return null;
    }

    function pastDay(day) {
      return day < earliest();
    }

    function build() {
      if (state.wrap) return;
      var wrap = create('div', { 'd2-booking-calendar-built': '' });
      var head = create('div', { 'd2-booking-calendar-head': '' });
      var prev = create('button', {
        type: 'button', 'd2-booking-calendar-prev': '', 'aria-label': MESSAGES.calendar_prev
      });
      prev.textContent = '‹';
      var next = create('button', {
        type: 'button', 'd2-booking-calendar-next': '', 'aria-label': MESSAGES.calendar_next
      });
      next.textContent = '›';
      captionSeq += 1;
      state.captionId = 'd2-booking-month-' + captionSeq;
      state.caption = create('div', {
        'd2-booking-calendar-month': '', id: state.captionId, 'aria-live': 'polite'
      });
      head.appendChild(prev);
      head.appendChild(state.caption);
      head.appendChild(next);
      // A grid of real buttons: the month is one tab stop and the arrows walk
      // it, which is what a date grid is supposed to do.
      state.grid = create('div', {
        'd2-booking-calendar-grid': '', role: 'grid', 'aria-labelledby': state.captionId
      });
      wrap.appendChild(head);
      wrap.appendChild(state.grid);
      el.appendChild(wrap);
      state.wrap = wrap;
      statusSlot(wrap);

      prev.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        goToMonth(addMonths(state.month, -1), 0);
      });
      next.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        goToMonth(addMonths(state.month, 1), 0);
      });
    }

    // One window per month, kept for the visit: walking back and forth must not
    // ask the API (and its rate limit) for an answer we already have.
    function loadMonth(firstDay, again) {
      var key = dayKey(firstDay).slice(0, 7);
      // A month that failed is asked for again only when the guest comes back
      // to it, never by the two calls start() makes for the same month.
      if (state.windows[key] && !(again && state.windows[key] === 'failed')) {
        return Promise.resolve(false);
      }
      state.windows[key] = true;
      // A month wholly behind the earliest stay has nothing to tell us.
      if (state.rules && addMonths(firstDay, 1) <= earliest()) return Promise.resolve(false);
      if (!state.product) return Promise.resolve(false);
      el.setAttribute('d2-booking-busy', '');
      // Answered from memory once the product is known; after a failed lookup
      // this is the retry, so the window does not go out under a bare slug.
      return product(state.product).then(function () {
        return request('GET', '/products/' + encodeURIComponent(productId(state.product)) + '/availability', {
          query: 'date_from=' + encodeURIComponent(naiveOf(firstDay))
            + '&date_to=' + encodeURIComponent(naiveOf(addMonths(firstDay, 1))),
          notFound: 'product_not_found',
          // On this route a plain-sentence 400 is always about the window we
          // asked for, so the guest hears about dates and not about "data".
          badRequest: 'invalid_stay'
        });
      }).then(function (res) {
        el.removeAttribute('d2-booking-busy');
        if (!res.ok) {
          state.windows[key] = 'failed';
          // The page is not held hostage by the API: the month stays usable and
          // the backend refuses the stay on quote or on submit if it must.
          _warn('the availability window ' + key + ' could not be read (' + res.reason
            + ') — the month stays open and the backend decides');
          return false;
        }
        var data = res.data || {};
        state.rules = rulesOf(data);
        lastRules = state.rules;
        if (!state.rules.nights) {
          _warn('this product does not rent by the day, and a calendar can only book nights');
        }
        markBusy(state.busy, data.busy, state.rules);
        return true;
      });
    }

    function goToMonth(firstDay, focusDay) {
      state.month = startOfMonth(firstDay);
      if (focusDay) state.focusDay = focusDay;
      return loadMonth(state.month, true).then(function () {
        render(!!focusDay);
      });
    }

    function dayLabel(day, phase) {
      var parts = [];
      if (day === state.from) parts.push(MESSAGES.day_arrival);
      else if (day === state.to) parts.push(MESSAGES.day_departure);
      else if (state.from && state.to && day > state.from && day < state.to) parts.push(MESSAGES.day_in_range);
      if (state.busy[day]) parts.push(MESSAGES.day_busy);
      if (pastDay(day)) parts.push(MESSAGES.day_past);
      else if (phase === 'departure' && day !== state.from && departureBlock(state.from, day) === null) {
        parts.push(MESSAGES.day_can_depart);
      }
      if (day === todayIn(rules().timezone, 0)) parts.push(MESSAGES.day_today);
      return dayText(day, lang()) + (parts.length ? ', ' + parts.join(', ') : '');
    }

    function render(focusNow) {
      build();
      var language = lang();
      var phase = state.from && !state.to ? 'departure' : 'arrival';
      var first = state.month;
      var count = daysInMonth(first);
      var week = firstWeekday(language);
      var today = todayIn(rules().timezone, 0);

      if (!state.focusDay || state.focusDay < first || state.focusDay >= first + count) {
        state.focusDay = Math.min(first + count - 1, Math.max(first, state.from || earliest()));
      }
      state.caption.textContent = dayText(first, language, { month: 'long', year: 'numeric' });

      clearEl(state.grid);
      var header = create('div', { role: 'row', 'd2-booking-calendar-weekdays': '' });
      for (var w = 0; w < 7; w++) {
        var sample = first + ((week + w - weekdayOf(first) + 7) % 7);
        var cell = create('div', {
          role: 'columnheader',
          'aria-label': dayText(sample, language, { weekday: 'long' })
        });
        cell.textContent = dayText(sample, language, { weekday: 'short' });
        header.appendChild(cell);
      }
      state.grid.appendChild(header);

      var row = create('div', { role: 'row' });
      state.grid.appendChild(row);
      var lead = (weekdayOf(first) - week + 7) % 7;
      for (var blank = 0; blank < lead; blank++) {
        row.appendChild(create('div', { role: 'gridcell', 'd2-booking-day-blank': '' }));
      }
      var focusTarget = null;

      for (var i = 0; i < count; i++) {
        var day = first + i;
        if ((lead + i) > 0 && (lead + i) % 7 === 0) {
          row = create('div', { role: 'row' });
          state.grid.appendChild(row);
        }
        var cellEl = create('div', { role: 'gridcell' });
        var btn = create('button', {
          type: 'button',
          'd2-booking-day': dayKey(day),
          tabindex: day === state.focusDay ? '0' : '-1'
        });
        btn.textContent = String(civilOf(day).d);
        btn.setAttribute('aria-label', dayLabel(day, phase));

        // aria-disabled, never the disabled property: a day a screen-reader
        // user cannot reach is a day they cannot be told about.
        var blocked = phase === 'departure'
          ? (arrivalBlock(day) !== null && departureBlock(state.from, day) !== null)
          : arrivalBlock(day) !== null;
        if (blocked) btn.setAttribute('aria-disabled', 'true');
        if (state.busy[day]) btn.setAttribute('d2-booking-day-busy', '');
        if (pastDay(day)) btn.setAttribute('d2-booking-day-past', '');
        if (day === state.from) btn.setAttribute('d2-booking-day-selected', '');
        if (day === state.to) btn.setAttribute('d2-booking-day-checkout', '');
        if (state.from && state.to && day > state.from && day < state.to) {
          btn.setAttribute('d2-booking-day-in-range', '');
        }
        if (day === today) {
          btn.setAttribute('d2-booking-day-today', '');
          btn.setAttribute('aria-current', 'date');
        }
        if (day === state.from || day === state.to) cellEl.setAttribute('aria-selected', 'true');
        bindDay(btn, day);
        cellEl.appendChild(btn);
        row.appendChild(cellEl);
        if (day === state.focusDay) focusTarget = btn;
      }

      while (row.children && row.children.length % 7 !== 0) {
        row.appendChild(create('div', { role: 'gridcell', 'd2-booking-day-blank': '' }));
      }
      if (focusNow && focusTarget && focusTarget.focus) focusTarget.focus();
      el.setAttribute('d2-booking-calendar-ready', '');
    }

    function bindDay(btn, day) {
      btn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        pick(day);
      });
      btn.addEventListener('keydown', function (e) {
        var step = keyStep(e && e.key, day);
        if (step === null) return;
        if (e && e.preventDefault) e.preventDefault();
        moveFocus(step);
      });
    }

    // Enter and Space are left to the browser: a <button> already clicks on
    // them, and handling them here would select the day twice.
    function keyStep(key, day) {
      if (key === 'ArrowLeft') return day - 1;
      if (key === 'ArrowRight') return day + 1;
      if (key === 'ArrowUp') return day - 7;
      if (key === 'ArrowDown') return day + 7;
      if (key === 'Home') return day - ((weekdayOf(day) - firstWeekday(lang()) + 7) % 7);
      if (key === 'End') return day + (6 - ((weekdayOf(day) - firstWeekday(lang()) + 7) % 7));
      if (key === 'PageUp') return sameDayIn(addMonths(state.month, -1), day);
      if (key === 'PageDown') return sameDayIn(addMonths(state.month, 1), day);
      return null;
    }

    function sameDayIn(firstDay, day) {
      return firstDay + Math.min(civilOf(day).d, daysInMonth(firstDay)) - 1;
    }

    function moveFocus(day) {
      var first = state.month;
      if (day < first || day >= first + daysInMonth(first)) {
        state.focusDay = day;
        goToMonth(startOfMonth(day), day);
        return;
      }
      var before = state.grid.querySelector('[d2-booking-day="' + dayKey(state.focusDay) + '"]');
      if (before) before.setAttribute('tabindex', '-1');
      state.focusDay = day;
      var now = state.grid.querySelector('[d2-booking-day="' + dayKey(day) + '"]');
      if (now) {
        now.setAttribute('tabindex', '0');
        if (now.focus) now.focus();
      }
    }

    /**
     * One click on a day. The first click is the arrival; the second closes the
     * range. A day before the arrival (or the arrival itself) starts over, and a
     * day the rules refuse says why and leaves the arrival where it is — the
     * guest never has to guess which half of the range the calendar dropped.
     */
    function pick(day) {
      // The grid is rebuilt below and the button holding the focus goes with
      // it, so the focus is put back on the same day: a keyboard user would
      // otherwise land on <body> between the arrival and the departure.
      state.focusDay = day;
      if (!state.from || state.to || day <= state.from) {
        var why = arrivalBlock(day);
        if (why) {
          announce(violationText(why, state.rules) || message('rental_rules'));
          return;
        }
        state.from = day;
        state.to = 0;
        select(null);
        announce(fill(MESSAGES.calendar_arrival, { date: dayText(day, lang()) }));
        render(true);
        return;
      }
      var blocked = departureBlock(state.from, day);
      if (blocked) {
        announce(violationText(blocked, state.rules) || message('rental_rules'));
        return;
      }
      state.to = day;
      var nights = day - state.from;
      select({
        product: state.product,
        unit: rules().unit,
        starts_at: naiveOf(state.from),
        units_count: nights
      });
      announce(fill(MESSAGES.calendar_range, {
        from: dayText(state.from, lang()),
        to: dayText(day, lang()),
        count: nights,
        nights: nightsWord(nights)
      }));
      render(true);
    }

    function start() {
      state.product = productOf(el);
      if (!state.product) {
        _warn('a calendar needs its product: put d2-booking-product="<uuid|slug>" on the loader tag or on the calendar');
      }
      announce(MESSAGES.calendar_loading);
      state.month = startOfMonth(todayIn(null, 0));
      // The reference may be a slug and availability takes an id, so the
      // product is resolved before the first window is asked for.
      return product(state.product).then(function () {
        return loadMonth(state.month);
      }).then(function () {
        // The rules are known only now: a long lead time can push the first
        // bookable day into a later month, and that is the month to open on.
        state.month = startOfMonth(Math.max(state.month, earliest()));
        return loadMonth(state.month);
      }).then(function () {
        render(false);
        announce(MESSAGES.calendar_pick);
      });
    }

    return { el: el, start: start, state: state };
  }

  /**
   * The product this element books, in the order the page means it: the
   * element's own attribute, then the loader tag's, then ?apartament= from the
   * address. The query parameter is what makes one booking page serve a whole
   * CMS collection — the link carries the apartment, so no per-item attribute
   * binding is needed — and it comes last, because an attribute the Designer
   * wrote down is a decision and an address is only where the guest clicked.
   */
  function productOf(el) {
    var given = attr(el, 'd2-booking-product') || attr(cfgEl(), 'd2-booking-product');
    given = given === null || given === undefined ? '' : String(given).trim();
    if (given) return given;
    var asked = queryParam('apartament');
    asked = asked === null ? '' : String(asked).trim();
    return asked || null;
  }

  var calendars = [];

  function applyCalendars() {
    var found = allOf('d2-booking-calendar');
    var started = [];
    if (found.length) injectCalendarStyles();
    for (var i = 0; i < found.length; i++) {
      var known = null;
      for (var j = 0; j < calendars.length; j++) {
        if (calendars[j].el === found[i]) known = calendars[j];
      }
      if (known) continue;
      var made = makeCalendar(found[i]);
      calendars.push(made);
      started.push(made.start());
    }
    return Promise.all(started);
  }

  // ---------------------------------------------------------------------------
  // The price — asked for once per settled change, printed as the answer gave it
  // ---------------------------------------------------------------------------

  // What quote and bookings call the party; everything else in the form is none
  // of the price's business.
  var PARTY_KEYS = ['guests', 'adults', 'children', 'child_ages', 'pets', 'pets_over_threshold'];

  var quoteTimer = null;
  var quoteSeq = 0;
  var lastQuote = null;
  // The question the last answer belongs to, so an identical one is not asked
  // twice (see askQuote).
  var lastQuoteKey = '';
  // The question on its way: { key, seq, promise }. Asking it again joins it.
  var quoteFlight = null;

  function scheduleQuote() {
    if (quoteTimer) clearTimeout(quoteTimer);
    quoteTimer = setTimeout(function () {
      quoteTimer = null;
      runQuote();
    }, QUOTE_DEBOUNCE_MS);
  }

  function priceForm() {
    var forms = formsOf();
    return forms.length ? forms[0] : null;
  }

  function priceBoxes() {
    return allOf('d2-booking-breakdown');
  }

  function wantsPrice() {
    return priceBoxes().length > 0 || allOf('d2-booking-total').length > 0;
  }

  function runQuote() {
    if (!wantsPrice()) return Promise.resolve(null);
    var form = priceForm();
    var stay = stayFor(form);
    if (!stay || !stay.starts_at || !stay.units_count) {
      // The sequence moves too: an answer still on its way is about a stay
      // the guest has just let go of, and must not print its price.
      quoteSeq++;
      setPriceBusy(false);
      clearPrice();
      return Promise.resolve(null);
    }
    var seq = ++quoteSeq;
    return config().then(function (cfg) {
      return product(stay.product).then(function () {
        return askQuote(stay, form, cfg, seq);
      });
    });
  }

  /**
   * One quote for a stay whose product is already resolved. The sequence
   * number is the staleness guard: a slower answer to an older question never
   * overwrites a newer one.
   */
  function askQuote(stay, form, cfg, seq) {
    var body = {
      unit: stay.unit || 'day',
      starts_at: stay.starts_at,
      units_count: stay.units_count
    };
    if (form) {
      var said = values(form, cfg);
      for (var i = 0; i < PARTY_KEYS.length; i++) {
        if (said.hasOwnProperty(PARTY_KEYS[i])) body[PARTY_KEYS[i]] = said[PARTY_KEYS[i]];
      }
    }
    // The form fires on every keystroke, and most of them — a name, a note —
    // cannot move the price. A question we already asked, byte for byte, is
    // answered from the reply we are holding instead of spending the key's
    // rate limit on the same answer again.
    var asked = productId(stay.product) + '|' + JSON.stringify(body);
    // The same question still on its way is joined, not repeated: it answers
    // for this newer sequence number, or a keystroke would throw its price away.
    if (quoteFlight && quoteFlight.key === asked) {
      quoteFlight.seq = seq;
      return quoteFlight.promise;
    }
    // lastQuoteKey names the question lastQuote answers, so it is written with
    // the answer and never with the asking. Back on the price already printed,
    // nothing is coming for this sequence number to clear the busy mark.
    if (asked === lastQuoteKey && lastQuote) {
      setPriceBusy(false);
      return Promise.resolve({ ok: true, status: 200, data: lastQuote });
    }
    setPriceBusy(true);
    var flight = { key: asked, seq: seq, promise: null };
    quoteFlight = flight;
    flight.promise = request('POST', '/products/' + encodeURIComponent(productId(stay.product)) + '/quote', {
      body: body,
      notFound: 'product_not_found',
      // The only values this route takes are the stay and the party, so a
      // plain-sentence 400 is a period it cannot price (KONTRAKT.md: the
      // sentence itself is for the log, never for the guest).
      badRequest: 'invalid_stay'
    }).then(function (res) {
      if (quoteFlight === flight) quoteFlight = null;
      if (flight.seq !== quoteSeq) return res;
      setPriceBusy(false);
      if (!res.ok) {
        clearPrice();
        announce(res.message);
        _emit('booking:quote', { quote: null, reason: res.reason, status: res.status });
        return res;
      }
      var data = res.data || {};
      if (data.available === false) {
        // The answer itself says this stay cannot be had: a price next to
        // that sentence would be an offer nobody can keep.
        clearPrice();
        announce(message('rental_rules', { violations: data.violations }));
        _emit('booking:quote', { quote: data, reason: 'rental_rules', status: res.status });
        return res;
      }
      lastQuote = data;
      lastQuoteKey = asked;
      renderPrice(data, cfg);
      _emit('booking:quote', { quote: data });
      return res;
    });
    return flight.promise;
  }

  function setPriceBusy(on) {
    var boxes = priceBoxes();
    for (var i = 0; i < boxes.length; i++) {
      if (on) boxes[i].setAttribute('d2-booking-busy', '');
      else boxes[i].removeAttribute('d2-booking-busy');
    }
  }

  function writeAmount(name, text) {
    var list = allOf(name);
    for (var i = 0; i < list.length; i++) {
      list[i].textContent = text || '';
      if (text) list[i].removeAttribute('d2-booking-empty');
      else list[i].setAttribute('d2-booking-empty', '');
    }
  }

  function clearPrice() {
    var boxes = priceBoxes();
    for (var i = 0; i < boxes.length; i++) {
      lineTemplate(boxes[i]);
      clearEl(boxes[i]);
    }
    writeAmount('d2-booking-total', '');
    writeAmount('d2-booking-deposit', '');
    writeAmount('d2-booking-balance', '');
    lastQuote = null;
    lastQuoteKey = '';
  }

  // The row the Designer built, remembered before the container is emptied for
  // the first time — so the price list keeps the styling of the site.
  function lineTemplate(box) {
    if (box._d2BookingLine === undefined) {
      var found = firstIn(box, 'd2-booking-line');
      box._d2BookingLine = found && found.cloneNode ? found.cloneNode(true) : null;
    }
    return box._d2BookingLine;
  }

  function lineLabel(line, language) {
    if (line.label) return String(line.label);
    var text = LINE_LABELS[String(line.kind)] || String(line.kind || '');
    // A cleaning fee folded into the stay leaves length_discount without its
    // rate (contract): the label then goes out without one, and the amount
    // beside it is still the answer's.
    if (line.percent !== null && line.percent !== undefined) {
      var rate = percentText(line.percent, language);
      if (rate) text += ' (' + rate + ')';
    }
    return text;
  }

  function fillSlot(row, name, text) {
    var el = firstIn(row, name);
    if (el) el.textContent = text;
    return el;
  }

  function buildRow() {
    var row = create('div', { 'd2-booking-line': '', 'd2-booking-built': '' });
    row.appendChild(create('span', { 'd2-booking-line-label': '' }));
    row.appendChild(create('span', { 'd2-booking-line-detail': '' }));
    row.appendChild(create('span', { 'd2-booking-line-amount': '' }));
    return row;
  }

  function renderPrice(data, cfg) {
    var language = pageLanguage(cfg);
    var currency = data.currency ? String(data.currency) : null;
    var lines = isArray(data.line_items) ? data.line_items : [];
    var boxes = priceBoxes();

    for (var b = 0; b < boxes.length; b++) {
      var box = boxes[b];
      var tmpl = lineTemplate(box);
      clearEl(box);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i] || {};
        var row = tmpl && tmpl.cloneNode ? tmpl.cloneNode(true) : buildRow();
        row.setAttribute('d2-booking-line-kind', String(line.kind || ''));
        if (parseFloat(String(line.amount)) < 0) row.setAttribute('d2-booking-line-negative', '');
        fillSlot(row, 'd2-booking-line-label', lineLabel(line, language));
        fillSlot(row, 'd2-booking-line-amount', money(line.amount, currency, language));
        // The quantity and the rate the answer carries, side by side; the
        // module never multiplies one by the other.
        var quantity = Number(line.quantity);
        fillSlot(row, 'd2-booking-line-detail',
          isFinite(quantity) && quantity > 1 && line.unit_amount
            ? quantity + ' × ' + money(line.unit_amount, currency, language)
            : '');
        box.appendChild(row);
      }
    }

    writeAmount('d2-booking-total', money(data.amount_total, currency, language));
    writeAmount('d2-booking-deposit', moneyMinor(data.deposit_amount_minor, currency, language));
    writeAmount('d2-booking-balance', moneyMinor(data.balance_amount_minor, currency, language));
  }

  // ---------------------------------------------------------------------------
  // Booking
  // ---------------------------------------------------------------------------

  function applyRefusal(form, res, cfg) {
    var field = res.field;
    var el = field
      ? form.querySelector('[d2-booking-field="' + field + '"], [data-d2-booking-field="' + field + '"]')
      : null;
    if (el && fieldState(field, cfg) !== 'off') markInvalid(form, field, el, res.message);
    else showMessage(form, 'form', res.message);
  }

  // Every button that would submit this form: the one marked for us and the
  // ones the browser would submit on its own.
  function submitsOf(form) {
    var out = [];
    function add(list) {
      for (var i = 0; i < list.length; i++) {
        var seen = false;
        for (var j = 0; j < out.length; j++) if (out[j] === list[i]) seen = true;
        if (!seen) out.push(list[i]);
      }
    }
    try { add(form.querySelectorAll('[d2-booking-submit], [data-d2-booking-submit]')); } catch (e) {}
    try { add(form.querySelectorAll('button[type="submit"], input[type="submit"]')); } catch (e) {}
    return out;
  }

  // The form while a booking is in flight: the button is really disabled, so
  // the second click never happens, not even before our own guard sees it.
  function lock(form, on) {
    if (on) {
      form.setAttribute('d2-booking-busy', '');
      form.setAttribute('aria-busy', 'true');
    } else {
      form.removeAttribute('d2-booking-busy');
      form.removeAttribute('aria-busy');
    }
    var buttons = submitsOf(form);
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = !!on;
      if (on) buttons[i].setAttribute('disabled', '');
      else buttons[i].removeAttribute('disabled');
    }
  }

  // ---------------------------------------------------------------------------
  // Payment
  // ---------------------------------------------------------------------------

  function payableUrl(url) {
    var text = url === null || url === undefined ? '' : String(url);
    return !!text && (CHECKOUT_URL_RE.test(text) || LOCAL_CHECKOUT_RE.test(text));
  }

  function goTo(url) {
    try {
      var loc = window.location;
      if (!loc) return;
      if (typeof loc.assign === 'function') loc.assign(url);
      else loc.href = url;
    } catch (e) {
      _warn('the browser would not open the checkout address', e);
    }
  }

  // A state this form cannot leave by trying again: the sentence stays and the
  // button stays down until another period is picked (reopenClosed). `final` is remembered against the request it refused,
  // because a hold that expired is exactly the moment a guest reaches for
  // another period — and a form frozen for the whole visit would not let them.
  function closeForm(form, state, res, key) {
    form.setAttribute('d2-booking-payment', state);
    form._d2BookingLast = res;
    form._d2BookingClosedKey = key === undefined ? null : key;
  }

  // A 429 said how long: the button waits exactly that long, because opening
  // it at once only buys the guest the next refusal. The form keeps the
  // answer, so a submit that gets past the disabled button during the wait is
  // handed it instead of spending another call.
  function waitOut(form, res) {
    form.setAttribute('d2-booking-payment', 'wait');
    form._d2BookingLast = res;
    setTimeout(function () {
      if (form.getAttribute('d2-booking-payment') !== 'wait') return;
      form.removeAttribute('d2-booking-payment');
      form._d2BookingLast = null;
      lock(form, false);
    }, res.retryAfter * 1000);
  }

  // Nothing the guest did or can mend: the object has no payments yet. Their
  // sentence is information, so it is not painted like a mistake.
  var NOT_THE_GUEST = { stripe_not_connected: 1, stripe_account_not_ready: 1 };

  function paymentRefused(form, res, key) {
    _log('payment refused', { reason: res.reason, status: res.status });
    if (form) showMessage(form, 'form', res.message, !!NOT_THE_GUEST[res.reason]);
    announce(res.message);
    _emit('booking:refused', { reason: res.reason, status: res.status, form: form || null });
    if (!form) return;
    if (PAYMENT_FINAL[res.reason]) {
      // Nothing a guest can do with THIS booking: the hold is gone, the money
      // is in, or the owner has no Stripe. A retry would only ask for a
      // session that cannot exist. A booking that no longer awaits payment is
      // also dropped from the kept ones, so the next period the guest picks
      // creates a booking of its own instead of paying the dead one again.
      if (res.reason === 'booking_not_payable' && key) drop(madeBookings, key);
      if (res.reason === 'booking_not_payable' && form) form._d2BookingAttempt = null;
      closeForm(form, 'final', res, key || null);
      return;
    }
    if (res.reason === 'too_many_requests' && res.retryAfter > 0) {
      waitOut(form, res);
      return;
    }
    // 502 from the provider, a dead network, anything else: worth another try.
    form.setAttribute('d2-booking-payment', 'retry');
    lock(form, false);
  }

  /**
   * The checkout of a booking that exists. The route takes no body: what is
   * being paid and where Stripe comes back to are the backend's business.
   */
  function pay(bookingId, form, key) {
    var id = String(bookingId || '');
    if (!id) return Promise.resolve(refusal('booking_not_found', 0));
    return request('POST', '/bookings/' + encodeURIComponent(id) + '/checkout-session', {
      notFound: 'booking_not_found',
      conflict: 'booking_not_payable',
      // Only the two payment routes read a 502 as the provider being down
      // (errors.json); everywhere else a bad gateway is a bad gateway.
      badGateway: 'payment_provider_unavailable'
    }).then(function (res) {
      if (!res.ok) {
        paymentRefused(form, res, key);
        return res;
      }
      var url = res.data ? res.data.checkout_url : null;
      if (!payableUrl(url)) {
        if (url) {
          _warn('the checkout_url in the answer is not an https address, so the guest stays'
            + ' on the page: ' + url);
        }
        var stuck = refusal('checkout_url_missing', res.status);
        if (form) {
          showMessage(form, 'form', stuck.message);
          form.setAttribute('d2-booking-payment', 'retry');
          lock(form, false);
        }
        announce(stuck.message);
        _emit('booking:refused', { reason: stuck.reason, status: res.status, form: form || null });
        return stuck;
      }
      if (form) {
        // We are leaving the page: the button stays down behind us.
        closeForm(form, 'opening', res, key || null);
        showMessage(form, 'form', MESSAGES.payment_opening, true);
      }
      announce(MESSAGES.payment_opening);
      _log('checkout opened', { booking: id });
      _emit('booking:payment', {
        booking_id: id, url: url, session: res.data, form: form || null
      });
      goTo(url);
      return res;
    });
  }

  function payFor(form, created, createdRes, key) {
    if (!created || !created.id) {
      // A 201 with no booking in it: nothing to point a payment at.
      var bad = refusal('bad_response', createdRes.status || 0);
      showMessage(form, 'form', bad.message);
      lock(form, false);
      return Promise.resolve(bad);
    }
    if (created.payment_required === false) {
      // On request: the booking is in and the owner decides. Asking Stripe for
      // a session here would charge for a stay nobody has accepted.
      showMessage(form, 'form', MESSAGES.booking_received, true);
      announce(MESSAGES.booking_received);
      closeForm(form, 'done', createdRes, key || null);
      return Promise.resolve(createdRes);
    }
    return pay(created.id, form, key).then(function (res) {
      return res.ok ? createdRes : res;
    });
  }

  // ---------------------------------------------------------------------------
  // One booking per request
  // ---------------------------------------------------------------------------

  // Requests in flight and the bookings they already made, both keyed on what
  // the hold actually stands on: the same stay and the same party is one
  // booking, and a retry after a payment hiccup pays that one instead of
  // holding the period twice.
  var flights = [];
  var madeBookings = [];

  function keptFor(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i].value;
    return null;
  }

  function keep(list, key, value) {
    list.push({ key: key, value: value });
    return value;
  }

  function drop(list, key) {
    for (var i = list.length - 1; i >= 0; i--) if (list[i].key === key) list.splice(i, 1);
  }

  // What the booking is OF: the product, the period and the party. The
  // contact fields are deliberately out of it — a guest who fixes a typo after
  // a payment hiccup must pay the booking they already hold, not ask the
  // backend for a second hold on the same nights. A changed name, e-mail or
  // phone travels to that booking through sendContact().
  var HOLD_KEYS = ['unit', 'starts_at', 'units_count'].concat(PARTY_KEYS);

  var CONTACT_KEYS = ['customer_email', 'customer_name', 'customer_phone'];

  function contactOf(body) {
    var out = {};
    for (var i = 0; i < CONTACT_KEYS.length; i++) {
      if (body[CONTACT_KEYS[i]]) out[CONTACT_KEYS[i]] = body[CONTACT_KEYS[i]];
    }
    return out;
  }

  // Per booking id: { token, sent }. Apart from the booking on purpose, because
  // that object is handed to listeners and a copy of it to the page.
  var bookingContacts = {};

  function rememberContact(data, body) {
    if (!data) return;
    var token = data.contact_token ? String(data.contact_token) : null;
    delete data.contact_token;
    bookingContacts[String(data.id)] = { token: token, sent: JSON.stringify(contactOf(body)) };
  }

  /**
   * The address the guest typed last reaches the booking before it is paid, or
   * the confirmation and the link with its token go to the one they corrected.
   * No token means no way of proving this guest made the booking, and paying
   * under the old address in silence is the one thing not to do.
   */
  function sendContact(made, body) {
    var kept = bookingContacts[String(made.id)] || { token: null, sent: '' };
    var now = JSON.stringify(contactOf(body));
    if (kept.sent === now) return Promise.resolve({ ok: true, status: 200, data: made });
    if (!kept.token) return Promise.resolve(refusal('contact_locked', 0));
    return request('POST', '/bookings/' + encodeURIComponent(String(made.id)) + '/contact', {
      body: contactOf(body),
      token: kept.token,
      notFound: 'contact_locked',
      conflict: 'booking_not_payable'
    }).then(function (res) {
      if (!res.ok) return res;
      kept.sent = now;
      return { ok: true, status: res.status, data: made };
    });
  }

  // 24 h is what the backend promises for a key; past that a new one is safer.
  var ATTEMPT_MS = 24 * 3600 * 1000;

  function uuid() {
    var b = new Array(16);
    var c = typeof crypto !== 'undefined' ? crypto : null;
    if (c && typeof c.getRandomValues === 'function') {
      b = c.getRandomValues(new Uint8Array(16));
    } else {
      for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    }
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    var hex = '';
    for (var j = 0; j < 16; j++) {
      hex += (b[j] < 16 ? '0' : '') + b[j].toString(16);
      if (j === 3 || j === 5 || j === 7 || j === 9) hex += '-';
    }
    return hex;
  }

  // The key belongs to the exact body: a retry of the same request repeats it,
  // and any changed field is a new request with a new key.
  function attemptKey(form, product, body) {
    var said = productId(product) + '|' + JSON.stringify(body);
    var kept = form._d2BookingAttempt;
    if (!kept || kept.said !== said || Date.now() - kept.at > ATTEMPT_MS) {
      kept = { said: said, key: uuid(), at: Date.now() };
      form._d2BookingAttempt = kept;
    }
    return kept.key;
  }

  function requestKey(product, body) {
    var of = {};
    for (var i = 0; i < HOLD_KEYS.length; i++) {
      if (body.hasOwnProperty(HOLD_KEYS[i])) of[HOLD_KEYS[i]] = body[HOLD_KEYS[i]];
    }
    return productId(product) + '|' + JSON.stringify(of);
  }

  /**
   * Validate, create the booking and (when the submit asked for it) open the
   * payment. Never rejects: a refusal is a value.
   */
  function run(form, stay, withPayment) {
    if (!form) return Promise.resolve(refusal('request_refused', 0));
    var state = form.getAttribute('d2-booking-payment');
    if (state === 'done' || state === 'opening' || state === 'wait') {
      // Trying again cannot change the answer this form already has.
      return Promise.resolve(form._d2BookingLast || refusal('request_refused', 0));
    }
    // The same submit twice is one booking: the second caller is handed the
    // answer of the attempt already running.
    if (form._d2BookingFlight) return form._d2BookingFlight;
    // A new attempt starts clean: the state of the last one would leave CSS
    // keyed on "retry" saying "try again" over a refusal about the dates.
    form.removeAttribute('d2-booking-payment');
    lock(form, true);

    var flight = config().then(function (cfg) {
      var errors = validate(form, cfg);
      if (errors.length) {
        lock(form, false);
        var invalid = refusal('form_invalid', 0);
        showMessage(form, 'form', invalid.message);
        return invalid;
      }
      if (!stay || !stay.product || !stay.starts_at) {
        lock(form, false);
        var missing = refusal('stay_required', 0);
        showMessage(form, 'form', missing.message);
        return missing;
      }
      // The reference may be a slug and the bookings route takes an id, so
      // the product is resolved (once per visit) before anything is sent.
      return product(stay.product).then(function () {
        return send(form, stay, cfg, state, withPayment);
      });
    }, function () {
      lock(form, false);
      return refusal('bad_response', 0);
    });

    form._d2BookingFlight = flight;
    function done() { form._d2BookingFlight = null; }
    flight.then(done, done);
    return flight;
  }

  /**
   * The request itself, once the config and the product are known. Split out
   * of run() so the two awaits above read as the preparation they are.
   */
  function send(form, stay, cfg, state, withPayment) {
    var body = values(form, cfg);
    body.unit = stay.unit || 'day';
    body.starts_at = stay.starts_at;
    body.units_count = stay.units_count || 1;

    var key = requestKey(stay.product, body);
    // `final` belongs to the request that earned it, not to the whole form:
    // the same stay and the same party cannot be tried again, while another
    // period is a booking the guest is still entitled to make. A hold that
    // expired is exactly when they reach for one.
    if (state === 'final' && form._d2BookingClosedKey === key) {
      var closed = form._d2BookingLast || refusal('request_refused', 0);
      form.setAttribute('d2-booking-payment', 'final');
      showMessage(form, 'form', closed.message, !!NOT_THE_GUEST[closed.reason]);
      return closed;
    }
    var running = keptFor(flights, key);
    // The same request from another form (or from the page's own code): it
    // joins that attempt and is let go of when the attempt settles — the
    // form that did not send it must not stay disabled for good.
    if (running) {
      return running.then(function (res) {
        lock(form, false);
        return res;
      });
    }

    var made = keptFor(madeBookings, key);
    var step = made
      ? sendContact(made, body)
      : request('POST', '/products/' + encodeURIComponent(productId(stay.product)) + '/bookings', {
        body: body,
        notFound: 'product_not_found',
        idempotencyKey: attemptKey(form, stay.product, body)
      });

    var chain = step.then(function (res) {
      // A contact refused for good says what a refused payment says.
      if (!res.ok && made && PAYMENT_FINAL[res.reason]) {
        paymentRefused(form, res, key);
        return res;
      }
      if (!res.ok) {
        if (res.reason === 'idempotency_key_reused') form._d2BookingAttempt = null;
        applyRefusal(form, res, cfg);
        _emit('booking:refused', { reason: res.reason, status: res.status, form: form });
        // The limit said how long, so the button waits exactly that long
        // instead of inviting the click that earns the next 429.
        if (res.reason === 'too_many_requests' && res.retryAfter > 0) {
          waitOut(form, res);
          return res;
        }
        lock(form, false);
        return res;
      }
      // A retry can recover a booking whose hold ran out while we were away.
      // That one is over: the next submit is a new request under a new key.
      if (!made && res.data && res.data.status === 'expired') {
        form._d2BookingAttempt = null;
        var expired = refusal('hold_expired', res.status);
        showMessage(form, 'form', expired.message);
        announce(expired.message);
        _emit('booking:refused', { reason: expired.reason, status: expired.status, form: form });
        lock(form, false);
        return expired;
      }
      if (!made) {
        rememberContact(res.data, body);
        keep(madeBookings, key, res.data);
        _log('booking created', { id: res.data && res.data.id });
        // A copy, like every other emit: a listener that reshapes the
        // payload must not change which booking the next step pays.
        _emit('booking:created', { booking: copy(res.data), form: form });
      }
      if (!withPayment) {
        lock(form, false);
        return res;
      }
      return payFor(form, res.data, res, key);
    });
    keep(flights, key, chain);
    return chain.then(function (res) {
      drop(flights, key);
      return res;
    }, function (e) {
      drop(flights, key);
      throw e;
    });
  }

  function book(form, stay) {
    return run(form, stay, false);
  }

  function checkout(form, stay) {
    return run(form, stay, true);
  }

  // ---------------------------------------------------------------------------
  // Slots the two guest blocks write into
  // ---------------------------------------------------------------------------

  /**
   * The one slot of a block, filled with what the answer says.
   *
   * A slot the page built is used where it stands and always written to: with
   * nothing to say it is emptied and marked d2-booking-empty, so the
   * Designer's layout keeps its place and their CSS can hide the row. A slot
   * of ours is only drawn when there is something to put in it — an empty row
   * we invented ourselves is a hole in the page, not a layout.
   */
  function blockSlot(host, name, text, good) {
    var el = firstIn(host, name);
    if (!el) {
      if (!text) return null;
      el = create('div', { 'd2-booking-built': '' });
      el.setAttribute(name, '');
      if (name.indexOf('-message') > 0) {
        // The sentence arrives after a fetch, so a screen reader has to be
        // told; it is news, not a label.
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
      }
      host.appendChild(el);
    }
    el.textContent = text || '';
    if (text) el.removeAttribute('d2-booking-empty');
    else el.setAttribute('d2-booking-empty', '');
    if (text && good) el.setAttribute('d2-booking-ok', '');
    else el.removeAttribute('d2-booking-ok');
    return el;
  }

  /**
   * A link of a block: filled in where the page put it, drawn at the end when
   * the page has none — and removed when there is nowhere to go. A link whose
   * address the answer did not carry would read as a way out and lead nowhere,
   * which is worse than no link at all.
   */
  function blockLink(host, name, url, label) {
    var el = firstIn(host, name);
    var good = payableUrl(url) ? String(url) : '';
    if (!good) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return null;
    }
    if (!el) {
      el = create('a', { 'd2-booking-built': '' });
      el.setAttribute(name, '');
      host.appendChild(el);
    }
    el.setAttribute('href', good);
    if (!String(el.textContent || '').trim()) el.textContent = label;
    return el;
  }

  // ---------------------------------------------------------------------------
  // The return page — what became of the booking the guest just paid for
  // ---------------------------------------------------------------------------

  /**
   * Stripe sends the guest back the moment the card went through, and the
   * booking only changes when the webhook lands — usually within a second,
   * sometimes not. So the page asks again, each time after a longer wait, and
   * then stops: eight tries over about forty seconds. A guest is never left
   * watching a spinner, and a backend having a bad minute is never asked ten
   * times a second.
   */
  var RETURN_DELAYS = [1000, 2000, 3000, 5000, 8000, 8000, 8000, 8000];
  // A Retry-After can run to most of an hour, and this page has a guest on it.
  var RETURN_MAX_WAIT_MS = 30000;
  // States that end well, so the sentence is not painted as a refusal.
  var RETURN_GOOD = { confirmed: 1, paid: 1, balance_paid: 1, pending: 1 };

  var lastReturn = null;

  /**
   * What a status answer means for the guest. `payment` is what the return
   * address carried: Stripe comes back with payment=cancelled when the guest
   * closed the payment, and then no webhook is on its way.
   *
   * Only the two cases the contract makes unambiguous are ever called expired
   * — the status saying so, and awaiting_payment with the hold closed. A
   * status this module does not know is never guessed into a verdict: it keeps
   * asking, and then says the payment is still being checked.
   */
  function readStatus(data, payment) {
    var state = String(data.status || '');
    var paid = data.paid === true;
    var hold = data.hold_open;
    var left = Number(data.balance_due_minor);
    var owes = isFinite(left) && left > 0;

    if (state === 'rejected') {
      return { state: 'rejected', text: MESSAGES.return_rejected, done: true, again: true };
    }
    if (state === 'cancelled') {
      return { state: 'cancelled', text: MESSAGES.return_cancelled, done: true, again: true };
    }
    if (state === 'expired') {
      return { state: 'expired', text: MESSAGES.return_expired, done: true, again: true };
    }
    if (payment === 'balance_cancelled') {
      return { state: 'cancelled', text: MESSAGES.return_balance_cancelled, done: true };
    }
    if (payment === 'balance_success') {
      // The balance is paid when it is gone from the answer, not when Stripe
      // said so: the webhook is what moves it in our books.
      if (owes) return { state: 'checking', text: MESSAGES.return_checking, done: false };
      return { state: 'balance_paid', text: MESSAGES.return_balance_paid, done: true };
    }
    if (state === 'confirmed') {
      return { state: 'confirmed', text: MESSAGES.return_confirmed, done: true };
    }
    if (paid || state === 'paid') {
      return { state: 'paid', text: MESSAGES.return_paid, done: true };
    }
    if (state === 'awaiting_payment' && hold === false) {
      // Nothing was paid and the hold is gone, so the period is back in the
      // offer. Saying "still being checked" here would keep a guest waiting
      // while the dates they wanted are taken by somebody else.
      return { state: 'expired', text: MESSAGES.return_expired, done: true, again: true };
    }
    if (state === 'pending') {
      // payment_mode tells a prepaid booking from an on-request one, and
      // `pending` is the state the second one sits in: the booking is in and
      // the owner decides. Nothing is being checked, so nothing is polled —
      // saying "the payment is still being checked" about a booking with no
      // payment would keep the guest watching a spinner for forty seconds.
      return { state: 'pending', text: MESSAGES.return_pending, done: true };
    }
    if (payment === 'cancelled') {
      return {
        state: 'cancelled',
        text: hold === false ? MESSAGES.return_cancelled : MESSAGES.return_cancelled_hold,
        done: true,
        again: hold === false
      };
    }
    return { state: 'checking', text: MESSAGES.return_checking, done: false };
  }

  function returnBalance(data, cfg) {
    var left = data ? Number(data.balance_due_minor) : 0;
    if (!isFinite(left) || left <= 0) return '';
    var language = pageLanguage(cfg);
    var amount = moneyMinor(left, data.currency ? String(data.currency) : null, language);
    if (!amount) return '';
    // /status carries no timezone, so the day is read on the visitor's clock.
    var due = data.balance_due_at ? instantText(data.balance_due_at, null, language) : '';
    return (due ? fill(MESSAGES.return_balance, { amount: amount, date: due }) : null) || amount;
  }

  function returnSay(host, state, text, siteUrl, data, cfg) {
    host.setAttribute('d2-booking-return-state', state);
    blockSlot(host, 'd2-booking-return-message', text, !!RETURN_GOOD[state]);
    blockSlot(host, 'd2-booking-return-balance', returnBalance(data, cfg));
    blockLink(host, 'd2-booking-return-new', siteUrl, MESSAGES.return_new_period);
  }

  function pollStatus(host, id, payment, cfg, tries) {
    return request('GET', '/bookings/' + encodeURIComponent(id) + '/status', {
      notFound: 'booking_not_found'
    }).then(function (res) {
      // A dead network, a 429 or a 5xx says nothing about the payment, and this
      // guest may have just been charged: a failure sentence now would send
      // them back to pay again. The loop exists to ride this out; only an
      // answer about the booking itself, or the last try, ends it.
      var blip = !res.ok && (res.status === 0 || res.status === 429 || res.status >= 500);
      if (blip && tries + 1 < RETURN_DELAYS.length) {
        setTimeout(function () { pollStatus(host, id, payment, cfg, tries + 1); },
          Math.min(RETURN_MAX_WAIT_MS, Math.max(RETURN_DELAYS[tries], (res.retryAfter || 0) * 1000)));
        return res;
      }
      // Out of tries on a blip, with the payment already being checked: that
      // sentence is still the truth, and the e-mail follows the confirmation.
      if (blip && lastReturn && lastReturn.state === 'checking') return res;
      if (!res.ok) {
        returnSay(host, 'error', res.message, null, null, cfg);
        lastReturn = { state: 'error', status: null };
        _emit('booking:refused', { reason: res.reason, status: res.status, form: null });
        return res;
      }
      var data = res.data && typeof res.data === 'object' ? res.data : {};
      var said = readStatus(data, payment);
      // The way to a new period is only offered where picking one is the next
      // step; site_url null means the key has no page to send the guest to.
      returnSay(host, said.state, said.text, said.again ? data.site_url : null, data, cfg);
      lastReturn = { state: said.state, status: copy(data) };
      _log('return', { state: said.state });
      _emit('booking:return', { booking_id: id, state: said.state, status: copy(data) });
      if (said.done) return res;
      if (tries + 1 >= RETURN_DELAYS.length) {
        // Out of tries: the sentence already says the payment is still being
        // checked, and the e-mail goes out once the booking is confirmed.
        return res;
      }
      setTimeout(function () { pollStatus(host, id, payment, cfg, tries + 1); }, RETURN_DELAYS[tries]);
      return res;
    });
  }

  function setupReturn(host, cfg) {
    host.setAttribute('d2-booking-return-ready', '');
    var id = bookingIdOf(host, 'd2-booking-return');
    if (!id) {
      // Asking about an empty id would fetch /bookings//status and get a 404,
      // which reads to the guest like a booking that was lost.
      returnSay(host, 'unknown', MESSAGES.return_unknown, null, null, cfg);
      return Promise.resolve(null);
    }
    returnSay(host, 'loading', MESSAGES.return_loading, null, null, cfg);
    return pollStatus(host, id, queryParam('payment'), cfg, 0);
  }

  function applyReturns(cfg) {
    var hosts = allOf('d2-booking-return');
    var waiting = [];
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i].getAttribute('d2-booking-return-ready') !== null) continue;
      injectWidgetStyles();
      waiting.push(setupReturn(hosts[i], cfg));
    }
    return Promise.all(waiting);
  }

  // ---------------------------------------------------------------------------
  // The manage page — the booking, through the token from the e-mail
  // ---------------------------------------------------------------------------

  // The rows the module draws when the page left it to us, in this order. A
  // page that wants them apart can name any key of manageValues in
  // d2-booking-manage-field.
  var MANAGE_ROWS = [
    { name: 'product_name', label: MESSAGES.manage_label_product },
    { name: 'dates', label: MESSAGES.manage_label_dates },
    { name: 'status', label: MESSAGES.manage_label_status },
    { name: 'paid', label: MESSAGES.manage_label_paid },
    { name: 'refunded', label: MESSAGES.manage_label_refunded },
    { name: 'balance', label: MESSAGES.manage_label_balance },
    { name: 'emergency_phone', label: MESSAGES.manage_label_phone }
  ];
  /**
   * What the guest may ask for, and what has to be true for it.
   *
   * `purpose` is the link the token came with: a manage link may ask for a
   * refund or a date change, a balance link may pay the balance, and neither
   * may do the other's job (KONTRAKT.md). Offering the wrong one would be
   * refused as a booking that does not exist, which reads like a lost booking.
   */
  var MANAGE_ACTIONS = [
    { kind: 'balance', allow: 'balance_payable', purpose: 'balance', label: MESSAGES.manage_pay_balance },
    { kind: 'refund', allow: 'refund_available', purpose: 'manage', label: MESSAGES.manage_refund },
    { kind: 'date_change', allow: 'date_change_available', purpose: 'manage', label: MESSAGES.manage_change_date }
  ];
  // What a date-change request needs, and the note either request may carry.
  var MANAGE_INPUTS = [
    { name: 'requested_starts_at', kind: 'date_change', type: 'date', label: MESSAGES.manage_label_new_date },
    { name: 'requested_units_count', kind: 'date_change', type: 'number', label: MESSAGES.manage_label_nights },
    { name: 'customer_note', kind: 'any', type: 'textarea', label: MESSAGES.manage_label_note }
  ];

  var lastManage = null;

  function oneIn(host, name, value) {
    if (!host) return null;
    try {
      return host.querySelector('[' + name + '="' + value + '"], [data-' + name + '="' + value + '"]');
    } catch (e) {
      return null;
    }
  }

  function manageInput(host, name) {
    var el = oneIn(host, 'd2-booking-manage-input', name);
    return el ? String(el.value == null ? '' : el.value).trim() : '';
  }

  function manageActionEl(host, kind) {
    return oneIn(host, 'd2-booking-manage-action', kind);
  }

  function dropEl(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /**
   * Every value the manage answer has for the guest, already in words. The
   * amounts are the answer's minor units through Intl, the days are civil
   * dates in the rental's own timezone, and a field the answer left null is an
   * empty string — never a 0,00 nobody owes.
   */
  function manageValues(data, cfg) {
    var language = pageLanguage(cfg);
    var currency = data.currency ? String(data.currency) : null;
    var zone = data.timezone ? String(data.timezone) : null;
    var from = data.starts_at ? instantText(data.starts_at, zone, language) : '';
    var to = data.ends_at ? instantText(data.ends_at, zone, language) : '';
    var left = Number(data.amount_outstanding_minor);
    var owed = isFinite(left) && left > 0 ? moneyMinor(left, currency, language) : '';
    var back = Number(data.amount_refunded_minor);
    var due = data.balance_due_at ? instantText(data.balance_due_at, zone, language) : '';
    return {
      booking_id: data.booking_id ? String(data.booking_id) : '',
      product_name: data.product_name ? String(data.product_name) : '',
      dates: from && to ? from + ' – ' + to : (from || to || ''),
      starts_at: from,
      ends_at: to,
      status: STATUS_LABELS[String(data.status)] || '',
      paid: moneyMinor(data.amount_paid_minor, currency, language),
      outstanding: owed,
      refunded: isFinite(back) && back > 0 ? moneyMinor(back, currency, language) : '',
      balance: owed && due ? (fill(MESSAGES.manage_balance, { amount: owed, date: due }) || owed) : owed,
      balance_due_at: due,
      emergency_phone: data.emergency_phone ? String(data.emergency_phone) : ''
    };
  }

  /**
   * The booking on the page. A slot the Designer built is filled where it
   * stands (and emptied when the answer has nothing for it); a row of ours is
   * drawn only for what the answer does carry.
   */
  function fillManage(host, values) {
    var name;
    for (name in values) {
      if (!values.hasOwnProperty(name)) continue;
      var own = oneIn(host, 'd2-booking-manage-field', name);
      if (!own) continue;
      own.textContent = values[name];
      if (values[name]) own.removeAttribute('d2-booking-empty');
      else own.setAttribute('d2-booking-empty', '');
    }
    for (var i = 0; i < MANAGE_ROWS.length; i++) {
      var row = MANAGE_ROWS[i];
      if (!values[row.name] || oneIn(host, 'd2-booking-manage-field', row.name)) continue;
      var line = create('div', { 'd2-booking-manage-row': '', 'd2-booking-built': '' });
      line.appendChild(textEl('span', row.label));
      var slot = textEl('span', values[row.name], {
        'd2-booking-manage-field': row.name, 'd2-booking-built': ''
      });
      line.appendChild(slot);
      host.appendChild(line);
    }
    // A phone number is for calling: where the slot is a link, it gets one.
    var phone = oneIn(host, 'd2-booking-manage-field', 'emergency_phone');
    if (phone && phone.tagName === 'A' && values.emergency_phone) {
      phone.setAttribute('href', 'tel:' + values.emergency_phone.replace(/[^\d+]/g, ''));
    }
  }

  // The row the Designer built, remembered before the list is emptied for the
  // first time — so the guest's requests keep the styling of the site.
  function requestTemplate(box) {
    if (box._d2BookingRequest === undefined) {
      var found = firstIn(box, 'd2-booking-manage-request');
      box._d2BookingRequest = found && found.cloneNode ? found.cloneNode(true) : null;
    }
    return box._d2BookingRequest;
  }

  function buildRequestRow() {
    var row = create('div', { 'd2-booking-manage-request': '', 'd2-booking-built': '' });
    row.appendChild(create('span', { 'd2-booking-manage-request-kind': '' }));
    // Only the row we draw ourselves gets the separators; a template the
    // Designer built says it their way.
    row.appendChild(textEl('span', '·'));
    row.appendChild(create('span', { 'd2-booking-manage-request-status': '' }));
    row.appendChild(textEl('span', '·'));
    row.appendChild(create('span', { 'd2-booking-manage-request-date': '' }));
    row.appendChild(create('span', { 'd2-booking-manage-request-note': '' }));
    return row;
  }

  function requestRow(box, item, zone, language) {
    var tmpl = requestTemplate(box);
    var row = tmpl && tmpl.cloneNode ? tmpl.cloneNode(true) : buildRequestRow();
    var kind = String(item.kind || '');
    var state = String(item.status || '');
    row.setAttribute('d2-booking-manage-request-kind-name', kind);
    row.setAttribute('d2-booking-manage-request-state', state);
    fillSlot(row, 'd2-booking-manage-request-kind', REQUEST_KINDS[kind] || kind);
    fillSlot(row, 'd2-booking-manage-request-status', REQUEST_STATES[state] || state);
    fillSlot(row, 'd2-booking-manage-request-date',
      item.created_at ? instantText(item.created_at, zone, language) : '');
    // The owner's answer, passed on word for word: it is the only thing the
    // guest is ever told about a decision (contract: no e-mail goes out).
    fillSlot(row, 'd2-booking-manage-request-note',
      item.resolution_note ? String(item.resolution_note) : '');
    return row;
  }

  function requestsBox(host, make) {
    var box = firstIn(host, 'd2-booking-manage-requests');
    if (box || !make) return box;
    box = create('div', { 'd2-booking-manage-requests': '', 'd2-booking-built': '' });
    host.appendChild(box);
    return box;
  }

  function renderRequests(host, list, zone, cfg) {
    var box = requestsBox(host, list.length > 0);
    if (!box) return;
    var language = pageLanguage(cfg);
    requestTemplate(box);
    clearEl(box);
    for (var i = 0; i < list.length; i++) {
      box.appendChild(requestRow(box, list[i] || {}, zone, language));
    }
  }

  function lockManage(host, on) {
    var buttons = host.querySelectorAll('[d2-booking-manage-action], [data-d2-booking-manage-action]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = !!on;
      if (on) buttons[i].setAttribute('disabled', '');
      else buttons[i].removeAttribute('disabled');
    }
    if (on) host.setAttribute('aria-busy', 'true');
    else host.removeAttribute('aria-busy');
  }

  function manageSay(host, text, good) {
    blockSlot(host, 'd2-booking-manage-message', text, good);
  }

  /**
   * The balance, paid with the balance token from the e-mail. The route takes
   * no body: what is owed and where Stripe comes back to are the backend's
   * business, and the token says which booking it is.
   */
  function payBalance(host, id, token, cfg) {
    lockManage(host, true);
    return request('POST', '/bookings/' + encodeURIComponent(id) + '/balance-checkout', {
      token: token,
      notFound: 'booking_not_found',
      conflict: 'no_balance',
      // One of the two payment routes, so this is the one place besides the
      // first payment where a 502 means the provider and not the gateway.
      badGateway: 'payment_provider_unavailable'
    }).then(function (res) {
      if (!res.ok) {
        lockManage(host, false);
        manageSay(host, res.message);
        _emit('booking:refused', { reason: res.reason, status: res.status, form: null });
        if (PAYMENT_FINAL[res.reason] || BALANCE_FINAL[res.reason]) {
          // The same reasons the first payment calls final, plus the two that
          // say there is nothing left to pay. The button goes with them: a
          // guest clicking a refusal nobody can mend only spends the key's
          // rate limit until the 429.
          dropEl(manageActionEl(host, 'balance'));
        } else if (res.reason === 'too_many_requests' && res.retryAfter > 0) {
          // The limit said how long, so the button waits exactly that long.
          lockManage(host, true);
          setTimeout(function () { lockManage(host, false); }, res.retryAfter * 1000);
        }
        return res;
      }
      var url = res.data ? res.data.checkout_url : null;
      if (!payableUrl(url)) {
        lockManage(host, false);
        if (url) {
          _warn('the checkout_url of the balance is not an https address, so the guest stays'
            + ' on the page: ' + url);
        }
        var stuck = refusal('checkout_url_missing', res.status);
        manageSay(host, stuck.message);
        return stuck;
      }
      manageSay(host, MESSAGES.payment_opening, true);
      _log('balance checkout opened', { booking: id });
      _emit('booking:payment', {
        booking_id: id, url: url, session: copy(res.data), form: null, balance: true
      });
      goTo(url);
      return res;
    });
  }

  /**
   * A request for the owner. A 201 means "saved": the booking does not change,
   * no money moves and the owner decides in the panel. One waiting request
   * closes its own kind, so the button goes with it — a second one would only
   * earn a 409.
   */
  function sendRequest(host, id, token, kind, zone, cfg) {
    var body = { kind: kind };
    if (kind === 'date_change') {
      var when = naiveStamp(manageInput(host, 'requested_starts_at'));
      if (!when) {
        manageSay(host, MESSAGES.manage_date_required);
        return Promise.resolve(refusal('invalid_request', 0));
      }
      body.requested_starts_at = when;
      var nights = intOf(manageInput(host, 'requested_units_count'));
      if (nights !== null && nights > 0) body.requested_units_count = nights;
    }
    var note = manageInput(host, 'customer_note');
    if (note) body.customer_note = note;

    lockManage(host, true);
    return request('POST', '/bookings/' + encodeURIComponent(id) + '/requests', {
      body: body,
      token: token,
      notFound: 'booking_not_found',
      conflict: 'request_not_allowed'
    }).then(function (res) {
      lockManage(host, false);
      if (!res.ok) {
        manageSay(host, res.message);
        // A 409 is either a booking that is closed or a request of this kind
        // already waiting (errors.json has both shapes with a plain sentence,
        // so the module cannot tell them apart and must not try). Either way
        // this kind is closed, so the button goes.
        if (res.status === 409) dropEl(manageActionEl(host, kind));
        _emit('booking:refused', { reason: res.reason, status: res.status, form: null });
        return res;
      }
      manageSay(host, MESSAGES.manage_request_sent, true);
      dropEl(manageActionEl(host, kind));
      var made = res.data && typeof res.data === 'object' ? res.data : { kind: kind, status: 'pending' };
      var box = requestsBox(host, true);
      if (box) box.appendChild(requestRow(box, made, zone, pageLanguage(cfg)));
      _log('request sent', { kind: kind });
      _emit('booking:request', { booking_id: id, request: copy(made) });
      return res;
    });
  }

  // The inputs a request needs: drawn only for a request this link may make,
  // and only where the page has none of its own.
  function drawManageInputs(host, allowed) {
    for (var i = 0; i < MANAGE_INPUTS.length; i++) {
      var want = MANAGE_INPUTS[i];
      var wanted = want.kind === 'any'
        ? (allowed.refund || allowed.date_change)
        : allowed[want.kind];
      if (!wanted || oneIn(host, 'd2-booking-manage-input', want.name)) continue;
      fieldSeq += 1;
      var id = 'd2-booking-manage-' + want.name + '-' + fieldSeq;
      var group = create('div', { 'd2-booking-field-group': '', 'd2-booking-built': '' });
      group.appendChild(textEl('label', want.label, { 'for': id }));
      var input = create(want.type === 'textarea' ? 'textarea' : 'input', {
        'd2-booking-manage-input': want.name, 'd2-booking-built': '', id: id
      });
      if (want.type === 'textarea') input.setAttribute('rows', '3');
      else input.setAttribute('type', want.type);
      if (want.type === 'number') {
        input.setAttribute('min', '1');
        input.setAttribute('step', '1');
        input.setAttribute('inputmode', 'numeric');
      }
      group.appendChild(input);
      host.appendChild(group);
    }
  }

  function applyManageActions(host, allowed, id, token, zone, cfg) {
    for (var i = 0; i < MANAGE_ACTIONS.length; i++) {
      var act = MANAGE_ACTIONS[i];
      var el = manageActionEl(host, act.kind);
      if (!allowed[act.kind]) {
        // Not allowed is not greyed out: a button the backend would refuse is
        // taken off the page, the Designer's own one included.
        dropEl(el);
        continue;
      }
      if (!el) {
        el = textEl('button', act.label, {
          type: 'button', 'd2-booking-manage-action': act.kind, 'd2-booking-built': ''
        });
        host.appendChild(el);
      }
      if (el.getAttribute('d2-booking-bound') !== null) continue;
      el.setAttribute('d2-booking-bound', '');
      bindManageAction(host, el, act.kind, id, token, zone, cfg);
    }
  }

  function bindManageAction(host, el, kind, id, token, zone, cfg) {
    el.addEventListener('click', function (e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (kind === 'balance') payBalance(host, id, token, cfg);
      else sendRequest(host, id, token, kind, zone, cfg);
    });
  }

  function accountLink(host, cfg) {
    return blockLink(host, 'd2-booking-manage-account', cfg.account_url, MESSAGES.manage_account);
  }

  /**
   * One sentence and no data. Every refusal of a token is the same
   * booking_not_found — missing, wrong, expired, for another purpose, from
   * another booking or outside the key (KONTRAKT.md) — so naming a cause would
   * be a guess, and a guess here is an oracle for whoever is trying tokens.
   */
  function manageInvalid(host, cfg, state, text) {
    host.setAttribute('d2-booking-manage-state', state || 'invalid');
    host.removeAttribute('d2-booking-manage-status');
    var i;
    var slots = host.querySelectorAll('[d2-booking-manage-field], [data-d2-booking-manage-field]');
    for (i = 0; i < slots.length; i++) {
      slots[i].textContent = '';
      slots[i].setAttribute('d2-booking-empty', '');
      slots[i].removeAttribute('href');
    }
    var rows = host.querySelectorAll('[d2-booking-manage-row], [data-d2-booking-manage-row]');
    for (i = 0; i < rows.length; i++) dropEl(rows[i]);
    var buttons = host.querySelectorAll('[d2-booking-manage-action], [data-d2-booking-manage-action]');
    for (i = 0; i < buttons.length; i++) dropEl(buttons[i]);
    var box = requestsBox(host, false);
    if (box) clearEl(box);
    manageSay(host, text || MESSAGES.booking_not_found);
    accountLink(host, cfg);
  }

  function renderManage(host, data, cfg, purpose, id, token) {
    var zone = data.timezone ? String(data.timezone) : null;
    host.setAttribute('d2-booking-manage-state', 'ready');
    if (data.status) host.setAttribute('d2-booking-manage-status', String(data.status));
    fillManage(host, manageValues(data, cfg));
    renderRequests(host, isArray(data.requests) ? data.requests : [], zone, cfg);

    var allowed = {};
    for (var i = 0; i < MANAGE_ACTIONS.length; i++) {
      var act = MANAGE_ACTIONS[i];
      allowed[act.kind] = data[act.allow] === true && act.purpose === purpose;
    }
    // A balance this link cannot open is still worth a word: the guest has the
    // mail with the right link, or their account (KONTRAKT.md).
    var hint = data.balance_payable === true && purpose !== 'balance'
      ? MESSAGES.manage_balance_elsewhere
      : '';
    manageSay(host, hint);
    drawManageInputs(host, allowed);
    applyManageActions(host, allowed, id, token, zone, cfg);
    accountLink(host, cfg);
    lastManage = copy(data);
    _log('manage read', { booking: id });
    _emit('booking:manage', { booking_id: id, booking: copy(data) });
  }

  function setupManage(host, cfg) {
    host.setAttribute('d2-booking-manage-ready', '');
    var link = emailLink();
    var id = bookingIdOf(host, 'd2-booking-manage');
    // What the link is for comes from its action, never from the token.
    var purpose = link.action === 'balance' ? 'balance' : 'manage';
    if (!link.token || !id) {
      // Stripe comes back to the manage page with ?payment=… and no token
      // (contract: the balance returns to manage_url without one). That guest
      // did not open a manage link, so this block has nothing to say and says
      // nothing — the return block on the same page is what answers them.
      if (queryParam('payment')) {
        host.setAttribute('d2-booking-manage-state', 'returned');
        return Promise.resolve(null);
      }
      // Without the token the route answers 404 to everyone, which would read
      // as a dead booking instead of a link that is simply missing its token.
      manageInvalid(host, cfg);
      return Promise.resolve(null);
    }
    host.setAttribute('d2-booking-manage-state', 'loading');
    manageSay(host, MESSAGES.manage_loading);
    return request('GET', '/bookings/' + encodeURIComponent(id) + '/manage', {
      token: link.token,
      notFound: 'booking_not_found'
    }).then(function (res) {
      if (res.ok) {
        renderManage(host, res.data && typeof res.data === 'object' ? res.data : {},
          cfg, purpose, id, link.token);
        return res;
      }
      // A flaky connection, a rate limit or a bad minute on the backend is not
      // an invalid link: telling that guest their e-mail is worthless would
      // send them looking for a link that is already in their inbox.
      if (res.reason === 'booking_not_found') manageInvalid(host, cfg);
      else manageInvalid(host, cfg, 'error', res.message);
      _emit('booking:refused', { reason: res.reason, status: res.status, form: null });
      return res;
    });
  }

  function applyManages(cfg) {
    var hosts = allOf('d2-booking-manage');
    var waiting = [];
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i].getAttribute('d2-booking-manage-ready') !== null) continue;
      injectWidgetStyles();
      waiting.push(setupManage(hosts[i], cfg));
    }
    return Promise.all(waiting);
  }

  // ---------------------------------------------------------------------------
  // The list of places — GET /products into the template the page built
  // ---------------------------------------------------------------------------

  /**
   * [d2-booking-results] is a list of places, filled from GET /products. The
   * row the page built — [d2-booking-template] — is remembered and taken off
   * the page before anything shows, then cloned once per entry of the answer,
   * so the list keeps the styling of the site. A template left where it stood
   * would be an empty card above every real one.
   *
   * Nothing out of the answer is ever markup: a value is written with
   * textContent, an address with setAttribute, and a picture only once its
   * address reads as the address of a picture. The names in this list come out
   * of a CMS the module does not own.
   *
   * The rows are appended to the container, so a [d2-booking-more] or a
   * [d2-booking-count] belongs NEXT to the list, not inside it — which is
   * where a Webflow layout leaves a button anyway. One put inside is still
   * filled in and never removed; the rows simply follow it.
   */
  function listBoxes() {
    return allOf('d2-booking-results');
  }

  // Every control of a list: the ones inside it, and otherwise the ones the
  // page put beside it. With two lists on a page each has to carry its own,
  // because a button standing between them belongs to neither.
  function listControls(box, name) {
    var out = [];
    var i;
    var found = box.querySelectorAll('[' + name + '], [data-' + name + ']');
    for (i = 0; i < found.length; i++) out.push(found[i]);
    if (out.length || listBoxes().length !== 1) return out;
    var beside = allOf(name);
    for (i = 0; i < beside.length; i++) out.push(beside[i]);
    return out;
  }

  function listState(box) {
    if (!box._d2BookingList) box._d2BookingList = { offset: 0, more: false, busy: false };
    return box._d2BookingList;
  }

  function listLimit(box) {
    var given = parseInt(String(attr(box, 'd2-booking-results-limit') || ''), 10);
    return isFinite(given) && given > 0 ? given : DEFAULT_LIST_LIMIT;
  }

  // The clone is a row and not a pattern any more — and neither is anything
  // inside it, or every card would carry an empty pattern of its own.
  function dropTemplateMark(el) {
    var all = [el];
    var found = el.querySelectorAll
      ? el.querySelectorAll('[d2-booking-template], [data-d2-booking-template]') : [];
    var i;
    for (i = 0; i < found.length; i++) all.push(found[i]);
    for (i = 0; i < all.length; i++) {
      all[i].removeAttribute('d2-booking-template');
      all[i].removeAttribute('data-d2-booking-template');
    }
  }

  /**
   * The row the Designer built, remembered and taken out of the page the first
   * time the list is read. The clone is a row and not a pattern any more, so it
   * loses the attribute that made it one and gains the one that marks an item.
   *
   * EVERY pattern leaves the page, not only the first: a card built inside a
   * Webflow Collection List is rendered once per CMS item, so the published
   * page carries the attribute on every one of them, and a copy left standing
   * would be a placeholder card above the apartments that no render ever
   * clears (only [d2-booking-item] rows are).
   */
  function collectionItemOf(el, box) {
    for (var at = el.parentNode; at && at !== box; at = at.parentNode) {
      if ((' ' + (at.getAttribute('class') || '') + ' ').indexOf(' w-dyn-item ') >= 0) return at;
    }
    return null;
  }

  function listTemplate(box) {
    if (box._d2BookingRow === undefined) {
      var found = box.querySelectorAll('[d2-booking-template], [data-d2-booking-template]');
      var tmpl = null;
      var i;
      // Inside a Collection List the row is the whole Collection Item, however
      // deep the card sits in it: its classes carry the columns and the layout
      // of the Designer's grid, and it goes back where the items stood.
      var item = found.length ? collectionItemOf(found[0], box) : null;
      var pattern = item || found[0];
      box._d2BookingHost = (pattern && pattern.parentNode) || box;
      if (found.length && pattern.cloneNode) {
        tmpl = pattern.cloneNode(true);
        dropTemplateMark(tmpl);
        tmpl.setAttribute('d2-booking-item', '');
      }
      if (found.length > 1) {
        _warn('the list has ' + found.length + ' elements with d2-booking-template; the first'
          + ' one is the pattern and the rest are taken off the page too — a card built inside'
          + ' a Webflow Collection List carries the attribute on every rendered item');
      }
      for (i = 0; i < found.length; i++) dropEl(collectionItemOf(found[i], box) || found[i]);
      box._d2BookingRow = tmpl;
    }
    return box._d2BookingRow;
  }

  // The row itself may be the slot — a whole card is usually one link — and a
  // querySelectorAll never answers with the element it was asked on.
  function slotsIn(row, name) {
    var out = [];
    if (row.getAttribute(name) !== null || row.getAttribute('data-' + name) !== null) out.push(row);
    var found = row.querySelectorAll('[' + name + '], [data-' + name + ']');
    for (var i = 0; i < found.length; i++) out.push(found[i]);
    return out;
  }

  function writeBind(el, text) {
    el.textContent = text || '';
    if (text) el.removeAttribute('d2-booking-empty');
    else el.setAttribute('d2-booking-empty', '');
  }

  /**
   * One field of one entry, and only a field the answer really carries. A bind
   * naming something off the prototype — a typo, or "constructor" — would
   * otherwise render JavaScript source into the card instead of nothing.
   */
  function entryField(entry, field) {
    if (!entry || !field) return undefined;
    if (!Object.prototype.hasOwnProperty.call(entry, field)) return undefined;
    var value = entry[field];
    return typeof value === 'function' ? undefined : value;
  }

  /**
   * One field of one entry, as the guest reads it. `price` is the entry's own
   * amount in the entry's own currency through Intl — the module never computes
   * a price, here least of all. Everything else is the answer's own scalar: a
   * list of scalars is joined (amenities, and image_urls with it), and a value
   * that is an object (pet_fee, prices) answers nothing, because
   * "[object Object]" is not a sentence.
   */
  function bindValue(entry, field, language) {
    var currency = entry.currency ? String(entry.currency) : null;
    var price = entry.price && typeof entry.price === 'object' ? entry.price : null;
    if (field === 'price') return price ? money(price.price, currency, language) : '';
    if (field === 'price_unit') return price ? (MESSAGES['unit_' + String(price.unit)] || '') : '';
    var value = entryField(entry, field);
    if (value === null || value === undefined || value === '') return '';
    if (isArray(value)) {
      var parts = [];
      for (var i = 0; i < value.length; i++) {
        var one = value[i];
        if (one !== null && one !== undefined && typeof one !== 'object') parts.push(String(one));
      }
      return parts.join(', ');
    }
    if (typeof value === 'object') return '';
    return String(value);
  }

  /**
   * The picture of a place: image_url, and nothing else. On an <img> it is the
   * src and the alt is the name; anywhere else it is the background. An address
   * that does not read as the address of a picture is no picture at all — a src
   * is one click away from running, and a background goes into a style
   * property, where one quote ends the declaration and starts the next.
   */
  function bindImage(el, entry) {
    var url = entry.image_url === null || entry.image_url === undefined ? '' : String(entry.image_url);
    var good = url && IMAGE_URL_RE.test(url) ? url : '';
    if (url && !good) {
      _warn('the picture of "' + String(entry.slug || entry.id || '')
        + '" is not an address we can use: ' + url);
    }
    if (el.tagName === 'IMG') {
      if (good) el.setAttribute('src', good);
      else el.removeAttribute('src');
      // A browser prefers srcset, so the set a Webflow image comes with would
      // show the Designer's placeholder on every card.
      el.removeAttribute('srcset');
      el.removeAttribute('sizes');
      // An unnamed picture gets an empty alt on purpose: a screen reader skips
      // it instead of reading an address out loud.
      el.setAttribute('alt', entry.name ? String(entry.name) : '');
    } else if (el.style) {
      el.style.backgroundImage = good ? 'url("' + good + '")' : '';
    }
    if (good) el.removeAttribute('d2-booking-empty');
    else el.setAttribute('d2-booking-empty', '');
  }

  function bindRow(row, entry, language) {
    var slots = slotsIn(row, 'd2-booking-bind');
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      var field = String(attr(el, 'd2-booking-bind') || '');
      if (field === 'image') { bindImage(el, entry); continue; }
      var value = entryField(entry, field);
      // A flag is not a word: true leaves the slot exactly as the Designer
      // built it ("na zapytanie", icon and all) and false empties it like a
      // missing value. Nobody reads "false" in a list of apartments — and
      // writing the slot's own text back into it would replace the markup
      // inside with one text node, which is what textContent does.
      if (typeof value === 'boolean') {
        if (value) el.removeAttribute('d2-booking-empty');
        else writeBind(el, '');
        continue;
      }
      writeBind(el, bindValue(entry, field, language));
    }
  }

  /**
   * Where a card leads. The default is ?apartament=<slug> — the very query the
   * booking page reads — and a page whose apartments are CMS pages under their
   * own addresses writes the shape it needs, on the link or on the list:
   * /apartamenty/{slug}. {slug} and {id} are the two references the booking
   * page can resolve, and both go out escaped: a slug comes from a CMS this
   * module does not own.
   */
  function placeUrl(pattern, slug, id) {
    var ref = slug || id;
    if (!pattern) return ref ? '?' + LIST_PARAM + '=' + encodeURIComponent(ref) : '';
    if (/\{(slug|id)\}/.test(pattern)) {
      // Each placeholder is the field it names and nothing else: a slug is
      // nullable in the contract, and an id dropped into a {slug} path is a
      // CMS address that cannot exist. A card with no address is better than a
      // card that leads to a 404, so the shape with nothing to put in it is
      // the same answer as an entry with no reference at all.
      var missing = false;
      var out = pattern.replace(/\{(slug|id)\}/g, function (all, name) {
        var value = name === 'id' ? id : slug;
        if (!value) { missing = true; return ''; }
        return encodeURIComponent(value);
      });
      return missing ? '' : out;
    }
    if (!ref) return '';
    // A shape with no placeholder is a page and not a pattern, so the
    // reference goes on as the query the booking page reads: one address can
    // still serve the whole collection.
    return pattern + (pattern.indexOf('?') < 0 ? '?' : '&')
      + LIST_PARAM + '=' + encodeURIComponent(ref);
  }

  function bindLinks(row, entry, box) {
    // Read raw, like every other address the module takes from the page: a
    // query may legally carry ';' and '@'.
    var shape = raw(box, 'd2-booking-results-link');
    var links = slotsIn(row, 'd2-booking-link');
    for (var i = 0; i < links.length; i++) {
      var own = raw(links[i], 'd2-booking-link');
      var url = placeUrl(String(own || shape || ''),
        entry.slug ? String(entry.slug) : '', entry.id ? String(entry.id) : '');
      // An answer with neither a slug nor an id leads nowhere, and a link that
      // leads nowhere is worse than a card that is not one.
      if (url) {
        links[i].setAttribute('href', url);
        links[i].removeAttribute('d2-booking-empty');
      } else {
        links[i].removeAttribute('href');
        links[i].setAttribute('d2-booking-empty', '');
      }
    }
  }

  /**
   * The card the module draws for a page that gave no template: the picture,
   * the name, the city line and the price with its unit, all inside one link —
   * the same stylesheet and the same CSS variables as the rest of the drawn
   * look.
   */
  function buildCard() {
    var row = create('a', {
      'd2-booking-item': '', 'd2-booking-built': '', 'd2-booking-link': ''
    });
    row.appendChild(create('img', { 'd2-booking-bind': 'image', alt: '' }));
    row.appendChild(textEl('strong', '', { 'd2-booking-bind': 'name' }));
    row.appendChild(textEl('span', '', { 'd2-booking-bind': 'city_line' }));
    var price = create('div', {});
    price.appendChild(create('span', { 'd2-booking-bind': 'price' }));
    price.appendChild(create('span', { 'd2-booking-bind': 'price_unit' }));
    row.appendChild(price);
    return row;
  }

  function listRow(box, entry, language) {
    var tmpl = listTemplate(box);
    var row = tmpl && tmpl.cloneNode ? tmpl.cloneNode(true) : buildCard();
    bindRow(row, entry, language);
    bindLinks(row, entry, box);
    return row;
  }

  // Only the rows we rendered go: a page may keep its own button or its empty
  // state inside the list, and emptying the whole container would take them.
  function clearRows(box) {
    var rows = box.querySelectorAll('[d2-booking-item], [data-d2-booking-item]');
    for (var i = 0; i < rows.length; i++) dropEl(rows[i]);
  }

  function renderList(box, list, append, cfg) {
    var language = pageLanguage(cfg);
    listTemplate(box);
    if (!append) clearRows(box);
    var host = box._d2BookingHost || box;
    for (var i = 0; i < list.length; i++) host.appendChild(listRow(box, list[i] || {}, language));
  }

  function writeListCount(box, count) {
    var n = Number(count);
    var els = listControls(box, 'd2-booking-count');
    for (var i = 0; i < els.length; i++) writeBind(els[i], isFinite(n) ? String(n) : '');
  }

  function showListControl(box, name, on) {
    var els = listControls(box, name);
    for (var i = 0; i < els.length; i++) {
      if (on) els[i].removeAttribute('hidden');
      else els[i].setAttribute('hidden', '');
      if (els[i].style) els[i].style.display = on ? '' : 'none';
    }
  }

  function lockMore(box, on) {
    var els = listControls(box, 'd2-booking-more');
    for (var i = 0; i < els.length; i++) {
      els[i].disabled = !!on;
      if (on) els[i].setAttribute('disabled', '');
      else els[i].removeAttribute('disabled');
    }
  }

  // The search asks the same route, so it waits with the list.
  function lockSearch(on) {
    var forms = searchForms();
    for (var i = 0; i < forms.length; i++) {
      var buttons = submitsOf(forms[i]);
      for (var j = 0; j < buttons.length; j++) {
        buttons[j].disabled = !!on;
        if (on) buttons[j].setAttribute('disabled', '');
        else buttons[j].removeAttribute('disabled');
      }
    }
  }

  /**
   * A 429 said how long: the button waits exactly that long, because opening
   * it at once only buys the guest the next refusal. The wait is remembered on
   * the list as well as on the button, so a click that got past a disabled
   * button spends no call either, and only the newest wait may open it again.
   */
  function holdMore(box, state, seconds) {
    var mark = (state.waitMark || 0) + 1;
    state.waiting = true;
    state.waitMark = mark;
    lockMore(box, true);
    lockSearch(true);
    setTimeout(function () {
      if (state.waitMark !== mark) return;
      state.waiting = false;
      lockMore(box, false);
      lockSearch(false);
    }, seconds * 1000);
  }

  /**
   * One page of the list. The first page replaces the rows and every later one
   * is appended, so the guest keeps what they were already reading. A page that
   * was refused leaves the offset where it was: the next click asks for that
   * same page again instead of skipping it, and the sentence is the module's
   * own (the backend's text is for logs, never for a guest).
   */
  function askList(box, cfg) {
    var state = listState(box);
    if (state.busy) return Promise.resolve(null);
    var append = state.offset > 0;
    var filter = listFilter(box);
    // Which question this answer belongs to. A search asked while a page was
    // still in flight makes that page somebody else's answer.
    var seq = state.seq || 0;
    state.busy = true;
    box.setAttribute('d2-booking-busy', '');
    lockMore(box, true);
    if (!append) box.setAttribute('d2-booking-results-state', 'loading');
    return request('GET', '/products', {
      // A 400 on this route is about what the filter asked for (KONTRAKT.md):
      // the period, and the city too once the search named one.
      badRequest: filter.located ? 'invalid_search' : 'invalid_stay',
      query: 'limit=' + listLimit(box) + '&offset=' + state.offset
        + (filter.query ? '&' + filter.query : '')
    }).then(function (res) {
      // The filter changed while this page was on its way: it would show
      // apartments nobody asked about and move the offset past the ones the
      // guest is reading now.
      if ((state.seq || 0) !== seq) return res;
      state.busy = false;
      box.removeAttribute('d2-booking-busy');
      if (!res.ok) {
        box.setAttribute('d2-booking-results-state', 'error');
        // A refusal is not an offer with nothing in it, so whatever an earlier
        // answer put on the page about an empty offer goes.
        showListControl(box, 'd2-booking-results-empty', false);
        blockSlot(box, 'd2-booking-results-message', res.message);
        // A first page refused: the address and the form already name this
        // search, so rows of the last one would be read as its answer. The
        // button is the way to ask again, whatever the last answer said.
        if (!append) {
          clearRows(box);
          writeListCount(box, NaN);
          showListControl(box, 'd2-booking-more', true);
        }
        if (res.reason === 'too_many_requests' && res.retryAfter > 0) {
          holdMore(box, state, res.retryAfter);
        } else {
          lockMore(box, false);
        }
        _emit('booking:list', { reason: res.reason, status: res.status });
        return res;
      }
      state.waiting = false;
      lockMore(box, false);
      var data = res.data && typeof res.data === 'object' ? res.data : {};
      var list = isArray(data.data) ? data.data : [];
      renderList(box, list, append, cfg);
      state.offset += list.length;
      state.more = !!data.has_more;
      blockSlot(box, 'd2-booking-results-message', '');
      writeListCount(box, data.count);
      showListControl(box, 'd2-booking-more', state.more);
      // Nothing found says so; a refusal does not, because a refusal is not an
      // offer with nothing in it.
      showListControl(box, 'd2-booking-results-empty', state.offset === 0);
      box.setAttribute('d2-booking-results-state', state.offset === 0 ? 'empty' : 'ready');
      _emit('booking:list', { count: data.count, shown: state.offset, has_more: state.more });
      _log('list', { shown: state.offset, count: data.count, has_more: state.more });
      return res;
    });
  }

  function nextPage(box) {
    var state = listState(box);
    if (state.busy) return Promise.resolve(null);
    // The rate limit said how long to wait, and a click during the wait earns
    // nothing but the next 429 — the button is down, so this is a click that
    // got past it.
    if (state.waiting) return Promise.resolve(null);
    // An answer that said there is no next page is final; a refusal is not, so
    // a list that could not be read is still one click from another try.
    if (state.offset > 0 && !state.more) return Promise.resolve(null);
    return askList(box, currentConfig());
  }

  function bindMore(box) {
    var els = listControls(box, 'd2-booking-more');
    for (var i = 0; i < els.length; i++) {
      if (els[i].getAttribute('d2-booking-bound') !== null) continue;
      els[i].setAttribute('d2-booking-bound', '');
      els[i].addEventListener('click', function (e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        nextPage(box);
      });
    }
  }

  function applyResults(cfg) {
    var boxes = listBoxes();
    var jobs = [];
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      bindMore(box);
      // A list already read is left alone: an apply() after a DOM change must
      // not spend a second page of the key's rate limit on the same question.
      if (box._d2BookingList) continue;
      // The pattern leaves the page before anything shows, and a list that has
      // none is drawn by the module — stylesheet and all.
      if (!listTemplate(box)) {
        box.setAttribute('d2-booking-results-drawn', '');
        injectWidgetStyles();
      }
      showListControl(box, 'd2-booking-results-empty', false);
      jobs.push(askList(box, cfg));
    }
    return Promise.all(jobs);
  }

  // ---------------------------------------------------------------------------
  // The search above the list — the period, the party and the city
  // ---------------------------------------------------------------------------

  /**
   * <form d2-booking-search> narrows the list. Its fields say which question
   * they are with d2-booking-search-field="check_in|check_out|adults|children
   * |location", and a submit searches without leaving the page: the lists
   * start again from their first page and the address remembers what was
   * asked for, so a reload keeps the search and the link is worth sharing.
   *
   * What goes out is what GET /products takes and nothing else. The party is
   * two questions on the page and one number in the request: guests is the sum
   * of adults and children (KONTRAKT.md), so a request can never contradict
   * itself, and a page that asks about neither sends no guests at all.
   *
   * The period may be typed into two fields or picked in stage 5's calendar
   * standing in the form — the calendar already tells the module what it has,
   * so there is no second one here.
   */
  var searchState = null;

  function searchForms() {
    return allOf('d2-booking-search');
  }

  function searchFieldsOf(form) {
    return form.querySelectorAll('[d2-booking-search-field], [data-d2-booking-search-field]');
  }

  function searchFieldName(el) {
    var n = attr(el, 'd2-booking-search-field');
    return n === null ? '' : String(n).trim().toLowerCase();
  }

  /**
   * The city the page pinned, on the search form or on the list itself. Read
   * raw and never through digi2.attr: a location is free text the route
   * matches, so the responsive syntax would cut a name at its semicolon and
   * send half a city.
   */
  function pinnedLocation(el) {
    var given = raw(el, 'd2-booking-location');
    return given === null || given === undefined ? '' : String(given).trim();
  }

  // The day a field holds, as the filter spells one. A typed time is dropped
  // (the filter asks about days) and text that is not a day at all is no
  // answer: half a typed date must not narrow the list by accident.
  function dayValue(el) {
    var stamp = naiveStamp(readValue(el));
    return stamp ? stamp.slice(0, 10) : '';
  }

  /**
   * The period the calendar in this form picked. It is the same calendar the
   * booking form uses, and it has already said what it has through select(),
   * so the search only reads it. A typed field still wins over it: a value the
   * guest can see on the page is what they think they are searching for.
   */
  function stayPeriod(form) {
    if (!firstIn(form, 'd2-booking-calendar')) return null;
    if (!stayState || !stayState.starts_at || !stayState.units_count) return null;
    var from = dayOfKey(String(stayState.starts_at));
    if (from === null) return null;
    return { check_in: dayKey(from), check_out: dayKey(from + stayState.units_count) };
  }

  // What one search form says, by the name the page gave each field.
  function readSearch(form) {
    var out = { check_in: '', check_out: '', adults: '', children: '', location: '' };
    var els = searchFieldsOf(form);
    var shown = {};
    var i;
    for (i = 0; i < els.length; i++) {
      var name = searchFieldName(els[i]);
      if (!SEARCH_FIELDS[name]) {
        _warn('unknown d2-booking-search-field="' + name + '" — it is not sent; use one of: '
          + Object.keys(SEARCH_FIELDS).join(', '));
        continue;
      }
      var value = name === 'check_in' || name === 'check_out'
        ? dayValue(els[i]) : readValue(els[i]);
      // One question may stand on several elements. In a radio group the
      // checked one answers. A field built twice for two breakpoints answers
      // with the copy the guest can see, so clearing it is an answer, and a
      // hidden copy only speaks when no visible one does.
      if (String(els[i].type || '').toLowerCase() === 'radio') {
        if (value !== '') out[name] = value;
      } else if (els[i].offsetParent !== null) {
        out[name] = value;
        shown[name] = true;
      } else if (!shown[name] && out[name] === '') {
        out[name] = value;
      }
    }
    var picked = stayPeriod(form);
    if (picked) {
      if (!out.check_in) out.check_in = picked.check_in;
      if (!out.check_out) out.check_out = picked.check_out;
    }
    // A pinned city answers for the location field whatever that field holds:
    // the pin is the page's decision and the field is only a control.
    var pin = pinnedLocation(form);
    if (pin) out.location = pin;
    out.pinned = !!pin;
    return out;
  }

  // Which of the five questions this form actually asks. A key it has no field
  // for is a key the page address goes on answering.
  function searchAsked(form) {
    var out = {};
    var els = searchFieldsOf(form);
    for (var i = 0; i < els.length; i++) {
      var name = searchFieldName(els[i]);
      if (SEARCH_FIELDS[name]) out[name] = true;
    }
    return out;
  }

  /**
   * What the guest is searching for, out of the two sources that each know
   * only part of it: the page address and the form. A field the form carries
   * answers for its own key even when it is empty — the guest can see that
   * field, so clearing it is an answer — and so does anything the form knows
   * without a field of its own for it (the calendar's period, a pinned city).
   * Every other key keeps what the address said, so a shared link opens its
   * own result above a form that asks about only half of it, and a reload
   * keeps the search instead of widening it to the whole offer.
   */
  function mergedSearch(form, fromLink) {
    var out = {};
    var i;
    var key;
    for (i = 0; i < SEARCH_PARAMS.length; i++) {
      key = SEARCH_PARAMS[i];
      if (fromLink && fromLink[key] !== undefined) out[key] = String(fromLink[key]);
    }
    if (!form) return out;
    var own = readSearch(form);
    var asked = searchAsked(form);
    for (i = 0; i < SEARCH_PARAMS.length; i++) {
      key = SEARCH_PARAMS[i];
      if (asked[key] || (own[key] !== '' && own[key] !== undefined)) out[key] = own[key];
    }
    out.pinned = !!own.pinned;
    return out;
  }

  /**
   * The search as the route takes it: a period of two days or none, the sum of
   * the party, and a city. Nothing is invented — a field left empty asks
   * nothing, and a filter nobody filled in is the whole offer.
   */
  function normalizeSearch(input) {
    var out = { check_in: '', check_out: '', guests: 0, location: '' };
    if (!input) return out;
    if (DAY_RE.test(String(input.check_in || ''))) out.check_in = String(input.check_in);
    if (DAY_RE.test(String(input.check_out || ''))) out.check_out = String(input.check_out);
    var adults = intOf(String(input.adults === null || input.adults === undefined
      ? '' : input.adults).trim());
    var children = intOf(String(input.children === null || input.children === undefined
      ? '' : input.children).trim());
    if (adults !== null || children !== null) out.guests = (adults || 0) + (children || 0);
    out.location = String(input.location || '').trim();
    return out;
  }

  // Two searches that ask the route the same question.
  function sameSearch(a, b) {
    return a.check_in === b.check_in && a.check_out === b.check_out
      && a.guests === b.guests && a.location === b.location;
  }

  // A list whose FIRST page is in flight: the answer to a search nobody has
  // seen yet. A later page is a different question, so it is not one of these.
  function firstPageInFlight(boxes) {
    for (var i = 0; i < boxes.length; i++) {
      var state = boxes[i]._d2BookingList;
      if (state && state.busy && state.offset === 0) return true;
    }
    return false;
  }

  /**
   * Why this search cannot go out as it stands. Caught here, because the route
   * answers half a period with a 400 whose sentence is for logs ("check_in and
   * check_out go together", errors.json) and the guest reads the one the
   * module already has for a period that is not chosen yet.
   */
  function searchProblem(s) {
    if (!s.check_in !== !s.check_out) return MESSAGES.stay_required;
    if (s.check_in && dayOfKey(s.check_out) <= dayOfKey(s.check_in)) return MESSAGES.invalid_stay;
    return '';
  }

  /**
   * The filter of one list: the search the guest performed, with this list's
   * own pinned city winning for this list. Two lists on a page may well be
   * two cities, and a list may carry a pin with no search form anywhere near
   * it — which is how a city landing page is built.
   */
  function listFilter(box) {
    var s = searchState || normalizeSearch(null);
    var city = pinnedLocation(box) || s.location;
    var parts = [];
    if (s.check_in && s.check_out) {
      parts.push('check_in=' + encodeURIComponent(s.check_in));
      parts.push('check_out=' + encodeURIComponent(s.check_out));
    }
    if (s.guests > 0) parts.push('guests=' + s.guests);
    if (city) parts.push('location=' + encodeURIComponent(city));
    return { query: parts.join('&'), located: !!city };
  }

  /**
   * The search in the page address, so a reload keeps it and the link opens
   * the same result. replaceState and not pushState: narrowing a filter is not
   * walking through pages, and a Back button that steps through every
   * narrowing is a trap on the way off the page. A pinned city is never
   * written — it belongs to the page, not to the guest's search.
   */
  function writeSearchAddress(input) {
    var loc = locationOf();
    if (!loc) return;
    var parts = [];
    var was = String(loc.search || '').replace(/^\?/, '').split('&');
    var i;
    for (i = 0; i < was.length; i++) {
      if (!was[i]) continue;
      var eq = was[i].indexOf('=');
      // Everything else the address carried stays exactly as it was written:
      // the apartment query, a campaign, a language. Only the search is ours.
      if (SEARCH_PARAMS.indexOf(eq < 0 ? was[i] : was[i].slice(0, eq)) < 0) parts.push(was[i]);
    }
    for (i = 0; i < SEARCH_PARAMS.length; i++) {
      var key = SEARCH_PARAMS[i];
      if (key === 'location' && input.pinned) continue;
      var value = input[key] === null || input[key] === undefined ? '' : String(input[key]).trim();
      if (value) parts.push(key + '=' + encodeURIComponent(value));
    }
    var query = parts.join('&');
    try {
      var past = window.history;
      if (past && typeof past.replaceState === 'function') {
        past.replaceState(null, '', (loc.pathname || '') + (query ? '?' + query : '')
          + (loc.hash || ''));
      }
    } catch (e) {}
  }

  // The search a link carries, read before the first page of any list goes
  // out, so a shared address opens its own result and not the whole offer.
  function searchFromAddress() {
    var out = null;
    for (var i = 0; i < SEARCH_PARAMS.length; i++) {
      var got = queryParam(SEARCH_PARAMS[i]);
      if (got === null || String(got).trim() === '') continue;
      if (!out) out = {};
      out[SEARCH_PARAMS[i]] = String(got).trim();
    }
    return out;
  }

  /**
   * A value into a field the guest reads, including the one case a browser
   * refuses: a <select> takes only what one of its own <option>s carries, and
   * anything else leaves it at selectedIndex -1 — blank on screen and empty
   * when read back. A city that came with the link would then be lost twice
   * over: off the screen, and out of the merge, because a field answers for
   * its own key even when it is empty. So the module adds the one option it
   * needs to be able to say what is being shown, and selects it.
   *
   * The options the page wrote are still the choice the guest can make: this
   * one is the search already running, carried in by a link or pinned by the
   * page, and it is marked d2-booking-search-option so the page can tell it
   * apart. A field that takes the value on its own (every input) is untouched.
   */
  function showFieldValue(el, value) {
    var want = value === null || value === undefined ? '' : String(value).trim();
    // A radio's value is what it offers, not what is chosen.
    if (String(el.type || '').toLowerCase() === 'radio') {
      el.checked = !!want && String(el.value).trim() === want;
      return;
    }
    el.value = value;
    if (!want || readValue(el) === want) return;
    if (String(el.tagName || '').toUpperCase() !== 'SELECT') return;
    var option = create('option', { value: want, 'd2-booking-search-option': '' });
    option.textContent = want;
    el.appendChild(option);
    el.value = want;
  }

  // The form shows the search the address carries: a shared link opens with
  // its own dates in the fields, not with an empty form above a filtered list.
  function fillSearchForm(form, input) {
    var els = searchFieldsOf(form);
    var pin = pinnedLocation(form);
    for (var i = 0; i < els.length; i++) {
      var name = searchFieldName(els[i]);
      if (!SEARCH_FIELDS[name] || input[name] === undefined) continue;
      if (name === 'location' && pin) continue;
      showFieldValue(els[i], input[name]);
    }
  }

  /**
   * A pinned city, on the field the page built for choosing one: the value is
   * the pin and the field is disabled. The pilot asked for a page of one city
   * the guest cannot wander off, and a select still offering five cities over
   * a list that only ever shows one is a lie.
   */
  function pinSearch(form) {
    var pin = pinnedLocation(form);
    if (!pin) return;
    var els = searchFieldsOf(form);
    for (var i = 0; i < els.length; i++) {
      if (searchFieldName(els[i]) !== 'location') continue;
      // A select that does not offer the pinned city gets an option for it:
      // the page pinned that city, so a disabled field standing blank over a
      // list of it says less than the city's own name.
      showFieldValue(els[i], pin);
      els[i].disabled = true;
      els[i].setAttribute('disabled', '');
      els[i].setAttribute('d2-booking-pinned', '');
    }
  }

  /**
   * The guest pressed search. The page stays where it is: every list goes back
   * to its first page with the new filter, the address remembers the search,
   * and a search that cannot go out says one sentence where the list's
   * refusals already go.
   */
  function runSearch(form) {
    var input = mergedSearch(form, searchFromAddress());
    var next = normalizeSearch(input);
    var boxes = listBoxes();
    var bad = searchProblem(next);
    var i;
    // The rate limit said how long, and a search is the same route: a click
    // that got past the disabled button spends nothing.
    for (i = 0; i < boxes.length; i++) {
      if (listState(boxes[i]).waiting) return Promise.resolve(null);
    }
    // A bad period out of a link, on a form with no way of mending it: without
    // this the guest is told to pick dates and has nowhere to pick them.
    var asked = searchAsked(form);
    if (bad && !asked.check_in && !asked.check_out && !stayPeriod(form)) {
      delete input.check_in;
      delete input.check_out;
      next = normalizeSearch(input);
      bad = searchProblem(next);
    }
    if (bad) {
      // The filter in force stays in force: the rows on screen and the offset
      // beside them belong to it, and a list paged on a filter the guest never
      // got would mix two result sets in one column — showing the apartments
      // of the overlap twice and skipping the rest.
      for (i = 0; i < boxes.length; i++) {
        boxes[i].setAttribute('d2-booking-results-state', 'error');
        showListControl(boxes[i], 'd2-booking-results-empty', false);
        blockSlot(boxes[i], 'd2-booking-results-message', bad);
      }
      _emit('booking:search', { search: copy(next), message: bad });
      return Promise.resolve(null);
    }
    // The same question, already on its way: a second click on Szukaj must not
    // spend another call of the key's rate limit on an answer that is coming.
    // A page further down the list is another question, and a list standing
    // idle is a retry — both go out.
    if (searchState && sameSearch(searchState, next) && firstPageInFlight(boxes)) {
      return Promise.resolve(null);
    }
    searchState = next;
    writeSearchAddress(input);
    _emit('booking:search', { search: copy(searchState) });
    var jobs = [];
    for (i = 0; i < boxes.length; i++) {
      var state = listState(boxes[i]);
      // A new search is a new first page. The offset goes back to the start
      // and the question changes number, so an answer still on its way is no
      // longer the answer to what is on screen.
      state.offset = 0;
      state.more = false;
      state.busy = false;
      state.seq = (state.seq || 0) + 1;
      jobs.push(askList(boxes[i], currentConfig()));
    }
    return Promise.all(jobs);
  }

  function bindSearch(form) {
    if (form.getAttribute('d2-booking-search-bound') !== null) return;
    form.setAttribute('d2-booking-search-bound', '');
    form.addEventListener('submit', function (e) {
      // The page stays: a search is the same page with another list in it, and
      // a reload would throw away the rows the guest is already reading.
      // Stopped here, for the reason bind() gives: without it a Form Block
      // posts every search to Webflow and then hides itself.
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      runSearch(form);
    });
  }

  /**
   * The search forms and the address, before any list asks for its first page:
   * what the link says is what the list opens with.
   */
  function applySearch() {
    var forms = searchForms();
    var fromLink = searchFromAddress();
    var input = null;
    // An apply() after a DOM change binds what is new and nothing else: the rows
    // on screen belong to the search in force, and what the form says now has
    // not been asked yet.
    var again = searchState !== null;
    for (var i = 0; i < forms.length; i++) {
      bindSearch(forms[i]);
      pinSearch(forms[i]);
      if (again) continue;
      if (fromLink) fillSearchForm(forms[i], fromLink);
      // The lists open with what the first form says, over what the address
      // says about everything that form does not ask about; a second form is
      // bound all the same, so searching in it works.
      if (!input) input = mergedSearch(forms[i], fromLink);
    }
    if (again) return;
    if (!input) input = mergedSearch(null, fromLink);
    // A search form searches the lists of its own page, so a page with no list
    // on it takes the submit and has nothing to answer it with.
    if (forms.length && !listBoxes().length) {
      _warn('a [d2-booking-search] form searches the lists on its own page, and this page has'
        + ' no [d2-booking-results]: the submit is taken and nothing can answer it');
    }
    searchState = normalizeSearch(input);
    // A link carrying half a period opens the whole offer instead of nothing:
    // the sentence belongs to a guest who just pressed search, not to a page
    // that is only opening.
    if (searchProblem(searchState)) {
      searchState.check_in = '';
      searchState.check_out = '';
    }
  }

  // ---------------------------------------------------------------------------
  // Page
  // ---------------------------------------------------------------------------

  function formsOf() {
    try {
      return document.querySelectorAll('[d2-booking-form], [data-d2-booking-form]');
    } catch (e) {
      return [];
    }
  }

  function applyFields(form, cfg) {
    var items = collect(form, cfg);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.state === 'off') { removeField(item.el, form, cfg); continue; }
      if (item.state === 'required') {
        item.el.setAttribute('d2-booking-required', '');
        item.el.setAttribute('aria-required', 'true');
      } else {
        item.el.removeAttribute('d2-booking-required');
        item.el.removeAttribute('aria-required');
      }
    }
    form.setAttribute('d2-booking-ready', '');
  }

  function bind(form) {
    if (form.getAttribute('d2-booking-bound') !== null) return;
    form.setAttribute('d2-booking-bound', '');
    // Stopped here on the way up: Webflow listens for this event on the document
    // and does not care about preventDefault, so a Form Block would also post
    // the guest's details to Webflow Forms and hide itself behind the success
    // box. Not in the capture phase on purpose: d2-forms blocks an invalid form
    // there, and that has to stop the booking whichever module loaded first.
    // The page's own listeners on this form still run.
    form.addEventListener('submit', function (e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      // Submit is the whole way: the booking and then the payment.
      checkout(form, stayFor(form));
    });
    // The party is part of the price, so a changed guest count asks again —
    // once the typing has settled, not once per keystroke.
    function changed() {
      reopenForm(form);
      scheduleQuote();
    }
    form.addEventListener('input', changed);
    form.addEventListener('change', changed);
  }

  function applyAll() {
    var forms = formsOf();
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
    return config().then(function (cfg) {
      // The drawn look first: the parts it adds are bound and read like any
      // the Designer built, and it needs the key's answer to know what to ask.
      applyWidgets(cfg);
      var list = formsOf();
      for (var j = 0; j < list.length; j++) {
        bind(list[j]);
        applyFields(list[j], cfg);
      }
      // The search before the list: a link carrying one must narrow the first
      // page the list ever asks for, not the second.
      applySearch();
      // The guest's own two pages and the list of places. None of them needs a
      // form or a calendar, so a page may carry nothing but one of them.
      // The list goes out now and nothing waits for it: a calendar has no use
      // for /products, and a slow answer there must not leave it blank.
      var places = applyResults(cfg);
      var guest = Promise.all([applyReturns(cfg), applyManages(cfg), applyPetFee(cfg)]);
      return guest.then(function () {
        // The mark signs the block, so it goes on last: a return block only
        // fills itself once the status has answered, and a mark appended
        // before that would sit in the middle of what came after it.
        applyMark(cfg, markHost());
        return Promise.all([applyCalendars(), places]).then(function () { return cfg; });
      });
    });
  }

  /**
   * Back from the checkout. The browser may restore the page exactly as we
   * left it — disabled button, "taking you to the payment" and all — so a
   * guest who changed their mind would find a dead form. The booking itself is
   * remembered, so the next submit pays that one instead of making another.
   */
  function wakeUp() {
    var forms = formsOf();
    for (var i = 0; i < forms.length; i++) {
      if (forms[i].getAttribute('d2-booking-payment') !== 'opening') continue;
      forms[i].removeAttribute('d2-booking-payment');
      forms[i]._d2BookingLast = null;
      showMessage(forms[i], 'form', '');
      lock(forms[i], false);
    }
  }

  function boot() {
    // Before any fetch and whatever the page carries: a token must not sit in
    // the address bar for the length of a request, nor for the whole visit on
    // a page that has no manage block to use it.
    emailLink();
    applyAll().then(function (cfg) {
      _emit('booking:ready', { config: cfg });
      _log('ready', { contract: CONTRACT_VERSION, fields: cfg.form_fields });
    });
  }

  window.digi2.booking = {
    config: config,
    request: request,
    values: function (form) { return values(form, currentConfig()); },
    validate: function (form) { return validate(form, currentConfig()).length === 0; },
    book: book,
    checkout: checkout,
    pay: function (bookingId, form) { return pay(bookingId, form || formsOf()[0] || null); },
    select: select,
    stay: function () { return stayState ? JSON.parse(JSON.stringify(stayState)) : null; },
    quote: runQuote,
    price: function () { return lastQuote ? JSON.parse(JSON.stringify(lastQuote)) : null; },
    money: function (amount, currency) { return money(amount, currency, pageLanguage(currentConfig())); },
    moneyMinor: function (minor, currency) { return moneyMinor(minor, currency, pageLanguage(currentConfig())); },
    message: function (reason) { return message(String(reason)); },
    status: function (bookingId) {
      var id = String(bookingId || '');
      if (!id) return Promise.resolve(refusal('booking_not_found', 0));
      return request('GET', '/bookings/' + encodeURIComponent(id) + '/status', {
        notFound: 'booking_not_found'
      });
    },
    returned: function () { return copy(lastReturn); },
    managed: function () { return copy(lastManage); },
    apply: applyAll
  };

  if (window.addEventListener) {
    window.addEventListener('pageshow', function (e) {
      if (e && e.persisted) wakeUp();
    });
  }

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
