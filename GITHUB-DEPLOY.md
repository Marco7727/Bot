
# 🚀 Despliegue GitHub → Replit → UptimeRobot (24/7)

## 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit - IdeaBox Discord Bot"
git branch -M main
git remote add origin https://github.com/tu-usuario/ideabox-bot.git
git push -u origin main
```

## 2. Deployment en Replit

### Desde GitHub a Replit:
1. Ve a [replit.com](https://replit.com)
2. Click "Create Repl" → "Import from GitHub"
3. Pega tu URL de GitHub
4. Replit detectará automáticamente el proyecto Node.js

### Variables de Entorno en Replit:
Ve a "Secrets" en tu Repl y añade:

```
DISCORD_BOT_TOKEN=tu_token_aqui
SESSION_SECRET=clave_secreta_random
DATABASE_URL=postgresql://... (Replit lo genera automáticamente)
NODE_ENV=production
```

### 3. Deploy en Replit

1. Click "Deploy" en tu workspace
2. Selecciona "Autoscale Deployment"
3. Configuración:
   - **Machine Power**: 0.25 vCPU, 1 GB RAM (suficiente para bot)
   - **Max instances**: 1 (para ahorro de costos)

## 4. UptimeRobot Setup (24/7)

### Endpoints disponibles:
- **Health Check**: `https://tu-repl.replit.app/health`
- **Bot Status**: `https://tu-repl.replit.app/bot-status`

### Configuración UptimeRobot:
1. Regístrate en [uptimerobot.com](https://uptimerobot.com) (gratis)
2. "Add New Monitor":
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://tu-repl.replit.app/health`
   - **Monitoring Interval**: 5 minutos
   - **Keyword**: `"status":"ok"` (opcional)

### Respuesta Health Check:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": 3600,
  "service": "IdeaBox Discord Bot"
}
```

## 5. Verificación Final

### ✅ Checklist:
- [ ] Bot conectado en Discord (comandos funcionan)
- [ ] Health endpoint responde OK
- [ ] UptimeRobot monitoreando cada 5 min
- [ ] Deployment activo en Replit

### Comandos para probar:
```
/idea titulo:"Test idea" descripcion:"Probando el bot" categoria:tecnologia
/ideas
```

## 6. Costos (Replit)

- **Autoscale**: ~$0.02/hora cuando está activo
- **PostgreSQL**: ~$2/mes
- **UptimeRobot**: Gratis hasta 50 monitores

**Total estimado**: $5-10/mes para 24/7

## 7. Mantenimiento

### Actualizar desde GitHub:
1. Haz push a GitHub
2. En Replit: "Deploy" → "Deploy latest commit"

### Monitoreo:
- UptimeRobot te enviará alertas por email si el bot falla
- Logs disponibles en tiempo real en Replit
