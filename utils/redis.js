const Redis = require("ioredis");
const { promisify } = require("util");

exports.Client = (function () {
  let instance;

  const createInstance = () => {
    var client = new Redis(process.env.REDIS_HOST_URL);
    client.get = promisify(client.get);
    client.del = promisify(client.del);
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
