import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import { api } from '../api/client';

const CHANNEL_LABELS = { whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram' };

export default function ConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    api.channelConfigs.list().then(setConfigs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (config) => {
    const newStatus = config.status === 'active' ? 'disabled' : 'active';
    setSavingId(config.id);
    try {
      const updated = await api.channelConfigs.update(config.id, { status: newStatus });
      setConfigs((prev) => prev.map((c) => (c.id === config.id ? updated : c)));
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configuración de canales</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : configs.length === 0 ? (
        <div className="card text-center py-12">
          <Settings className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay ningún canal configurado todavía.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <div key={config.id} className="card flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {config.status === 'active' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{CHANNEL_LABELS[config.channel] || config.channel}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cuenta: {config.external_account_id}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <KeyRound className="w-3 h-3" />
                    {config.access_token_set ? 'Token configurado' : 'Sin token'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(config)}
                disabled={savingId === config.id}
                className={config.status === 'active' ? 'btn-secondary' : 'btn-primary'}
              >
                {savingId === config.id ? 'Guardando...' : config.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Para cambiar el token de acceso o el secreto de la app, hacelo desde el archivo de
        configuración del servidor — por seguridad no se muestran ni se editan acá.
      </p>
    </div>
  );
}
