// commands/painel.js
//
// Define o comando /painel e monta a mensagem com os 4 botões.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("painel")
  .setDescription("Abre o painel de gerenciamento da sua key");

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("Painel — Vexus Lock")
    .setDescription("Escolha uma opção abaixo.")
    .setColor(0x2563eb);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("redeem_key")
      .setLabel("Redeem Key")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("reset_hwid")
      .setLabel("Reset HWID")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("view_script")
      .setLabel("View Script")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("info")
      .setLabel("Info")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

module.exports = { data, execute };
