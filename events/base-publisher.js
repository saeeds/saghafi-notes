const { amqpWrapper } = require('../amqp-wrapper');
const { winston } = require('../utils/logger');

exports.amqpPublisher = (function () {
  const logger = winston.getInstance();
  let offlinePubQueue = [];
  let pubChannel = null;

  function closeOnErr(err) {
    const amqpConn = amqpWrapper.Client();
    if (!err) return false;
    logger.log({
      level: 'info',
      message: "[AMQP] auth service error"
    });
    amqpConn.close();
    return true;
  }

  return {
    startPublisher: function () {
      const amqpConn = amqpWrapper.Client();
      amqpConn.createConfirmChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function (err) {
          logger.log({
            level: 'error',
            message: `[AMQP] auth service channel error: ${err.message}`
          });
        });
        ch.on("close", function () {
          logger.log({
            level: 'error',
            message: "[AMQP] auth service channel closed"
          });
        });
        pubChannel = ch;
        while (true) {
          var m = offlinePubQueue.shift();
          if (!m) break;
          publish(m[0], m[1], m[2]);
        }
      });
    },
    publish: function (exchange, routingKey, content) {
      return new Promise((resolve, reject) => {
        try {
          pubChannel.publish(exchange, routingKey, content, { persistent: true }, function (err, ok) {
            if (err) {
              logger.log({
                level: 'error',
                message: `[AMQP] auth service publish: ${err}`
              });
              offlinePubQueue.push([exchange, routingKey, content]);
              pubChannel.connection.close();
              reject();
            }
            resolve();
          });
        } catch (e) {
          logger.log({
            level: 'error',
            message: `[AMQP] auth service publish: ${e.message}`
          });
          offlinePubQueue.push([exchange, routingKey, content]);
          reject();
        }
      });
    },
  };
})();
