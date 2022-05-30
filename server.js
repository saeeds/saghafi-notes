const { config } = require('dotenv');
const app = require('./app');
const { amqpWrapper } = require('./amqp-wrapper');
const { amqpPublisher } = require('./events/base-publisher');
const { amqpCreateUserNoteListener } = require('./events/createUserNoteListener');
const { amqpDeleteUserNoteListener } = require('./events/deleteUserNoteListener');
try {
  config({ path: './config.env' });

  amqpWrapper.connect(process.env.AMQP_HOST_URL)
    .then(() => {
      amqpPublisher.startPublisher();
      amqpCreateUserNoteListener.startWorker();
      amqpDeleteUserNoteListener.startWorker();
    }).catch(err => console.log(err));

  process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });

  const port = process.env.PORT || 3000;

  const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
  });

  process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('SIGINT', () => amqpWrapper.Client.close());

  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    amqpWrapper.Client().close()
    server.close(() => {
      console.log('💥 Process terminated!');
    });
  });
} catch (err) {
  console.error(err);
}