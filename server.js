const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');
const express = require('express');
// const bodyParser = require('body-parser');
const session = require('express-session');
const methodOverride = require('method-override');
const fs = require('fs');

const app = express();
const port=8080;

// 🔍 Confirm .env loaded
console.log("🔍 MONGO_URI from .env:", process.env.MONGO_URI);
console.log("TEST_ENV: ", process.env.TEST_ENV);
console.log("📂 Current dir:", __dirname);
console.log("📄 .env file exists:", fs.existsSync(path.join(__dirname, '.env')));

if (!process.env.MONGO_URI) {
   console.error('❌ MONGO_URI is undefined — check .env file and path!');
}

// ✅ Connect Mongo
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000
})
.then(() => console.log('✅ Connected to Local MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// mongoose.connect(process.env.MONGO_URI, {
//   serverSelectionTimeoutMS: 10000,
//   socketTimeoutMS: 45000
// })
// .then(() => console.log('✅ Connected to MongoDB Atlas'))
// .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, './public/uploads')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, 'views'));

// ✅ Session middleware (must be before routes)
app.use(session({
   secret: 'some-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.url = req.originalUrl;
  next();
});

// Debugging body for POST requests
app.use((req, res, next) => {
  if (req.method === 'POST') {
     console.log('🧾 Incoming POST body:', req.body);
   }
   next();
});

app.use((req, res, next) => {
  res.locals.session = req.session; // ✅ This makes session available in EJS
  res.locals.user = req.session.user; // Optional, for <%= user.name %>
  next();
});

// ✅ Routes
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const custodianRoutes = require('./routes/custodianRoutes');
app.use('/', authRoutes);
app.use('/asset', assetRoutes);
app.use('/custodians', custodianRoutes);

app.get('/', (req, res) => {
  res.redirect('/login');
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server running at port ${port}`);
});
