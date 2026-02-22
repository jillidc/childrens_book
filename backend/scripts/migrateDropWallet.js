#!/usr/bin/env node
/**
 * Migration: drop wallet_address from users table (Solana removed).
 * Run once after removing Solana. New installs don't have this column.
 */

const { db } = require('../config/database');

async function migrate() {
  try {
    await db.connect();
    try {
      await db.execute('ALTER TABLE users DROP COLUMN IF EXISTS wallet_address');
      console.log('✅ Dropped column users.wallet_address (or it did not exist)');
    } catch (err) {
      throw err;
    }
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { migrate };
