/**
 * unique(channel, external_message_id) WHERE external_message_id IS NOT NULL es el guardia de
 * deduplicación que al bot viejo directamente le faltaba: Meta puede reintentar la entrega de
 * un mismo webhook, y sin esto un mensaje entrante se podía procesar dos veces.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('messages', (table) => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.integer('conversation_id').unsigned().notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.string('direction').notNullable();
    table.string('channel').notNullable();
    table.string('external_message_id');
    table.text('body_text');
    table.string('message_type').notNullable().defaultTo('text');
    table.string('status').notNullable().defaultTo('received');
    table.text('error_message');
    table.jsonb('raw_payload');
    table.timestamps(true, true);

    table.index(['conversation_id', 'created_at']);
  });

  // Índice único parcial (solo cuando external_message_id no es null) — knex no tiene un
  // helper directo para "unique ... where", se hace con SQL crudo.
  await knex.raw(`
    CREATE UNIQUE INDEX messages_channel_external_message_id_unique
    ON messages (channel, external_message_id)
    WHERE external_message_id IS NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('messages');
};
