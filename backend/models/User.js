const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.username = data.username || null;
    this.email = data.email || null;
    this.passwordHash = data.passwordHash || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const query = `
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      this.id,
      this.username,
      this.email,
      this.passwordHash,
      this.createdAt,
      this.updatedAt
    ];

    try {
      await db.execute(query, values);
      return this;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async update() {
    this.updatedAt = new Date();

    const query = `
      UPDATE users
      SET username = ?, email = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `;

    const values = [this.username, this.email, this.passwordHash, this.updatedAt, this.id];

    try {
      await db.execute(query, values);
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';

    try {
      const rows = await db.execute(query, [id]);
      if (rows && rows.length > 0) {
        return new User({
          id: rows[0].ID,
          username: rows[0].USERNAME,
          email: rows[0].EMAIL,
          passwordHash: rows[0].PASSWORD_HASH,
          createdAt: rows[0].CREATED_AT,
          updatedAt: rows[0].UPDATED_AT
        });
      }
      return null;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    if (!email) return null;
    const query = 'SELECT * FROM users WHERE email = ?';
    try {
      const rows = await db.execute(query, [email]);
      if (rows && rows.length > 0) {
        return new User({
          id: rows[0].ID,
          username: rows[0].USERNAME,
          email: rows[0].EMAIL,
          passwordHash: rows[0].PASSWORD_HASH,
          createdAt: rows[0].CREATED_AT,
          updatedAt: rows[0].UPDATED_AT
        });
      }
      return null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async deleteById(id) {
    const query = 'DELETE FROM users WHERE id = ?';

    try {
      await db.execute(query, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;