'use strict';

const { errorMessage, successMessage } = require('./components');

// pending confirmations: Map<customId, { resolve, reject, timeout }>
const pending = new Map();

/**
 * Register a pending confirmation and return a Promise that resolves when confirmed or rejected.
 * The promise resolves with true (confirmed) or false (cancelled/timed-out).
 */
function awaitConfirmation(confirmId, cancelId, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const cleanup = () => {
      pending.delete(confirmId);
      pending.delete(cancelId);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const entry = {
      resolve: (value) => {
        clearTimeout(timer);
        cleanup();
        resolve(value);
      },
    };

    pending.set(confirmId, { ...entry, value: true });
    pending.set(cancelId, { ...entry, value: false });
  });
}

/**
 * Handle an incoming button interaction for confirmations.
 */
async function handleConfirmButton(interaction) {
  try {
    const entry = pending.get(interaction.customId);
    if (!entry) {
      await interaction.reply({
        ...errorMessage('Zaman Aşımı', 'Bu buton artık geçerli değil.'),
        ephemeral: true,
      });
      return;
    }
    await interaction.deferUpdate().catch(() => {});
    entry.resolve(entry.value);
  } catch (err) {
    console.error('[confirmationManager]', err);
  }
}

module.exports = { awaitConfirmation, handleConfirmButton };
