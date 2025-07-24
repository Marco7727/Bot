# 🤖 Bot de Discord - IdeaBox

## 📋 Descripción

Bot de Discord para gestionar ideas con sistema de votación usando reacciones de pulgar arriba/abajo y controles de administración mediante comandos slash.

## ✨ Características

### 🔧 Comandos Disponibles

- `/idea` - Crear una nueva idea con título, descripción y categoría
- `/ideas` - Ver lista de ideas (con filtro por estado opcional)
- `/stats` - Ver estadísticas de ideas (solo admins)
- `/setrango` - Asignar rangos a usuarios (solo super admins)

### 👍 Sistema de Votación

- **👍** - Voto positivo (pulgar arriba)
- **👎** - Voto negativo (pulgar abajo)
- Solo un voto por usuario por idea
- Los usuarios pueden cambiar su voto reaccionando de nuevo

### 🛡️ Sistema de Roles

- **Usuario** - Puede crear ideas y votar
- **Moderador** - Puede aprobar/rechazar ideas + permisos de usuario
- **Administrador** - Puede ver estadísticas + permisos de moderador
- **Super Admin** - Puede asignar rangos + todos los permisos

### ⚡ Controles de Admin

- Botones de **✅ Aprobar** y **❌ Rechazar** en cada idea (solo admins)
- Las ideas rechazadas no permiten más votaciones
- Actualización automática del estado en el mensaje original

## 🚀 Configuración

### 1. Crear Bot en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. Ve a la sección "Bot"
4. Crea un bot y copia el token
5. Activa los siguientes privilegios:
   - `Send Messages`
   - `Use Slash Commands`
   - `Add Reactions`
   - `Read Message History`

### 2. Invitar Bot al Servidor

Genera un enlace de invitación con estos permisos:
- `applications.commands` (Slash Commands)
- `bot`
- `Send Messages`
- `Add Reactions`
- `Read Message History`

### 3. Configurar Variables de Entorno

Añade el token del bot como variable de entorno:

```bash
DISCORD_BOT_TOKEN=tu_token_aqui
```

### 4. Iniciar el Bot

```bash
# Desarrollo
npm run dev:bot

# Producción
npm run build:bot
npm run start:bot
```

## 📝 Ejemplo de Uso

### Crear una Idea
```
/idea titulo:"Sistema de notificaciones" descripcion:"Implementar notificaciones push para usuarios" categoria:tecnologia
```

### Ver Ideas
```
/ideas estado:pending
```

### Asignar Rango (Solo Super Admin)
```
/setrango usuario:@usuario rango:admin
```

## 🗃️ Base de Datos

El bot utiliza PostgreSQL con las siguientes tablas:

- `discord_users` - Usuarios de Discord con roles
- `ideas` - Ideas con estado y metadata de Discord
- `votes` - Votos de usuarios en ideas

## 🔧 Desarrollo

### Estructura de Archivos

- `server/discord-bot.ts` - Lógica principal del bot
- `server/discord-main.ts` - Punto de entrada del bot
- `shared/schema.ts` - Esquemas de base de datos

### Agregar Nuevos Comandos

1. Añadir comando en `setupCommands()`
2. Implementar handler en `handleCommand()`
3. Actualizar permisos si es necesario

## 🎯 Próximas Funcionalidades

- [ ] Comando `/misvotaciones` para ver votaciones del usuario
- [ ] Sistema de categorías personalizables
- [ ] Notificaciones automáticas cuando se aprueban/rechazan ideas
- [ ] Dashboard web para admins
- [ ] Integración con webhooks

## 🐛 Solución de Problemas

### Bot no responde
- Verificar que el token sea correcto
- Confirmar que el bot tenga los permisos necesarios
- Revisar logs de la consola

### Comandos no aparecen
- Los comandos se registran automáticamente al iniciar
- Puede tomar unos minutos en aparecer en Discord
- Reiniciar Discord si es necesario

### Error de permisos
- Verificar que el bot tenga permisos en el canal
- Confirmar que el usuario tenga el rol adecuado en la base de datos