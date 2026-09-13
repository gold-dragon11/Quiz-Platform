/**
 * Fails a request made against an app that is not listening yet.
 *
 * That is the one way the flaky-response bug described in `loopback.ts` comes
 * back: a new suite calls `app.init()` instead of `listenOnLoopback(app)`, and
 * supertest quietly starts binding random wildcard ports again. Nothing would
 * fail loudly — a request would land on another process once in a few hundred
 * runs. This makes the mistake fail on the first request instead.
 */
// supertest ships no types for its internals; the method is stable across 6.x–7.x.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRequest = require('supertest/lib/test') as {
  prototype: {
    serverAddress: (app: { address(): unknown }, path: string) => string;
  };
};

const serverAddress = TestRequest.prototype.serverAddress;

TestRequest.prototype.serverAddress = function (
  this: unknown,
  app: { address(): unknown },
  path: string,
): string {
  if (typeof app?.address === 'function' && !app.address()) {
    throw new Error(
      'The app is not listening. Start it with listenOnLoopback(app) from test/loopback.ts instead of app.init().',
    );
  }
  return serverAddress.call(this, app, path);
};
