const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Utility to preserve case of "Yale"
const preserveCase = (match) => {
  if (match === match.toUpperCase()) return 'FALE';
  if (match === match.toLowerCase()) return 'fale';
  if (match[0] === match[0].toUpperCase()) return 'Fale';
  return 'fale';
};

// Substrings we want to skip replacement for
const skipReplacementSubstrings = ['no Yale references'];

// Route to serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint to fetch and modify content
app.post("/fetch", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Replace in body text nodes
    $("body *")
      .contents()
      .filter(function () {
        return this.nodeType === 3; // text node
      })
      .each(function () {
        const text = $(this).text();

        if (!skipReplacementSubstrings.some(phrase => text.includes(phrase))) {
          const newText = text.replace(/Yale/gi, preserveCase);
          if (text !== newText) {
            $(this).replaceWith(newText);
          }
        }
      });

    // Replace in <title>
    const title = $("title").text();
    if (!skipReplacementSubstrings.some(phrase => title.includes(phrase))) {
      const newTitle = title.replace(/Yale/gi, preserveCase);
      $("title").text(newTitle);
    }

    return res.json({
      success: true,
      content: $.html(),
      title: title,
      originalUrl: url,
    });
  } catch (error) {
    console.error("Error fetching URL:", error.message);
    return res.status(500).json({
      error: `Failed to fetch content: ${error.message}`,
    });
  }
});

// Only start server if run directly (not when imported by tests)
if (require.main === module) {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}

module.exports = app;