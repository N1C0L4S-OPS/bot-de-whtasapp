require('dotenv').config();
const knex = require('../src/config/db');

async function migrate() {
  console.log('Running bot migrations...');

  await knex.schema.hasTable('bot_reminders').then(exists => {
    if (!exists) {
      return knex.schema.createTable('bot_reminders', table => {
        table.increments('id').primary();
        table.integer('appointment_id').unsigned().references('id').inTable('appointments').onDelete('CASCADE');
        table.integer('patient_id').unsigned().references('id').inTable('patients').onDelete('CASCADE');
        table.string('patient_phone', 20).notNullable();
        table.string('patient_name', 200).notNullable();
        table.string('reminder_type', 20).notNullable();
        table.timestamp('appointment_datetime').notNullable();
        table.string('status', 20).defaultTo('pending');
        table.timestamp('sent_at');
        table.text('error_message');
        table.timestamps(true, true);
      });
    }
  });

  await knex.schema.hasTable('bot_conversations').then(exists => {
    if (!exists) {
      return knex.schema.createTable('bot_conversations', table => {
        table.increments('id').primary();
        table.string('phone_number', 20).notNullable().unique();
        table.integer('patient_id').unsigned().references('id').inTable('patients').onDelete('SET NULL');
        table.string('patient_name', 200);
        table.string('status', 20).defaultTo('active');
        table.timestamp('last_message_at');
        table.timestamps(true, true);
      });
    }
  });

  await knex.schema.hasTable('bot_messages').then(exists => {
    if (!exists) {
      return knex.schema.createTable('bot_messages', table => {
        table.increments('id').primary();
        table.integer('conversation_id').unsigned().references('id').inTable('bot_conversations').onDelete('CASCADE');
        table.string('direction', 10).notNullable();
        table.text('message_text').notNullable();
        table.string('status', 20).defaultTo('delivered');
        table.string('whatsapp_message_id', 100);
        table.timestamps(true, true);
      });
    }
  });

  console.log('Bot migrations completed.');
  await knex.destroy();
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
