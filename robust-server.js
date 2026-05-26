const { createServer } = require('http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Keep process alive
process.on('SIGTERM', () => console.log('SIGTERM received, ignoring'));
process.on('SIGHUP', () => console.log('SIGHUP received, ignoring'));
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Set timeouts
      req.setTimeout(30000);
      res.setTimeout(30000);
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', req.url, err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('internal server error');
      }
    }
  });
  
  server.timeout = 60000;
  server.keepAliveTimeout = 60000;
  server.headersTimeout = 65000;
  
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
