// index.js
//
// Entrypoint do bot. Roda como "Background Worker" no Render (processo
// que fica sempre ligado, sem precisar responder HTTP).

const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

const api = require("./api");
const cooldown = require("./cooldown");
const painelCommand = require("./commands/painel");

const RESET_HWID_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h
const REDEEM_KEY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_KEY_DURATION = process.env.DEFAULT_KEY_DURATION || "lifetime";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
client.commands.set(painelCommand.data.name, painelCommand);

client.once(Events.ClientReady, (c) => {
  console.log(`Logado como ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }
  } catch (err) {
    console.error(err);
    const msg = { content: `Erro: ${err.message}`, ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId === "info") {
    const embed = new EmbedBuilder()
      .setTitle("Info")
      .setDescription(
        "Use **Redeem Key** para pegar uma key.\n" +
          "Use **Reset HWID** se trocou de executor/PC.\n" +
          "Use **View Script** para ver o status da sua key.\n\n" +
          "Nunca compartilhe sua key com ninguém."
      )
      .setColor(0x2563eb);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (customId === "redeem_key") {
    const { blocked, remainingMs } = cooldown.isOnCooldown(
      "redeem_key",
      interaction.user.id,
      REDEEM_KEY_COOLDOWN_MS
    );
    if (blocked) {
      await interaction.reply({
        content: `Você já pegou uma key recentemente. Tente novamente em ${cooldown.formatRemaining(remainingMs)}.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const created = await api.createKey(DEFAULT_KEY_DURATION);
    cooldown.markUsed("redeem_key", interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("Sua key")
      .addFields(
        { name: "Key", value: `\`${created.key}\`` },
        { name: "Expira", value: created.expiresAt ? `<t:${Math.floor(created.expiresAt / 1000)}:R>` : "Nunca" }
      )
      .setColor(0x22c55e);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (customId === "reset_hwid") {
    const modal = new ModalBuilder().setCustomId("modal_reset_hwid").setTitle("Reset HWID");
    const input = new TextInputBuilder()
      .setCustomId("key_value")
      .setLabel("Sua key")
      .setPlaceholder("VXS-AB3F-9QK7-ZP12")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (customId === "view_script") {
    const modal = new ModalBuilder().setCustomId("modal_view_script").setTitle("View Script");
    const input = new TextInputBuilder()
      .setCustomId("key_value")
      .setLabel("Sua key")
      .setPlaceholder("VXS-AB3F-9QK7-ZP12")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }
}

async function handleModal(interaction) {
  const keyValue = interaction.fields.getTextInputValue("key_value").trim();

  if (interaction.customId === "modal_reset_hwid") {
    const { blocked, remainingMs } = cooldown.isOnCooldown(
      "reset_hwid",
      interaction.user.id,
      RESET_HWID_COOLDOWN_MS
    );
    if (blocked) {
      await interaction.reply({
        content: `Você já resetou o HWID recentemente. Tente novamente em ${cooldown.formatRemaining(remainingMs)}.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const match = await api.findKeyByValue(keyValue);
    if (!match) {
      await interaction.editReply({ content: "Key não encontrada." });
      return;
    }
    if (match.revoked) {
      await interaction.editReply({ content: "Essa key foi revogada." });
      return;
    }

    await api.unbindHwid(match.id);
    cooldown.markUsed("reset_hwid", interaction.user.id);
    await interaction.editReply({ content: "HWID resetado com sucesso." });
    return;
  }

  if (interaction.customId === "modal_view_script") {
    await interaction.deferReply({ ephemeral: true });
    const match = await api.findKeyByValue(keyValue);
    if (!match) {
      await interaction.editReply({ content: "Key não encontrada." });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Status da key")
      .addFields(
        { name: "Válida", value: match.revoked ? "Revogada" : match.expired ? "Expirada" : "Ativa" },
        { name: "HWID vinculado", value: match.hwidBound ? "Sim" : "Não" },
        {
          name: "Expira",
          value: match.expiresAt ? `<t:${Math.floor(match.expiresAt / 1000)}:R>` : "Nunca",
        }
      )
      .setColor(0x2563eb);
    await interaction.editReply({ embeds: [embed] });
    return;
  }
}

client.login(process.env.DISCORD_TOKEN);
