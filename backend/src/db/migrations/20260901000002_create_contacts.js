/**
 * Identidad de un contacto, agnóstica al canal. NO tiene FK obligatoria a `patients` — un
 * contacto de Facebook/Instagram, o un número de WhatsApp que todavía no se cruzó con
 * ningún paciente registrado, tiene que poder existir igual. El vínculo con un paciente
 * real es opcional y se resuelve más tarde (findPatientByPhone, etc), nunca al crear el
 * contacto.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('contacts', (table) => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('channel').notNullable();
    table.string('external_contact_id').notNullable(); // wa_id / PSID / IGSID
    table.string('display_name');
    table.string('phone'); // solo tiene sentido para whatsapp
    table.integer('patient_id').unsigned().nullable(); // FK cruzada a otro repo/base lógica; sin
    // constraint de FK real porque `patients` vive en el mismo Postgres pero es una tabla que
    // gobierna el sistema principal — no queremos que un rollback de migración de ESTE repo
    // dependa de esa tabla, ni que un ON DELETE de allá se propague implícitamente sin que
    // quede explícito en el código que lo hace.
    table.timestamp('first_seen_at').defaultTo(knex.fn.now());
    table.timestamp('last_seen_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.unique(['tenant_id', 'channel', 'external_contact_id']);
    table.index(['patient_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('contacts');
};
