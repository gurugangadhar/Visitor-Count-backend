require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Configuration ---
const corsOptions = {
  origin: (origin, callback) => {
    const whitelist = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://visitor-count-backend.onrender.com',
      'https://gurugangadhar.github.io',
      'https://gurugangadhar.github.io/tk2k25/',
      'https://your-frontend-domain.com'
    ];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// --- Visitor Schema ---
const visitorSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { collection: 'visitors' });

const Visitor = mongoose.model('Visitor', visitorSchema);

// --- Tracker Schema for IP Logging (Expires in 1 Hour) ---
const visitorTrackSchema = new mongoose.Schema({
  ip: String,
  createdAt: { type: Date, default: Date.now, expires: 3600 } // TTL: 1 hour
}, { collection: 'visitor_tracker' });

const VisitorTracker = mongoose.model('VisitorTracker', visitorTrackSchema);

// --- Initialize Visitor Counter ---
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

// --- Atomic Counter Increment ---
const incrementCount = async () => {
  const result = await Visitor.findOneAndUpdate(
    {},
    { $inc: { count: 1 }, $set: { lastUpdated: new Date() } },
    { new: true, upsert: true }
  );
  return result.count;
};

// --- GET Visitor Count ---
app.get('/api/visitors', async (req, res) => {
  try {
    const visitor = await Visitor.findOne();
    res.json({ 
      count: visitor?.count || 0,
      isNewVisitor: false
    });
  } catch (error) {
    console.error('GET Error:', error);
    res.status(500).json({ error: 'Failed to fetch count', count: 0 });
  }
});

// --- POST Increment Count for New Visitor ---
app.post('/api/visitors', async (req, res) => {
  try {
    // Get real client IP
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;

    // Check if IP already tracked within 1 hour
    const existingVisitor = await VisitorTracker.findOne({ ip });

    if (existingVisitor) {
      // Not a new visitor
      const visitor = await Visitor.findOne();
      return res.json({
        count: visitor?.count || 0,
        isNewVisitor: false
      });
    }

    // Track IP and increment count
    await VisitorTracker.create({ ip });
    const newCount = await incrementCount();

    return res.json({
      count: newCount,
      isNewVisitor: true
    });

  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: 'Failed to increment count', count: 0 });
  }
});

// --- Initialize and Start Server ---
initializeVisitor();

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
