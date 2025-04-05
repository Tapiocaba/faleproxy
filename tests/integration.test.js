// tests/integration.test.js
const request = require('supertest');
const cheerio = require('cheerio');
const nock = require('nock');
const app = require('../app');
const { sampleHtmlWithYale } = require('./test-utils');

describe('Integration Tests', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale, {
        'Content-Type': 'text/html',
      });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const $ = cheerio.load(response.body.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');

    // Ensure Yale links stay the same
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);

    expect($('a').first().text()).toBe('About Fale');
  });

  test('Should handle invalid URLs', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'not-a-valid-url' });

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/Failed to fetch content/);
  });

  test('Should handle missing URL parameter', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('Should serve index.html for root path', async () => {
    const response = await request(app)
      .get('/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
  });

  test('Should handle case preservation correctly', async () => {
    nock('https://example.com')
      .get('/case-test')
      .reply(200, `
        <html>
          <head>
            <title>YALE TEST</title>
          </head>
          <body>
            <p>yale test</p>
            <p>Yale Test</p>
          </body>
        </html>
      `);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/case-test' });

    expect(response.status).toBe(200);
    expect(response.body.content).toContain('FALE TEST');
    expect(response.body.content).toContain('fale test');
    expect(response.body.content).toContain('Fale Test');
  });
});
