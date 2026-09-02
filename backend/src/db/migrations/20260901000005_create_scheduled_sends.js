/**
 * Reemplazo generalizado de `bot_reminders`. unique(appointment_id, send_type) es, textual,
 * la única pieza del esquema viejo que ya estaba bien diseñada — la garantía de idempotencia
 * (no reenviar el mismo recordatorio dos veces) se copia tal cual, solo renombrada.
 *
 * appointment_id y patient_id son nullable a propósito: hoy todo scheduled_send nace de una
 * cita, pero la idea es que este mecanismo sirva a futuro para otros envíos programados que
 * no estén atados a una cita (campañas, avisos generales).
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('scheduled_sends', (table) => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.integer('appointment_id').unsigned().nullable(); // sin FK real, ver nota en contacts.patient_id
    table.integer('patient_id').unsigned().nullable();
    table.integer('contact_id').unsigned().nullable().references('id').inTable('contacts').onDelete('SET NULL');
    table.string('send_type').notNullable(); // reminder_24h | reminder_3h | ...
    table.string('channel_preference').notNullable().defaultTo('whatsapp');
    table.timestamp('scheduled_for').notNullable();
    table.string('status').notNullable().defaultTo('pending'); // pending | queued | sent | failed
    table.timestamp('sent_at');
    table.text('error_message');
    table.timestamps(true, true);

    table.unique(['appointment_id', 'send_type']);
    table.index(['status', 'scheduled_for']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('scheduled_sends');
};
