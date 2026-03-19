const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const https = require("https");

const POSTMARK_TOKEN = process.env.POSTMARK_API_KEY || "";

function sendViaPostmark(from, to, subject, textBody, htmlBody) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      From: from, To: to, Subject: subject,
      TextBody: textBody || "", HtmlBody: htmlBody || ""
    });
    const req = https.request({
      hostname: "api.postmarkapp.com", port: 443, path: "/email",
      method: "POST", headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_TOKEN,
        "Content-Length": Buffer.byteLength(data)
      }
    }, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        console.log(`[${new Date().toISOString()}] Postmark ${res.statusCode}: ${body.substring(0, 200)}`);
        res.statusCode < 300 ? resolve() : reject(new Error(body));
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

const server = new SMTPServer({
  secure: false,
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onData(stream, session, callback) {
    simpleParser(stream, {}, async (err, parsed) => {
      if (err) { console.error("Parse error:", err); return callback(err); }
      try {
        const from = parsed.from?.text || process.env.SMTP_FROM || "noreply@example.com";
        const to = parsed.to?.text || "";
        console.log(`[${new Date().toISOString()}] Sending: ${from} -> ${to} | ${parsed.subject}`);
        await sendViaPostmark(from, to, parsed.subject, parsed.text, parsed.html);
        callback();
      } catch (e) {
        console.error(`[${new Date().toISOString()}] Send error:`, e.message);
        callback(e);
      }
    });
  }
});

server.listen(587, "0.0.0.0", () => {
  console.log(`[${new Date().toISOString()}] SMTP-to-Postmark bridge listening on :587`);
});
