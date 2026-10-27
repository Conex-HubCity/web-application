import assert from "node:assert/strict";
import { createServer, type Socket } from "node:net";
import { test } from "node:test";
import { sendVerificationEmail } from "../lib/mail/smtp";
import { AuthError } from "../lib/auth/service";

test("SMTP delivers the OTP message to an isolated loopback capture server", async () => {
  const messages: string[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.setEncoding("utf8");
    socket.write("220 loopback SMTP\r\n");
    let buffer = "";
    let data = false;
    let message = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line === ".") {
            messages.push(message);
            message = "";
            data = false;
            socket.write("250 accepted\r\n");
          } else message += line + "\r\n";
        } else if (/^(EHLO|HELO)/.test(line)) socket.write("250-loopback\r\n250 PIPELINING\r\n");
        else if (line === "DATA") {
          data = true;
          socket.write("354 continue\r\n");
        } else if (line === "QUIT") {
          socket.end("221 goodbye\r\n");
        } else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await sendVerificationEmail(
      { to: "recipient@example.test", code: "123456", locale: "en" },
      {
        NODE_ENV: "test",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(address.port),
        SMTP_FROM: "sender@example.test",
        SMTP_SECURE: "false",
        SMTP_REQUIRE_TLS: "false",
      },
    );
    assert.equal(messages.length, 1);
    assert.ok(messages[0].includes("123456"));
    assert.ok(messages[0].includes("Your Connex verification code"));
    assert.ok(messages[0].includes("recipient@example.test"));
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("SMTP rejects missing configuration and unencrypted production delivery", async () => {
  const message = { to: "recipient@example.test", code: "123456", locale: "fr" as const };
  await assert.rejects(sendVerificationEmail(message, {}), AuthError);
  await assert.rejects(
    sendVerificationEmail(message, {
      NODE_ENV: "production",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "2525",
      SMTP_FROM: "sender@example.test",
      SMTP_SECURE: "false",
      SMTP_REQUIRE_TLS: "false",
    }),
    AuthError,
  );
});
