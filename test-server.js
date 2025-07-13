const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!\n');
});

server.listen(3005, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:3005/');
});