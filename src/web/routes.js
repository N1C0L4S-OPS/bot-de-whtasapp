const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/stats', async (req, res) => {
  try {
    const totalReminders = await db('bot_reminders').count('id as count').first();
    const sentReminders = await db('bot_reminders').where('status', 'sent').count('id as count').first();
    const failedReminders = await db('bot_reminders').where('status', 'failed').count('id as count').first();
    const totalConversations = await db('bot_conversations').count('id as count').first();
    const totalMessages = await db('bot_messages').count('id as count').first();

    res.json({
      reminders: {
        total: parseInt(totalReminders.count) || 0,
        sent: parseInt(sentReminders.count) || 0,
        failed: parseInt(failedReminders.count) || 0,
      },
      conversations: parseInt(totalConversations.count) || 0,
      messages: parseInt(totalMessages.count) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reminders', async (req, res) => {
  try {
    const reminders = await db('bot_reminders')
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const messages = await db('bot_messages')
      .join('bot_conversations', 'bot_messages.conversation_id', 'bot_conversations.id')
      .select(
        'bot_messages.*',
        'bot_conversations.phone_number',
        'bot_conversations.patient_name'
      )
      .orderBy('bot_messages.created_at', 'desc')
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/config', (req, res) => {
  res.json({
    responseMode: process.env.RESPONSE_MODE || 'known_patients',
    keywordTrigger: process.env.KEYWORD_TRIGGER || 'PACIENTE',
    reminder24hHour: process.env.REMINDER_24H_HOUR || 8,
    reminder3hEnabled: process.env.REMINDER_3H_ENABLED === 'true',
    clinicName: process.env.CLINIC_NAME || 'Centro Odontológico MY DENT\'S',
  });
});

module.exports = router;
