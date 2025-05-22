const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database file path
const DB_PATH = path.join(__dirname, 'visitors.json');

// Initialize visitor count
const initializeVisitorCount = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ count: 0 }));
  }
};

// Get visitor count
app.get('/api/visitors', (req, res) => {
  initializeVisitorCount();
  const data = JSON.parse(fs.readFileSync(DB_PATH));
  res.json({ count: data.count });
});

// Increment visitor count
app.post('/api/visitors', (req, res) => {
  initializeVisitorCount();
  const data = JSON.parse(fs.readFileSync(DB_PATH));
  data.count += 1;
  fs.writeFileSync(DB_PATH, JSON.stringify(data));
  res.json({ count: data.count });
});

// Serve static files (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});