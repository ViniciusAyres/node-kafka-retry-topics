const express = require('express');

const app = express();
const port = 3000;

app.use(express.json());

function start(producer, mainTopic) {
  app.post('/produce', async (req, res) => {
    try {
      await producer.send({
        topic: mainTopic,
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
}

module.exports = {
  start
}