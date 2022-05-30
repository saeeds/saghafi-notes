
const amqp = require('amqplib/callback_api');

exports.amqpWrapper = (function () {
  let client = null;
  return {
    connect: function (url) {
      return new Promise((resolve, reject) => {
        amqp.connect(url, function (err, conn) {
          if (err) {
            reject(err);
          }

          conn.on("error", function (err) {
            if (err.message !== "Connection closing") {
              reject(err);
            }
          });

          conn.on("close", function () {
            reject(err);
          });

          client = conn;

          resolve();
        });
      });
    },
    Client: function () {
      if (!client) {
        throw new Error('Cannot access Rabbit client before connecting');
      }
      return client;
    }
  }
})();

