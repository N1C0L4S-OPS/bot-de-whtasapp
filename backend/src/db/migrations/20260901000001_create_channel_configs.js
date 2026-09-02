/**
 * Un canal conectado (número de WhatsApp Business, página de Facebook, cuenta de Instagram)
 * por tenant. external_account_id es único GLOBAL (no por tenant): así se resuelve a qué
 * tenant pertenece un webhook entrante que llega sin ningún contexto propio, más que el id
 * de cuenta de Meta al que fue dirigido.
 *
 * Requiere que la tabla `tenants` ya exista en esta misma base (la crea el sistema principal
 * — este bot comparte la base Postgres real del consultorio, no tiene la suya propia).
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('channel_configs', (table) => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('channel').notNullable(); // 'whatsapp' | 'messenger' | 'instagram'
    table.string('external_account_id').notNullable().unique(); // phone_number_id / page_id / ig_user_id
    table.text('access_token'); // token de la cuenta (cifrado a nivel de infraestructura, no en columna aparte por ahora)
    table.string('verify_token');
    table.string('app_secret');
    table.string('status').notNullable().defaultTo('active'); // active | disabled
    table.jsonb('config_json').defaultTo('{}'); // extras específicos del canal
    table.timestamps(true, true);

    table.index(['tenant_id', 'channel']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('channel_configs');
};
