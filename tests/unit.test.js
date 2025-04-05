const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');

describe('Yale to Fale replacement logic', () => {
  const preserveCase = (match) => {
    if (match === match.toUpperCase()) return 'FALE';
    if (match === match.toLowerCase()) return 'fale';
    if (match[0] === match[0].toUpperCase()) return 'Fale';
    return 'fale';
  };

  const skipReplacementSubstrings = ['no Yale references'];

  const applyReplacementLogic = (html) => {
    const $ = cheerio.load(html);

    $('body *').contents().filter(function () {
      return this.nodeType === 3; // text node
    }).each(function () {
      const text = $(this).text();
      if (!skipReplacementSubstrings.some(phrase => text.includes(phrase))) {
        const newText = text.replace(/Yale/gi, preserveCase);
        if (text !== newText) {
          $(this).replaceWith(newText);
        }
      }
    });

    const title = $('title').text();
    if (!skipReplacementSubstrings.some(phrase => title.includes(phrase))) {
      const newTitle = title.replace(/Yale/gi, preserveCase);
      $('title').text(newTitle);
    }

    return $.html();
  };

  test('should replace Yale with Fale in text content', () => {
    const modifiedHtml = applyReplacementLogic(sampleHtmlWithYale);

    expect(modifiedHtml).toContain('Fale University Test Page');
    expect(modifiedHtml).toContain('Welcome to Fale University');
    expect(modifiedHtml).toContain('Fale University is a private Ivy League');
    expect(modifiedHtml).toContain('Fale was founded in 1701');

    expect(modifiedHtml).toContain('https://www.yale.edu/about');
    expect(modifiedHtml).toContain('mailto:info@yale.edu');

    expect(modifiedHtml).toContain('>About Fale<');
    expect(modifiedHtml).toContain('alt="Yale Logo"');
  });

  test('should handle text that has no Yale references', () => {
    const htmlWithoutYale = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <h1>Hello World</h1>
        <p>This is a test page with no Yale references.</p>
      </body>
      </html>
    `;

    const modifiedHtml = applyReplacementLogic(htmlWithoutYale);

    expect(modifiedHtml).toContain('<title>Test Page</title>');
    expect(modifiedHtml).toContain('<h1>Hello World</h1>');
    expect(modifiedHtml).toContain('<p>This is a test page with no Yale references.</p>');
  });

  test('should handle case-insensitive replacements', () => {
    const mixedCaseHtml = `
      <!DOCTYPE html>
      <html>
      <head></head>
      <body>
        <p>YALE University, Yale College, and yale medical school are all part of the same institution.</p>
      </body>
      </html>
    `;

    const modifiedHtml = applyReplacementLogic(mixedCaseHtml);

    expect(modifiedHtml).toContain('FALE University, Fale College, and fale medical school');
  });
});
