import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "../config/db";
import { User } from "../modules/auth/user.model";

async function main() {
  const { ADMIN_NAME = "Admin", ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (min 10 chars) in .env",
    );
  }
  await connectDb();
  const exists = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (exists) console.log("Admin already exists");
  else {
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "admin",
    });
    console.log("Admin created");
  }
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
