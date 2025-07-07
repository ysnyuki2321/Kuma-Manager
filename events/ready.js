const Discord = require('discord.js');
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'))
const colors = require('ansi-colors');
const packageFile = require('../package.json');

module.exports = async client => {
    if(packageFile.version !== config.Version) {
    console.log('\x1b[31m%s\x1b[0m', `[ERROR] Your config.yml file is outdated!`)
    process.exit()
    }

    let guild = client.guilds.cache.get(config.GuildID)
    if(!guild) {
        console.log('\x1b[31m%s\x1b[0m', `[ERROR] The guild ID specified in the config is invalid or the bot is not in the server!\nYou can use the link below to invite the bot to your server:\nhttps://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
        process.exit()
    } 

    await client.guildData.ensure(`${guild.id}`, {
        guildID: guild.id,
        cases: 1,
        totalMessages: 0,
        stars: {},
        birthday: null,
        totalSuggestions: 1
      });

    await client.verification.ensure(`${guild.id}`, {
        msgID: null,
        unverifiedRoleID: null
      });


if(config.EnableReactionRoles) {
    config.ReactionRoles.forEach(async r => {
        let channel = await guild.channels.cache.get(r.channelID)
        let role = guild.roles.cache.get(r.roleID);
        if(!channel) console.log('\x1b[31m%s\x1b[0m', `[ERROR] config.ReactionRoles.channelID is not a valid channel! (${r.channelID})`)
        if(!role) console.log('\x1b[31m%s\x1b[0m', `[ERROR] config.ReactionRoles.roleID is not a valid role! (${r.roleID})`)
        if(channel && role) {
        let meHoist = guild.members.cache.find(m => m.user.id == client.user.id).roles.highest.rawPosition;
        let theHoist = role.rawPosition;
        if(theHoist > meHoist) await console.log('\x1b[31m%s\x1b[0m', `[ERROR] The bot's role has to be above all the reaction roles! (${role.name})`)

        let msg = await channel.messages.fetch(`${r.messageID}`).catch(e => {})
        if(msg !== undefined) {
            try {
                await msg.react(`${r.emojiName}`)
            } catch(e) {}
        }
    }
});
}

// bot activity
let activType;
if(config.BotActivitySettings.Type === "WATCHING") activType = Discord.ActivityType.Watching
if(config.BotActivitySettings.Type === "PLAYING") activType = Discord.ActivityType.Playing
if(config.BotActivitySettings.Type === "COMPETING") activType = Discord.ActivityType.Competing

if(config.BotActivitySettings.Enabled) {
    let index = 0
    client.user.setActivity(config.BotActivitySettings.Statuses[0].replace(/{total-users}/g, `${guild.memberCount}`).replace(/{total-channels}/g, `${client.channels.cache.size}`).replace(/{total-messages}/g, `${client.guildData.get(guild.id, 'totalMessages')}`), { type: activType  });
    setInterval(() => {
        if(index === config.BotActivitySettings.Statuses.length) index = 0
        client.user.setActivity(config.BotActivitySettings.Statuses[index].replace(/{total-users}/g, `${guild.memberCount}`).replace(/{total-channels}/g, `${client.channels.cache.size}`).replace(/{total-messages}/g, `${client.guildData.get(guild.id, 'totalMessages')}`), { type: activType  });
        index++;
    }, config.BotActivitySettings.Interval * 1000);
}
//

client.guilds.cache.forEach(guild => {
    if(!config.GuildID.includes(guild.id)) {
    guild.leave();
    console.log('\x1b[31m%s\x1b[0m', `[INFO] Someone tried to invite the bot to another server! I automatically left it (${guild.name})`)
    }
})


if (guild && !guild.members.me.permissions.has("Administrator")) {
    console.log('\x1b[31m%s\x1b[0m', `[ERROR] The bot doesn't have enough permissions! Please give the bot ADMINISTRATOR permissions in your server or it won't function properly!`)
}

// Update channel stats
function updateChannelStats() {
if(config.MemberCount.Enabled || config.NitroBoosterCount.Enabled) {
    if(config.MemberCount.Enabled) {
        let channel = guild.channels.cache.get(config.MemberCount.ChannelID)
        let memberCountMsg = config.MemberCount.ChannelName.replace(/{total-members}/g, `${guild.memberCount}`);
        if (channel) channel.setName(memberCountMsg).catch(error => console.log(error));
    }

    if(config.NitroBoosterCount.Enabled) {
        let channel = guild.channels.cache.get(config.NitroBoosterCount.ChannelID)
        let boosterCountMsg = config.NitroBoosterCount.ChannelName.replace(/{total-boosters}/g, `${guild.premiumSubscriptionCount}`);
        if (channel) channel.setName(boosterCountMsg).catch(error => console.log(error));
    }
}
}
//
// Birthday system
function birthday() {
    if(config.BirthdaySystem.Enabled) {
    const isToday = d => d ? new Date().getDate() === new Date(d).getDate() && new Date().getMonth() === new Date(d).getMonth() : false
    let channel = guild.channels.cache.get(config.BirthdaySystem.ChannelID)
    const today = new Date().getMonth() + ' ' + new Date().getDate()
    if(client.guildData.get(guild.id, 'birthday') === today) return;

    const birthdays = client.userData.filter(p => isToday(p.birthday)).array()
    if(!birthdays.length) return

    const embed = new Discord.EmbedBuilder()
        .setTitle(config.BirthdaySystem.MessageTitle)
        .setColor(config.EmbedColors)
        .setDescription(`${config.BirthdaySystem.Message}\n\n${birthdays.map(s => `<@!${s.userID}>`).join(' ')}`)

    if(!channel) return
    channel.send({ embeds: [embed] })
    client.guildData.set(guild.id, today, 'birthday')
    }
}

