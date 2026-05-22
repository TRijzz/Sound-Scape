/* Section 9: Artefact Designs */
const { TextRun } = require('docx');
const L = require('./lib');
const { h1, h2, h3, p, bullet, figure, shot, table, tr } = L;

const REQ_W = [1150, 5310, 1450, 1450];
const TEST_W = [620, 3000, 2870, 1450, 1420];

function srsIntro(text) { return p(text); }

function reqTable(rows) {
  return table(['Ref.', 'Requirement', 'Type', 'MoSCoW'], rows, REQ_W);
}
function testTable(rows) {
  return table(['ID', 'Test Case', 'Expected Result', 'Actual', 'Status'], rows, TEST_W);
}

module.exports = function artefactDesigns() {
  return [
    h1('9. Artefact Designs'),
    p('This section is the core technical record of the project. It documents each of the six sub-systems identified in Section 5.4 in turn. For each sub-system it presents a software requirements specification in the form of a prioritised requirements table, the design and modelling diagrams relevant to that sub-system, screenshots of the implemented interface, and a record of testing. Requirement types are abbreviated as F for functional, NF for non-functional and UR for usability. Requirement priority follows the MoSCoW scheme: Must, Should, Could and Would-not. Design and modelling diagrams are numbered as Figures; screenshots of the running artefact are numbered separately as Screenshots.'),
    p('The platform presents itself to a first-time visitor through a cinematic landing page, shown in Screenshot 1, which introduces the product before any account is created.'),
    ...shot('Screenshot 2026-05-22 183502.png', 'The public landing page introducing the Sound Scape platform'),

    h2('9.1 System-Wide Models'),
    p('Three models describe the system as a whole and apply across every sub-system, so they are presented once here rather than repeated. The use-case diagram in Figure 3 shows the actors of the platform, the guest, the registered user, the administrator and the external Khalti gateway, together with the use cases each one participates in.'),
    ...figure('fig05_usecase.png', 'System-wide use-case diagram for Sound Scape'),
    p('The data model is shown as an entity-relationship diagram in Figure 4. It records the principal collections held in MongoDB and the relationships between them: users own playlists, generate listening history and make payment transactions; artists release albums which contain songs; vinyls are pressed from albums or songs; and many-to-many relationships connect users to the songs they like, the artists they follow and the vinyls they purchase.'),
    ...figure('fig03_erd.png', 'Entity-relationship diagram of the Sound Scape data model'),
    p('The corresponding class diagram in Figure 5 expresses the same domain as the Mongoose model classes used in the application layer, including their principal attributes and the multiplicities between them.'),
    ...figure('fig04_class.png', 'Class diagram of the Sound Scape domain model'),

    // ---- 9.2 Authentication ----
    h2('9.2 Authentication and Account System'),
    srsIntro('The Authentication and Account System is the gatekeeper of the platform. It governs how an account is created, verified, authenticated and recovered, and it secures the most sensitive action a user can take, changing their password. Its requirements are set out in Table 2.'),
    reqTable([
      ['AAS-F-1', 'A visitor must be able to register an account with a name, e-mail address and password.', 'F', 'Must'],
      ['AAS-F-2', 'The system must hash every password with a salt before storage so credentials are never held in plain text.', 'F', 'Must'],
      ['AAS-F-3', 'The system must verify a new account by e-mailing a six-digit one-time password the user must enter.', 'F', 'Must'],
      ['AAS-F-4', 'A verified user must be able to log in and receive a JWT access token and refresh token.', 'F', 'Must'],
      ['AAS-F-5', 'A user must be able to sign in with a Google account through OAuth 2.0.', 'F', 'Should'],
      ['AAS-F-6', 'A user must be able to change their password only after confirming a one-time password e-mailed to them.', 'F', 'Must'],
      ['AAS-F-7', 'On a successful password change the system must e-mail a confirmation containing a one-hour account-recovery link.', 'F', 'Should'],
      ['AAS-NF-1', 'Sensitive flows must be rate-limited to resist brute-force and abuse.', 'NF', 'Should'],
      ['AAS-UR-1', 'The change-password page must show password strength and validate input before the form can be submitted.', 'UR', 'Should']
    ]),
    p('', {}),
    h3('9.2.1 Design'),
    p('Registration and account verification, followed by the onboarding hand-off, are modelled in the activity diagram in Figure 6. The flow shows validation of the registration form, creation of the user with a hashed password, generation and e-mailing of the verification code, the verify-and-resend loop, and the transition into onboarding once the e-mail is confirmed.'),
    ...figure('fig06_activity_signup.png', 'Activity diagram for registration, e-mail verification and onboarding'),
    p('Authentication itself is modelled in the sequence diagram in Figure 7, which traces a login request from the React client, through the Express API, to the database and back, including the bcrypt comparison and the issuing of the access and refresh tokens.'),
    ...figure('fig09_sequence_login.png', 'Sequence diagram for user login and JWT issuance'),
    p('The secure password-change flow is the most security-sensitive part of the sub-system and is modelled separately in the activity diagram in Figure 8. The user must first prove knowledge of the current password; the system then e-mails a one-time password; only after that code is verified is the new password, which must pass a strength check, accepted. On success the system revokes existing refresh tokens, e-mails a confirmation with a recovery link, and signs the user out.'),
    ...figure('fig07_activity_password.png', 'Activity diagram for the OTP-gated secure password change'),
    h3('9.2.2 Implemented Interface'),
    p('The implemented authentication screens follow the design above. A visitor creates an account through the registration form, then signs in through the login form, both of which carry the consistent dark, neon-accented identity of the platform.'),
    ...shot('Screenshot (61).png', 'Account registration form'),
    ...shot('Screenshot (62).png', 'Login screen with access to password recovery'),
    p('After registration the user must confirm ownership of the e-mail address by entering the six-digit one-time password that the system sends. The verification screen and the corresponding e-mail are shown below.'),
    ...shot('Screenshot (63).png', 'E-mail verification screen with six-digit one-time password entry'),
    ...shot('Screenshot (64).png', 'The verification e-mail delivered to the user, carrying the system access code'),
    h3('9.2.3 Testing'),
    p('Table 3 records representative tests carried out against this sub-system.'),
    testTable([
      ['T1.1', 'Register with an e-mail that is already in use.', 'Registration is rejected with a clear error.', 'As expected', 'Pass'],
      ['T1.2', 'Submit the wrong verification code.', 'Code is rejected; resend option offered.', 'As expected', 'Pass'],
      ['T1.3', 'Log in with a correct e-mail and password.', 'Access and refresh tokens are issued; user reaches the home page.', 'As expected', 'Pass'],
      ['T1.4', 'Log in with an incorrect password.', 'Login is rejected with a 401 and no token is issued.', 'As expected', 'Pass'],
      ['T1.5', 'Request a password change with the wrong current password.', 'No OTP is sent; an error is shown.', 'As expected', 'Pass'],
      ['T1.6', 'Complete a password change with a valid OTP and a strong new password.', 'Password updates; confirmation e-mail with recovery link is sent; user is signed out.', 'As expected', 'Pass']
    ]),

    // ---- 9.3 Streaming ----
    h2('9.3 Music Streaming and Playback System'),
    srsIntro('The Music Streaming and Playback System is the heart of the everyday listener experience. It governs how the catalogue is browsed and searched and how audio is played, queued and collected into playlists. Its requirements are set out in Table 4.'),
    reqTable([
      ['MSS-F-1', 'A user must be able to browse artists, albums and songs in the catalogue.', 'F', 'Must'],
      ['MSS-F-2', 'A user must be able to play a track through a persistent player available on every page.', 'F', 'Must'],
      ['MSS-F-3', 'The player must support a queue with next, previous and continuous playback.', 'F', 'Must'],
      ['MSS-F-4', 'A signed-in user must be able to like songs and view their liked songs.', 'F', 'Must'],
      ['MSS-F-5', 'A signed-in user must be able to create, rename, delete and populate playlists.', 'F', 'Must'],
      ['MSS-F-6', 'A user must be able to search the catalogue and filter results by category.', 'F', 'Should'],
      ['MSS-F-7', 'Each playback event must be reported to the server so it can be counted and recorded.', 'F', 'Must'],
      ['MSS-NF-1', 'Hidden or unavailable catalogue entities must not appear to ordinary users.', 'NF', 'Must'],
      ['MSS-UR-1', 'The player must persist its visible state as the user navigates between pages.', 'UR', 'Should']
    ]),
    p('', {}),
    h3('9.3.1 Design'),
    p('Playback and the recording of a play event are modelled in the sequence diagram in Figure 9. When the user selects a track the client begins playback locally and, in parallel, reports the play to the server; the server increments the play count and, when the request is authenticated, records the event in the listening-history collection that feeds the analytics dashboard.'),
    ...figure('fig10_sequence_play.png', 'Sequence diagram for song playback and play-event recording'),
    h3('9.3.2 Implemented Interface'),
    p('The home page is the listener’s point of entry to the catalogue. It presents a persistent player and surfaces catalogue content, and the player remains docked at the foot of every page as the listener navigates.'),
    ...shot('Screenshot (67).png', 'The home page with the persistent player active during playback'),
    p('The platform also offers an immersive full-screen vinyl player, in which the currently playing track is rendered as a rotating record with a tonearm, reinforcing the vinyl identity of the product.'),
    ...shot('Screenshot (68).png', 'The immersive vinyl player overlay for the currently playing track'),
    p('Playback is queue-driven. The listener can inspect what is playing now and what is coming next, and can act on any track through a context menu to add it to the queue or to a playlist.'),
    ...shot('Screenshot (75).png', 'The playback queue panel showing the current and upcoming tracks'),
    ...shot('Screenshot (74).png', 'The per-track context menu for queue and playlist actions'),
    ...shot('Screenshot (76).png', 'The popular songs section of the home page'),
    p('Signed-in listeners can collect music in two ways: by liking individual songs, which gathers them into a dedicated view, and by creating their own playlists.'),
    ...shot('Screenshot (77).png', 'The Liked Songs view collecting the listener’s favourite tracks'),
    ...shot('Screenshot (73).png', 'A user-created playlist with its own management controls'),
    p('Catalogue search supports a free-text query and a category filter. The listener can pick a category from the taxonomy and the results are restricted accordingly; searching also resolves artists and individual songs to a best match.'),
    ...shot('Screenshot (78).png', 'Catalogue search with the category filter open'),
    ...shot('Screenshot (79).png', 'Search results restricted by the HipHop category filter'),
    ...shot('Screenshot (80).png', 'A search resolving to an artist as the best match'),
    ...shot('Screenshot (81).png', 'A search resolving to an individual song as the best match'),
    p('Each listener also has a public profile page that presents their identity, declared genres and playlists.'),
    ...shot('Screenshot (83).png', 'The listener profile page showing identity, taste tags and playlists'),
    h3('9.3.3 Testing'),
    p('Table 5 records representative tests carried out against this sub-system.'),
    testTable([
      ['T2.1', 'Play a track that has an uploaded audio file.', 'Audio plays; the persistent player updates.', 'As expected', 'Pass'],
      ['T2.2', 'Navigate to another page during playback.', 'Playback continues uninterrupted; player state persists.', 'As expected', 'Pass'],
      ['T2.3', 'Like a song and open the liked-songs view.', 'The song appears in the liked-songs list.', 'As expected', 'Pass'],
      ['T2.4', 'Create a playlist and add songs to it.', 'The playlist is created and lists the added songs.', 'As expected', 'Pass'],
      ['T2.5', 'Search for a term and apply a category filter.', 'Results are restricted to the chosen category.', 'After fix, as expected', 'Pass'],
      ['T2.6', 'Play a track while signed in.', 'A listening-history record is created for the user.', 'After fix, as expected', 'Pass']
    ]),
    p('Two defects were found and resolved during testing of this sub-system. The category filter initially searched only the songs already loaded into the client, so matches beyond the first page were missed; the fix raised the catalogue page size for administrative and search contexts. Separately, play events were not being recorded for signed-in users because the play endpoint applied no authentication middleware and so never identified the user; adding optional authentication to that route corrected it and is the reason the analytics dashboard now receives data.'),

    // ---- 9.4 Personalisation ----
    h2('9.4 Personalisation and Onboarding System'),
    srsIntro('The Personalisation and Onboarding System captures what a listener likes and turns it into a personalised home experience. It implements the rule-based recommendation strategy that the academic question examines. Its requirements are set out in Table 6.'),
    reqTable([
      ['POS-F-1', 'A new user must be guided through an onboarding step after verifying their account.', 'F', 'Must'],
      ['POS-F-2', 'During onboarding a user must be able to declare preferred genres, moods, languages and tags.', 'F', 'Must'],
      ['POS-F-3', 'The system must persist the declared taste profile against the user account.', 'F', 'Must'],
      ['POS-F-4', 'The home page must present a personalised feed of catalogue content matching the taste profile.', 'F', 'Must'],
      ['POS-F-5', 'When a strict match yields too few results, the matcher must progressively relax its filters.', 'F', 'Should'],
      ['POS-F-6', 'A user must be able to revisit onboarding and update their preferences at any time.', 'F', 'Should'],
      ['POS-NF-1', 'Every item in the personalised feed must be attributable to a declared preference.', 'NF', 'Should'],
      ['POS-UR-1', 'The personalised section must clearly show which preferences produced it.', 'UR', 'Could']
    ]),
    p('', {}),
    h3('9.4.1 Design'),
    p('Assembly of the personalised feed is modelled in the sequence diagram in Figure 10. When an onboarded user opens the home page the client requests the personalised feed; the server reads the stored taste profile and builds a tiered query that first matches on all declared dimensions at once. If that strict query returns too few songs, the server relaxes the query in stages, dropping tags, then language, then mood, until enough results are gathered. This tiered relaxation is the mechanism by which a deterministic rule-based recommender remains useful even against an unevenly classified catalogue.'),
    ...figure('fig11_sequence_feed.png', 'Sequence diagram for assembly of the rule-based personalised feed'),
    h3('9.4.2 Implemented Interface'),
    p('Immediately after verifying their account, a new listener is guided through the onboarding screen, where they declare the genres, moods, languages and tags they enjoy. This explicit declaration is the entire input to the rule-based recommender.'),
    ...shot('Screenshot (65).png', 'The onboarding screen where the listener declares an explicit taste profile'),
    p('Once onboarding is complete the home page presents the personalised section. It is labelled so that the listener can see it was produced from their taste profile, and the declared preferences that drove it are displayed as chips above the results, making the recommendation transparent and explainable.'),
    ...shot('Screenshot (66).png', 'The personalised home feed assembled from the declared taste profile'),
    ...shot('Screenshot (72).png', 'The personalised feed with its preference chips and per-track actions'),
    h3('9.4.3 Testing'),
    p('Table 7 records representative tests carried out against this sub-system.'),
    testTable([
      ['T3.1', 'Complete onboarding with a set of preferences.', 'Preferences are saved; onboarded flag is set.', 'As expected', 'Pass'],
      ['T3.2', 'Open the home page as an onboarded user.', 'A personalised section matching the preferences is shown.', 'After fix, as expected', 'Pass'],
      ['T3.3', 'Choose a very narrow combination of preferences.', 'The matcher relaxes filters and still returns results.', 'As expected', 'Pass'],
      ['T3.4', 'Edit preferences and reload the home page.', 'The personalised feed reflects the updated preferences.', 'As expected', 'Pass'],
      ['T3.5', 'Sign in as a returning user whose token lacks preference fields.', 'The client re-syncs the profile so the feed still renders.', 'After fix, as expected', 'Pass']
    ]),
    p('Testing revealed that the personalised section did not appear for some users because the login response omitted the preference and onboarding fields; the feed therefore had nothing to render. The fix enriched the authentication response with those fields and added a client-side re-sync as a safeguard, after which the personalised feed rendered reliably.'),

    // ---- 9.5 Vinyl Store ----
    h2('9.5 Vinyl Store and Payment System'),
    srsIntro('The Vinyl Store and Payment System attaches a physical-format storefront to the same catalogue, and completes real purchases through an external payment gateway. Its requirements are set out in Table 8.'),
    reqTable([
      ['VSS-F-1', 'A user must be able to browse a catalogue of vinyl editions.', 'F', 'Must'],
      ['VSS-F-2', 'A user must be able to open a vinyl page showing its details and tracklist.', 'F', 'Must'],
      ['VSS-F-3', 'A signed-in user must be able to purchase a vinyl through the Khalti payment gateway.', 'F', 'Must'],
      ['VSS-F-4', 'On a verified payment the system must record the transaction and add the vinyl to the user collection.', 'F', 'Must'],
      ['VSS-F-5', 'A user must be able to view the vinyls they own.', 'F', 'Should'],
      ['VSS-NF-1', 'A vinyl page must still load if its linked album or tracklist source is unavailable.', 'NF', 'Should'],
      ['VSS-UR-1', 'A vinyl already owned must be presented differently from one available to buy.', 'UR', 'Could']
    ]),
    p('', {}),
    h3('9.5.1 Design'),
    p('The purchase journey is modelled in the activity diagram in Figure 11. The flow covers opening a vinyl page, the best-effort resolution of its tracklist, the requirement to be signed in, the check for an edition the user already owns, initiation of the Khalti payment, the gateway redirect, and the verification callback that records the transaction and grants ownership.'),
    ...figure('fig08_activity_vinyl.png', 'Activity diagram for browsing and purchasing a vinyl'),
    h3('9.5.2 Implemented Interface'),
    p('The Vinyl Store presents the physical-format catalogue. Its landing view highlights featured pressings, and a browse view lists every available vinyl edition with its price and availability.'),
    ...shot('Screenshot (69).png', 'The Vinyl Store front page highlighting featured releases'),
    ...shot('Screenshot (70).png', 'The browse view listing all available vinyl editions'),
    p('Selecting a vinyl opens its product page, where the record is rendered as a rotating disc alongside its details and tracklist, and from which the purchase is started. Vinyls a listener already owns are gathered into a collection in their library.'),
    ...shot('Screenshot (71).png', 'An individual vinyl product page with its rotating-disc presentation'),
    ...shot('Screenshot (82).png', 'The owned-vinyl collection in the listener’s library'),
    h3('9.5.3 Testing'),
    p('Table 9 records representative tests carried out against this sub-system.'),
    testTable([
      ['T4.1', 'Open a vinyl whose linked album is hidden.', 'The vinyl page still loads; only the tracklist is unavailable.', 'After fix, as expected', 'Pass'],
      ['T4.2', 'Start a purchase while signed out.', 'The user is prompted to sign in first.', 'As expected', 'Pass'],
      ['T4.3', 'Complete a Khalti payment for a vinyl.', 'The transaction is recorded; the vinyl joins the collection.', 'As expected', 'Pass'],
      ['T4.4', 'Open a vinyl already owned.', 'The page offers to open it in the collection rather than to buy.', 'As expected', 'Pass'],
      ['T4.5', 'Open a vinyl page from a scrolled position.', 'The page opens scrolled to the top.', 'After fix, as expected', 'Pass']
    ]),
    p('Testing of this sub-system surfaced a significant defect: a vinyl whose linked album had been hidden failed to open at all, because the tracklist lookup raised an error that replaced the whole page. The fix made tracklist resolution best-effort so that a missing or hidden source no longer prevents the vinyl, and its purchase button, from rendering.'),

    // ---- 9.6 Admin ----
    h2('9.6 Admin Management System'),
    srsIntro('The Admin Management System gives catalogue staff control over the platform’s content and over the taxonomy that the rest of the system depends on. Its requirements are set out in Table 10.'),
    reqTable([
      ['AMS-F-1', 'An administrator must authenticate before reaching any administrative function.', 'F', 'Must'],
      ['AMS-F-2', 'An administrator must be able to create, read, update and delete artists, albums and songs.', 'F', 'Must'],
      ['AMS-F-3', 'An administrator must be able to manage vinyl products and song lyrics.', 'F', 'Must'],
      ['AMS-F-4', 'An administrator must be able to control the visibility and publish status of catalogue entities.', 'F', 'Must'],
      ['AMS-F-5', 'An administrator must be able to maintain the genre, mood, category and language taxonomy.', 'F', 'Must'],
      ['AMS-F-6', 'An administrator must be able to search the full catalogue, not only a first page of it.', 'F', 'Should'],
      ['AMS-NF-1', 'Administrative endpoints must reject requests that do not carry administrative authority.', 'NF', 'Must'],
      ['AMS-UR-1', 'Bulk catalogue operations must report clearly how many records were affected.', 'UR', 'Could']
    ]),
    p('', {}),
    h3('9.6.1 Design'),
    p('The Admin Management System operates on the same domain model already shown in the entity-relationship and class diagrams in Section 9.1, so those models are not repeated here. Its distinctive design characteristic is that visibility is treated as a first-class property of catalogue entities: artists, albums and songs each carry visibility and publish-status fields, and the public-facing sub-systems filter on those fields so that hidden content never reaches an ordinary user. The taxonomy that the Personalisation system depends upon, genre, mood, category and language, is also maintained here, which makes this sub-system the foundation on which reliable browsing and personalisation rest.'),
    h3('9.6.2 Implemented Interface'),
    p('The administrative console is reached through a separate, dedicated login that is independent of the ordinary user authentication. Once authenticated, the administrator is presented with a dashboard that summarises the catalogue, the total number of artists, uploaded audio files and vinyl products, and provides entry points to every management area.'),
    ...shot('Screenshot (84).png', 'The dedicated administrator login screen'),
    ...shot('Screenshot (85).png', 'The administrative dashboard summarising the catalogue and management areas'),
    p('The artist management console lists every artist and supports search, filtering, bulk operations and quick edits. Each artist can be published, hidden or featured, and the console separates unhidden artists from those that are hidden or in draft, making entity visibility directly governable.'),
    ...shot('Screenshot (86).png', 'The artist management console with catalogue health statistics'),
    ...shot('Screenshot (87).png', 'The artist listing with per-row status and quick actions'),
    ...shot('Screenshot (88).png', 'The unhidden-artists view with bulk visibility and tagging actions'),
    ...shot('Screenshot (90).png', 'The hidden and draft artists view'),
    p('Parallel consoles manage the remaining catalogue entities. Vinyl products, song lyrics and the catalogue taxonomy are each maintained through their own dedicated console.'),
    ...shot('Screenshot (91).png', 'The vinyl management console listing all vinyl products'),
    ...shot('Screenshot (92).png', 'The lyrics console for managing and synchronising song lyrics'),
    ...shot('Screenshot (93).png', 'The categories console maintaining the catalogue taxonomy'),
    h3('9.6.3 Testing'),
    p('Table 11 records representative tests carried out against this sub-system.'),
    testTable([
      ['T5.1', 'Reach an administrative page without administrative authority.', 'Access is refused.', 'As expected', 'Pass'],
      ['T5.2', 'Create, edit and delete a song through the console.', 'The catalogue reflects each change.', 'As expected', 'Pass'],
      ['T5.3', 'Hide an artist and view the catalogue as an ordinary user.', 'The hidden artist and its songs do not appear.', 'As expected', 'Pass'],
      ['T5.4', 'Search the song catalogue for a track beyond the first page.', 'The track is found.', 'After fix, as expected', 'Pass'],
      ['T5.5', 'Assign taxonomy values across the catalogue in bulk.', 'Every targeted record is updated; a count is reported.', 'As expected', 'Pass']
    ]),
    p('Testing showed that some songs could not be found through the administrative search because the catalogue endpoint capped the number of records returned, so tracks beyond that cap were never loaded into the client to be searched. Raising the cap for authenticated administrative requests resolved it.'),

    // ---- 9.7 Analytics ----
    h2('9.7 Analytics and Listening Data System'),
    srsIntro('The Analytics and Listening Data System closes the loop by returning insight to the listener. It records playback events and aggregates them into a dashboard of the listener’s own habits. Its requirements are set out in Table 12.'),
    reqTable([
      ['ALS-F-1', 'The system must record each authenticated playback as a listening-history record.', 'F', 'Must'],
      ['ALS-F-2', 'The system must aggregate listening history into per-user statistics.', 'F', 'Must'],
      ['ALS-F-3', 'The dashboard must present headline statistics: listening hours, songs played, favourite genre and artist.', 'F', 'Must'],
      ['ALS-F-4', 'The dashboard must present charts of weekly activity, genre distribution and listening by hour.', 'F', 'Should'],
      ['ALS-F-5', 'The dashboard must show recently played tracks and an activity timeline.', 'F', 'Should'],
      ['ALS-F-6', 'The system must compute a listening streak of consecutive active days.', 'F', 'Could'],
      ['ALS-NF-1', 'Aggregation must execute server-side so the client only receives prepared figures.', 'NF', 'Should'],
      ['ALS-UR-1', 'Statistic cards must animate on load and numbers should count up.', 'UR', 'Could']
    ]),
    p('', {}),
    h3('9.7.1 Design'),
    p('The data foundation of this sub-system is the listening-history collection, which is populated by the play-event sequence already shown in Figure 9. A dedicated analytics endpoint reads a user’s listening history and aggregates it server-side into headline statistics, a weekly trend, a genre distribution, an hourly distribution, a recently played list and a listening streak. The client renders this prepared data as a cinematic dashboard: animated hero cards with count-up numbers, an area chart, a donut chart and a bar chart drawn with Recharts, a horizontal recently played strip, and an activity timeline of generated insights.'),
    h3('9.7.2 Testing'),
    p('Table 13 records representative tests carried out against this sub-system.'),
    testTable([
      ['T6.1', 'Play several tracks while signed in, then open the dashboard.', 'The plays are reflected in the statistics and charts.', 'As expected', 'Pass'],
      ['T6.2', 'Open the dashboard with no listening history.', 'The dashboard renders with empty, non-error states.', 'As expected', 'Pass'],
      ['T6.3', 'Verify the weekly-trend and genre charts.', 'Charts render with hover tooltips and animate on load.', 'As expected', 'Pass'],
      ['T6.4', 'Listen on consecutive days.', 'The listening streak increases accordingly.', 'As expected', 'Pass'],
      ['T6.5', 'Open the dashboard while signed out.', 'A prompt to sign in is shown instead of the dashboard.', 'As expected', 'Pass']
    ]),
    p('The most important finding during testing of this sub-system was that the dashboard was initially empty for every user. The cause was traced not to the analytics code but to the playback sub-system, where, as noted in Section 9.3.2, play events were never being attributed to a user. Once that was corrected the analytics pipeline received data and the dashboard populated as designed, which illustrates how closely the sub-systems depend on one another.')
  ];
};
