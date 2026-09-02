const { db } = require('../../../db/scope');

// Nunca devolver access_token/app_secret/verify_token completos a la UI — ni siquiera a un
// admin logueado, para no dejar el token de WhatsApp visible en la pestaña de red del
// navegador. Se muestra enmascarado; para cambiarlo se manda uno nuevo, no se edita el actual.
function mask(config) {
  const { access_token, app_secret, verify_token, ...rest } = config;
  return {
    ...rest,
    access_token_set: !!access_token,
    app_secret_set: !!app_secret,
    verify_token_set: !!verify_token
  };
}

const configController = {
  async list(req, res) {
    try {
      const configs = await db('channel_configs').where({ tenant_id: req.user.tenant_id });
      res.json(configs.map(mask));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },

  async update(req, res) {
    try {
      const { status, access_token, app_secret, verify_token } = req.body;
      const patch = {};
      if (status) patch.status = status;
      if (access_token) patch.access_token = access_token;
      if (app_secret) patch.app_secret = app_secret;
      if (verify_token) patch.verify_token = verify_token;
      patch.updated_at = db.fn.now();

      const [updated] = await db('channel_configs')
        .where({ id: req.params.id, tenant_id: req.user.tenant_id })
        .update(patch)
        .returning('*');

      if (!updated) return res.status(404).json({ error: 'Canal no encontrado.' });
      res.json(mask(updated));
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'No se pudo actualizar la configuración.' });
    }
  }
};

module.exports = { configController };
