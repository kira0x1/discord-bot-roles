import EventEmitter from 'events';
import { Client, Guild, GuildMember, Role, VoiceChannel } from 'discord.js';
import { logger } from './logger';
import { server_id } from '../config';

export async function initVoiceManager(client: Client) {
   const codersClubVoiceManager = new VoiceRoleManager(client.guilds.cache.get(server_id));

   client.on('voiceStateUpdate', (oldMember, newMember) => {
      const member = (oldMember || newMember).member;
      const guildId = member.guild.id;

      const oldChannel = oldMember.channel;
      const newChannel = newMember.channel;

      // User joined a vc
      if (!oldChannel && newChannel instanceof VoiceChannel) {
         if (guildId === server_id) codersClubVoiceManager.emit('voice-join', member);
         return;
      }

      // User left vc
      if (!newChannel && oldChannel instanceof VoiceChannel) {
         if (guildId === server_id) codersClubVoiceManager.emit('voice-leave', member);
      }
   });
}

export class VoiceRoleManager extends EventEmitter {
   public guild: Guild;
   public voiceRole: Role;

   constructor(guild: Guild) {
      super();

      this.guild = guild;

      // This is called on voice manager creation, i.e when the bot starts
      if (this.guild?.client.user.id !== server_id) return;
      this.refreshVoiceRole();

      if (!this.voiceRole) {
         logger.warn(`no voice role found for guild: ${guild.name}`);
         return;
      }

      this.on('voice-leave', this.removVoiceRole);
      this.on('voice-join', this.addVoiceRole);
   }

   async refreshVoiceRole() {
      this.voiceRole = this.guild.roles.cache.find(r => r.name.toLowerCase() === 'voice');

      this.removeVoiceRoleFromAll();

      // Check if their are any people in voice, and add the voice role incase the bot was offline
      this.addVoiceRoleToAll();
   }

   // adds voice role to all members currently in a vc
   async addVoiceRoleToAll() {
      const states = this.guild.voiceStates.cache.map(v => v);
      for (const voiceState of states) {
         this.addVoiceRole(voiceState.member);
      }
   }

   // Remove the voice role from everyone not in a vc
   async removeVoiceRoleFromAll() {
      this.guild.members.cache
         .filter(member => member.roles.cache.has(this.voiceRole.id) && !member.voice)
         .map(this.removVoiceRole);
   }

   removVoiceRole(member: GuildMember) {
      member.roles
         .remove(this.voiceRole)
         .catch(err => logger.error(`Failed to remove voice role\nREASON: ${err.message}`));
   }

   addVoiceRole(member: GuildMember) {
      member.roles
         .add(this.voiceRole)
         .catch(err => logger.error(`Error trying to add vc role\nREASON: ${err.message}`));
   }
}
