const dotenv = require('dotenv');
dotenv.config();                         
const APP_HOST = process.env.APP_HOST || 'http://localhost:8080';

const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const User = require('../models/User');
const Custodian = require('../models/Custodian');
const multer = require('multer');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path'); 
const QRCode = require('qrcode');

const roleCheck = require('../middleware/roleCheck');

const idPrefixes = require('../utils/idPrefixes');

// ----------Dashboard---------------
router.get('/dashboard', roleCheck(['admin', 'trainee']), async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments();
    const totalUsers = await User.countDocuments(); // Optional, only if you show user count
    
    res.render('asset/dashboard', {
      totalAssets,
      totalUsers
    });
  } catch (err) {
    console.error('Dashboard Load Error:', err);
    res.status(500).send('Internal Server Error');
  }
});

//-------------TOGGLE BUTTON-------
router.post('/toggle-dark-mode', (req, res) => {
  req.session.darkMode = !req.session.darkMode;
  res.json({ success: true });
});

//------------View All Assets----------
router.get('/', roleCheck(['admin', 'trainee']), async (req, res) => {
  const { search = '', type = '' } = req.query;
  const query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' }; // case-insensitive
  }

  if (type && type !== 'Other') {
    query.deviceClass = { $regex: new RegExp(`^${type}$`, 'i') }; // case-insensitive exact match
  } else if(type === 'Other') {
    query.deviceClass = { $not: /^hardware$|^software$/i };
  }

  try {
    console.log('🔍 Filter Query:', query);
    const assets = await Asset.find(query);

    const assetsWithQR = await Promise.all(
      assets.map(async asset => {
        if (!asset.qrCode) {
          asset.qrCode = await QRCode.toDataURL(
            `${APP_HOST}/asset/${asset._id}`
          );
          await asset.save();
        }
        return asset.toObject();  // simple plain object for EJS
      })
    );

    res.render('asset/assets', { assets: assetsWithQR, search, type });

  } catch (err) {
    console.error('❌ Search/filter error:', err);
    res.status(500).send('Server error');
  }
});


//------------Scan Asset-------------
router.get('/scan', roleCheck(['admin', 'trainee']), (req, res) => {
  res.render('asset/scanQR');
});


//-------------Add asset images----------
const storage = multer.diskStorage({
  destination: function (req, file, cb){
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb){
    cb(null, Date.now() + '-' + file.originalname);
  } 
});

const upload = multer({storage});

//------------Add Asset Form----------
router.get('/add', roleCheck(['admin']), async (req, res) => {
  try {
    const custodians = await Custodian.find();
    res.render('asset/addAsset', {
      asset: null,
      custodians
    }); 
  } catch (err) {
    res.status(500).send("Failed to load form");
  }
});

router.post('/add', roleCheck(['admin']), upload.single('image'), async (req, res) => {
  console.log('📩 Asset submission:', req.body);

  try {
    const { 
      name, deviceClass, owner, description, custodianName, designation, employeeId, department, deviceType, otherDeviceType, location, make, modelNo, serialNo, stockNo, purchaseDate, operatingSystem, ipUserName,
      ipAddress, macAddress 
    } = req.body;


    const prefix = idPrefixes[name] || idPrefixes['Default'];


    // Count existing assets with same prefix
    const existingAssets = await Asset.find({ manualId: new RegExp(`^${prefix}`) });
    const nextNumber = existingAssets.length + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0'); // MR001
    const manualId = `${prefix}${paddedNumber}`;


    const imagePath = req.file ? `/uploads/${req.file.filename}` : '/images/default.jpg';

    let finalAssetClass = req.body.deviceClass;
    

    const newAsset = new Asset({
      name, deviceClass, owner, description,
      image: imagePath,
      qrCode: qrCodeData,
      custodianName, designation, employeeId, department,
      deviceType, otherDeviceType, location, make, modelNo,
      serialNo, stockNo, purchaseDate, operatingSystem,
      ipUserName, ipAddress, macAddress, manualId
    });

    await newAsset.save();
    console.log('✅ Asset saved to DB');
    res.redirect('/asset');
  } catch(err) {
    console.error('❌ Asset save failed:', err);
    res.status(500).send('Error saving asset.');
  }
});

