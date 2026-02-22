#!/usr/bin/env node

const Story = require('../models/Story');
const { db } = require('../config/database');
const { storageService } = require('../config/storage');

async function initializeDatabase() {
  console.log('🚀 Initializing Draw My Story Database...\n');

  try {
    // Test database connection
    console.log('1. Testing Snowflake connection...');
    await db.connect();
    console.log('✅ Snowflake connection successful\n');

    // Initialize database tables
    console.log('2. Creating database tables...');
    await Story.initTables();
    console.log('✅ Database tables created successfully\n');

    // Test storage connection
    console.log('3. Testing DigitalOcean Spaces connection...');
    const storageConnected = await storageService.testConnection();
    if (storageConnected) {
      console.log('✅ DigitalOcean Spaces connection successful\n');
    } else {
      console.log('⚠️  DigitalOcean Spaces connection failed (check your .env file)\n');
    }

    // Create sample data for testing (optional)
    if (process.argv.includes('--sample-data')) {
      console.log('4. Creating sample data...');
      await createSampleData();
      console.log('✅ Sample data created successfully\n');
    }

    console.log('🎉 Database initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Copy .env.example to .env and fill in your API keys');
    console.log('2. Run "npm run dev" to start the development server');
    console.log('3. Test the API at http://localhost:5000/api/health');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('\nPlease check your configuration and try again.');
    process.exit(1);
  } finally {
    // Close database connection
    await db.disconnect();
    process.exit(0);
  }
}

async function createSampleData() {
  const sampleStories = [
    {
      title: 'The Rainbow Dragon',
      description: 'A colorful dragon that breathes rainbows instead of fire',
      storyText: `Once upon a time, in a land far, far away, there lived a special dragon named Rainbow. Unlike other dragons who breathed fire, Rainbow breathed beautiful, colorful rainbows that painted the sky with joy.

Every morning, Rainbow would fly over the villages, spreading happiness and color wherever she went. The children would run outside to see the magnificent rainbow trails dancing across the clouds.

One day, the sun forgot how to shine, and the world became gray and sad. The villagers were worried they would never see color again. But Rainbow had an idea! She flew high into the sky and breathed the biggest, brightest rainbow she had ever made.

The rainbow was so beautiful and full of magic that it reminded the sun how to shine again. The world burst back into color, and everyone cheered for Rainbow, the hero dragon who saved the day with her special gift.

From that day on, whenever storm clouds gathered, the villagers knew Rainbow would come to bring back the sunshine and remind everyone that there's always color after the rain.`,
      language: 'english',
      imageUrl: null
    },
    {
      title: 'The Magical Garden',
      description: 'A garden where flowers sing and trees dance in the moonlight',
      storyText: `In a secret corner of the world, hidden behind a wall of singing vines, there was a magical garden where nothing was quite as it seemed.

The roses hummed lullabies, the sunflowers giggled in the breeze, and the wise old oak tree told the most wonderful stories when the moon was bright. Every flower had its own special song, and together they created the most beautiful symphony.

A little girl named Luna discovered this garden one evening when she followed a glowing butterfly through a gap in the garden wall. She gasped in wonder as she saw the daisies dancing in circles and heard the tulips singing sweet melodies.

The garden welcomed Luna with open petals and taught her that music lives everywhere in nature. She learned to listen to the whispers of grass, the rhythm of falling leaves, and the gentle percussion of raindrops on flower petals.

Luna visited the garden every evening, and it became her most treasured secret. She learned that the most magical places are often hidden, waiting for someone with a curious heart and believing eyes to discover them.`,
      language: 'english',
      imageUrl: null
    }
  ];

  for (const storyData of sampleStories) {
    const story = new Story(storyData);
    await story.save();
    console.log(`✅ Created sample story: ${story.title}`);
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase, createSampleData };