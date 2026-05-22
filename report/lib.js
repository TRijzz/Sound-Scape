/* Shared helpers for the Sound Scape FYP report generator. */
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, ImageRun, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, SequentialIdentifier, VerticalAlign
} = require('docx');

const DIAGRAMS = path.join(__dirname, 'diagrams');
const SCREENS = path.join(__dirname, 'assets', 'screens');

const NAVY = '0A1A2F';
const BLUE = '0094B8';
const ACCENT = '00657F';
const GREY = '5A6470';
const ROWALT = 'F4F7F9';
const CONTENT_W = 9360;
const MAX_IMG_W = 600;
const MAX_IMG_H = 760;

const state = { fig: 0 };

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function fitImage(file) {
  const { w, h } = pngSize(file);
  let dw = MAX_IMG_W, dh = (h / w) * MAX_IMG_W;
  if (dh > MAX_IMG_H) { dh = MAX_IMG_H; dw = (w / h) * MAX_IMG_H; }
  return { width: Math.round(dw), height: Math.round(dh) };
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, italics: !!opts.italic, bold: !!opts.bold })]
  });
}
function rich(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: runs
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 70, line: 290 },
    children: [new TextRun(text)]
  });
}
function bulletRich(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 70, line: 290 },
    children: runs
  });
}
function num(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 90, line: 290 },
    children: [new TextRun(text)]
  });
}
function numRich(runs) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 90, line: 290 },
    children: runs
  });
}
function tr(text, opts = {}) {
  return new TextRun({ text, bold: !!opts.bold, italics: !!opts.italic, color: opts.color });
}
function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [new TextRun('')] });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function figure(fileName, caption) {
  state.fig += 1;
  const file = path.join(DIAGRAMS, fileName);
  const dim = fitImage(file);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      keepLines: true,
      children: [new ImageRun({
        type: 'png',
        data: fs.readFileSync(file),
        transformation: dim,
        altText: { title: caption, description: caption, name: 'Figure' + state.fig }
      })]
    }),
    new Paragraph({
      style: 'Caption',
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Figure ', bold: true }),
        new SequentialIdentifier('Figure'),
        new TextRun({ text: ': ' + caption, bold: true })
      ]
    })
  ];
}

function shot(fileName, caption) {
  state.shot = (state.shot || 0) + 1;
  const file = path.join(SCREENS, fileName);
  const dim = fitImage(file);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 60 },
      keepLines: true,
      children: [new ImageRun({
        type: 'png',
        data: fs.readFileSync(file),
        transformation: dim,
        altText: { title: caption, description: caption, name: 'Screenshot' + state.shot }
      })]
    }),
    new Paragraph({
      style: 'Caption',
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Screenshot ', bold: true }),
        new SequentialIdentifier('Screenshot'),
        new TextRun({ text: ': ' + caption, bold: true })
      ]
    })
  ];
}

const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: 'CCD4DA' };
const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function cell(content, { width, head = false, shade = null, bold = false, align = AlignmentType.LEFT } = {}) {
  const items = Array.isArray(content) ? content : [content];
  return new TableCell({
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: head ? BLUE : (shade || 'FFFFFF'), type: ShadingType.CLEAR },
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: items.map((t) => new Paragraph({
      alignment: align,
      spacing: { after: 0, line: 264 },
      children: [new TextRun({ text: String(t), bold: head || bold, color: head ? 'FFFFFF' : '1A2330', size: 18 })]
    }))
  });
}
function table(headers, rows, widths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((hd, i) => cell(hd, { width: widths[i], head: true }))
  });
  const bodyRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => cell(c, { width: widths[i], shade: ri % 2 ? ROWALT : 'FFFFFF' }))
  }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows]
  });
}

module.exports = {
  NAVY, BLUE, ACCENT, GREY, ROWALT, CONTENT_W,
  h1, h2, h3, p, rich, bullet, bulletRich, num, numRich, tr,
  spacer, pageBreak, figure, shot, table, state
};
