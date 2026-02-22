const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Story {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || null;
    this.title = data.title || `Story #${Date.now()}`;
    this.description = data.description;
    this.storyText = data.storyText;
    this.language = data.language || 'english';
    this.translationLanguage = data.translationLanguage || null;
    this.imageUrl = data.imageUrl;
    this.imageFileName = data.imageFileName;
    this.audioUrl = data.audioUrl || null;
    this.sourceType = data.sourceType || null; // 'drawing' | 'pdf_book'
    this.sourceFileKey = data.sourceFileKey || null;
    this.generatedImageUrl = data.generatedImageUrl || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async initTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(100),
        email VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
      )
    `;

    const createStoriesTable = `
      CREATE TABLE IF NOT EXISTS stories (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        story_text TEXT NOT NULL,
        language VARCHAR(50) DEFAULT 'english',
        translation_language VARCHAR(50),
        image_url VARCHAR(512),
        image_file_name VARCHAR(255),
        audio_url VARCHAR(512),
        source_type VARCHAR(50),
        source_file_key VARCHAR(512),
        generated_image_url VARCHAR(512),
        created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    try {
      await db.execute(createUsersTable);
      await db.execute(createStoriesTable);
      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
      throw error;
    }
  }

  async save() {
    const query = `
      INSERT INTO stories (
        id, user_id, title, description, story_text, language,
        translation_language, image_url, image_file_name, audio_url,
        source_type, source_file_key, generated_image_url,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      this.id,
      this.userId ?? null,
      this.title,
      this.description,
      this.storyText,
      this.language,
      this.translationLanguage ?? null,
      this.imageUrl ?? null,
      this.imageFileName ?? null,
      this.audioUrl ?? null,
      this.sourceType ?? null,
      this.sourceFileKey ?? null,
      this.generatedImageUrl ?? null,
      this.createdAt,
      this.updatedAt
    ];

    try {
      await db.execute(query, values);
      return this;
    } catch (error) {
      console.error('Error saving story:', error);
      throw error;
    }
  }

  async update() {
    this.updatedAt = new Date();

    const query = `
      UPDATE stories
      SET title = ?, description = ?, story_text = ?, language = ?,
          translation_language = ?, audio_url = ?,
          source_type = ?, source_file_key = ?, generated_image_url = ?,
          updated_at = ?
      WHERE id = ?
    `;

    const values = [
      this.title,
      this.description,
      this.storyText,
      this.language,
      this.translationLanguage,
      this.audioUrl,
      this.sourceType,
      this.sourceFileKey,
      this.generatedImageUrl,
      this.updatedAt,
      this.id
    ];

    try {
      await db.execute(query, values);
      return this;
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM stories WHERE id = ?';

    try {
      const rows = await db.execute(query, [id]);
      if (rows && rows.length > 0) {
        return new Story({
          id: rows[0].ID,
          userId: rows[0].USER_ID,
          title: rows[0].TITLE,
          description: rows[0].DESCRIPTION,
          storyText: rows[0].STORY_TEXT,
          language: rows[0].LANGUAGE,
          translationLanguage: rows[0].TRANSLATION_LANGUAGE,
          imageUrl: rows[0].IMAGE_URL,
          imageFileName: rows[0].IMAGE_FILE_NAME,
          audioUrl: rows[0].AUDIO_URL,
          sourceType: rows[0].SOURCE_TYPE,
          sourceFileKey: rows[0].SOURCE_FILE_KEY,
          generatedImageUrl: rows[0].GENERATED_IMAGE_URL,
          createdAt: rows[0].CREATED_AT,
          updatedAt: rows[0].UPDATED_AT
        });
      }
      return null;
    } catch (error) {
      console.error('Error finding story:', error);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM stories
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const rows = await db.execute(query, [userId, limit, offset]);
      return rows.map(row => new Story({
        id: row.ID,
        userId: row.USER_ID,
        title: row.TITLE,
        description: row.DESCRIPTION,
        storyText: row.STORY_TEXT,
        language: row.LANGUAGE,
        translationLanguage: row.TRANSLATION_LANGUAGE,
        imageUrl: row.IMAGE_URL,
        imageFileName: row.IMAGE_FILE_NAME,
        audioUrl: row.AUDIO_URL,
        sourceType: row.SOURCE_TYPE,
        sourceFileKey: row.SOURCE_FILE_KEY,
        generatedImageUrl: row.GENERATED_IMAGE_URL,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
      }));
    } catch (error) {
      console.error('Error finding stories by user:', error);
      throw error;
    }
  }

  static async findAll(limit = 50, offset = 0) {
    const query = 'SELECT * FROM stories ORDER BY created_at DESC LIMIT ? OFFSET ?';

    try {
      const rows = await db.execute(query, [limit, offset]);
      return rows.map(row => new Story({
        id: row.ID,
        userId: row.USER_ID,
        title: row.TITLE,
        description: row.DESCRIPTION,
        storyText: row.STORY_TEXT,
        language: row.LANGUAGE,
        translationLanguage: row.TRANSLATION_LANGUAGE,
        imageUrl: row.IMAGE_URL,
        imageFileName: row.IMAGE_FILE_NAME,
        audioUrl: row.AUDIO_URL,
        sourceType: row.SOURCE_TYPE,
        sourceFileKey: row.SOURCE_FILE_KEY,
        generatedImageUrl: row.GENERATED_IMAGE_URL,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
      }));
    } catch (error) {
      console.error('Error finding all stories:', error);
      throw error;
    }
  }

  static async deleteById(id) {
    const query = 'DELETE FROM stories WHERE id = ?';

    try {
      await db.execute(query, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      storyText: this.storyText,
      language: this.language,
      translationLanguage: this.translationLanguage,
      imageUrl: this.imageUrl,
      imageFileName: this.imageFileName,
      audioUrl: this.audioUrl,
      sourceType: this.sourceType,
      sourceFileKey: this.sourceFileKey,
      generatedImageUrl: this.generatedImageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Story;