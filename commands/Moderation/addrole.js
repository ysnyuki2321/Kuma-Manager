/*
  _____  _              ____        _   
 |  __ \| |            |  _ \      | |  
 | |__) | | _____  __  | |_) | ___ | |_ 
 |  ___/| |/ _ \ \/ /  |  _ < / _ \| __|
 | |    | |  __/>  <   | |_) | (_) | |_ 
 |_|    |_|\___/_/\_\  |____/ \___/ \__|
                                        
Thank you for purchasing Plex!
If you find any issues, need support, or have a suggestion for the bot, please join our support server and create a ticket,
https://discord.gg/eRaeJdTsPY
*/

const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require ("discord.js")
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription(`Add a role to a user`)
        .addUserOption(option => option.setName('user').setDescription('The user to add the role to').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('The role to add to the user').setRequired(true)),
    async execute(interaction, client) {
        if(!interaction.member.permissions.has("ManageRoles")) return interaction.reply({ content: lang.NoPermsMessage, ephemeral: true })

        let user = interaction.options.getUser("user");
        let role = interaction.options.getRole("role");
        let user3 = interaction.guild.members.cache.get(user.id)

        const errorEmbed2 = new Discord.EmbedBuilder()
        .setAuthor({ name: `${lang.ErrorEmbedTitle}`, iconURL: `https://i.imgur.com/MdiCK2c.png` })
        .setColor(config.ErrorEmbedColor)
        .setDescription(lang.AddroleSelfRole)

        if(user.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed2], ephemeral: true })

        let meHoist = interaction.guild.members.cache.find(m => m.user.id == client.user.id).roles.highest.rawPosition;
        let theHoist = role.rawPosition;
        if(theHoist > meHoist) {
            const errorEmbed = new Discord.EmbedBuilder()
            .setAuthor({ name: `${lang.ErrorEmbedTitle}`, iconURL: `https://i.imgur.com/MdiCK2c.png` })
            .setColor(config.ErrorEmbedColor)
            .setDescription(lang.AddroleHighestRole)
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true })
        }

        let meHoistt = interaction.guild.members.cache.get(interaction.user.id).roles.highest.rawPosition;
        let theHoistt = role.rawPosition;
        if(theHoistt > meHoistt) {
            const errorEmbed = new Discord.EmbedBuilder()
            .setAuthor({ name: `${lang.ErrorEmbedTitle}`, iconURL: `https://i.imgur.com/MdiCK2c.png` })
            .setColor(config.ErrorEmbedColor)
            .setDescription(lang.AddroleUserRoleNotAbove)
           return interaction.reply({ embeds: [errorEmbed], ephemeral: true })
        }

        const errorEmbed4 = new Discord.EmbedBuilder()
        .setAuthor({ name: `${lang.ErrorEmbedTitle}`, iconURL: `https://i.imgur.com/MdiCK2c.png` })
        .setColor(config.ErrorEmbedColor)
        .setDescription(lang.AddroleAlreadyHave)
        if(user3.roles.cache.has(role.id)) return interaction.reply({ embeds: [errorEmbed4], ephemeral: true })

        user3.roles.add(role.id).catch(console.error);

        let roleadded = new Discord.EmbedBuilder()
        .setAuthor({ name: `${lang.AddroleEmbedTitle}`, iconURL: `https://i.imgur.com/7SlmRRa.png` })
        .setColor(config.SuccessEmbedColor)
        .addFields([
            { name: `${lang.AddroleEmbedRole}`, value: `${role}` },
            { name: `${lang.AddroleEmbedAssignedBy}`, value: `${interaction.user}` },
            { name: `${lang.AddroleEmbedAssignedTo}`, value: `${user}` },
            ])
        .setFooter({ text: `${interaction.guild.name}` })
        .setTimestamp()

        try{
            let addRoleUserMsgVariable = lang.AddroleUserMsg.replace(/{guild-name}/g, `${interaction.guild.name}`).replace(/{role}/g, `${role.name}`)
            user.send(addRoleUserMsgVariable);
            interaction.reply({ embeds: [roleadded] });
        }
        catch(e){
            console.log(e);
        }


    }

}