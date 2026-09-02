const { db } = require('../../../db/scope');
const { getOutboundQueue } = require('../../../queues/outboundQueue');

const conversationsController = {
  async list(req, res) {
    try {
      const { channel, status } = req.query;
      let query = db('conversations as c')
        .where('c.tenant_id', req.user.tenant_id)
        .join('contacts as ct', 'c.contact_id', 'ct.id')
        .join('channel_configs as cc', 'c.channel_config_id', 'cc.id')
        .select(
          'c.id', 'c.status', 'c.last_message_at', 'c.unread_count',
          'cc.channel',
          'ct.id as contact_id', 'ct.display_name', 'ct.phone', 'ct.external_contact_id'
        )
        .orderBy('c.last_message_at', 'desc');

      if (channel) query = query.where('cc.channel', channel);
      if (status) query = query.where('c.status', status);

      const conversations = await query.limit(100);

      // último mensaje de cada conversación, para la vista previa de la lista
      const ids = conversations.map((c) => c.id);
      const lastMessages = ids.length
        ? await db('messages')
            .whereIn('conversation_id', ids)
            .distinctOn('conversation_id')
            .orderBy('conversation_id')
            .orderBy('created_at', 'desc')
            .select('conversation_id', 'direction', 'body_text', 'status', 'created_at')
        : [];
      const lastMessageByConv = Object.fromEntries(lastMessages.map((m) => [m.conversation_id, m]));

      res.json(conversations.map((c) => ({ ...c, last_message: lastMessageByConv[c.id] || null })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },

  async getMessages(req, res) {
    try {
      const conversation = await db('conversations')
        .where({ id: req.params.id, tenant_id: req.user.tenant_id })
        .first();
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada.' });

      const messages = await db('messages')
        .where({ conversation_id: conversation.id })
        .orderBy('created_at', 'asc')
        .select('id', 'direction', 'channel', 'body_text', 'message_type', 'status', 'error_message', 'created_at');

      // marcar como leído del lado del panel (no del canal — eso es aparte)
      await db('conversations').where({ id: conversation.id }).update({ unread_count: 0 });

      res.json({ conversation, messages });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },

  async sendMessage(req, res) {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });

      const conversation = await db('conversations as c')
        .where({ 'c.id': req.params.id, 'c.tenant_id': req.user.tenant_id })
        .join('contacts as ct', 'c.contact_id', 'ct.id')
        .join('channel_configs as cc', 'c.channel_config_id', 'cc.id')
        .select('c.id', 'c.channel_config_id', 'cc.channel', 'ct.external_contact_id')
        .first();
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada.' });

      await getOutboundQueue(conversation.channel).add('send-message', {
        channel: conversation.channel,
        channelConfigId: conversation.channel_config_id,
        conversationId: conversation.id,
        tenantId: req.user.tenant_id,
        externalContactId: conversation.external_contact_id,
        text: text.trim()
      });

      res.status(202).json({ message: 'Mensaje encolado para envío.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
};

module.exports = { conversationsController };