// Run birthday and channelstats functions every 5 minutes
setInterval(function() {
    birthday()
    updateChannelStats()
}, 300000);


// Send verification embed to channel
if(config.VerificationSettings.Enabled && client.verification.has(guild.id)) {
    let verifData = client.verification.get(guild.id)
    let channel = guild.channels.cache.get(config.VerificationSettings.ChannelID)
    let role = guild.roles.cache.get(config.VerificationSettings.VerifiedRoleID)
    if(!channel) console.log('\x1b[31m%s\x1b[0m', `[ERROR] VerificationSettings.ChannelID is not a valid channel!`)

    const button = new Discord.ButtonBuilder()
    .setCustomId('verifButton')
    .setLabel(config.VerificationButton.Name)
    .setStyle(config.VerificationButton.Color)
    .setEmoji(config.VerificationButton.Emoji)
    let row = new Discord.ActionRowBuilder().addComponents(button);

    const verifEmbed = new Discord.EmbedBuilder()
    .setTitle(config.VerificationEmbed.Title)
    .setColor(config.EmbedColors)
    .setDescription(config.VerificationEmbed.Description)
    .setImage(config.VerificationEmbed.Image)

    if(channel && verifData.msgID === null) {
        channel.send({ embeds: [verifEmbed], components: [row] }).then(async function(msg) {
        client.verification.set(guild.id, msg.id, "msgID");
    })
}

    if(channel && verifData.msgID !== null) {
        await channel.messages.fetch(verifData.msgID).catch(error => {
            channel.send({ embeds: [verifEmbed], components: [row] }).then(async function(msg2) {
                client.verification.set(guild.id, msg2.id, "msgID");
        })
    })
}

// Automatically create unverified role and deny all channel perms to all channels other than verify channel
if(config.VerificationSettings.Enabled && config.VerificationSettings.EnableUnverifiedRole && verifData.unverifiedRoleID === null || !guild.roles.cache.get(verifData.unverifiedRoleID) ) {

    await guild.roles.create({
        name: 'Unverified',
        color: 'Grey',
        reason: 'Automatic role creation for Verification System',
      }).then(async function(role) {
        client.verification.set(guild.id, role.id, "unverifiedRoleID");

        guild.channels.cache.forEach(channel => {
            if(channel.id !== config.VerificationSettings.ChannelID) {
            try {
                channel.permissionOverwrites.edit(role, {
                    ViewChannel: false,
                    SendMessages: false,
                    Speak: false,
                    ReadMessageHistory: false
                });
            } catch (error) { 
                console.log(error)
            };
        }

      })
    })
}

// Update channel perms for existing channels for the unverified role, if it already exists
if(config.VerificationSettings.Enabled && config.VerificationSettings.EnableUnverifiedRole && verifData.unverifiedRoleID !== null && guild.roles.cache.get(verifData.unverifiedRoleID) ) {
    let role = guild.roles.cache.get(verifData.unverifiedRoleID)
    guild.channels.cache.forEach(channel => {
        if(channel.id !== config.VerificationSettings.ChannelID) {
        try {
            channel.permissionOverwrites.edit(role, {
                ViewChannel: false,
                SendMessages: false,
                Speak: false,
                ReadMessageHistory: false
            });
        } catch (error) { 
            console.log(error)
        };
    }
})
}

}
//

await console.log("――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――");
await console.log("                                                                          ");
if(config.LicenseKey) await console.log(`${colors.green(colors.bold(`Kuma Manager v${packageFile.version} is now Online!`))} (${colors.gray(`${config.LicenseKey}`)})`);
if(!config.LicenseKey) await console.log(`${colors.green(colors.bold(`Kuma Manager v${packageFile.version} is now Online!`))}`);
await console.log("                                                                          ");
await console.log("――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――");

let logMsg = `\n\n[${new Date().toLocaleString()}] [READY] Bot is now ready!`;
fs.appendFile("./logs.txt", logMsg, (e) => { 
  if(e) console.log(e);
});

}