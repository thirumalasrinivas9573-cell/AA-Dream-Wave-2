const PREFIX = 'dw:'

function key(name) {
  return `${PREFIX}${name}`
}

function get(name, fallback = null, storage = localStorage) {
  try {
    const value = storage.getItem(key(name))
    return value === null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

function set(name, value, storage = localStorage) {
  try {
    storage.setItem(key(name), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function remove(name, storage = localStorage) {
  try {
    storage.removeItem(key(name))
    return true
  } catch {
    return false
  }
}

function update(name, updater, fallback = null, storage = localStorage) {
  const next = updater(get(name, fallback, storage))
  set(name, next, storage)
  return next
}

export const storageService = { get, set, remove, update }
export default storageService
