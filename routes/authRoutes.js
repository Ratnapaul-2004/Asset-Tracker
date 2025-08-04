const axios = require('axios');

const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const User = require('../models/User');
const Asset = require('../models/Asset');

// Central Function to render Login Page safely
function renderLogin(res, {
  error = null,
  success = null,
  query = {},
  user = null,
  url = '/login'
   }) {
    return res.render('auth/login', {
      error,
      success,
      query,
      siteKey: process.env.RECAPTCHA_SITE_KEY,
      user,
      url
    });
}


//----------LOGIN------------
router.get('/login', (req, res) => {
  renderLogin(res, {
    error: null,
    success: null,
    query: req.query,
    user: req.session.user,
    url: req.originalUrl
  });
});

router.post('/login', async (req, res) => {
  const { email, password, 'g-recaptcha-response': captcha} = req.body;
  console.log("📩 Full req.body:", req.body);

  if (!email || !password) {
    return renderLogin(res, {
      error: 'Please provide both email and password'
    });
  }

  if (!captcha) {
    return renderLogin(res, {
      error: 'Please complete the CAPTCHA'
    });
  }

  try {
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`;
    const response = await axios.post(verifyURL);

    if (!response.data.success) {
      return renderLogin(res, { error: 'CAPTCHA verification failed' });
    }

    const user = await User.findOne({
      email: new RegExp(`^${email.trim()}$`, 'i')
    });

    if (!user) {
      return renderLogin(res, { error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return renderLogin(res, { error: 'Incorrect password' });
    }

    req.session.user = user;
    return res.redirect('/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    return renderLogin(res, { error: 'Something went wrong. Please try again' });
  }
});



//------------REGISTER---------
router.get('/register', (req, res) => {
  res.render('auth/register', {
    error: null, 
    success: null,
    user: req.session.user,
    url: req.originalUrl
  });
});

router.post('/register', async (req, res) => {
  const {name, email, password, role, 
    designation = 'none', 
    employeeId = 'none', 
    department = 'none'
  } = req.body;
  const trimmedEmail = email?.trim().toLowerCase();  

  try {
     if (!name || !trimmedEmail || !password) {
      return res.render('auth/register', {
        error: 'All fields are required.',
        success: null,
        user: req.session.user,
        url: req.originalUrl
      });
    }

    const exists = await User.findOne({ email: new RegExp(`^${trimmedEmail}$`, 'i') });

    if (exists) {
      return res.render('auth/register', { 
        error: 'Email already exists.', 
        success: null,
        user: req.session.user,
        url: req.originalUrl 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email: trimmedEmail, 
      password: hashedPassword,
      role,
      designation: role === 'admin' ? designation: 'none',
      employeeId: role === 'admin' ? employeeId: 'none',
      department: role === 'admin' ? department : 'none'
    });

    console.log("👤 Registering:", {
      name,
      email: trimmedEmail,
      password: '[PROTECTED]', // do not log raw password
      role
    });

    await newUser.save();

    return res.redirect('/login');  
  } catch (err) {
    console.error('❌ Registration error:', err);
    return res.render('auth/register', {
      error: 'Something went wrong. Try again',
      success: null,
      user: req.session.user,
      url: req.originalUrl
    });
  }
});



//-----------ACCESS LIST--------------
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

router.get('/users', isAuthenticated, async (req, res) => {
  const users = await User.find();
  res.render('auth/usersList', { 
    users,
    user: req.session.user,
    url: req.originalUrl
  });
});


//-----------FORGOT PASSWORD----------
router.get('/forgot-password', (req, res) => {
  return res.render('auth/forgotPassword', {
    error: null, 
    message: null,
    user: req.session.user,
    url: req.originalUrl
  });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.render('auth/forgotPassword', {
        error: 'Please enter your email',
        message: null,
        user: req.session.user,
        url: req.originalUrl
      });
    }

    const user = await User.findOne({
      email: new RegExp(`^${email}$`, 'i') // case-insensitive match
    });

    if (!user) {
      return res.render('auth/forgotPassword', {
        error: 'No account found with this email',
        message: null,
        user: req.session.user,
        url: req.originalUrl
      });
    }

    console.log(`📧 Sending reset link to: ${email}`);

    return res.render('auth/forgotPassword', {
      message: 'A password reset link has been sent to your email',
      error: null,
      user: req.session.user,
      url: req.originalUrl
    });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    return res.render('auth/forgotPassword', {
      message: null,
      error: 'Something went wrong',
      user: req.session.user,
      url: req.originalUrl
    });
  }
});


//------------LOGOUT------------
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).send("Logout failed");
    }

    res.set('Clear-Site-Data', '"storage"'); // Clears sessionStorage and localStorage

    res.clearCookie('connect.sid'); // optional, clears session cookie
    
    return res.redirect('/login?message=Logged+out+successfully');
 // redirect to login after logout
  });
});



//------------DASHBOARD---------
router.get('/dashboard', isAuthenticated, async (req, res) => {
  const user = req.session.user;
  if(!user){
    return res.redirect('/login');
  }

  try {
    const totalAssets = await Asset.countDocuments();
    const totalUsers = await User.countDocuments();

    res.render('asset/dashboard', { 
      user, 
      totalAssets, 
      totalUsers,
      url: req.originalUrl
    });
  } catch (err) {
    console.error("Dashboard load error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;