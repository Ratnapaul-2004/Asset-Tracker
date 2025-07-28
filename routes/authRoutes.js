const axios = require('axios');

const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const User = require('../models/User');



//----------LOGIN------------
router.get('/login', (req, res) => {
  res.render('auth/login', {error: null, success: null, query: req.query, siteKey: process.env.RECAPTCHA_SITE_KEY});
});

router.post('/login', async (req, res) => {
  const { email, password, 'g-recaptcha-response': captcha} = req.body;
  console.log("📩 Full req.body:", req.body);

  if (!email || !password) {
    return res.render('auth/login', {
      error: 'Please provide both email and password.',
      success: null
    });
  }

  if (!captcha) {
    return res.render('auth/login', { error: 'Please complete the CAPTCHA.', success: null });
  }

  try {
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`;
    const response = await axios.post(verifyURL);

    if (!response.data.success) {
      return res.render('auth/login', { error: 'CAPTCHA verification failed.', success: null });
    }

    const user = await User.findOne({
      email: new RegExp(`^${email.trim()}$`, 'i')
    });

    if (!user) {
      return res.render('auth/login', {
        error: 'User not found.',
        success: null
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render('auth/login', {
        error: 'Incorrect password.',
        success: null
      });
    }

    req.session.user = user;
    return res.redirect('asset/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    return res.render('auth/login', {
      error: 'Something went wrong.',
      success: null
    });
  }
});



//------------REGISTER---------
router.get('/register', (req, res) => {
  res.render('auth/register', {error: null, success: null});
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
        success: null
      });
    }

    const exists = await User.findOne({ email: new RegExp(`^${trimmedEmail}$`, 'i') });

    if (exists) {
      return res.render('auth/register', { error: 'Email already exists.', success: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email: trimmedEmail, 
      password: hashedPassword,
      role,
      designation: role === 'admin' ? designation: 'none',
      employeeId: role === 'admin' ? designation: 'none',
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
      error: 'Something went wrong. Try again.',
      success: null
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
  res.render('auth/usersList', { users });
});


//-----------FORGOT PASSWORD----------
router.get('/forgot-password', (req, res) => {
  return res.render('auth/forgotPassword', {error: null, message: null});
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.render('auth/forgotPassword', {
        error: 'Please enter your email.',
        message: null
      });
    }

    const user = await User.findOne({
      email: new RegExp(`^${email}$`, 'i') // case-insensitive match
    });

    if (!user) {
      return res.render('auth/forgotPassword', {
        error: 'No account found with this email.',
        message: null
      });
    }

    console.log(`📧 Sending reset link to: ${email}`);

    return res.render('auth/forgotPassword', {
      message: 'A password reset link has been sent to your email.',
      error: null
    });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    return res.render('auth/forgotPassword', {
      error: 'Something went wrong.',
      message: null
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

    res.clearCookie('connect.sid'); // optional, clears session cookie
    res.redirect('/login?message=Logged+out+successfully');
 // redirect to login after logout
  });
});



//------------DASHBOARD---------
router.get('/dashboard', (req, res) => {
  const user = req.session.user;
  if(!user){
    return res.redirect('/login');
  }

//   res.send(`<h2>Welcome, ${req.session.user.email}</h2><a href="/logout">Logout</a>`);

  res.render('asset/dashboard', {user});
});

module.exports = router;