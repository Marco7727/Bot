import DiscordIdeaBot from './discord-bot';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  
  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN no encontrado en las variables de entorno');
    console.log('Para usar el bot de Discord, necesitas:');
    console.log('1. Crear una aplicación en https://discord.com/developers/applications');
    console.log('2. Crear un bot y copiar el token');
    console.log('3. Añadir el token como variable de entorno DISCORD_BOT_TOKEN');
    process.exit(1);
  }

  try {
    const bot = new DiscordIdeaBot();
    await bot.start(token);
    console.log('🤖 Bot de Discord IdeaBox iniciado correctamente');
  } catch (error) {
    console.error('❌ Error iniciando el bot de Discord:', error);
    process.exit(1);
  }
}

// Iniciar el bot si se ejecuta directamente
if (require.main === module) {
  startDiscordBot();
}

export default startDiscordBot;