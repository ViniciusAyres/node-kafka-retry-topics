const kafkaInit = require("./kafka-init");
const API = require('./api');

const TOPIC_NAME = 'my-topic';


async function start() {
  // Start consumers
  const { producer } = await kafkaInit.start()

  // REST API
  API.start(producer, TOPIC_NAME)
}

start()