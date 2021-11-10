import { token } from './config';
import { Client } from 'discord.js';
import { syncRoles } from './util/syncRoles';
import { initGreeter } from './util/serverGreeter';
import { initVoiceManager, VoiceRoleManager } from './util/voiceRoleManager';

const client = new Client({
   intents: ['GUILDS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_MESSAGE_REACTIONS']
});

client.once('ready', () => {
   syncRoles(client);
   initGreeter(client);
   initVoiceManager(client);
});

client.login(token);
