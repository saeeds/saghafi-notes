const { Client } = require('../utils/redis');
const client = require('../apollo/client');
const { amqpPublisher } = require('../events/base-publisher');
const { GET_USER_NOTES_BY_LESSONID } = require('../queries');
const {
  AMPQ_CREATE_USER_NOTE_DIRECT,
  AMPQ_DELETE_USER_NOTE_DIRECT
} = require('./../events/exchange');

exports.getAllUserNotesByLessonId = async (req, res) => {
  try {
    const { userId, lessonId } = req.body;
    //get redis instance
    var redis = Client.getInstance();
    //set cache key
    const key = JSON.stringify(
      Object.assign({
        collection: "saghafi_exam_notes",
        userId,
        lessonId
      })
    );
    var cache = await redis.get(key);
    //fetch data from cache
    if (cache) return res.json(JSON.parse(cache));
    //get notes from db
    const result = await client.request(GET_USER_NOTES_BY_LESSONID, { userId, lessonId })
    //set cache value
    const isOk = await redis.set(key, JSON.stringify({
      status: true,
      message: result.userNotes
    }), "EX", process.env.REDIS_EXPRIRATION_PERIOD);
    //send rsponse to client
    isOk ? res.json({
      status: true,
      message: result
    }) : res.json({
      status: false,
      message: "somthing wroing happen please contact the administartor"
    });
  } catch (error) {
    return res.json({ message: error });
  }
};

exports.createUserNoteById = async (req, res) => {
  const { userId, lessonId, note, clientId } = req.body;
  amqpPublisher.publish(AMPQ_CREATE_USER_NOTE_DIRECT, '',
    new Buffer.from(JSON.stringify({ user: userId, lesson: lessonId, note, clientId })))
    .then(() => {
      res.json({
        status: true,
        message: "the message sent"
      });
    })
    .catch(error => res.json({
      status: false,
      message: error
    }));
};

exports.deleteUserNoteById = async (req, res) => {
  const { clientId } = req.body;
  amqpPublisher.publish(AMPQ_DELETE_USER_NOTE_DIRECT,
    '', new Buffer.from(JSON.stringify({ clientId })))
    .then(() => {
      res.json({
        status: true,
        message: "the message sent"
      });
    })
    .catch(error => res.json({
      status: false,
      message: error
    }));
};