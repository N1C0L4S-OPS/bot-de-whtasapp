const { db } = require('../../../db/scope');

const statsController = {
  async get(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const [remindersSent, remindersFailed, remindersPending, conversationsOpen, conversationsTotal, messagesToday] = await Promise.all([
        db('scheduled_sends').where({ tenant_id: tenantId, status: 'sent' }).count('* as c').first(),
        db('scheduled_sends').where({ tenant_id: tenantId, status: 'failed' }).count('* as c').first(),
        db('scheduled_sends').where({ tenant_id: tenantId, status: 'queued' }).count('* as c').first(),
        db('conversations').where({ tenant_id: tenantId, status: 'open' }).count('* as c').first(),
        db('conversations').where({ tenant_id: tenantId }).count('* as c').first(),
        db('messages').where({ tenant_id: tenantId }).where('created_at', '>=', db.raw("CURRENT_DATE")).count('* as c').first()
      ]);

      res.json({
        reminders: {
          sent: parseInt(remindersSent.c, 10),
          failed: parseInt(remindersFailed.c, 10),
          pending: parseInt(remindersPending.c, 10)
        },
        conversations: {
          open: parseInt(conversationsOpen.c, 10),
          total: parseInt(conversationsTotal.c, 10)
        },
        messages_today: parseInt(messagesToday.c, 10)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },

  async recentReminders(req, res) {
    try {
      const reminders = await db('scheduled_sends')
        .where({ tenant_id: req.user.tenant_id })
        .orderBy('created_at', 'desc')
        .limit(50)
        .select('id', 'appointment_id', 'send_type', 'status', 'scheduled_for', 'sent_at', 'error_message', 'created_at');
      res.json(reminders);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
};

module.exports = { statsController };
