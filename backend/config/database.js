const snowflake = require('snowflake-sdk');
require('dotenv').config();

class SnowflakeDB {
  constructor() {
    this.connection = null;
    this.connectionOptions = {
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      role: process.env.SNOWFLAKE_ROLE,
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      if (this.connection) {
        return resolve(this.connection);
      }

      this.connection = snowflake.createConnection(this.connectionOptions);

      this.connection.connect((err, conn) => {
        if (err) {
          console.error('Unable to connect to Snowflake:', err.message);
          reject(err);
        } else {
          console.log('✅ Successfully connected to Snowflake');
          resolve(conn);
        }
      });
    });
  }

  async execute(query, binds = []) {
    try {
      const conn = await this.connect();

      return new Promise((resolve, reject) => {
        conn.execute({
          sqlText: query,
          binds: binds,
          complete: (err, stmt, rows) => {
            if (err) {
              console.error('Failed to execute statement:', err.message);
              reject(err);
            } else {
              resolve(rows);
            }
          }
        });
      });
    } catch (error) {
      console.error('Database execution error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      return new Promise((resolve) => {
        this.connection.destroy((err) => {
          if (err) {
            console.error('Error disconnecting from Snowflake:', err.message);
          } else {
            console.log('✅ Disconnected from Snowflake');
          }
          this.connection = null;
          resolve();
        });
      });
    }
  }
}

// Create singleton instance
const db = new SnowflakeDB();

// Export both the instance and the class
module.exports = {
  db,
  SnowflakeDB
};