//------------------Report Page-------------
router.get('/report', roleCheck(['admin', 'trainee']), async (req, res) => {
  const assets = await Asset.find();
  res.render('asset/report', {assets});
});


router.get('/report/download', roleCheck(['admin']), async (req, res) => {
  try {
    const assets = await Asset.find().lean(); // lean() gives plain JS objects
    const fields = ['name', 'type', 'owner', 'description', 'createdAt'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(assets);

    res.header('Content-Type', 'text/csv');
    res.attachment('asset-report.csv');
    return res.send(csv);
  } catch (err) {
    console.error('❌ CSV Export Error:', err);
    res.status(500).send('Error generating CSV');
  }
});


router.get('/report/pdf', roleCheck(['admin']), async (req, res) => {
  try {
    const assets = await Asset.find();
    const doc = new PDFDocument();

    res.setHeader('Content-disposition', 'attachment; filename="Asset_Report.pdf"');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Asset Report', { align: 'center' });
    doc.moveDown();

    assets.forEach((asset, index) => {
      doc.fontSize(12).text(`${index + 1}. ${asset.name}`);
      doc.text(`   Type: ${asset.type}`);
      doc.text(`   Owner: ${asset.owner}`);
      doc.text(`   Description: ${asset.description}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error('❌ PDF Generation Error:', err);
    res.status(500).send('Error generating PDF');
  }
});


//---------------View Asset by ID (used in QR code)-------------
router.get('/:id', roleCheck(['admin', 'trainee']), async (req, res) => {
  const { id } = req.params;

  if (id === 'add' || id === 'report' || id === 'scan') return res.status(400).send("Invalid Asset ID");

  try {
    const asset = await Asset.findById(req.params.id);
    if(!asset) return res.status(404).send('Asset not found');
    res.render('asset/assetDetail', { asset });
  } catch(err) {
    console.error('❌ Error loading asset details:', err);
    res.status(500).send('Server error');
  }
});

//-----------------Edit Asset Form----------
router.get('/edit/:id', roleCheck(["admin"]), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    const custodians = await Custodian.find();

    res.render('asset/editAsset', {
      asset,
      custodians,
      user: req.session.user,
      url: req.originalUrl
    });
  } catch (err) {
    console.error("Edit asset error:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post('/edit/:id', async (req, res) => {
  try {
    const assetId = req.params.id;
    const update = req.body;

    console.log("🛠️ Updating asset:", assetId);
    console.log("📥 Body:", update);

    await Asset.findByIdAndUpdate(assetId, update, { runValidators: true });
    res.redirect('/asset');
  } catch (err) {
    console.error('❌ Error updating asset:', err);
    res.status(500).send("Update failed.");
  }
});

// router.put('/edit/:id', async (req, res) => {
//   try {
//     console.log("📩 Incoming update body:", req.body);
//     const assetId = req.params.id;
//     const updatedData = req.body;

//     console.log("🛠️ Updating Asset:", assetId);
//     console.log("📥 Incoming Data:", updatedData);

//     await Asset.findByIdAndUpdate(assetId, updatedData, { runValidators: true });
//     res.redirect('/asset');
//   } catch (error) {
//     console.error('❌ Error updating asset:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// //-----------------Delete Asset Page--------
// router.get('/delete/:id', roleCheck(['admin']), async (req, res) => {
//   const asset = await Asset.findById(req.params.id);
//   if(!asset) return res.status(404).send('Asset not found');
//   res.render('asset/deleteAsset', {asset});
// });

router.post('/delete/:id', roleCheck(['admin']), async (req, res) => {
  await Asset.findByIdAndDelete(req.params.id);
  res.redirect('asset/assets');
});


module.exports = router;