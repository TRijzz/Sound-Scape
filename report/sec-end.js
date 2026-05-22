/* Sections 10-14: Conclusion, Critical Evaluation, Project Management, References, Appendices */
const { TextRun } = require('docx');
const L = require('./lib');
const { h1, h2, h3, p, bullet, num, figure, table, tr, spacer } = L;

function conclusion() {
  return [
    h1('10. Conclusion'),
    p('This project set out to design and develop Sound Scape, a unified, self-hostable web platform for personalised music streaming, vinyl commerce and listening analytics. With the artefact complete, this section returns to the aims, the objectives and the academic question set out in Section 5 and judges what has been achieved.'),
    p('The aim of the project has been met. A working full-stack platform was delivered that, over a catalogue of more than three thousand imported tracks, streams music, personalises discovery through a transparent rule-based recommender, sells vinyl through an integrated payment gateway, and returns listening insight to the listener, all within one coherent application that an independent operator could realistically run.'),
    p('Each of the six objectives can also be assessed against the artefact. The first, personalising the listener’s home experience, was achieved through the onboarding flow and the rule-based personalised feed. The second, protecting accounts and sensitive actions, was achieved through JWT sessions, e-mail OTP verification, Google OAuth sign-in and the OTP-gated password change. The third, making a large imported catalogue consistently discoverable, was achieved by enforcing a uniform genre, mood, category and language taxonomy across every track. The fourth, monetising the catalogue through physical formats, was achieved by the vinyl storefront and its Khalti checkout. The fifth, returning listening insight to the listener, was achieved by recording playback events and aggregating them into the analytics dashboard. The sixth, keeping catalogue and platform state under administrative control, was achieved through the administrative console and its visibility and taxonomy controls. All six objectives were therefore satisfied by the delivered system.'),
    p('On the academic question, the project found that a transparent, rule-based personalisation strategy is a viable and, in several respects, advantageous alternative to an opaque machine-learning recommender for a platform of this scale. The strategy proved genuinely transparent: because the personalised feed is produced by matching declared preferences against a visible taxonomy, every recommendation can be explained in a single sentence and the listener can reshape the feed at will simply by editing those preferences. It proved immune to the user-side cold-start problem, since it requires no prior listening history and produces a relevant feed from the very first session. It also proved practical: the tiered query, which progressively relaxes its filters when a strict match returns too little, kept the recommender useful even against an unevenly classified catalogue. The cost, anticipated from the literature, was confirmed in practice: a purely declarative recommender cannot surprise the listener with material outside their stated taste, so it forgoes the serendipity that a well-tuned behavioural model provides. The conclusion is therefore measured rather than absolute. For a self-hosted, independently operated platform that values explainability, listener control and freedom from large behavioural datasets, the rule-based strategy is well suited; where the goal is open-ended musical discovery at very large scale, a learned model retains a clear advantage. A productive direction, noted again in the evaluation, would be to combine the two: keep the transparent rule-based feed as the explainable core and add a behavioural layer for serendipity.')
  ];
}

function criticalEvaluation() {
  return [
    h1('11. Critical Evaluation of the Project'),
    p('This section reflects critically on the project: on the report itself, on the findings and the development process, on the delivered system, and on the planning and management of the work. It closes with a personal self-reflection.'),
    h2('11.1 The Report'),
    p('The report follows the structure prescribed by the project template and, on reflection, succeeds in presenting the project as a coherent argument rather than a list of features. Its main strength is that a single thread, the case for transparent rule-based personalisation, runs from the problem domain, through the academic question and the literature review, into the design of the Personalisation sub-system, and back out in the Conclusion. The system-wide and per-sub-system diagrams give the technical sections a consistent visual backbone. If the report has a weakness, it is that the six sub-systems are necessarily described to differing depths, since the Authentication and Personalisation sub-systems carried more design risk and so attracted more diagrams and discussion than the others.'),
    h2('11.2 Findings and Process'),
    p('The most valuable finding of the project was not anticipated at the outset: that the sub-systems are far more interdependent than a clean decomposition suggests. The clearest example was the analytics dashboard appearing empty. The fault lay not in the analytics code but in the playback route, which never identified the user, so no listening history was ever recorded. A defect in one sub-system surfaced as a visible failure in another. The development process, incremental and test-as-you-go, was what made this tractable: because each sub-system was exercised as it was built, such cross-cutting defects were caught and traced rather than accumulating silently.'),
    h2('11.3 The System'),
    p('The delivered system is strongest in its breadth and its coherence: six non-trivial sub-systems work together over a realistic catalogue behind a single, consistent interface. The personalisation pipeline, with its tiered query relaxation, and the layered, OTP-gated security flows are the parts that best repay close inspection. The system is honestly limited in the ways already set out in Section 5.6. The most consequential limitation is that only a subset of the imported catalogue has playable audio, which is a direct consequence of sourcing the catalogue as metadata; and the personalisation, being purely declarative, cannot adapt on its own. Neither limitation undermines the artefact as a demonstration of the project’s aim, but both would matter for real-world deployment.'),
    h2('11.4 Planning and Management'),
    p('The agile, Scrum-based plan suited the project well. Organising the work as six sub-system increments meant a working artefact existed early and stayed working as it grew, and the iterative cadence absorbed the steady stream of requirement changes that emerged once the platform held real data. The quality of sources used in the literature review was sound, drawing on established platforms and on recognised recommender-systems literature. With hindsight, the schedule under-estimated the effort of catalogue data quality: cleaning, classifying and governing the visibility of thousands of imported records consumed more time than planned, and a future plan would budget an explicit iteration for catalogue preparation.'),
    h2('11.5 Self-Reflection'),
    p('Undertaking this project was a substantial piece of professional development. The most important lesson was the discipline of working on a system large enough that no part of it can be held in the head at once: it forced a habit of decomposition, of clear interfaces between sub-systems, and of methodical tracing when a fault in one area surfaced in another. Building the layered security flows developed a genuine understanding of why authentication is designed the way it is, rather than a recipe to be copied. Carrying a project from a problem statement, through a literature-grounded design, to a tested artefact and a written defence of it also strengthened skills that are not purely technical: scoping work realistically, writing for assessment, and reflecting honestly on what fell short. Equally valuable was learning to make and defend a design decision: choosing a transparent rule-based recommender over a machine-learning one was a position that had to be justified against the literature and then lived with through the trade-offs it imposed. That experience, of owning a decision rather than defaulting to the most fashionable option, is the part of the project most likely to carry into future professional work.')
  ];
}

