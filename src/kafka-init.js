const kafka = require("./kafka-connection")
const Service = require('./service');


const TOPIC_NAME = 'my-topic';
const RETRY_TOPICS = ['my-topic-retry-1', 'my-topic-retry-2'];
const GROUP_ID = 'my-group';

const runMainConsumer = async () => {
    const producer = kafka.producer();
    const consumer = kafka.consumer({
        groupId: GROUP_ID,
    });

    const service = new Service(producer);

    await consumer.connect();
    await producer.connect();

    await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            await service.processMessage(topic, partition, message);
        },
    });

    return { producer, consumer, service }
};

const runRetryConsumers = async (service) => {
    const retryConsumers = RETRY_TOPICS.map((retryTopic, index) => {
        const retryConsumer = kafka.consumer({ groupId: `retry-group-${index + 1}` });

        retryConsumer.connect();
        retryConsumer.subscribe({ topic: retryTopic, fromBeginning: true });

        retryConsumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                await service.processMessage(topic, partition, message);
            },
        });

        return retryConsumer;
    });

    return retryConsumers;
};

const run = async () => {
    const { producer, consumer, service } = await runMainConsumer();
    const retryConsumers = await runRetryConsumers(service);

    return {
        producer,
        consumer,
        retryConsumers
    }
};

module.exports = {
    start: run
}