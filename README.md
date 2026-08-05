# bot-de-whtasapp

Bot escalable de WhatsApp para **Centro Odontológico My Dent's** - Recordatorios automáticos y gestión de citas.

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                 My Dent's Bot                    │
├─────────────────────────────────────────────────┤
│  FASE 1 (Actual)     │  FASE 2 (Futuro)        │
│  - Recordatorios      │  - Respuestas rule-based │
│  - GUI Panel          │  - Info consultorio      │
│  - Webhook            │  - Agenda citas          │
├─────────────────────────────────────────────────┤
│  FASE 3 (Futuro)                               │
│  - IA para consultorio                         │
│  - Preguntas frecuentes                        │
│  - NLP avanzado                                │
└─────────────────────────────────────────────────┘
```

## Funcionalidades FASE 1

### Recordatorios Automáticos
- **24 horas antes**: Se envía a las 8:00 AM del día anterior
- **3 horas antes**: Se envía automáticamente 3 horas antes de la cita
- **Formato**: Fecha, hora, tratamiento, doctor y centro

### Modos de Respuesta
- **Solo Pacientes Conocidos** (recomendado): Solo responde a números registrados en la BD
- **Palabra Clave**: Solo responde cuando escribe "PACIENTE" al inicio
- **Todos**: Responde a todos (no recomendado por riesgo de spam)

### Panel de Control (GUI)
- Estadísticas de recordatorios enviados/fallidos
- Lista de últimos recordatorios
- Lista de mensajes recibidos/enviados
- Configuración actual del bot

## Instalación

### Requisitos
- Docker y Docker Compose
- Cuenta en Meta for Developers (WhatsApp Cloud API)
- Número de WhatsApp Business verificado

### Paso 1: Configurar WhatsApp Cloud API

1. Crear cuenta en [Meta for Developers](https://developers.facebook.com/)
2. Crear una App → Producto: WhatsApp
3. Obtener:
   - `WHATSAPP_TOKEN`: Token de acceso permanente
   - `WHATSAPP_PHONE_NUMBER_ID`: ID del número de teléfono
   - `WHATSAPP_VERIFY_TOKEN`: Token de verificación ( tú lo defines)

### Paso 2: Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### Paso 3: Ejecutar con Docker

```bash
# Levantar el bot
docker-compose up -d

# Ver logs
docker-compose logs -f bot

# Detener
docker-compose down
```

### Paso 4: Configurar Webhook en Meta

1. Ir a WhatsApp → Configuration → Webhook
2. URL: `https://tu-dominio.com/webhook`
3. Verify Token: el que configuraste en .env
4. Suscribir a: `messages`

## Estructura del Proyecto

```
bot-de-whtasapp/
├── src/
│   ├── index.js              # Entry point
│   ├── config/
│   │   ├── db.js             # Conexión PostgreSQL
│   │   └── whatsapp.js       # Config WhatsApp API
│   ├── services/
│   │   ├── appointmentService.js  # Queries de citas
│   │   ├── reminderService.js     # Lógica de recordatorios
│   │   └── whatsappService.js     # Enviar mensajes
│   ├── scheduler/
│   │   └── cron.js           # Cron jobs
│   ├── web/
│   │   ├── server.js         # Express server
│   │   └── routes.js         # API endpoints
│   └── utils/
│       └── helpers.js        # Utilidades
├── public/                   # GUI estática
├── migrations/               # Migraciones de BD
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/stats` | Estadísticas del bot |
| GET | `/api/reminders` | Últimos recordatorios |
| GET | `/api/messages` | Últimos mensajes |
| GET | `/api/config` | Configuración actual |
| POST | `/webhook` | Webhook de WhatsApp |

## Base de Datos

### Tablas Nuevas (bot)

- **bot_reminders**: Registro de recordatorios enviados
- **bot_conversations**: Conversaciones activas
- **bot_messages**: Mensajes enviados/recibidos

### Tablas Existentes (sistema principal)

- **appointments**: Citas (con campos payment_status, surgeon_id)
- **patients**: Pacientes (con phone)
- **users**: Doctores/usuarios

## Reglas del Bot

```
MENSAJE ENTRANTE
    │
    ├── ¿Es número de paciente registrado?
    │   ├── SÍ → Responder automáticamente
    │   └── NO → ¿Modo keyword?
    │       ├── SÍ → ¿Escribe "PACIENTE" al inicio?
    │       │   ├── SÍ → Responder
    │       │   └── NO → Silencio (doctor responde manual)
    │       └── NO → Silencio total
    │
    └── RECORDATORIOS (automáticos)
        ├── 24h antes → Siempre enviar
        └── 3h antes → Siempre enviar
```

## Roadmap

### FASE 1 ✅
- [x] Recordatorios automáticos (24h + 3h)
- [x] Panel de control (GUI)
- [x] Modo de respuesta configurable
- [x] Docker containerized

### FASE 2 (Próximo)
- [ ] Respuestas rule-based (precios, horarios, ubicación)
- [ ] Gestión de agenda vía chat
- [ ] Confirmación de citas
- [ ] Estado de cuenta

### FASE 3 (Futuro)
- [ ] Integración con LLM (GPT/Claude)
- [ ] NLP para preguntas complejas
- [ ] Análisis de sentimiento
- [ ] Multi-consultorio

## Configuración

### Modos de Respuesta

| Modo | Variable | Descripción |
|------|----------|-------------|
| `known_patients` | `RESPONSE_MODE` | Solo responde a pacientes en BD |
| `keyword` | `RESPONSE_MODE` | Responde con palabra clave |
| `all` | `RESPONSE_MODE` | Responde a todos |

### Recordatorios

| Variable | Default | Descripción |
|----------|---------|-------------|
| `REMINDER_24H_HOUR` | `8` | Hora envío recordatorio 24h |
| `REMINDER_24H_MINUTE` | `0` | Minuto envío recordatorio 24h |
| `REMINDER_3H_ENABLED` | `true` | Activar recordatorio 3h |

## Licencia

ISC

## Soporte

**Centro Odontológico My Dent's**
- WhatsApp: [Tu número]
- Email: [Tu email]
