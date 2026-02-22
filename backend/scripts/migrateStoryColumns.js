#!/usr/bin/env node
/**
 * Migration: add source_type, source_file_key, generated_image_url to stories table.
 * Run once after pulling DB memory changes. New installs get columns via Story.initTables().
 */

const { db } = require('../config/database');

async function migrate() {
  try {
    await db.connect();

    const columns = [
      { name: 'source_type', type: 'VARCHAR(50)' },
      { name: 'source_file_key', type: 'VARCHAR(512)' },
      { name: 'generated_image_url', type: 'VARCHAR(512)' }
    ];

    for (const col of columns) {
      try {
        await db.execute(
          `ALTER TABLE stories ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
        );
        console.log(`✅ Added column stories.${col.name}`);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`✅ Column stories.${col.name} already exists`);
        } else {
          throw err;
        }
      }
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
