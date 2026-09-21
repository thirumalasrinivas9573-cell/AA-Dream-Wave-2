async function hasDuplicate(collection, key, match = null) {
  const groups = await collection.aggregate([
    { $match: match || Object.fromEntries(Object.keys(key).map((field) => [field, { $ne: null }])) },
    { $group: { _id: Object.fromEntries(Object.keys(key).map((field) => [field, `$${field}`])), count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray()
  return groups.length > 0
}

async function createUniqueWhenSafe(collection, key, options) {
  if (await hasDuplicate(collection, key, options.partialFilterExpression)) {
    console.warn(`[db] Skipped unique index ${options.name}: duplicate data requires reconciliation`)
    return false
  }
  await collection.createIndex(key, { ...options, unique: true })
  return true
}

async function ensureCoreIndexes(mongoose) {
  const db = mongoose.connection

  await createUniqueWhenSafe(
    db.collection('institutions'),
    { ownerId: 1 },
    {
      name: 'institution_owner_unique',
      partialFilterExpression: { ownerId: { $type: 'objectId' } },
    },
  )
  await createUniqueWhenSafe(
    db.collection('companyprofiles'),
    { ownerId: 1 },
    {
      name: 'company_owner_unique',
      partialFilterExpression: { ownerId: { $type: 'objectId' } },
    },
  )
  await createUniqueWhenSafe(
    db.collection('users'),
    { phone: 1, role: 1 },
    {
      name: 'phone_portal_unique',
      partialFilterExpression: { phone: { $type: 'string', $gt: '' }, role: { $type: 'string' } },
    },
  )
  await createUniqueWhenSafe(
    db.collection('roadmaps'),
    { userId: 1, goalId: 1 },
    { name: 'roadmap_user_goal_unique' },
  )

  // TTL indexes are declared on the Recommendation and PhoneOtpState schemas.
  // Recreating the same keys here under different names causes IndexOptionsConflict.
}

module.exports = { ensureCoreIndexes }
