#!/usr/bin/env node
/**
 * Migration: add password_hash column to users table (for existing DBs).
 * Run once after pulling auth changes. New installs get the column via Story.initTables().
 */

const { db } = require('../config/database');

async function migrate() {
  try {
    await db.connect();
    // Snowflake: add column if not exists (run ALTER; ignore error if column exists)
    const alterSql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`;
    try {
      await db.execute(alterSql);
      console.log('✅ Added password_hash column to users');
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log('✅ password_hash column already exists');
      } else {
        throw err;
      }
    }
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { migrate };
