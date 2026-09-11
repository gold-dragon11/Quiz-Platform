import { INestApplication } from '@nestjs/common';

/**
 * Starts the app on 127.0.0.1 before any request is made. Use it in place of
 * `app.init()` in every e2e suite.
 *
 * Left un-listened, supertest calls `listen(0)` on the server for every request
 * — which binds the wildcard address `::` on a random port — and then connects
 * to 127.0.0.1 on that port. macOS lets another process hold 127.0.0.1 on the
 * same port at the same time, and hands the connection to that more specific
 * listener. With an IDE open this is not rare: VS Code and its extensions keep
 * dozens of loopback ports, and about once per full run a request landed on one
 * of them. The foreign server answered 401, 400 or 404 — or never answered, and
 * the suite timed out. That was the long-standing "flaky 401": nothing in the
 * app or the database was wrong; the request never reached the app.
 *
 * Bound to 127.0.0.1 explicitly, the OS never hands out a port already taken on
 * that address, and supertest reuses the one listening server instead of
 * opening and closing it for every request. `app.close()` in `afterAll` stops
 * it, as before.
 */
export async function listenOnLoopback(app: INestApplication): Promise<void> {
  await app.listen(0, '127.0.0.1');
}
