/**
 * Ensure User indexes support multi-portal emails:
 * unique (email, role) instead of unique email alone.
 */
async function ensureMultiPortalUserIndexes(mongoose, User) {
  const col = mongoose.connection.collection('users');
  try {
    const indexes = await col.indexes();
    const emailOnly = indexes.find(
      (idx) => idx.name === 'email_1' || (
        idx.key
        && idx.key.email === 1
        && Object.keys(idx.key).length === 1
        && idx.unique
      ),
    );
    if (emailOnly) {
      await col.dropIndex(emailOnly.name);
      console.log(`[db] Dropped unique email index (${emailOnly.name}) for multi-portal accounts`);
    }
  } catch (err) {
    if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
      console.warn('[db] Could not drop email_1 index:', err.message);
    }
  }

  try {
    await User.syncIndexes();
    console.log('[db] User indexes synced (email+role unique)');
  } catch (err) {
    console.warn('[db] User.syncIndexes failed:', err.message);
  }
}

module.exports = { ensureMultiPortalUserIndexes };
