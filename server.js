require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5174', 
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-frontend-domain.com' // Add your frontend domain here
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());


// MongoDB Connection

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit process if can't connect
});


// Visitor Schema
const visitorSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { collection: 'visitors' });

const Visitor = mongoose.model('Visitor', visitorSchema);

// Initialize visitor document
const initializeVisitor = async () => {
  try {
    await Visitor.findOneAndUpdate(
      {},
      { $setOnInsert: { count: 0 } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Initialization error:', err);
  }
};

// Atomic increment function
const incrementCount = async () => {
  const result = await Visitor.findOneAndUpdate(
    {},
    { $inc: { count: 1 } },
    { new: true, upsert: true }
  );
  return result.count;
};

// Routes
app.get('/api/visitors', async (req, res) => {
  try {
    const visitor = await Visitor.findOne();
    res.json({ 
      count: visitor?.count || 0,
      isNewVisitor: false // Always false for GET requests
    });
  } catch (error) {
    console.error('GET Error:', error);
    res.status(500).json({ error: 'Failed to fetch count', count: 0 });
  }
});

app.post('/api/visitors', async (req, res) => {
  try {
    const count = await incrementCount();
    res.json({ 
      count,
      isNewVisitor: true 
    });
  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: 'Failed to increment count', count: 0 });
  }
});

// Initialize on startup
initializeVisitor();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});