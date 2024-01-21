const RETRY_TOPICS = ['my-topic-retry-1', 'my-topic-retry-2'];
const TOPIC_NAME_DLT = 'my-topic-dlt';
const MAX_RETRY_ATTEMPTS = 2;

class Service {
  constructor(producer) {
    this.producer = producer;
  }

  process = (payload, headers) => {
    const retryCount = headers["retry-count"] || 0;

    if (payload.error && parseInt(retryCount) < payload.error.successAt) {
      console.log(`Forced error - processed ${retryCount} time(s)`);
      throw Error("Forced error");
    }
  };

  processMessage = async (topic, partition, message) => {
    try {
      const payload = JSON.parse(message.value);
      console.log(`Received from topic: ${topic}, partition: ${partition} the message:`);
      console.log(payload);
      await this.process(payload, message.headers);
    } catch (error) {
      await this.handleProcessingError(message);
    }
  };

  handleProcessingError = async (message) => {
    const retryCount = message.headers['retry-count'] || 0;

    if (parseInt(retryCount) < MAX_RETRY_ATTEMPTS) {
      const nextRetryTopic = RETRY_TOPICS[retryCount];
      await this.retryMessage(message, nextRetryTopic, parseInt(retryCount) + 1); 
    } else {
      await this.sendToDeadLetter(message);
    }
  };

  retryMessage = async (message, retryTopic, retryCount) => {
    try {
      await this.producer.send({ 
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

  sendToDeadLetter = async (message) => {
    try {
      await this.producer.send({ 
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
}

module.exports = Service;
