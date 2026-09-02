const path = require('path');
require('dotenv').config();

// El CLI de knex (npx knex migrate:latest) no pasa por src/index.js, así que sin este
// dotenv.config() acá no leía backend/.env y siempre caía al fallback de SQLite.
if (process.env.DB_CLIENT === 'postgres' && !process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD no está definido. Configúralo en las variables de entorno antes de iniciar el servidor.');
}

// El bot vive en la MISMA base Postgres que el sistema principal (DB_NAME=mydents por
// defecto en ambos): sus tablas (channel_configs, contacts, conversations, messages,
// scheduled_sends) son nuevas y propias, pero resuelve pacientes/citas via join directo
// contra las tablas de ese otro repo, sin duplicar ni sincronizar nada.
//
// El fallback a SQLite (sin DB_CLIENT=postgres) es solo para poder levantar el bot sin
// Docker en desarrollo local — en ese modo las tablas propias del bot funcionan, pero los
// joins contra patients/appointments no existen (viven en otra base física). Para probar
// el flujo completo de extremo a extremo hay que correr con DB_CLIENT=postgres.
module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'sqlite3',
    connection: process.env.DB_CLIENT === 'postgres' ? {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'mydents',
      user: process.env.DB_USER || 'mydents',
      password: process.env.DB_PASSWORD
    } : {
      filename: process.env.DB_FILENAME || path.join(__dirname, 'data', 'bot-dev.db')
    },
    useNullAsDefault: process.env.DB_CLIENT !== 'postgres',
    // tableName propio: knex usa por defecto una tabla `knex_migrations` GLOBAL a la base
    // conectada, sin distinguir de qué app son las migraciones. Como esta base la comparte
    // con el sistema principal (que ya tiene su propia knex_migrations con sus 24 archivos),
    // sin esto el CLI de acá se confunde pensando que le "faltan" los archivos de ESE repo.
    migrations: {
      directory: path.join(__dirname, 'src', 'db', 'migrations'),
      tableName: 'bot_knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'src', 'db', 'seeds')
    },
    pool: process.env.DB_CLIENT === 'postgres' ? {
      min: 2,
      max: 10
    } : {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    // tableName propio: knex usa por defecto una tabla `knex_migrations` GLOBAL a la base
    // conectada, sin distinguir de qué app son las migraciones. Como esta base la comparte
    // con el sistema principal (que ya tiene su propia knex_migrations con sus 24 archivos),
    // sin esto el CLI de acá se confunde pensando que le "faltan" los archivos de ESE repo.
    migrations: {
      directory: path.join(__dirname, 'src', 'db', 'migrations'),
      tableName: 'bot_knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'src', 'db', 'seeds')
    },
    pool: {
      min: 2,
      max: 20
    }
  }
};
