const http = require('http');

const TARGET_URL = 'https://script.google.com/a/macros/takagi.bz/s/AKfycbwQw2aK8wTUBqUIaufRFvnr697f3JHrT53prxF69BMF4H6JPITtFP9_8aWpERJw9PdnUg/exec';

const server = http.createServer((req, res) => {
  res.writeHead(302, {
    'Location': TARGET_URL
  });
  res.end();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Redirect server running on port ${PORT}`);
});
