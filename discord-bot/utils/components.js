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
const e = require('./emojiMap');

// ── Internals ─────────────────────────────────────────────────────────────────

function _container(accentColor, ...components) {
  const c = new ContainerBuilder();
  if (accentColor != null) c.setAccentColor(accentColor);
  for (const comp of components) {
    if (comp == null) continue;
    if (comp instanceof TextDisplayBuilder)  c.addTextDisplayComponents(comp);
    else if (comp instanceof SeparatorBuilder)    c.addSeparatorComponents(comp);
    else if (comp instanceof ActionRowBuilder)    c.addActionRowComponents(comp);
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

function _ts() {
  return Math.floor(Date.now() / 1000);
}

/** Remove a leading unicode icon (if any) so custom emojis don't duplicate. */
function _cleanTitle(title) {
  return String(title).replace(/^\s*(🚨|⚠️|✅|❌|📋|📖|🔐|🛡️|💾)\s*/, '').trim();
}

/** Wrap each line of a value inside a Discord blockquote. */
function _quote(text) {
  return text.split('\n').map(l => `> ${l}`).join('\n');
}

/** Render a list of {name, value} fields as formatted text blocks. */
function _fields(fields) {
  return fields.map(f => _txt(`**${f.name}**\n${_quote(f.value)}`));
}

// ── Public Builders ───────────────────────────────────────────────────────────

/**
 * 🚨 Red alert — threat detected / quarantine triggered.
 */
function alertMessage(title, description, fields = []) {
  const parts = [
    _txt(`### ${e.ALERT} ${_cleanTitle(title)}\n-# <t:${_ts()}:f>`),
    _sep(),
  ];
  if (description) parts.push(_txt(description));
  if (fields.length) {
    parts.push(_sep(false));
    parts.push(..._fields(fields));
  }
  return { flags: _flags(), components: [_container(0xED4245, ...parts)] };
}

/**
 * ✅ Green success.
 */
function successMessage(title, description, fields = []) {
  const parts = [
    _txt(`### ${e.SUCCESS} ${_cleanTitle(title)}`),
  ];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  if (fields.length) {
    parts.push(_sep(false));
    parts.push(..._fields(fields));
  }
  return { flags: _flags(), components: [_container(0x57F287, ...parts)] };
}

/**
 * ❌ Red error.
 */
function errorMessage(title, description) {
  const parts = [_txt(`### ${e.ERROR} ${_cleanTitle(title)}`)];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  return { flags: _flags(), components: [_container(0xED4245, ...parts)] };
}

/**
 * 📋 Blue info / dashboard.
 */
function infoMessage(title, description, fields = []) {
  const parts = [
    _txt(`### 📋 ${title}\n-# <t:${_ts()}:f>`),
  ];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  if (fields.length) {
    parts.push(_sep(false));
    parts.push(..._fields(fields));
  }
  return { flags: _flags(), components: [_container(0x5865F2, ...parts)] };
}

/**
 * ⚠️ Yellow warning.
 */
function warnMessage(title, description, fields = []) {
  const parts = [
    _txt(`### ${e.WARN} ${_cleanTitle(title)}\n-# <t:${_ts()}:f>`),
  ];
  if (description) {
    parts.push(_sep());
    parts.push(_txt(description));
  }
  if (fields.length) {
    parts.push(_sep(false));
    parts.push(..._fields(fields));
  }
  return { flags: _flags(), components: [_container(0xFEE75C, ...parts)] };
}

/**
 * 🔐 Orange confirmation with Onayla / İptal buttons.
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
    _txt(`### 🔐 ${title}`),
    _sep(),
  ];
  if (description) parts.push(_txt(description));
  parts.push(_sep(false));
  parts.push(row);

  return { flags: _flags(), components: [_container(0xFF8800, ...parts)] };
}

/**
 * 📖 Paginated help page.
 */
function helpPage(pageTitle, pageBody, currentPage, totalPages, prevId, nextId) {
  const navRow = new ActionRowBuilder().addComponents(
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
        _txt(`### ${e.SHIELD} ${pageTitle}\n-# Sayfa ${currentPage + 1} / ${totalPages}`),
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
