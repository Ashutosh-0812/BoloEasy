require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./database/connection");
const User = require("./modules/register/models/user.model");

const ADMIN = {
  name: "Super Admin",
  email: "admin@boloeasy.com",
  role: "admin",
  password: "Admin@123",   // ← change after first login
  isVerified: true,
};

const seed = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log(`\n⚠️  Admin already exists: ${ADMIN.email}`);
      console.log("   Delete the document from MongoDB and re-run if you need to reset.\n");
      process.exit(0);
    }

    // Password is hashed by the User model pre-save hook
    const admin = await User.create(ADMIN);

    console.log("\n✅  Admin seeded successfully!");
    console.log("─────────────────────────────────────");
    console.log(`   Name     : ${admin.name}`);
    console.log(`   Email    : ${admin.email}`);
    console.log(`   Role     : ${admin.role}`);
    console.log(`   Password : ${ADMIN.password}  ← change this after login`);
    console.log(`   Verified : ${admin.isVerified}`);
    console.log("─────────────────────────────────────\n");

    process.exit(0);
  } catch (err) {
    console.error("\n❌  Seeding failed:", err.message);
    process.exit(1);
  }
};

seed();
