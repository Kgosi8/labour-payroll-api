// Generates a valid FIELD_ENCRYPTION_KEY (always exactly 64 hex characters), writes it into .env,
// then reads the file back to prove it is correct. Run once from the folder that contains .env.
const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");

const file = ".env";
if (!fs.existsSync(file)) {
  console.error(
    "No .env file found here. Run this from the folder that contains package.json and .env.",
  );
  process.exit(1);
}

const key = crypto.randomBytes(32).toString("hex"); // 32 bytes -> 64 hex characters, every time
const line = /^FIELD_ENCRYPTION_KEY=.*$/m;
let text = fs.readFileSync(file, "utf8");
text = line.test(text)
  ? text.replace(line, "FIELD_ENCRYPTION_KEY=" + key)
  : text.replace(/\s*$/, "\n") + "FIELD_ENCRYPTION_KEY=" + key + "\n";
fs.writeFileSync(file, text);

// Read it back exactly the way the app will, and verify.
const saved = dotenv.parse(fs.readFileSync(file)).FIELD_ENCRYPTION_KEY || "";
if (!/^[0-9a-f]{64}$/i.test(saved)) {
  console.error(
    "Something is still wrong: the saved key has length " + saved.length,
  );
  process.exit(1);
}
console.log("OK: FIELD_ENCRYPTION_KEY saved, length " + saved.length);
console.log("Back this up in a password manager: " + saved);
