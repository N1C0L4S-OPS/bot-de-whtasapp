class NotImplementedError extends Error {
  constructor(channelKey, methodName) {
    super(`${channelKey}: '${methodName}' todavía no está implementado.`);
    this.name = 'NotImplementedError';
  }
}

module.exports = { NotImplementedError };
