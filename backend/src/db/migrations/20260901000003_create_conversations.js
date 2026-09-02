/**
 * unique(channel_config_id, contact_id) es lo que permite un find-or-create atómico con
 * `INSERT ... ON CONFLICT (channel_config_id, contact_id) DO UPDATE ... RETURNING *` en vez
 * del find-then-create manual (no atómico, con condición de carrera bajo entregas concurrentes
 * de webhook) que tenía el bot viejo.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('conversations', (table) => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.integer('channel_config_id').unsigned().notNullable().references('id').inTable('channel_configs').onDelete('CASCADE');
    table.integer('contact_id').unsigned().notNullable().references('id').inTable('contacts').onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('open'); // open | closed | needs_human
    table.timestamp('last_message_at');
    table.integer('unread_count').notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(['channel_config_id', 'contact_id']);
    table.index(['tenant_id', 'status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('conversations');
};
