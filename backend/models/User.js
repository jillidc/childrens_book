const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.walletAddress = data.walletAddress || null;
    this.username = data.username || null;
    this.email = data.email || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const query = `
      INSERT INTO users (id, wallet_address, username, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      this.id,
      this.walletAddress,
      this.username,
      this.email,
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
      SET username = ?, email = ?, updated_at = ?
      WHERE id = ?
    `;

    const values = [this.username, this.email, this.updatedAt, this.id];

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
          walletAddress: rows[0].WALLET_ADDRESS,
          username: rows[0].USERNAME,
          email: rows[0].EMAIL,
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

  static async findByWalletAddress(walletAddress) {
    const query = 'SELECT * FROM users WHERE wallet_address = ?';

    try {
      const rows = await db.execute(query, [walletAddress]);
      if (rows && rows.length > 0) {
        return new User({
          id: rows[0].ID,
          walletAddress: rows[0].WALLET_ADDRESS,
          username: rows[0].USERNAME,
          email: rows[0].EMAIL,
          createdAt: rows[0].CREATED_AT,
          updatedAt: rows[0].UPDATED_AT
        });
      }
      return null;
    } catch (error) {
      console.error('Error finding user by wallet:', error);
      throw error;
    }
  }

  static async findOrCreateByWallet(walletAddress) {
    try {
      let user = await User.findByWalletAddress(walletAddress);

      if (!user) {
        user = new User({ walletAddress });
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('Error finding or creating user:', error);
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
      walletAddress: this.walletAddress,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;