require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Setup ---
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://gurugangadhar.github.io',
    'https://gurugangadhar.github.io/tk2k25/',
    'https://visitor-count-backend.onrender.com',
    'https://your-frontend-domain.com'
  ],
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

// --- Schema: Visitor per Page ---
const visitorSchema = new mongoose.Schema({
  page: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { collection: 'visitors_by_page' });

const Visitor = mongoose.model('Visitor', visitorSchema);

// --- Increment Visitor Count for Page ---
const incrementPageCount = async (page) => {
  const result = await Visitor.findOneAndUpdate(
    { page },
    { $inc: { count: 1 }, $set: { lastUpdated: new Date() } },
    { new: true, upsert: true }
  );
  return result.count;
};

// --- Get Count for Page ---
const getPageCount = async (page) => {
  const result = await Visitor.findOne({ page });
  return result?.count || 0;
};

// --- API Routes ---

// GET count for specific page
app.get('/api/visitors', async (req, res) => {
  const page = req.query.page;
  if (!page) return res.status(400).json({ error: 'Page parameter is required' });

  try {
    const count = await getPageCount(page);
    res.json({ page, count, isNewVisitor: false });
  } catch (error) {
    console.error('GET Error:', error);
    res.status(500).json({ error: 'Failed to fetch count', count: 0 });
  }
});

// POST: increment count for page
app.post('/api/visitors', async (req, res) => {
  const page = req.body.page;
  if (!page) return res.status(400).json({ error: 'Page parameter is required in body' });

  try {
    const count = await incrementPageCount(page);
    res.json({ page, count, isNewVisitor: true });
  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: 'Failed to increment count', count: 0 });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
