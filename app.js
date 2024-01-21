const express = require('express');
const { Kafka, logLevel } = require('kafkajs');
const ip = require('ip');

const TOPIC_NAME = 'my-topic';
const RETRY_TOPICS = ['my-topic-retry-1', 'my-topic-retry-2'];
const TOPIC_NAME_DLT = 'my-topic-dlt';
const GROUP_ID = 'my-group';
const MAX_RETRY_ATTEMPTS = 2;

const process = (payload, headers) => {
  const retryCount = headers["retry-count"] || 0;

  if (payload.error && parseInt(retryCount) <= payload.error.successAt) {
    console.log(`Forced error - processed ${retryCount} time(s)`);
    throw Error("Forced error");
  }
};

const processMessage = async (topic, partition, message) => {
  try {
    const payload = JSON.parse(message.value);
    console.log(`Received from topic: ${topic}, partition: ${partition} the message:`);
    console.log(payload);
    await process(payload, message.headers);
  } catch (error) {
    await handleProcessingError(message);
  }
};

const handleProcessingError = async (message) => {
  const retryCount = message.headers['retry-count'] || 0;

  if (parseInt(retryCount) < MAX_RETRY_ATTEMPTS) {
    const nextRetryTopic = RETRY_TOPICS[retryCount];
    await retryMessage(message, nextRetryTopic, parseInt(retryCount) + 1);
  } else {
    await sendToDeadLetter(message);
  }
};

const kafka = new Kafka({
  logLevel: logLevel.INFO,
  clientId: 'kafka-node-project',
  brokers: [`${ip.address()}:9092`],
});

const producer = kafka.producer();

const consumer = kafka.consumer({
  groupId: GROUP_ID,
});

const retryMessage = async (message, retryTopic, retryCount) => {
  try {
    await producer.send({
      topic: retryTopic,
      messages: [
        {
          value: message.value,
          headers: {
            'retry-count': String(retryCount),
          },
        },
      ],
    });

    console.log(`Message sent to retry topic (${retryCount}): ${message.value.toString()}`);
  } catch (e) {
    console.error(`Error to send message to retry topic: ${e.message}`);
  }
};

const sendToDeadLetter = async (message) => {
  try {
    await producer.send({
      topic: TOPIC_NAME_DLT,
      messages: [
        {
          value: message.value,
          headers: {
            'retry-count': String(MAX_RETRY_ATTEMPTS),
          },
        },
      ],
    });

    console.log(`Message sent to dlt topic after ${MAX_RETRY_ATTEMPTS} retries: ${message.value.toString()}`);
  } catch (e) {
    console.error(`Failed to send message to DLT: ${e.message}`);
  }
};

const runMainConsumer = async () => {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await processMessage(topic, partition, message);
    },
  });
};

const runRetryConsumers = async () => {
  const retryConsumers = RETRY_TOPICS.map((retryTopic, index) => {
    const retryConsumer = kafka.consumer({ groupId: `retry-group-${index + 1}` });

    retryConsumer.connect();
    retryConsumer.subscribe({ topic: retryTopic, fromBeginning: true });

    retryConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(topic, partition, message);
      },
    });

    return retryConsumer;
  });

  return retryConsumers;
};

const run = async () => {
  await runMainConsumer();
  const retryConsumers = await runRetryConsumers();
};

// REST API
const app = express();
const port = 3000;

app.use(express.json());

app.post('/produce', async (req, res) => {
  try {
    await producer.send({
      topic: TOPIC_NAME,
      messages: [{ value: JSON.stringify(req.body) }],
    });
    res.json({ status: 'Message sent to Kafka' });
  } catch (error) {
    console.error(`Error to publish message: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Start consumers
run().catch(console.error);
