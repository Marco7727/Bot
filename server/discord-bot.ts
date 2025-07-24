import { Client, GatewayIntentBits, SlashCommandBuilder, CommandInteraction, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { db } from './db';
import { discordUsers, ideas, votes, serverConfig } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

class DiscordIdeaBot {
  private client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.setupEventHandlers();
    this.setupCommands();
  }

  private setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`¡Bot de IdeaBox conectado como ${this.client.user?.tag}!`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      }
    });

    // Manejar reacciones para votación
    this.client.on('messageReactionAdd', async (reaction, user) => {
      await this.handleReactionAdd(reaction, user);
    });

    this.client.on('messageReactionRemove', async (reaction, user) => {
      await this.handleReactionRemove(reaction, user);
    });
  }

  private async setupCommands() {
    const commands = [
      // Comando para crear una nueva sugerencia
      new SlashCommandBuilder()
        .setName('sugerencia')
        .setDescription('Crear una nueva sugerencia')
        .addStringOption(option =>
          option.setName('titulo')
            .setDescription('Título de la sugerencia')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('descripcion')
            .setDescription('Descripción detallada de la sugerencia')
            .setRequired(true)
        ),

      // Comando para configurar permisos de aprobación
      new SlashCommandBuilder()
        .setName('config-permisos')
        .setDescription('Configurar qué roles pueden aprobar/rechazar sugerencias')
        .addRoleOption(option =>
          option.setName('rol')
            .setDescription('Rol que puede aprobar/rechazar sugerencias')
            .setRequired(true)
        ),

      // Comando para configurar canal de sugerencias
      new SlashCommandBuilder()
        .setName('config-canal')
        .setDescription('Configurar canal donde se envían las sugerencias')
        .addChannelOption(option =>
          option.setName('canal')
            .setDescription('Canal para las sugerencias')
            .setRequired(true)
        ),
    ];

    this.client.on('ready', async () => {
      if (!this.client.application) return;
      
      await this.client.application.commands.set(commands);
      console.log('Comandos de Discord registrados');
    });
  }

  private async handleCommand(interaction: CommandInteraction) {
    const { commandName } = interaction;

    try {
      // Asegurar que el usuario existe en la base de datos
      await this.ensureUserExists(interaction.user);

      switch (commandName) {
        case 'sugerencia':
          await this.handleSugerenciaCommand(interaction);
          break;
        case 'config-permisos':
          await this.handleConfigPermisosCommand(interaction);
          break;
        case 'config-canal':
          await this.handleConfigCanalCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Comando no reconocido', ephemeral: true });
      }
    } catch (error) {
      console.error('Error manejando comando:', error);
      await interaction.reply({ 
        content: 'Ocurrió un error al procesar el comando', 
        ephemeral: true 
      });
    }
  }

  private async handleSugerenciaCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const titulo = interaction.options.getString('titulo', true);
    const descripcion = interaction.options.getString('descripcion', true);

    // Obtener canal configurado o usar el actual
    const suggestionsChannel = await this.getSuggestionsChannel(interaction.guildId!);
    const channelToUse = suggestionsChannel || interaction.channel;

    // Crear la sugerencia en la base de datos
    const [sugerencia] = await db.insert(ideas).values({
      title: titulo,
      description: descripcion,
      category: 'general', // Sin categorías específicas
      authorId: interaction.user.id,
      status: 'pending',
    }).returning();

    // Crear embed para mostrar la sugerencia
    const embed = new EmbedBuilder()
      .setTitle(`💡 ${titulo}`)
      .setDescription(descripcion)
      .addFields(
        { name: 'Estado', value: '🟡 Pendiente', inline: true },
        { name: 'Autor', value: interaction.user.username, inline: true }
      )
      .setColor(0x3498db)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Sugerencias' });

    // Botones para admins (solo aparecen si tienen permisos)
    const adminRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_${sugerencia.id}`)
          .setLabel('✅ Aprobar')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${sugerencia.id}`)
          .setLabel('❌ Rechazar')
          .setStyle(ButtonStyle.Danger)
      );

    // Enviar al canal apropiado
    let message;
    if (channelToUse && channelToUse.id !== interaction.channelId) {
      message = await channelToUse.send({
        embeds: [embed],
        components: [adminRow]
      });
      await interaction.reply({ 
        content: `✅ Sugerencia enviada a ${channelToUse}`, 
        ephemeral: true 
      });
    } else {
      message = await interaction.reply({
        embeds: [embed],
        components: [adminRow],
        fetchReply: true
      });
    }

    // Agregar reacciones para votación
    await message.react('👍');
    await message.react('👎');

    // Actualizar la sugerencia con el messageId
    await db.update(ideas)
      .set({ 
        messageId: message.id,
        channelId: message.channelId 
      })
      .where(eq(ideas.id, sugerencia.id));
  }

  

  private async handleConfigPermisosCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const user = await this.getDiscordUser(interaction.user.id);
    if (!user || !['admin', 'super_admin'].includes(user.role || '')) {
      await interaction.reply({ 
        content: '❌ Solo los administradores pueden configurar permisos', 
        ephemeral: true 
      });
      return;
    }

    const role = interaction.options.getRole('rol', true);
    const guildId = interaction.guildId!;

    // Obtener configuración actual o crear nueva
    let config = await db.select().from(serverConfig).where(eq(serverConfig.guildId, guildId)).limit(1);
    
    if (config.length === 0) {
      await db.insert(serverConfig).values({
        guildId,
        approvalRoleIds: [role.id]
      });
    } else {
      const currentRoles = (config[0].approvalRoleIds as string[]) || [];
      const updatedRoles = currentRoles.includes(role.id) 
        ? currentRoles.filter(id => id !== role.id)
        : [...currentRoles, role.id];
      
      await db.update(serverConfig)
        .set({ approvalRoleIds: updatedRoles, updatedAt: new Date() })
        .where(eq(serverConfig.guildId, guildId));
    }

    await interaction.reply({
      content: `✅ Configuración actualizada. El rol ${role.name} ahora puede aprobar/rechazar sugerencias`
    });
  }

  private async handleConfigCanalCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    
    const user = await this.getDiscordUser(interaction.user.id);
    if (!user || !['admin', 'super_admin'].includes(user.role || '')) {
      await interaction.reply({ 
        content: '❌ Solo los administradores pueden configurar el canal', 
        ephemeral: true 
      });
      return;
    }

    const channel = interaction.options.getChannel('canal', true);
    const guildId = interaction.guildId!;

    // Obtener configuración actual o crear nueva
    let config = await db.select().from(serverConfig).where(eq(serverConfig.guildId, guildId)).limit(1);
    
    if (config.length === 0) {
      await db.insert(serverConfig).values({
        guildId,
        suggestionsChannelId: channel.id
      });
    } else {
      await db.update(serverConfig)
        .set({ suggestionsChannelId: channel.id, updatedAt: new Date() })
        .where(eq(serverConfig.guildId, guildId));
    }

    await interaction.reply({
      content: `✅ Canal de sugerencias configurado: ${channel.name}`
    });
  }

  private async handleButton(interaction: ButtonInteraction) {
    const [action, ideaIdStr] = interaction.customId.split('_');
    const ideaId = parseInt(ideaIdStr);

    // Verificar permisos usando configuración del servidor
    const hasPermission = await this.userCanApprove(interaction.user.id, interaction.guildId!);
    
    if (!hasPermission) {
      await interaction.reply({ 
        content: '❌ No tienes permisos para realizar esta acción', 
        ephemeral: true 
      });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    await db.update(ideas)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(ideas.id, ideaId));

    const statusText = action === 'approve' ? 'aprobada' : 'rechazada';
    const statusEmoji = action === 'approve' ? '✅' : '❌';

    // Actualizar el embed original
    const originalEmbed = interaction.message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(originalEmbed);
    
    // Limpiar campos existentes y agregar los nuevos
    updatedEmbed.setFields(
      { name: 'Estado', value: `${statusEmoji} ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`, inline: true },
      { name: 'Autor', value: originalEmbed.fields.find(f => f.name === 'Autor')?.value || 'Desconocido', inline: true }
    );

    await interaction.update({
      embeds: [updatedEmbed],
      components: [] // Remover botones después de la acción
    });
  }

  private async handleReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (user.bot) return;

    // Obtener información completa si es parcial
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error('Error fetching user:', error);
        return;
      }
    }

    if (!['👍', '👎'].includes(reaction.emoji.name || '')) return;

    // Encontrar la idea por messageId
    const [idea] = await db.select()
      .from(ideas)
      .where(eq(ideas.messageId, reaction.message.id));

    if (!idea || idea.status === 'rejected') return;

    await this.ensureUserExists(user as User);
    const voteType = reaction.emoji.name === '👍' ? 'up' : 'down';

    // Verificar si el usuario ya votó
    const [existingVote] = await db.select()
      .from(votes)
      .where(and(eq(votes.ideaId, idea.id), eq(votes.userId, user.id)));

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Mismo voto - remover
        await db.delete(votes)
          .where(and(eq(votes.ideaId, idea.id), eq(votes.userId, user.id)));
      } else {
        // Voto diferente - actualizar
        await db.update(votes)
          .set({ voteType })
          .where(and(eq(votes.ideaId, idea.id), eq(votes.userId, user.id)));
      }
    } else {
      // Nuevo voto
      await db.insert(votes).values({
        ideaId: idea.id,
        userId: user.id,
        voteType,
      });
    }
  }

  private async handleReactionRemove(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    if (!['👍', '👎'].includes(reaction.emoji.name || '')) return;

    // Encontrar la idea por messageId
    const [idea] = await db.select()
      .from(ideas)
      .where(eq(ideas.messageId, reaction.message.id));

    if (!idea) return;

    // Remover el voto
    await db.delete(votes)
      .where(and(eq(votes.ideaId, idea.id), eq(votes.userId, user.id)));
  }

  private async ensureUserExists(user: User) {
    const [existingUser] = await db.select()
      .from(discordUsers)
      .where(eq(discordUsers.id, user.id));

    if (!existingUser) {
      await db.insert(discordUsers).values({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: 'user',
      });
    }
  }

  private async getDiscordUser(userId: string) {
    const [user] = await db.select()
      .from(discordUsers)
      .where(eq(discordUsers.id, userId));
    return user;
  }

  private async getSuggestionsChannel(guildId: string) {
    const [config] = await db.select()
      .from(serverConfig)
      .where(eq(serverConfig.guildId, guildId));
    
    if (!config?.suggestionsChannelId) return null;
    
    try {
      return await this.client.channels.fetch(config.suggestionsChannelId);
    } catch {
      return null;
    }
  }

  private async userCanApprove(userId: string, guildId: string): Promise<boolean> {
    // Verificar rol de bot interno
    const user = await this.getDiscordUser(userId);
    if (user && ['admin', 'super_admin'].includes(user.role || '')) {
      return true;
    }

    // Verificar configuración del servidor
    const [config] = await db.select()
      .from(serverConfig)
      .where(eq(serverConfig.guildId, guildId));
    
    if (!config?.approvalRoleIds) return false;

    // Verificar roles de Discord del usuario
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      const userRoleIds = member.roles.cache.map(role => role.id);
      const approvedRoles = config.approvalRoleIds as string[];
      
      return userRoleIds.some(roleId => approvedRoles.includes(roleId));
    } catch {
      return false;
    }
  }

  public async start(token: string) {
    await this.client.login(token);
  }

  public getClient() {
    return this.client;
  }
}

export default DiscordIdeaBot;