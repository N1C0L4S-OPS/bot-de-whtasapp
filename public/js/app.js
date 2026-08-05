const API_URL = window.location.origin + '/api';

async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/stats`);
    const data = await res.json();
    document.getElementById('totalReminders').textContent = data.reminders.total;
    document.getElementById('sentReminders').textContent = data.reminders.sent;
    document.getElementById('failedReminders').textContent = data.reminders.failed;
    document.getElementById('totalConversations').textContent = data.conversations;
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function fetchConfig() {
  try {
    const res = await fetch(`${API_URL}/config`);
    const data = await res.json();
    const modeLabels = {
      'known_patients': 'Solo Pacientes Conocidos',
      'keyword': 'Palabra Clave',
      'all': 'Todos',
    };
    document.getElementById('responseMode').textContent = modeLabels[data.responseMode] || data.responseMode;
    document.getElementById('keywordTrigger').textContent = data.keywordTrigger;
    document.getElementById('reminder24h').textContent = `Diario a las ${data.reminder24hHour}:00`;
    document.getElementById('reminder3h').textContent = data.reminder3hEnabled ? 'Activo (cada hora)' : 'Inactivo';
  } catch (err) {
    console.error('Error fetching config:', err);
  }
}

async function fetchReminders() {
  try {
    const res = await fetch(`${API_URL}/reminders`);
    const data = await res.json();
    const container = document.getElementById('remindersList');

    if (data.length === 0) {
      container.innerHTML = '<div class="reminder-item">No hay recordatorios aún</div>';
      return;
    }

    container.innerHTML = data.map(r => `
      <div class="reminder-item">
        <div>
          <strong>${r.patient_name}</strong>
          <div style="font-size:12px;color:#666">${r.patient_phone} - ${r.reminder_type}</div>
        </div>
        <span class="badge badge-${r.status}">${r.status === 'sent' ? 'Enviado' : r.status === 'failed' ? 'Fallido' : 'Pendiente'}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching reminders:', err);
  }
}

async function fetchMessages() {
  try {
    const res = await fetch(`${API_URL}/messages`);
    const data = await res.json();
    const container = document.getElementById('messagesList');

    if (data.length === 0) {
      container.innerHTML = '<div class="message-item">No hay mensajes aún</div>';
      return;
    }

    container.innerHTML = data.map(m => `
      <div class="message-item">
        <div>
          <strong>${m.patient_name || m.phone_number}</strong>
          <div style="font-size:12px;color:#666">${m.message_text.substring(0, 50)}${m.message_text.length > 50 ? '...' : ''}</div>
        </div>
        <span class="badge badge-${m.direction}">${m.direction === 'in' ? 'Recibido' : 'Enviado'}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching messages:', err);
  }
}

function init() {
  fetchStats();
  fetchConfig();
  fetchReminders();
  fetchMessages();

  setInterval(fetchStats, 30000);
  setInterval(fetchReminders, 60000);
  setInterval(fetchMessages, 60000);
}

document.addEventListener('DOMContentLoaded', init);
