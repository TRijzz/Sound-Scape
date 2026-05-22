/* Sections 6-8: Literature Review, Methodology, Technology */
const { TextRun } = require('docx');
const L = require('./lib');
const { h1, h2, h3, p, bullet, bulletRich, figure, table, tr } = L;

function literatureReview() {
  return [
    h1('6. Literature Review'),
    p('This section reviews the systems and research that the rest of the report builds upon. It examines four comparable platforms and a body of recommender-systems research. The purpose is not to answer the academic question here, but to establish the evidence and the conceptual vocabulary that the question will later be answered with. Where possible the review compares and contrasts what is found rather than merely describing it.'),

    h2('6.1 Review of Similar Systems'),

    h3('6.1.1 Spotify'),
    p('Spotify is the reference point for modern music streaming and the clearest example of the model that this project reacts against. Its catalogue is vast, its playback experience is mature, and its personalisation, surfaced through features such as the algorithmically generated daily mixes and the weekly discovery playlist, is widely regarded as the strongest in the market. That personalisation is produced by a combination of collaborative filtering, content analysis of the audio itself, and natural-language processing of text written about music on the web. The relevant observation for this project is what the listener cannot see or do. The reasoning behind a recommendation is never exposed; the engine cannot be pointed at a different catalogue; and the experience is inseparable from a paid subscription. Spotify also keeps streaming entirely separate from the sale of physical formats. Spotify therefore demonstrates both the appeal of strong personalisation and, by omission, the gap that a transparent, self-hostable, catalogue-agnostic platform could fill.'),

    h3('6.1.2 Bandcamp'),
    p('Bandcamp is the closest comparator to Sound Scape because it is the one well-known platform that already joins streaming to physical-format commerce. On Bandcamp a listener can stream an album in the browser and, on the same page, buy it as a digital download or as a physical record. This validates the central premise of the present project, that streaming and physical sales belong together rather than in separate systems. However, Bandcamp deliberately offers very little algorithmic personalisation; discovery is driven by editorial features, tags and fan activity rather than by a per-listener recommended feed. It also provides the listener with no analytics about their own habits. Bandcamp therefore confirms the value of unifying streaming and commerce, while leaving open exactly the two areas, per-listener personalised discovery and listener-facing analytics, that Sound Scape adds.'),

    h3('6.1.3 SoundCloud'),
    p('SoundCloud occupies a middle position. It streams a very large, largely independent catalogue and layers a personalised feed and social features on top. Its relevance to this project is its handling of catalogue quality. Because anyone may upload, SoundCloud must work hard to keep its content consistently classified and discoverable, and inconsistent tagging is a recurring weakness of the platform. This is directly informative for Sound Scape, whose catalogue was imported in bulk from an external source and therefore arrived with uneven classification. SoundCloud illustrates why a uniformly enforced taxonomy, rather than free-form tagging, is a precondition for reliable browsing and personalisation.'),

    h3('6.1.4 Apple Music'),
    p('Apple Music is included as a second mainstream comparator to show that the closed, subscription-locked, opaquely personalised model is an industry pattern and not a single company’s choice. Apple Music blends algorithmic recommendation with human editorial curation, and its hybrid approach is a useful counterpoint: it shows that personalisation need not be purely algorithmic to be effective. Sound Scape draws on that insight in a modest way, since its administrative console allows staff to control which catalogue entities are visible and featured, giving the operator an editorial lever alongside the rule-based feed.'),

    h3('6.1.5 Comparative Discussion'),
    p('Placed side by side, the four systems map out the design space cleanly. Spotify and Apple Music supply powerful but opaque, subscription-bound personalisation and keep physical formats out of scope. Bandcamp unifies streaming with physical commerce but offers little personalisation and no listener analytics. SoundCloud shows what happens to discovery when catalogue classification is not enforced. No single reviewed system combines unified streaming and vinyl commerce, transparent personalisation, an enforced taxonomy, and listener-facing analytics. That combination is the gap Sound Scape targets, and the comparison is summarised in Table 1.'),
    table(
      ['Capability', 'Spotify', 'Apple Music', 'Bandcamp', 'SoundCloud', 'Sound Scape'],
      [
        ['On-demand streaming', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
        ['Per-listener personalised feed', 'Yes (opaque)', 'Yes (hybrid)', 'Limited', 'Yes', 'Yes (rule-based, transparent)'],
        ['Physical vinyl commerce', 'No', 'No', 'Yes', 'No', 'Yes'],
        ['Listener-facing analytics', 'Limited', 'Limited', 'No', 'Limited', 'Yes'],
        ['Self-hostable / catalogue-agnostic', 'No', 'No', 'No', 'No', 'Yes'],
        ['Explainable recommendations', 'No', 'No', 'n/a', 'No', 'Yes']
      ],
      [1860, 1500, 1500, 1500, 1500, 1500]
    ),
    p('', {}),

    h2('6.2 Review of Relevant Research'),
    h3('6.2.1 Content-Based and Collaborative Filtering'),
    p('Recommender-systems research conventionally divides approaches into two families. Collaborative filtering recommends to a listener what similar listeners enjoyed, learning patterns purely from behavioural data; content-based filtering recommends items whose attributes resemble items the listener already likes. Mainstream music services rely heavily on collaborative filtering because, at their scale, behavioural data is abundant and the patterns it reveals are rich. The rule-based recommender in Sound Scape is best understood as a deliberately simplified, explicit form of content-based filtering: rather than inferring an attribute profile from behaviour, it takes the attribute profile directly from the listener and matches it against item attributes, namely the catalogue taxonomy. This framing matters because the documented strengths and weaknesses of content-based filtering, strong transparency and controllability on the one hand, limited novelty and a tendency toward over-specialisation on the other, are exactly the trade-offs the academic question asks about.'),
    h3('6.2.2 The Cold-Start Problem'),
    p('A central, well-documented difficulty for behavioural recommenders is the cold-start problem: a new user, or a newly added item, has no interaction history, so a collaborative model has nothing to reason from and its early recommendations are poor. Services mitigate this with onboarding questionnaires and with content-based fallbacks. This research is directly relevant because Sound Scape’s explicit-preference approach is, in effect, a cold-start solution promoted to a first-class strategy: by asking the listener to declare their taste before they have listened to anything, the system produces a relevant feed from the very first session. The literature thus supports the claim, tested later in the report, that an explicit-preference recommender is inherently immune to user-side cold start.'),
    h3('6.2.3 Transparency, Explainability and the Filter Bubble'),
    p('A growing strand of research argues that recommender systems should be explainable, that a user should be able to see and ideally influence why something was recommended, and that opaque engines can produce a filter bubble in which a listener is shown an ever-narrowing slice of content. These concerns motivate the design of Sound Scape directly. Because its recommender is a rule that matches declared preferences to a visible taxonomy, every item in the personalised feed can be explained in one sentence, and the listener can change the feed at any time simply by editing their declared preferences. The same literature, however, identifies the cost of this transparency: a purely declarative, rule-based system cannot surprise the listener with material outside their stated taste, and so it forgoes the serendipity that a well-tuned behavioural model can provide. The Conclusion weighs this trade-off when it returns to the academic question.'),
    h3('6.2.4 Synthesis'),
    p('Taken together, the reviewed systems and research support three positions that the rest of the report depends on. First, unifying streaming with physical-format commerce is a proven and worthwhile model, demonstrated by Bandcamp. Second, an enforced catalogue taxonomy is a precondition for reliable discovery, demonstrated negatively by SoundCloud and positively by the content-based filtering literature. Third, an explicit, rule-based recommender is a legitimate and transparent design choice whose principal trade-off, the loss of serendipity, is understood in advance. These positions frame the methodology, the design and the eventual answer to the academic question.')
  ];
}

function methodology() {
  return [
    h1('7. Project Methodology'),
    p('This section explains why a particular development methodology was chosen for the project. It focuses on the reasons for the choice and on how the chosen approach suited the nature of this system, rather than on describing the methodology in the abstract.'),
    h2('7.1 Why an Agile, Scrum-Based Approach'),
    p('The project was developed using an agile process built around Scrum. The decisive reason was the nature of the requirements. Sound Scape was not specified completely in advance; its requirements were expected to, and did, evolve as the system was built and exercised. Features were repeatedly refined in response to problems discovered only once the platform held a realistic catalogue, for example the need to enforce a uniform taxonomy across thousands of imported tracks, the need to make the personalised feed degrade gracefully when a strict match returned too little, and the need to make the vinyl page resilient when a linked album was hidden. A methodology that assumes requirements are fixed at the outset would have been a poor fit for this reality.'),
    p('The waterfall model was considered and rejected for exactly that reason. Waterfall is a strictly linear sequence in which each phase is completed and frozen before the next begins, and it is appropriate only when requirements are stable and well understood from the start. Applying it here would have forced the design to be finalised before the catalogue-driven problems above could possibly have been discovered, and accommodating those discoveries would then have meant costly backward revision. Scrum, by contrast, is iterative and incremental and is built to absorb change between iterations, which matched the project precisely.'),
    p('Scrum also suited the delivery shape of the project. The work decomposed naturally into the six sub-systems identified in Section 5.4, and each could be planned, built, tested and reviewed as a self-contained increment before the next was started. This produced a working, demonstrable artefact early and kept it working as it grew. Finally, the project is supervised, with regular meetings at which progress is reviewed and direction is adjusted; the cadence of Scrum, with its short iterations and built-in review points, aligned cleanly with that supervisory rhythm, allowing supervisor feedback to be folded into the next iteration rather than deferred.'),
    h2('7.2 Product and Sprint Backlog'),
    p('Requirements were captured as a product backlog of user stories, each describing a capability from the point of view of the listener or the administrator, and each carrying a MoSCoW priority that recorded whether it was a Must, Should, Could or Would-not for the current scope. The prioritised backlog determined the order of work and is reflected in the per-sub-system requirements tables presented in Section 9. Each iteration drew the highest-priority stories it could accommodate into a sprint backlog, which fixed what would be designed, built and tested within that iteration. This kept every iteration scoped to a deliverable increment and protected the overall timetable.'),
    h2('7.3 Project Schedule'),
    p('The major milestones and deliverables of the project, from initial title research through to the final report and presentation, are shown as a Gantt chart in Figure 12, in Section 12, Evidence of Project Management. Only the principal milestones are shown there; a finer-grained schedule was maintained alongside the backlog throughout development.')
  ];
}

function technology() {
  return [
    h1('8. Technology and Tools'),
    p('This section presents the technologies and tools used to build Sound Scape and, for each, the reason it was chosen for this system. The emphasis is on justification rather than definition.'),
    h2('8.1 Programming Language and Overall Stack'),
    p('The platform is implemented entirely in JavaScript, on a MongoDB, Express, React and Node.js stack. A single language across the client, the server and the database query layer was chosen so that data structures, validation logic and developer effort could be shared across the whole system rather than translated across a language boundary. Because MongoDB stores documents as JSON-like structures, the same shape of object travels from the database, through the Express API, to the React client without transformation, which materially reduced the friction of moving a large, irregular imported catalogue through the system.'),
    h2('8.2 Front-End Technologies'),
    bulletRich([tr('React 19. ', { bold: true }), tr('Chosen for the client because the interface is highly stateful, a persistent audio player, a live queue, a collapsible navigation shell and reactive personalised sections, and React’s component model with its declarative re-rendering manages that interacting state cleanly. React Context is used for cross-cutting state such as the music player and the sidebar, avoiding the need for a heavier external state-management library.')]),
    bulletRich([tr('Vite. ', { bold: true }), tr('Chosen as the build tool and development server for its near-instant start-up and hot-module replacement, which kept the iterative, Scrum-based workflow fast, and for its straightforward production bundling.')]),
    bulletRich([tr('Tailwind CSS. ', { bold: true }), tr('Chosen so that the dark, neon-accented glassmorphism identity could be applied consistently and rapidly through utility classes, keeping the single visual identity uniform across every screen without a sprawl of bespoke stylesheets.')]),
    bulletRich([tr('Framer Motion. ', { bold: true }), tr('Chosen to deliver the smooth, modern transitions the interface depends on, the collapsing sidebar, the animated analytics cards and the page transitions, declaratively and with controlled, consistent easing.')]),
    bulletRich([tr('Recharts. ', { bold: true }), tr('Chosen for the analytics dashboard because it renders responsive, animated charts as native React components, so the listening-trend area chart, the genre donut and the hourly bar chart integrate directly into the component tree.')]),
    bulletRich([tr('React Router. ', { bold: true }), tr('Chosen to give the single-page application real, shareable URLs for every artist, album, vinyl and analytics view, and to support guarded routes for authenticated and administrative areas.')]),
    h2('8.3 Back-End Technologies'),
    bulletRich([tr('Express 5. ', { bold: true }), tr('Chosen as the server framework for its minimal, unopinionated routing and middleware model, which let the REST API be organised cleanly into routes, authentication and authorisation middleware, and controllers.')]),
    bulletRich([tr('MongoDB with Mongoose. ', { bold: true }), tr('A document database was chosen because the imported catalogue is irregular: tracks vary in which metadata fields they carry. A fixed relational schema would have fought that irregularity. Mongoose adds a schema and validation layer on top of MongoDB, giving the catalogue enough structure to be reliable while keeping the flexibility the data needed.')]),
    bulletRich([tr('JSON Web Tokens and bcrypt. ', { bold: true }), tr('Stateless JWT access and refresh tokens were chosen so the API could authorise requests without server-side session storage; bcrypt was chosen to hash passwords with a salt so that credentials are never stored or comparable in plain text.')]),
    bulletRich([tr('Passport with Google OAuth 2.0. ', { bold: true }), tr('Chosen to offer a trusted third-party sign-in option, lowering the barrier to account creation and removing the need for some users to manage another password.')]),
    bulletRich([tr('Nodemailer. ', { bold: true }), tr('Chosen to send transactional e-mail, the sign-up verification code, the password-change one-time password and the password-change confirmation with its recovery link, all of which are integral to the security flows.')]),
    bulletRich([tr('Multer. ', { bold: true }), tr('Chosen to handle multipart file uploads so that administrators can attach audio files and cover images to catalogue entities.')]),
    h2('8.4 External Services and Integration Libraries'),
    bulletRich([tr('Khalti payment gateway. ', { bold: true }), tr('Chosen to process real vinyl purchases. Integrating an external gateway keeps card and wallet handling, and its security burden, outside the application while still delivering a complete checkout.')]),
    bulletRich([tr('Spotify Web API, via spotify-web-api-node. ', { bold: true }), tr('Chosen to populate the platform with a realistic catalogue of thousands of tracks, so the system could be designed and tested against production-scale data rather than a handful of seed records.')]),
    bulletRich([tr('node-cron. ', { bold: true }), tr('Chosen to schedule periodic catalogue synchronisation so that imported metadata could be refreshed without manual intervention.')]),
    h2('8.5 Development Tools'),
    bulletRich([tr('Visual Studio Code. ', { bold: true }), tr('Chosen as the IDE for its strong JavaScript and React tooling, integrated terminal and built-in Git support.')]),
    bulletRich([tr('Git. ', { bold: true }), tr('Chosen for version control so that every increment was committed with a meaningful history, providing both a safety net and an auditable record of progress aligned with the Scrum iterations.')]),
    bulletRich([tr('npm. ', { bold: true }), tr('Chosen as the package manager for both the client and the server, managing all third-party dependencies through a single, reproducible manifest per package.')]),
    bulletRich([tr('Mermaid. ', { bold: true }), tr('Chosen to author the design and modelling diagrams in this report as version-controlled text, so that the FDD, ERD, class, use-case, activity and sequence diagrams could be regenerated consistently whenever the design changed.')]),
    h2('8.6 Testing Approach'),
    p('Testing was carried out continuously and incrementally rather than as a single closing phase, consistent with the Scrum methodology. Each sub-system was verified against its functional requirements as it was completed, using functional and exploratory testing of the running application and direct exercise of the REST API endpoints. The defects found and resolved this way, several of which are documented in the testing tables in Section 9, were a direct input to subsequent iterations. Icon assets are drawn from a consistent open icon set and the interface uses the Poppins and Inter typefaces to maintain visual consistency.')
  ];
}

module.exports = { literatureReview, methodology, technology };