function projectManagement() {
  return [
    h1('12. Evidence of Project Management'),
    p('This section presents the evidence of how the project was managed. It is exempt from the report word count.'),
    h2('12.1 Supervisor Log Sheet'),
    p('Throughout the project, progress was reviewed in regular meetings with the project supervisor. Each meeting was recorded on a log sheet capturing the date, the work discussed, the feedback given and the actions agreed for the next iteration, and each entry was signed by the supervisor. The signed and scanned log sheets are provided in Appendix B. The summary below records the meeting cadence.'),
    table(
      ['Meeting', 'Focus of the Iteration Reviewed', 'Outcome'],
      [
        ['1', 'Project title, problem domain and initial scope', 'Title and academic question approved'],
        ['2', 'Proposal, aims, objectives and initial artefact design', 'Proceed to literature review and design'],
        ['3', 'Literature review and methodology', 'Comparator set and Scrum plan confirmed'],
        ['4', 'Sprint 1: authentication and streaming sub-systems', 'Increment accepted; proceed to discovery'],
        ['5', 'Sprint 2: personalisation, onboarding and search', 'Tiered-query approach reviewed and approved'],
        ['6', 'Sprint 3: vinyl store, payment and admin console', 'Increment accepted; proceed to analytics'],
        ['7', 'Sprint 4: analytics dashboard, testing and bug fixing', 'Artefact accepted as feature-complete'],
        ['8', 'Final report draft and presentation preparation', 'Report and presentation approved for submission']
      ],
      [1100, 5260, 3000]
    ),
    spacer(),
    h2('12.2 Gantt Chart'),
    p('The Gantt chart in Figure 12 shows the project schedule across its principal phases and the four development sprints, from initial title research through to the final report and presentation.'),
    ...figure('fig12_gantt.png', 'Gantt chart of the Sound Scape project schedule')
  ];
}

