import express from 'express';
import DiscordIdeaBot from './discord-bot';
import { registerRoutes } from './routes';
import { setupVite } from './vite';
import dotenv from 'dotenv';

dotenv.config();

async function startCombinedServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT ?? "5000", 10);

  // Setup middleware básico
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Endpoint de salud para uptimerobot
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'IdeaBox Discord Bot'
    });
  });

  // Endpoint de estado del bot
  app.get('/bot-status', (req, res) => {
    res.json({ 
      bot: 'active',
      message: 'Discord bot is running',
      timestamp: new Date().toISOString()
    });
  });

  // Registrar rutas de la API (opcional para futuras integraciones)
  const httpServer = await registerRoutes(app);

  // Setup Vite para desarrollo
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, httpServer);
  }

  // Iniciar servidor HTTP
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Servidor HTTP corriendo en puerto ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
  });

  // Iniciar bot de Discord
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  
  if (discordToken) {
    try {
      const bot = new DiscordIdeaBot();
      await bot.start(discordToken);
      console.log('🤖 Bot de Discord iniciado correctamente');
    } catch (error) {
      console.error('❌ Error iniciando bot de Discord:', error);
      console.log('⚠️  El servidor web continuará funcionando sin el bot');
    }
  } else {
    console.log('⚠️  DISCORD_BOT_TOKEN no encontrado - Solo servidor web activo');
    console.log('💡 Añade el token como variable de entorno para activar el bot');
  }

  return httpServer;
}

// Manejo de errores global
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor si se ejecuta directamente
if (require.main === module) {
  startCombinedServer();
}

export default startCombinedServer;