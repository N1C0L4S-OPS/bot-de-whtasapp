require('dotenv').config();

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mydents',
    user: process.env.DB_USER || 'mydents',
    password: process.env.DB_PASSWORD || 'mydents_secure_2026',
  },
  pool: {
    min: 2,
    max: 10,
  },
});

module.exports = knex;
