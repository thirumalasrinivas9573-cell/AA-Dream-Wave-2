const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function stamp(level, message, meta) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = {
  error: (message, meta) => stamp('error', message, meta),
  warn: (message, meta) => stamp('warn', message, meta),
  info: (message, meta) => stamp('info', message, meta),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') stamp('debug', message, meta);
  },
};

module.exports = logger;
