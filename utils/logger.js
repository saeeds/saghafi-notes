const { createLogger } = require('../common/logger');

exports.winston = (function () {
  let instance;
  const createInstance = () => {
    var client = createLogger();
    return client;
  }
  return {
    getInstance: function () {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
  };
})();
