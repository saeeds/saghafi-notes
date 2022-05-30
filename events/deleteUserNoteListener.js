const { amqpWrapper } = require('../amqp-wrapper');
const { winston } = require('../utils/logger');
const client = require('../apollo/client');
const { Client } = require('../utils/redis');
const {
  DELETE_USER_NOTES, GET_USER_NOTES_BY_LESSONID,
  GET_USER_NOTES_BY_CLIENT_ID
} = require('../queries');

exports.amqpDeleteUserNoteListener = (function () {
  const logger = winston.getInstance();

  const deleteUserNoteById = async (clientId) => {
    try {
      const noteItem = await client.request(GET_USER_NOTES_BY_CLIENT_ID, { clientId });
      logger.log({
        level: 'info',
        message: `GET_USER_NOTES_BY_CLIENT_ID: ${noteItem.userNotes[0].id}`
      });
      //delete note record
      const data = await client.request(DELETE_USER_NOTES, { noteId: noteItem.userNotes[0].id });
      logger.log({
        level: 'info',
        message: `deleteUserNoteById: ${data}`
      });
      //update redies cache
      var redis = Client.getInstance();
      //set cache key
      logger.log({
        level: 'info',
        message: `====user=====: ${data.deleteUserNote.userNote.user}`
      });
      logger.log({
        level: 'info',
        message: `====lesson=====: ${data.deleteUserNote.userNote.lesson}`
      });
      const key = JSON.stringify(
        Object.assign({
          collection: "saghafi_exam_notes",
          userId: data.deleteUserNote.userNote.user.id,
          lessonId: data.deleteUserNote.userNote.lesson.id
        })
      );
      //get notes from db
      const result = await client.request(GET_USER_NOTES_BY_LESSONID,
        {
          userId: data.deleteUserNote.userNote.user.id,
          lessonId: data.deleteUserNote.userNote.lesson.id
        });
      const isOk = await redis.set(key, JSON.stringify({
        status: true,
        message: result.userNotes
      }), "EX", process.env.REDIS_EXPRIRATION_PERIOD);
      logger.log({
        level: 'info',
        message: `notes redis cache key deleteUserNoteById: ${isOk}`
      });
    } catch (error) {
      logger.log({
        level: 'error',
        message: `deleteUserNoteById Error: ${isOk}`
      });
    }
  };

  const work = async (msg, cb) => {
    try {
      const { clientId } = JSON.parse(msg.content.toString());
      await deleteUserNoteById(clientId);
      logger.log({
        level: 'info',
        message: `Got queue.delete.user.note.direct msg: ${msg.content.toString()}`
      });
      cb(true);
    } catch (error) {
      logger.log({
        level: 'error',
        message: `deleteUserNoteById Error: ${error}`
      });
      cb(false);
    }
  };

  const closeOnErr = (err) => {
    const amqpConn = amqpWrapper.Client();
    if (!err) return false;
    logger.log({
      level: 'error',
      message: ` queue.delete.user.note.direct error: ${err}`
    });
    amqpConn.close();
    return true;
  };

  return {
    startWorker: function () {
      const amqpConn = amqpWrapper.Client();
      amqpConn.createChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", (err) => {
          logger.log({
            level: 'error',
            message: `queue.delete.user.note.direct channel error: ${err.message}`
          });
        });

        ch.on("close", () => {
          logger.log({
            level: 'info',
            message: "queue.delete.user.note.direct channel closed"
          });
        });

        ch.prefetch(10);

        ch.assertQueue("queue.delete.user.note.direct", { durable: true }, (err, _ok) => {
          if (closeOnErr(err)) return;
          ch.consume("queue.delete.user.note.direct", processMsg, { noAck: false });
          ch.on("close", () => {
            logger.log({
              level: 'info',
              message: "Worker queue.delete.user.note.direct is started"
            });
          });
        });

        const processMsg = (msg) => {
          work(msg, function (ok) {
            try {
              if (ok)
                ch.ack(msg);
              else
                ch.reject(msg, true);
            } catch (e) {
              closeOnErr(e);
            }
          });
        }
      });
    }
  }
})();

