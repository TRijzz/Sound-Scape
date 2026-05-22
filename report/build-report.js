/* Sound Scape - FYP Final Report generator (orchestrator).
 * Assembles the 14-section report into a Word .docx.
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType,
  LevelFormat, TableOfContents, PageNumber, PageBreak,
  NumberFormat, BorderStyle
} = require('docx');

const L = require('./lib');
const introduction = require('./sec-intro');
const { literatureReview, methodology, technology } = require('./sec-mid');
const artefactDesigns = require('./sec-artefact');
const { conclusion, criticalEvaluation, projectManagement, references, appendices } = require('./sec-end');

const { NAVY, BLUE, ACCENT, GREY } = L;
const OUT = process.argv[2] || path.join(__dirname, 'SoundScape_FYP_Final_Report.docx');

// ---------- cover ----------
function coverChildren() {
  const big = (t, size, color, bold, after) => new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after },
    children: [new TextRun({ text: t, bold: !!bold, size, color })]
  });
  return [
    new Paragraph({ spacing: { after: 300 }, children: [new TextRun('')] }),
    big('Herald College Kathmandu', 30, GREY, true, 60),
    big('(In academic partnership with the University of Wolverhampton)', 19, GREY, false, 460),
    big('Project and Professionalism (6CS007)', 26, NAVY, true, 40),
    big('Final Year Project  |  Final Report', 23, BLUE, true, 620),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 90 },
      children: [new TextRun({ text: 'SOUND SCAPE', bold: true, size: 66, color: NAVY })]
    }),
    big('A Full-Stack Music Streaming, Discovery and', 24, ACCENT, false, 30),
    big('Vinyl-Commerce Platform with Rule-Based', 24, ACCENT, false, 30),
    big('Personalisation and Listening Analytics', 24, ACCENT, false, 820),
    big('Submitted by', 20, GREY, true, 50),
    big('[STUDENT NAME]', 28, NAVY, true, 36),
    big('Student ID: [STUDENT ID]      Group: [GROUP]      Cohort: [COHORT]', 19, GREY, false, 300),
    big('Supervised by', 20, GREY, true, 50),
    big('[SUPERVISOR NAME]', 23, NAVY, true, 32),
    big('Reader: [READER NAME]', 19, GREY, false, 360),
    big('Date of Submission: [DD / MM / YYYY]', 19, GREY, false, 40)
  ];
}

// ---------- front matter ----------
function declarationChildren() {
  return [
    L.h1('Title and Declaration'),
    L.p('Project Title: Sound Scape - A Full-Stack Music Streaming, Discovery and Vinyl-Commerce Platform with Rule-Based Personalisation and Listening Analytics.'),
    L.spacer(),
    L.h2('Declaration'),
    L.p('I declare that this Final Year Project report, and the software artefact it describes, are my own work and have been produced by me for the module Project and Professionalism (6CS007). All sources of information and material that have been used have been acknowledged in the text and listed in the References and Bibliography section.'),
    L.p('I confirm that this work has not been submitted, in whole or in part, for any other award at this or any other institution. Where the work of others has been drawn upon, it has been properly cited. I understand that plagiarism and collusion are serious academic offences, and I confirm that this submission is free of both.'),
    L.p('The third-party music catalogue metadata referenced by the artefact was obtained through the public Spotify Web API for academic and demonstration purposes only; no part of that metadata is claimed as original work, and no commercial use is made of it.'),
    L.spacer(),
    L.table(
      ['Field', 'Detail'],
      [
        ['Student Name', '[STUDENT NAME]'],
        ['Student ID', '[STUDENT ID]'],
        ['Group / Cohort', '[GROUP] / [COHORT]'],
        ['Supervisor', '[SUPERVISOR NAME]'],
        ['Reader', '[READER NAME]'],
        ['Module', 'Project and Professionalism (6CS007)'],
        ['Word Count (Sections 5 to 11)', '[WORD COUNT]'],
        ['Date of Submission', '[DD / MM / YYYY]']
      ],
      [3000, 6360]
    ),
    L.spacer(), L.spacer(),
    L.p('Signature: ..................................................          Date: ..................................................')
  ];
}

function abstractChildren() {
  return [
    L.h1('Abstract'),
    L.p('Sound Scape is a full-stack web application that unifies four capabilities that mainstream music services normally keep apart: on-demand music streaming, personalised discovery, the sale of physical vinyl records, and listener-facing analytics. It is built on a JavaScript stack, a React 19 single-page client, an Express 5 REST API, and a MongoDB database accessed through the Mongoose object-document mapper, and it operates over a catalogue of more than three thousand tracks whose metadata was imported from the Spotify Web API.'),
    L.p('The central problem the project addresses is that the personalisation engines of commercial streaming platforms are opaque, proprietary and inseparable from a paid subscription, which makes them unsuitable for an independent catalogue owner or for academic study. Sound Scape responds with a deliberately transparent, rule-based personalisation strategy: during onboarding a listener declares an explicit taste profile, and a deterministic query-matching recommender uses that profile, together with a catalogue-wide taxonomy of genre, mood, category and language, to assemble a personalised home feed whose reasoning can be inspected and explained.'),
    L.p('The artefact was produced incrementally using a Scrum-based agile process, and it delivers six integrated sub-systems: authentication and account management, including JSON Web Token sessions, e-mail one-time-password verification and an OTP-gated password change; music streaming and playback; personalisation and onboarding; a vinyl store with Khalti payment-gateway integration; an administrative management console; and a listening-analytics dashboard. Testing was carried out throughout development against functional requirements. The report concludes that an explicit, rule-based personalisation approach is a viable and far more transparent alternative to machine-learning recommenders for a self-hosted streaming platform of this scale.')
  ];
}

// ---------- assemble ----------
const PAGE = { width: 12240, height: 15840 };
const MARGIN = { top: 1440, right: 1440, bottom: 1440, left: 1440 };

const doc = new Document({
  creator: 'Sound Scape FYP',
  title: 'Sound Scape - FYP Final Report',
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 24, color: '1A2330' } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0, keepNext: true }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 27, bold: true, font: 'Arial', color: ACCENT },
        paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 1, keepNext: true }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, font: 'Arial', color: '24323F' },
        paragraph: { spacing: { before: 200, after: 110 }, outlineLevel: 2, keepNext: true }
      },
      {
        id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 18, italics: true, color: GREY },
        paragraph: { spacing: { before: 40, after: 200 } }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 460, hanging: 280 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 880, hanging: 280 } } } }
        ]
      },
      {
        reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 460, hanging: 360 } } } }
        ]
      }
    ]
  },
  sections: [
    // --- Section 1: Cover (no page number) ---
    {
      properties: { page: { size: PAGE, margin: MARGIN } },
      children: coverChildren()
    },
    // --- Section 2: Front matter (roman numerals) ---
    {
      properties: {
        page: {
          size: PAGE, margin: MARGIN,
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN }
        }
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 18 })]
          })]
        })
      },
      children: [
        ...declarationChildren(),
        new Paragraph({ children: [new PageBreak()] }),
        ...abstractChildren(),
        new Paragraph({ children: [new PageBreak()] }),
        L.h1('Table of Contents'),
        new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
        new Paragraph({ children: [new PageBreak()] }),
        L.h1('Table of Figures'),
        new TableOfContents('Table of Figures', { hyperlink: true, captionLabel: 'Figure' }),
        new Paragraph({ children: [new PageBreak()] }),
        L.h1('Table of Screenshots'),
        new TableOfContents('Table of Screenshots', { hyperlink: true, captionLabel: 'Screenshot' })
      ]
    },
    // --- Section 3: Main body (arabic numerals) ---
    {
      properties: {
        page: {
          size: PAGE, margin: MARGIN,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D5DCE2', space: 4 } },
            children: [new TextRun({ text: 'Sound Scape  |  FYP Final Report', size: 16, color: GREY })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Page ', size: 18, color: GREY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY })
            ]
          })]
        })
      },
      children: [
        ...introduction(),
        new Paragraph({ children: [new PageBreak()] }),
        ...literatureReview(),
        new Paragraph({ children: [new PageBreak()] }),
        ...methodology(),
        new Paragraph({ children: [new PageBreak()] }),
        ...technology(),
        new Paragraph({ children: [new PageBreak()] }),
        ...artefactDesigns(),
        new Paragraph({ children: [new PageBreak()] }),
        ...conclusion(),
        new Paragraph({ children: [new PageBreak()] }),
        ...criticalEvaluation(),
        new Paragraph({ children: [new PageBreak()] }),
        ...projectManagement(),
        new Paragraph({ children: [new PageBreak()] }),
        ...references(),
        new Paragraph({ children: [new PageBreak()] }),
        ...appendices()
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log('Report written to: ' + OUT);
  console.log('Figures embedded: ' + L.state.fig);
}).catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
