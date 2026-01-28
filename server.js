const express = require('express');
const cors = require('cors');
const { runAgent } = require('./src/agent');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors({
    origin: 'http://localhost:5173'
}));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`Received message: ${message}`);
        const result = await runAgent(message);
        res.json({ answer: result });
    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`API Server listening on port ${port}`);
});