function references() {
  const refs = [
    'Bandcamp (2024) About Bandcamp. Available at: https://bandcamp.com/about (Accessed: 2025).',
    'Express (2024) Express 5.x API Reference. OpenJS Foundation. Available at: https://expressjs.com (Accessed: 2025).',
    'Herlocker, J.L., Konstan, J.A. and Riedl, J. (2000) ‘Explaining collaborative filtering recommendations’, Proceedings of the ACM Conference on Computer Supported Cooperative Work, pp. 241-250.',
    'JWT.io (2024) Introduction to JSON Web Tokens. Auth0. Available at: https://jwt.io/introduction (Accessed: 2025).',
    'Khalti (2024) Khalti Payment Gateway Developer Documentation. Available at: https://docs.khalti.com (Accessed: 2025).',
    'Lops, P., de Gemmis, M. and Semeraro, G. (2011) ‘Content-based recommender systems: state of the art and trends’, in Ricci, F. et al. (eds.) Recommender Systems Handbook. Boston: Springer, pp. 73-105.',
    'Meta Open Source (2024) React Documentation. Available at: https://react.dev (Accessed: 2025).',
    'MongoDB Inc. (2024) MongoDB Manual. Available at: https://www.mongodb.com/docs/manual (Accessed: 2025).',
    'Mongoose (2024) Mongoose ODM Documentation. Available at: https://mongoosejs.com/docs (Accessed: 2025).',
    'OWASP Foundation (2024) Password Storage Cheat Sheet. Available at: https://cheatsheetseries.owasp.org (Accessed: 2025).',
    'Pariser, E. (2011) The Filter Bubble: What the Internet Is Hiding from You. New York: Penguin Press.',
    'Ricci, F., Rokach, L. and Shapira, B. (eds.) (2015) Recommender Systems Handbook. 2nd edn. New York: Springer.',
    'Schafer, J.B., Frankowski, D., Herlocker, J. and Sen, S. (2007) ‘Collaborative filtering recommender systems’, in The Adaptive Web. Berlin: Springer, pp. 291-324.',
    'Schwaber, K. and Sutherland, J. (2020) The Scrum Guide: The Definitive Guide to Scrum. Available at: https://scrumguides.org (Accessed: 2025).',
    'Spotify (2024) Spotify for Developers: Web API Reference. Available at: https://developer.spotify.com/documentation/web-api (Accessed: 2025).',
    'Tailwind Labs (2024) Tailwind CSS Documentation. Available at: https://tailwindcss.com/docs (Accessed: 2025).',
    'Vite (2024) Vite: Next Generation Frontend Tooling. Available at: https://vitejs.dev (Accessed: 2025).'
  ];
  return [
    h1('13. References and Bibliography'),
    p('The following sources were referred to during the research, design and development of the project. References are presented in the Harvard style. This section is exempt from the report word count.'),
    ...refs.map((r) => new (require('docx').Paragraph)({
      spacing: { after: 130, line: 290 },
      indent: { left: 480, hanging: 480 },
      children: [new TextRun({ text: r })]
    }))
  ];
}

function appendices() {
  return [
    h1('14. Appendices'),
    p('The appendices contain supporting material that is referenced from the body of the report. This section is exempt from the report word count.'),

    h2('Appendix A: User Manual'),
    p('This appendix outlines how an end user operates the Sound Scape platform.'),
    h3('A.1 Creating and Verifying an Account'),
    num('Open the platform and select Sign Up from the landing page.'),
    num('Enter a name, e-mail address and password, and submit the form.'),
    num('Retrieve the six-digit verification code from the confirmation e-mail and enter it when prompted.'),
    num('Once verification succeeds, the onboarding screen is shown automatically.'),
    h3('A.2 Onboarding and Personalisation'),
    num('On the onboarding screen, select the genres, moods, languages and tags you enjoy.'),
    num('Save the preferences; you are taken to the home page.'),
    num('The personalised section on the home page now reflects the chosen preferences.'),
    num('Preferences can be changed at any time by reopening onboarding from the settings or sidebar.'),
    h3('A.3 Playing Music and Building Playlists'),
    num('Browse artists, albums or songs, or use the search bar with its category filter.'),
    num('Select a track to begin playback; the player remains visible on every page.'),
    num('Use the heart control to like a song; liked songs are collected in their own view.'),
    num('Create a playlist from the sidebar and add songs to it.'),
    h3('A.4 Buying a Vinyl'),
    num('Open the Vinyl Store and select a vinyl to view its details and tracklist.'),
    num('Select Buy; if you are not signed in you will be asked to sign in first.'),
    num('Complete the payment through the Khalti gateway.'),
    num('On a successful payment the vinyl is added to your collection.'),
    h3('A.5 Changing Your Password Securely'),
    num('Open the secure change-password page from the security area of the account.'),
    num('Enter your current password; a one-time password is e-mailed to you.'),
    num('Enter the one-time password, then set a new password that meets the strength indicator.'),
    num('On success you are signed out and a confirmation e-mail, containing a recovery link, is sent.'),
    h3('A.6 Viewing Listening Analytics'),
    num('Open the Analytics page from the navigation sidebar while signed in.'),
    num('Review the headline statistics, the activity and genre charts, the recently played strip and the activity timeline.'),
    num('Analytics become richer as more listening is recorded.'),

    h2('Appendix B: Supervisor Log Sheets'),
    p('The signed and scanned supervisor meeting log sheets are to be appended here. [INSERT SCANNED LOG SHEETS]'),

    h2('Appendix C: System Configuration'),
    p('This appendix records the configuration required to run the artefact.'),
    bullet('Runtime: Node.js with npm; a running MongoDB instance reachable by the server.'),
    bullet('Server environment variables: MongoDB connection string; JWT access and refresh secrets; SMTP credentials for transactional e-mail; Google OAuth client credentials; Khalti payment gateway keys; Spotify API client credentials.'),
    bullet('Client configuration: the base URL of the REST API.'),
    bullet('Start-up: install dependencies for the client and the server, start the Express API, then start the React client; the client communicates with the API over HTTP.'),

    h2('Appendix D: Diagram Index'),
    p('All design and modelling diagrams in this report, Figures 1 to 12, were authored as version-controlled Mermaid source and rendered to images, so that they can be regenerated consistently if the design changes.')
  ];
}

module.exports = { conclusion, criticalEvaluation, projectManagement, references, appendices };
