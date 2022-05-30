const { amqpWrapper } = require('../amqp-wrapper');
const { Client } = require('../utils/redis');
const { winston } = require('../utils/logger');
const { CREATE_USER_NOTE, GET_USER_NOTES_BY_LESSONID } = require('../queries');
const client = require('../apollo/client');

exports.amqpCreateUserNoteListener = (function () {
  const logger = winston.getInstance();

  const createUserNoteByLessonId = async (user, lesson, note, clientId) => {
    try {
      //cerate new record
      const data = await client.request(CREATE_USER_NOTE, {
        data: {
          user, lesson, note, clientId
        }
      });
      logger.log({
        level: 'info',
        message: `createUserNoteByLessonId: ${data}`
      });
      //update redies cache
      var redis = Client.getInstance();
      //set cache key
      const key = JSON.stringify(
        Object.assign({
          collection: "saghafi_exam_notes",
          userId: user,
          lessonId: lesson
        })
      );
      //get notes from db
      const result = await client.request(GET_USER_NOTES_BY_LESSONID, { userId: user, lessonId: lesson });
      const isOk = await redis.set(key, JSON.stringify({
        status: true,
        message: result.userNotes
      }), "EX", process.env.REDIS_EXPRIRATION_PERIOD);

      logger.log({
        level: 'info',
        message: `notes redis cache key update successfully: ${isOk}`
      });
    } catch (error) {
      logger.log({
        level: 'error',
        message: `createUserNoteByLessonId Error: ${error}`
      });
    }
  };

  const work = async (msg, cb) => {
    try {
      const { user, lesson, note, clientId } = JSON.parse(msg.content.toString());
      await createUserNoteByLessonId(user, lesson, note, clientId);
      logger.log({
        level: 'info',
        message: `Got queue.create.user.note.direct msg: ${msg.content.toString()}`
      });
      cb(true);
    } catch (error) {
      logger.log({
        level: 'error',
        message: `createUserNoteByLessonId Error: ${error}`
      });
      cb(false);
    }
  };

  const closeOnErr = (err) => {
    const amqpConn = amqpWrapper.Client();
    if (!err) return false;
    logger.log({
      level: 'error',
      message: ` queue.create.user.note.direct error: ${err}`
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
            message: ` queue.create.user.note.direct channel error: ${err.message}`
          });
        });

        ch.on("close", () => {
          logger.log({
            level: 'info',
            message: "queue.create.user.note.direct channel closed"
          });
        });

        ch.prefetch(10);

        ch.assertQueue("queue.create.user.note.direct", { durable: true }, (err, _ok) => {
          if (closeOnErr(err)) return;
          ch.consume("queue.create.user.note.direct", processMsg, { noAck: false });
          logger.log({
            level: 'info',
            message: "Worker queue.create.user.note.direct is started"
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

