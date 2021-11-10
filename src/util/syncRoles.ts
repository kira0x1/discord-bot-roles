import {
   Client,
   Collection,
   Guild,
   Message,
   MessageEmbed,
   MessageReaction,
   Role,
   TextChannel,
   User
} from 'discord.js';
import { logger } from './logger';
import { server_id } from '../config';

interface CustomRole {
   name: string;
   roleId: string;
   reactionName: string;
}

interface RoleSection {
   name: string;
   id: string;
   roles: CustomRole[];
}

const customRoles = require('../../customRoles.json');
const sections: RoleSection[] = customRoles.sections;

function getEmojiFromGuild(guild: Guild, emojiName: string) {
   const emoji = guild.emojis.cache.find(em => em.name.toLowerCase() === emojiName.toLowerCase());
   if (!emoji) logger.warn(`emoji not found: "${emojiName}"`);
   return emoji;
}

export async function syncRoles(client: Client) {
   const guild = client.guilds.cache.get(server_id);
   if (!guild) return;
   const channel = guild.channels.cache.get('618438576119742464');
   if (!channel) return;

   if (!(channel instanceof TextChannel)) return logger.log('info', 'Couldnt find channel');

   const messages = await channel.messages.fetch({ limit: 100 });

   await updateSections(channel, messages);
   await updateRoles(messages);

   const reactions = messages.flatMap(m => m.reactions.cache);
   reactions.map(r => syncEmoji(r));

   client.on('messageReactionRemove', (reaction, user) => {
      if (
         customRoles.sections.map((section: RoleSection) =>
            section.roles.find(role => role.reactionName === reaction.emoji.name)
         ) === false
      )
         return;

      if (user.bot) return;

      const member = guild.members.cache.get(user.id);
      const section = getSection(reaction.emoji.name);

      if (!section) return;

      const crole = section.roles.find(rl => rl.reactionName === reaction.emoji.name);
      const role = guild.roles.cache.find(rl => rl.id === crole.roleId);

      if (!member || !section || !role) {
         return;
      }

      const rolesFound: Role[] = [];

      member.roles.cache.forEach(role => {
         if (section.roles.find(reaction => reaction.roleId === role.id)) {
            rolesFound.push(role);
         }
      });

      if (member.roles.cache.has(role.id)) {
         member.roles.remove(role);
         if (rolesFound.length === 1) member.roles.remove(section.id);
      }
   });
}

async function updateSections(channel: TextChannel, messages: Collection<string, Message>) {
   const sectionTitles = messages.filter(
      msg =>
         msg.reactions.cache.size === 0 && sections.find(s => s.name === msg.embeds[0].title) !== undefined
   );

   const missingSections = sections.filter(s => !sectionTitles.find(m => m.embeds[0].title === s.name));
   for (const section of missingSections) {
      const embed = new MessageEmbed().setTitle(section.name);
      await channel.send({ embeds: [embed] });

      const embedRoles = createSectionRolesEmbed(channel.guild, section);
      channel.send({ embeds: [embedRoles] });
   }
}

async function updateRoles(messages: Collection<string, Message>) {
   const reactedMessages = messages
      .filter(msg => !sections.find(s => s.name === msg.embeds[0].title))
      .values();

   for (const msg of reactedMessages) {
      const msgReactions = msg.reactions.cache;

      const msgSection = sections.find(s => s.roles.find(r => r.name === msg.embeds[0].fields[0].name));

      if (!msgSection) {
         continue;
      }

      const sectionRolesAmount = msgSection.roles.length;
      if (msgReactions.size === sectionRolesAmount && msg.embeds[0].fields.length === sectionRolesAmount)
         continue;

      logger.info(`msg roles: ${msgReactions.size}, section roles: ${msgSection.roles.length}`);

      const missingReactions = msgSection.roles.filter(
         role => !msgReactions.find(r => r.emoji.name === role.reactionName)
      );

      logger.info(`Missing reactions for: ${msgSection.name}`);
      missingReactions.map(mr => logger.info(mr.name));
      logger.info(`\n`);

      if (msgReactions.size !== sectionRolesAmount) {
         const promises = missingReactions.map(async r =>
            msg.react(msg.guild.emojis.cache.find(e => e.name === r.reactionName) || r.reactionName)
         );

         Promise.all(promises);
      }

      if (msg.embeds[0].fields.length !== sectionRolesAmount) {
         const embed = createSectionRolesEmbed(msg.guild, msgSection);

         try {
            await msg.edit({ embeds: [embed] });
         } catch (err) {
            logger.error(err);
         }
      }
   }
}

async function syncEmoji(messageReaction: MessageReaction) {
   const msg = messageReaction.message;
   const emoji = messageReaction.emoji;

   const filter = (reaction: MessageReaction, user: User) => {
      return (
         reaction.emoji.id === emoji.id &&
         !user.bot &&
         customRoles.sections.find(() => getSection(reaction.emoji.name))
      );
   };

   const collector = msg.createReactionCollector({ filter });

   collector.on('collect', (reaction: MessageReaction, user: User) => {
      const member = msg.guild.members.cache.get(user.id);

      const section = getSection(reaction.emoji.name);

      if (!section) return;
      const crole = section.roles.find(rl => rl.reactionName === reaction.emoji.name);

      if (!section) return logger.info('couldnt find section');
      if (!crole) return logger.info('couldnt find crole');

      const role = msg.guild.roles.cache.find(rl => rl.id === crole.roleId);
      if (!member) return;

      if (member.roles.cache.has(role.id) === false) member.roles.add(role);

      if (member.roles.cache.has(section.id) === false) member.roles.add(section.id);
   });
}

function getSection(emojiName: string): RoleSection {
   return customRoles.sections.find((section: RoleSection) =>
      section.roles.find(role => role.reactionName === emojiName)
   );
}

function createSectionRolesEmbed(guild: Guild, section: RoleSection) {
   logger.info(`editing section: ${section.name}`);

   const embed = new MessageEmbed();

   for (const role of section.roles) {
      const emoji = getEmojiFromGuild(guild, role.reactionName) || role.reactionName;
      embed.addField(role.name, emoji.toString(), true);
   }

   return embed;
}
