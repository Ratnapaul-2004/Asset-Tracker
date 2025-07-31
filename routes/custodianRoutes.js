const express = require('express');
const router = express.Router();
const Custodian = require('../models/Custodian');
const roleCheck = require('../middleware/roleCheck');

// GET all custodians
router.get('/', roleCheck(['admin']), async (req, res) => {
  const custodians = await Custodian.find();
  res.render('custodian/custodians', {custodians});
});

// GET form to add a new custodian
router.get('/add', roleCheck(['admin']), (req, res) => {
  res.render('custodian/addCustodian');
});

//POST new custodian
router.post('/add', roleCheck(['admin']), async (req, res) => {
  try {
    await Custodian.create(req.body);
    res.redirect('/custodians');
  } catch (err) {
    res.status(500).send('Error saving custodian');
  }
});

module.exports = router;