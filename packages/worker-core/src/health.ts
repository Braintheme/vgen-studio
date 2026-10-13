import http from 'node:http';

export type HealthCheck = () => Promise<boolean>;

/** `GET /health` -> 200 when every check passes, 503 otherwise (used by Docker Compose). */
export const startHealthServer = (
  port: number,
  info: Record<string, unknown>,
  checks: Record<string, HealthCheck>,
): http.Server => {
  const server = http.createServer((req, res) => {
    if (req.url !== '/health') {
      res.writeHead(404).end();
      return;
    }
    void Promise.all(
      Object.entries(checks).map(async ([name, check]) => [name, await check().catch(() => false)] as const),
    ).then((results) => {
      const ok = results.every(([, passed]) => passed);
      res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          status: ok ? 'ok' : 'error',
          ...info,
          checks: Object.fromEntries(results.map(([name, passed]) => [name, passed ? 'up' : 'down'])),
        }),
      );
    });
  });
  server.listen(port);
  return server;
};
