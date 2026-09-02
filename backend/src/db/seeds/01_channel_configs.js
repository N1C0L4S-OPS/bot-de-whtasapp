require('dotenv').config();

// Siembra el channel_config de WhatsApp de My Dent's a partir de las variables de entorno
// WHATSAPP_* — es un paso de configuración inicial, no algo que la app lea en runtime: una
// vez sembrado, todo lo demás (envío, verificación de firma) lee esta fila de la base, no
// process.env, para poder soportar más de un tenant/cuenta más adelante sin tocar código.
//
// No hace nada si ya existe un channel_config con ese external_account_id (evita duplicar en
// cada `knex seed:run`).

/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  const tenant = await knex('tenants').where({ slug: 'my-dents' }).first();
  if (!tenant) {
    console.warn('No se encontró el tenant "my-dents" — ¿corriste las migraciones del sistema principal primero?');
    return;
  }

  const externalAccountId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!externalAccountId) {
    console.warn('WHATSAPP_PHONE_NUMBER_ID no está configurado — se omite la siembra del channel_config de WhatsApp.');
    return;
  }

  const existing = await knex('channel_configs').where({ external_account_id: externalAccountId }).first();
  if (existing) {
    console.log('channel_config de WhatsApp ya existe, no se vuelve a crear.');
    return;
  }

  await knex('channel_configs').insert({
    tenant_id: tenant.id,
    channel: 'whatsapp',
    external_account_id: externalAccountId,
    access_token: process.env.WHATSAPP_TOKEN || null,
    verify_token: process.env.WHATSAPP_VERIFY_TOKEN || null,
    app_secret: process.env.WHATSAPP_APP_SECRET || null,
    status: 'active'
  });

  console.log('channel_config de WhatsApp sembrado.');
};
