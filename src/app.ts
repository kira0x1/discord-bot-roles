import { token } from './config';
import { Client } from 'discord.js';
import { syncRoles } from './util/syncRoles';
import { initGreeter } from './util/serverGreeter';
import { initVoiceManager, VoiceRoleManager } from './util/voiceRoleManager';
import { logger } from './util/logger';

const client = new Client({
   intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_MESSAGE_REACTIONS']
});

client.once('ready', async () => {
   initGreeter(client);
   await syncRoles(client);
   await initVoiceManager(client);
   logger.info(`mikaela-roles online`);
});

client.login(token);
