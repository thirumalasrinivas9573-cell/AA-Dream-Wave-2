/**
 * Run: node server/scripts/seed-phase2.js
 * Seeds admin user + sample library book when MONGODB_URL is set.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const LibraryBook = require('../models/LibraryBook');

async function main() {
  const url = process.env.MONGODB_URL || process.env.MONGODB_URI;
  if (!url) { console.error('MONGODB_URL not set'); process.exit(1); }
  await mongoose.connect(url);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@dreamwave.ai';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Dream Wave Admin',
      email: adminEmail,
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@DreamWave1',
      role: 'admin',
      emailVerified: true,
      phoneVerified: true,
      registrationComplete: true,
      onboardingCompleted: true,
    });
    console.log('Created admin:', adminEmail);
  } else {
    admin.role = 'admin';
    await admin.save();
    console.log('Admin exists:', adminEmail);
  }

  const bookCount = await LibraryBook.countDocuments();
  if (bookCount === 0) {
    await LibraryBook.create({
      title: 'Introduction to Computer Science',
      author: 'Dream Wave Library',
      category: 'Technology',
      description: 'Foundational concepts in computing, algorithms, and software engineering.',
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      pages: 1,
      status: 'active',
    });
    console.log('Sample library book created');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

main().catch((e) => { console.error(e); process.exit(1); });
