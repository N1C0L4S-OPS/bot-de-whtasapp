import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Clock, MessageSquare, Users } from 'lucide-react';
import { api } from '../api/client';

const STATUS_LABELS = { sent: 'Enviado', failed: 'Falló', queued: 'En cola', pending: 'Pendiente' };
const STATUS_COLORS = {
  sent: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-red-600 dark:text-red-400',
  queued: 'text-amber-600 dark:text-amber-400',
  pending: 'text-gray-500'
};

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([api.stats.get(), api.stats.recentReminders()]);
      setStats(s);
      setReminders(r);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Estadísticas</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} color="bg-emerald-500" value={stats?.reminders.sent ?? '—'} label="Recordatorios enviados" />
        <StatCard icon={XCircle} color="bg-red-500" value={stats?.reminders.failed ?? '—'} label="Recordatorios fallidos" />
        <StatCard icon={Clock} color="bg-amber-500" value={stats?.reminders.pending ?? '—'} label="En cola" />
        <StatCard icon={Users} color="bg-primary-500" value={stats?.conversations.open ?? '—'} label="Conversaciones abiertas" />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Últimos recordatorios</h2>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Todavía no se programó ningún recordatorio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4">Cita</th>
                  <th className="pb-2 pr-4">Tipo</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2">Programado para</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">#{r.appointment_id}</td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{r.send_type.replace('reminder_', '')}</td>
                    <td className={`py-2 pr-4 font-medium ${STATUS_COLORS[r.status] || ''}`}>
                      {STATUS_LABELS[r.status] || r.status}
                      {r.error_message && <span className="block text-xs font-normal text-gray-400 truncate max-w-xs">{r.error_message}</span>}
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{new Date(r.scheduled_for).toLocaleString('es-PE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label }) {
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
