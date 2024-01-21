const { Kafka, logLevel } = require('kafkajs');
const ip = require('ip');

const kafka = new Kafka({
  logLevel: logLevel.ERROR,
  clientId: 'kafka-node-project',
  brokers: [`${ip.address()}:9092`],
});

module.exports = kafka