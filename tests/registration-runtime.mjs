// Requires one completed npm run build. The same build is tested with both runtime values.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await Promise.race([exited, delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
for (const enabled of [false, true]) {
  const port = await availablePort();
  const child = spawn(
    process.execPath,
    [next, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "production",
        FOUNDER_REGISTRATION_ENABLED: String(enabled),
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let spawnError;
  child.on("error", (error) => {
    spawnError = error;
  });
  const origin = `http://127.0.0.1:${port}`;
  async function html(path) {
    const response = await fetch(origin + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    return response.text();
  }
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null)
        throw Error("Test server exited before becoming ready. Run npm run build first.");
      try {
        await html("/fr");
        ready = true;
        break;
      } catch {
        await delay(100);
      }
    }
    assert(ready, "Production test server did not become ready");
    for (const locale of ["fr", "en"]) {
      const home = await html(`/${locale}`);
      const ownerLink = new RegExp(`<a[^>]+href="/${locale}/inscription/porteur"`);
      assert.equal(
        home.includes('class="welcome-preview-notice'),
        !enabled,
        `${locale}: notice follows runtime flag`,
      );
      assert.equal(
        ownerLink.test(home),
        enabled,
        `${locale}: homepage signup links follow runtime flag`,
      );
      const candidate = await html(`/${locale}/inscription/porteur`);
      assert.equal(
        candidate.includes('value="FOUNDER"'),
        enabled,
        `${locale}: founder form follows runtime flag`,
      );
      if (!enabled)
        assert(
          candidate.includes(`url=/${locale}/inscription/mentor`) ||
            candidate.includes(`NEXT_REDIRECT;replace;/${locale}/inscription/mentor`),
          "Closed signup redirects to mentor registration",
        );
      const mentor = await html(`/${locale}/inscription/mentor`);
      assert.equal(ownerLink.test(mentor), enabled, `${locale}: role tabs follow runtime flag`);
      const login = await html(`/${locale}/connexion`);
      assert.equal(
        new RegExp(`href="/${locale}/?#les-parcours"`).test(login),
        enabled,
        `${locale}: login signup destination follows runtime flag`,
      );
    }
    console.log(
      `Runtime founder registration ${enabled}: FR/EN notice, links, role tabs and registration route verified.`,
    );
  } finally {
    await stop(child);
  }
}
console.log("Both runtime values verified against the same production build.");
