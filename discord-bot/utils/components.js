'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SeparatorSpacingSize,
} = require('discord.js');

const { e } = require('../config/emojis');

// ── Helpers ──────────────────────────────────────────────────────────────────

function _container(accentColor, ...components) {
  const c = new ContainerBuilder();
  if (accentColor != null) c.setAccentColor(accentColor);
  for (const comp of components) {
    if (comp === null || comp === undefined) continue;
    if (comp instanceof TextDisplayBuilder) {
      c.addTextDisplayComponents(comp);
    } else if (comp instanceof SeparatorBuilder) {
      c.addSeparatorComponents(comp);
    } else if (comp instanceof ActionRowBuilder) {
      c.addActionRowComponents(comp);
    }
  }
  return c;
}

function _sep(divider = true, spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}

function _txt(content) {
  return new TextDisplayBuilder().setContent(content);
}

function _flags() {
  return MessageFlags.IsComponentsV2;
}

// ── Public Builders ───────────────────────────────────────────────────────────

/**
 * Red alert message (threat detected).
 */
function alertMessage(title, description, fields = []) {
  const parts = [
    _txt(`${e('uyari')} **${title}**`),
    _sep(),
  ];
  if (description) parts.push(_txt(description));
  for (const f of fields) {
    parts.push(_sep(false));
    parts.push(_txt(`**${f.name}**\n${f.value}`));
  }
  return {
    flags: _flags(),
    components: [_container(0xFF0000, ...parts)],
  };
}

/**
 * Green success message.
 */
function successMessage(title, description, fields = []) {
  const parts = [
    _txt(`${e('tik', 'static')} **${title}**`),
  ];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  for (const f of fields) {
    parts.push(_sep(false));
    parts.push(_txt(`**${f.name}**\n${f.value}`));
  }
  return {
    flags: _flags(),
    components: [_container(0x57F287, ...parts)],
  };
}

/**
 * Red error message.
 */
function errorMessage(title, description) {
  const parts = [_txt(`${e('red', 'static')} **${title}**`)];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  return {
    flags: _flags(),
    components: [_container(0xED4245, ...parts)],
  };
}

/**
 * Blue info message.
 */
function infoMessage(title, description, fields = []) {
  const parts = [
    _txt(`${e('bilgi')} **${title}**`),
  ];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  for (const f of fields) {
    parts.push(_sep(false));
    parts.push(_txt(`**${f.name}**\n${f.value}`));
  }
  return {
    flags: _flags(),
    components: [_container(0x5865F2, ...parts)],
  };
}

/**
 * Orange warning message.
 */
function warnMessage(title, description, fields = []) {
  const parts = [
    _txt(`${e('unlem')} **${title}**`),
  ];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  for (const f of fields) {
    parts.push(_sep(false));
    parts.push(_txt(`**${f.name}**\n${f.value}`));
  }
  return {
    flags: _flags(),
    components: [_container(0xFEE75C, ...parts)],
  };
}

/**
 * Confirmation message with Onayla / İptal buttons.
 */
function confirmationMessage(title, description, confirmId, cancelId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel('✅ Onayla')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel('❌ İptal')
      .setStyle(ButtonStyle.Secondary),
  );
  const parts = [
    _txt(`${e('uyari')} **${title}**`),
    _sep(),
  ];
  if (description) parts.push(_txt(description));
  parts.push(_sep(false));
  parts.push(row);
  return {
    flags: _flags(),
    components: [_container(0xFF8800, ...parts)],
  };
}

/**
 * Paginated help page container.
 */
function helpPage(pageTitle, pageBody, currentPage, totalPages, prevId, nextId) {
  const navRow = new ActionRowBuilder();
  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(prevId)
      .setLabel('◀ Geri')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId('help_noop')
      .setLabel(`${currentPage + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(nextId)
      .setLabel('İleri ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
  );
  return {
    flags: _flags(),
    components: [
      _container(
        0x5865F2,
        _txt(`${e('bilgi')} **${pageTitle}**`),
        _sep(),
        _txt(pageBody),
        _sep(false),
        navRow,
      ),
    ],
  };
}

module.exports = {
  alertMessage,
  successMessage,
  errorMessage,
  infoMessage,
  warnMessage,
  confirmationMessage,
  helpPage,
};
