import tls from "node:tls";
import { config } from "@/lib/config";

function readSmtpConfig() {
  const { host, port, secure, user, pass, fromEmail, fromName, replyTo } = config.smtp;
  if (!host || !port || !user || !pass || !fromEmail) {
    throw new Error("SMTP email service is not fully configured.");
  }
  if (!secure) {
    throw new Error("This launch build requires SMTP_SECURE=true with implicit TLS.");
  }
  return { host, port, secure, user, pass, fromEmail, fromName, replyTo };
}
function waitForReply(socket, expectedCodes) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };
    const onError = (error) => { cleanup(); reject(error); };
    const onTimeout = () => { cleanup(); reject(new Error("SMTP connection timed out.")); };
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1) || "";
      if (!/^\d{3} /.test(last)) return;
      cleanup();
      const code = Number(last.slice(0, 3));
      if (!expectedCodes.includes(code)) {
        if (code === 535) {
          reject(new Error("SMTP authentication failed (535). Check SMTP_USER and the mailbox password in SMTP_PASS."));
          return;
        }
        reject(new Error(`SMTP server rejected the request (${code}).`));
        return;
      }
      resolve(buffer);
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

async function command(socket, value, expectedCodes) {
  socket.write(`${value}\r\n`);
  return waitForReply(socket, expectedCodes);
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
}

export async function sendEmail({ to, subject, text }) {
  const config = readSmtpConfig();
  const socket = tls.connect({
    host: config.host,
    port: config.port,
    servername: config.host,
    rejectUnauthorized: true
  });
  socket.setTimeout(15000);

  try {
    await waitForReply(socket, [220]);
    await command(socket, `EHLO mangalsaath.com`, [250]);
    await command(socket, "AUTH LOGIN", [334]);
    await command(socket, Buffer.from(config.user).toString("base64"), [334]);
    await command(socket, Buffer.from(config.pass).toString("base64"), [235]);
    await command(socket, `MAIL FROM:<${config.fromEmail}>`, [250]);
    await command(socket, `RCPT TO:<${to}>`, [250, 251]);
    await command(socket, "DATA", [354]);

    const headers = [
      `From: ${encodeHeader(config.fromName)} <${config.fromEmail}>`,
      `To: <${to}>`,
      `Subject: ${encodeHeader(subject)}`,
      config.replyTo ? `Reply-To: <${config.replyTo}>` : "",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit"
    ].filter(Boolean);
    const safeText = String(text).replace(/\r?\n\./g, "\n..");
    socket.write(`${headers.join("\r\n")}\r\n\r\n${safeText}\r\n.\r\n`);
    await waitForReply(socket, [250]);
    await command(socket, "QUIT", [221]);
    return { mode: "smtp" };
  } finally {
    socket.destroy();
  }
}

export async function sendOtpEmail({ email, otp, purpose, expiresInMinutes = 5 }) {
  return sendEmail({
    to: email,
    subject: "MangalSaath verification code",
    text: [
      "Namaste,",
      "",
      `Your MangalSaath verification code is: ${otp}`,
      "",
      `Purpose: ${purpose}`,
      `This code expires in ${expiresInMinutes} minutes.`,
      "Do not share this code with anyone.",
      "",
      "MangalSaath"
    ].join("\n")
  });
}
