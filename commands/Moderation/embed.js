const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const config = yaml.load(require('fs').readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(require('fs').readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedbuild')
        .setDescription('Start building your custom embed!')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const id = Date.now().toString();
        const userId = interaction.user.id;
        const embedsDir = path.join(__dirname, '../../data/Embeds');
        await fs.mkdir(embedsDir, { recursive: true });

        let embed = new EmbedBuilder()
            .setTitle('Embed Builder')
            .setDescription(`Welcome to **KUMA EMBED BUILDER** here you can create your custom embed using the buttons and dropdowns below. When you're finished, click **Post Embed** to send it!`)
            .setColor(config.EmbedColors || '#2f3136');

        const embedConfig = client.embedConfig = client.embedConfig || {};

        function createButtonRows(id) {
            return [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`title_${id}`).setLabel('Title text').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`description_${id}`).setLabel('Description text').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`color_${id}`).setLabel('Embed Color').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`thumbnail_${id}`).setLabel('Thumbnail Image').setStyle('Secondary')
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`image_${id}`).setLabel('Large Image').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`footer_${id}`).setLabel('Footer text').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`author_${id}`).setLabel('Author text').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`add_field_${id}`).setLabel('Add Field').setStyle('Primary')
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`clear_fields_${id}`).setLabel('Clear Fields').setStyle('Danger'),
                    new ButtonBuilder().setCustomId(`post_${id}`).setLabel('Post Embed').setStyle('Success'),
                    new ButtonBuilder().setCustomId(`json_${id}`).setLabel('Get JSON format').setStyle('Secondary'),
                    new ButtonBuilder().setCustomId(`exit_${id}`).setLabel('Exit').setStyle('Danger')
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`load_json_${id}`)
                        .setPlaceholder('Load a template')
                        .addOptions([
                            { label: 'Load a JSON template', value: `json_template_${id}` }
                        ])
                )
            ];
        }

        function createModal(customId, title, fields) {
            const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
            fields.forEach(field => {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId(field.id)
                            .setLabel(field.label)
                            .setStyle(field.style || TextInputStyle.Short)
                            .setPlaceholder(field.placeholder || '')
                            .setRequired(field.required !== false)
                            .setValue(field.value || '')
                    )
                );
            });
            return modal;
        }

        async function createChannelSelectMenu(id, guild) {
            const channels = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText);
            const options = channels.map(channel => ({
                label: channel.name,
                value: `channel_${channel.id}_${id}`
            }));
            return [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`channel_select_${id}`)
                        .setPlaceholder('Select a channel to send the embed')
                        .addOptions(options)
                )
            ];
        }

        // Initialize embed config for the user
        embedConfig[userId] = {
            embed: embed.toJSON(),
            previewMessageId: null
        };

        // Send initial embed with buttons and dropdown
        const buttonRows = createButtonRows(id);
        const previewMessage = await interaction.reply({ embeds: [embed], components: buttonRows, ephemeral: true });
        embedConfig[userId].previewMessageId = previewMessage.id;

        // Set up interaction collector
        const filter = i => i.user.id === userId && i.customId.includes(id);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 900000 });

        collector.on('collect', async i => {
            try {
                embed = EmbedBuilder.from(embedConfig[userId].embed);

                if (i.isButton()) {
                    if (i.customId.startsWith(`title_${id}`)) {
                        i.showModal(createModal(`title_modal_${id}`, 'Edit Embed Title', [
                            { id: 'title_input', label: 'Title', placeholder: "Enter 'none' to remove title.", max_length: 256 }
                        ]));
                    } else if (i.customId.startsWith(`description_${id}`)) {
                        i.showModal(createModal(`description_modal_${id}`, 'Edit Embed Description', [
                            { id: 'description_input', label: 'Description', style: TextInputStyle.Paragraph, placeholder: "Enter 'none' for no description." }
                        ]));
                    } else if (i.customId.startsWith(`color_${id}`)) {
                        i.showModal(createModal(`color_modal_${id}`, 'Edit Embed Color', [
                            { id: 'color_input', label: 'Color', placeholder: "Enter color name (e.g., 'red', 'blue') or hex code (e.g., '#FF0000')" }
                        ]));
                    } else if (i.customId.startsWith(`thumbnail_${id}`)) {
                        i.showModal(createModal(`thumbnail_modal_${id}`, 'Edit Embed Thumbnail', [
                            { id: 'thumbnail_input', label: 'Thumbnail URL', placeholder: 'Enter thumbnail URL here' }
                        ]));
                    } else if (i.customId.startsWith(`image_${id}`)) {
                        i.showModal(createModal(`image_modal_${id}`, 'Edit Embed Image', [
                            { id: 'image_input', label: 'Image URL', placeholder: 'Enter a URL for the image' }
                        ]));
                    } else if (i.customId.startsWith(`footer_${id}`)) {
                        i.showModal(createModal(`footer_modal_${id}`, 'Edit Embed Footer', [
                            { id: 'footer_text', label: 'Footer Text', placeholder: 'Enter footer text' },
                            { id: 'footer_icon_url', label: 'Footer Icon URL', placeholder: 'Enter URL for the footer icon (optional)', required: false }
                        ]));
                    } else if (i.customId.startsWith(`author_${id}`)) {
                        i.showModal(createModal(`author_modal_${id}`, 'Edit Embed Author', [
                            { id: 'author_name', label: 'Author Name', placeholder: 'Enter author name' },
                            { id: 'author_icon_url', label: 'Author Icon URL', placeholder: 'Enter URL for the author icon (optional)', required: false }
                        ]));
                    } else if (i.customId.startsWith(`add_field_${id}`)) {
                        i.showModal(createModal(`field_modal_${id}`, 'Add Embed Field', [
                            { id: 'field_name', label: 'Field Name', placeholder: 'Enter field name' },
                            { id: 'field_value', label: 'Field Value', placeholder: 'Enter field value', style: TextInputStyle.Paragraph },
                            { id: 'inline', label: 'Inline (True/False)', placeholder: 'Enter True or False', value: 'False' }
                        ]));
                    } else if (i.customId.startsWith(`clear_fields_${id}`)) {
                        embed.clearFields();
                        embedConfig[userId].embed = embed.toJSON();
                        await i.update({ embeds: [embed], components: buttonRows });
                        await i.followUp({ content: 'All fields cleared!', ephemeral: true });
                    } else if (i.customId.startsWith(`post_${id}`)) {
                        const channelRows = await createChannelSelectMenu(id, interaction.guild);
                        await i.update({ content: 'Select the channel to send the embed:', embeds: [], components: channelRows, ephemeral: true });
                        return;
                    } else if (i.customId.startsWith(`json_${id}`)) {
                        const embedJson = JSON.stringify(embedConfig[userId].embed, null, 4);
                        await i.followUp({ content: `\`\`\`json\n${embedJson}\n\`\`\``, ephemeral: true });
                    } else if (i.customId.startsWith(`exit_${id}`)) {
                        delete embedConfig[userId];
                        await i.update({ content: 'Embed creation exited. All unsaved changes discarded.', embeds: [], components: [] });
                        await i.message.delete();
                        return;
                    }
                    await i.update({ embeds: [embed], components: buttonRows });
                } else if (i.isSelectMenu()) {
                    if (i.customId.startsWith(`load_json_${id}`)) {
                        i.showModal(createModal(`json_input_modal_${id}`, 'Paste your JSON Embed', [
                            { id: 'json_input', label: 'JSON Input', style: TextInputStyle.Paragraph, placeholder: 'Paste your JSON here' }
                        ]));
                    } else if (i.customId.startsWith(`channel_select_${id}`)) {
                        const channelId = i.values[0].split('_')[1];
                        const channel = interaction.guild.channels.cache.get(channelId);
                        if (channel) {
                            await channel.send({ embeds: [embed] });
                            const previewMessage = await interaction.channel.messages.fetch(embedConfig[userId].previewMessageId);
                            await previewMessage.delete();
                            delete embedConfig[userId];
                            await i.update({ content: `Embed successfully sent to ${channel}!`, embeds: [], components: [], ephemeral: true });
                        } else {
                            await i.update({ content: 'Failed to send embed. Invalid channel!', embeds: [], components: [], ephemeral: true });
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                if (!i.replied) await i.reply({ content: 'An error occurred.', ephemeral: true });
            }
        });

        // Modal submit handler
        client.on('interactionCreate', async i => {
            if (!i.isModalSubmit() || !i.customId.includes(id) || i.user.id !== userId) return;
            try {
                embed = EmbedBuilder.from(embedConfig[userId].embed);
                const input = i.fields;

                if (i.customId.startsWith(`title_modal_${id}`)) {
                    const title = input.getTextInputValue('title_input').trim();
                    if (title.toLowerCase() === 'none') {
                        embed.setTitle(null);
                        await i.reply({ content: 'Title has been removed!', ephemeral: true });
                    } else {
                        embed.setTitle(title);
                        await i.reply({ content: `Title updated to '${title}'!`, ephemeral: true });
                    }
                }
                else if (i.customId.startsWith(`description_modal_${id}`)) {
                    const description = input.getTextInputValue('description_input').trim();
                    if (description.toLowerCase() === 'none') {
                        embed.setDescription(null);
                    } else {
                        embed.setDescription(description);
                    }
                    await i.reply({ content: `Description updated to '${description}'`, ephemeral: true });
                }
                else if (i.customId.startsWith(`color_modal_${id}`)) {
                    const colorValue = input.getTextInputValue('color_input').trim().toLowerCase();
                    try {
                        const color = colorValue.startsWith('#') ? colorValue : require('color-name')[colorValue] ? `#${require('color-name')[colorValue].join('')}` : null;
                        if (color) {
                            embed.setColor(color);
                            await i.reply({ content: `Color updated to '${colorValue}'`, ephemeral: true });
                        } else {
                            throw new Error('Invalid color');
                        }
                    } catch {
                        await i.reply({ content: 'Invalid color! Please use a valid color name or hex code (e.g., \'red\', \'blue\', #FF5733).', ephemeral: true });
                        return;
                    }
                }
                else if (i.customId.startsWith(`thumbnail_modal_${id}`)) {
                    embed.setThumbnail(input.getTextInputValue('thumbnail_input'));
                    await i.reply({ content: 'Thumbnail successfully updated!', ephemeral: true });
                }
                else if (i.customId.startsWith(`image_modal_${id}`)) {
                    embed.setImage(input.getTextInputValue('image_input'));
                    await i.reply({ content: 'Image successfully updated!', ephemeral: true });
                }
                else if (i.customId.startsWith(`footer_modal_${id}`)) {
                    embed.setFooter({
                        text: input.getTextInputValue('footer_text'),
                        iconURL: input.getTextInputValue('footer_icon_url') || null
                    });
                    await i.reply({ content: 'Footer successfully updated!', ephemeral: true });
                }
                else if (i.customId.startsWith(`author_modal_${id}`)) {
                    embed.setAuthor({
                        name: input.getTextInputValue('author_name'),
                        iconURL: input.getTextInputValue('author_icon_url') || null
                    });
                    await i.reply({ content: 'Author successfully updated!', ephemeral: true });
                }
                else if (i.customId.startsWith(`field_modal_${id}`)) {
                    const inline = input.getTextInputValue('inline').toLowerCase() === 'true';
                    embed.addFields({
                        name: input.getTextInputValue('field_name'),
                        value: input.getTextInputValue('field_value'),
                        inline
                    });
                    await i.reply({ content: 'Field successfully updated!', ephemeral: true });
                }
                else if (i.customId.startsWith(`json_input_modal_${id}`)) {
                    try {
                        const jsonData = JSON.parse(input.getTextInputValue('json_input'));
                        embed = EmbedBuilder.from(jsonData);
                        await i.reply({ content: 'Embed updated from JSON successfully!', ephemeral: true });
                    } catch {
                        await i.reply({ content: 'Invalid JSON format. Please try again.', ephemeral: true });
                        return;
                    }
                }

                embedConfig[userId].embed = embed.toJSON();
            } catch (err) {
                console.error(err);
                if (!i.replied) await i.reply({ content: 'An error occurred.', ephemeral: true });
            }
        });
    }
};