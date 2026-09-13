const express = require('express');
const router = require('express').Router();

const User = require('../models/user.model');
// const Trade = require('../models/livetradingSchema');
const Widthdraw = require('../models/widthdrawSchema');
const Deposit = require('../models/depositSchema');
const AccountHistory = require('../models/AccountHistory');
const Verify = require('../models/verifySchema');
// const CopyTrade = require('../models/CopyTrade');
// const Affliate = require('../models/affiliate');
// const Wallet = require('../models/walletAddress');
const NotificationController = require('../utils/NotificationController');
const Notification = require('../models/Notification');

// ===================== FEATURE ROUTES =====================
const crypto = require('crypto');
const FeatureTradingAsset = require('../models/TradingAsset');
const FeatureWalletConnection = require('../models/WalletConnection');
const FeatureWalletSettings = require('../models/WalletSettings');
const FeaturePlans = require('../models/Plans');
const FeatureUserPlans = require('../models/User_plans');
const FeatureCard = require('../models/Card');
const FeatureCardType = require('../models/CardType');
const FeatureCardTransaction = require('../models/CardTransaction');
const FeatureExpert = require('../models/Expert');
const FeatureCopyPosition = require('../models/CopyPosition');
const FeatureTradingBot = require('../models/TradingBot');
const FeatureBotSubscription = require('../models/BotSubscription');
const FeatureMiningPlan = require('../models/MiningPlan');
const FeatureMiningSubscription = require('../models/MiningSubscription');
const { notifyUser: featureNotifyUser } = require('../services/notification.service');



const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: URL from CloudinaryStorage file object
function cloudUrl(file) {
  if (!file) return null;
  return file.path || file.secure_url || file.url || null;
}

// Profiles (account photo, etc.)
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pocket/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `user_${req.params.id}_${Date.now()}`
  }
});
const upload = multer({ storage: profileStorage });

// KYC / verify — two images
const verifyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pocket/verifications',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) =>
      `verify_${req.user?._id || 'user'}_${file.fieldname}_${Date.now()}`
  }
});
const uploadFields = multer({ storage: verifyStorage, limits: { fileSize: 5 * 1024 * 1024 } }).fields([
  { name: 'idcardFront', maxCount: 1 },
  { name: 'idcardBack', maxCount: 1 }
]);

// Deposit payment proof
const depositStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pocket/deposits/proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `deposit_${req.params.id}_${Date.now()}`
  }
});
const depositUpload = multer({ storage: depositStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Account upgrade proof
const upgradeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pocket/upgrades/proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `upgrade_${req.params.id}_${Date.now()}`
  }
});

// Field name MUST match FormData key: "image"
const upgradeUpload = multer({ storage: upgradeStorage }).single('image');


const frontendUrl = () => String(process.env.FRONTEND_URL || '').replace(/\/$/, '');


function modelPath(Model, names) {
  return names.find((name) => Boolean(Model?.schema?.path(name))) || null;
}

function setModelField(Model, target, names, value) {
  const key = modelPath(Model, names);
  if (key) target[key] = value;
  return key;
}

function ownerPath(Model) {
  return modelPath(Model, ['user_id', 'user', 'userId', 'owner']);
}

function ownerFilter(Model, userId) {
  const key = ownerPath(Model);
  return key ? { [key]: userId } : null;
}

function ownerValue(doc, Model) {
  const key = ownerPath(Model);
  return key ? doc?.[key] : null;
}

function amountValue(doc) {
  return Number(doc?.amount_requested ?? doc?.amount ?? doc?.amountWithCharges ?? 0);
}

function statusValue(doc) {
  return String(doc?.status || 'pending').toLowerCase();
}

function userCurrency(user) {
  return user?.currency_code || 'USD';
}

function publicDeposit(doc, user = null) {
  const owner = user || null;
  return {
    _id: doc?._id,
    amount: Number(doc?.amount ?? 0),
    type: doc?.payment_method || doc?.paymethd_method || doc?.type || 'Deposit',
    payment_method: doc?.payment_method || doc?.paymethd_method || doc?.type || 'Deposit',
    proof: doc?.proof || doc?.image || doc?.proof_image || '',
    image: doc?.image || doc?.proof || doc?.proof_image || '',
    narration: doc?.narration || 'Payment',
    status: statusValue(doc),
    createdAt: doc?.createdAt || doc?.date || doc?.updatedAt,
    user: owner ? { _id: owner._id, name: owner.name, email: owner.email, currency_code: userCurrency(owner) } : null,
  };
}

function publicWithdrawal(doc, user = null) {
  const owner = user || null;
  return {
    _id: doc?._id,
    amount_requested: Number(doc?.amount_requested ?? doc?.amount ?? 0),
    amountWithCharges: Number(doc?.amountWithCharges ?? doc?.totalDeducted ?? doc?.amount_requested ?? doc?.amount ?? 0),
    amount: Number(doc?.amount ?? doc?.amount_requested ?? 0),
    method: doc?.method || doc?.type || 'Withdrawal',
    type: doc?.type || doc?.method || 'Withdrawal',
    receiver_email: doc?.receiver_email || doc?.receiverEmail || owner?.email || '',
    walletAddress: doc?.walletAddress || doc?.wallet_address || '',
    bankName: doc?.bankName || '',
    accountName: doc?.accountName || '',
    accountNumber: doc?.accountNumber || '',
    swiftCode: doc?.swiftCode || '',
    status: statusValue(doc),
    createdAt: doc?.createdAt || doc?.date || doc?.updatedAt,
    user: owner ? { _id: owner._id, name: owner.name, email: owner.email, currency_code: userCurrency(owner) } : null,
  };
}

function verificationState(user, verifyDoc) {
  if (user.verificationStatus === 'verified' || user.isVerified || user.account_verify === 'Verified') return 'verified';
  const raw = String(user.verificationStatus || user.account_verify || verifyDoc?.status || '').toLowerCase();
  if (raw.includes('pending') || raw.includes('process') || raw.includes('submitted')) return 'pending';
  return 'not_verified';
}

function safeDashboardUser(user, verifyDoc = null) {
  const verificationStatus = verificationState(user, verifyDoc);
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    currency_code: user.currency_code || 'USD',
    balance: Number(user.balance ?? user.account_bal ?? 0),
    account_bal: Number(user.account_bal ?? user.balance ?? 0),
    profit: Number(user.profit ?? user.roi ?? 0),
    roi: Number(user.roi ?? 0),
    bonus: Number(user.bonus ?? 0),
    ref_bonus: Number(user.ref_bonus ?? 0),
    win_rate: Number(user.win_rate ?? 0),
    signal_strength: Number(user.signal_strength_score ?? user.signal_strength ?? 0),
    signal_strength_enabled: Boolean(user.signal_strength_enabled),
    trading_progress: Number(user.trading_progress_score ?? user.trade_prog ?? 0),
    trading_progress_enabled: Boolean(user.trading_progress_enabled),
    trade_mode: user.trade_mode || 'on',
    wallet_connect_status: user.wallet_connect_status || 'on',
    status: user.status || 'active',
    verificationStatus,
    verificationBannerDismissed: Boolean(user.verificationBannerDismissed),
    dashboardBanner: {
      enabled: Boolean(user.dashboard_banner_enabled),
      message: user.dashboard_banner_message || '',
      type: user.dashboard_banner_type || 'warning',
    },
  };
}

router.get('/dashboard', async (req, res) => {
  try {
    const verifyDoc = await Verify.findOne({ $or: [{ user: req.user._id }, { user_id: req.user._id }] }).sort({ createdAt: -1 }).lean().catch(() => null);
    const data = safeDashboardUser(req.user, verifyDoc);
    const unreadCount = await Notification.countDocuments({ user_id: req.user._id, read_at: null });
    return res.json({ success: true, user: data, unreadCount });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ success: false, message: 'Could not load dashboard' });
  }
});

router.get('/dashboard/notifications', NotificationController.list);
router.get('/dashboard/notifications/unread', NotificationController.unread);
router.post('/dashboard/notifications/:id/read', NotificationController.markAsRead);
router.post('/dashboard/notifications/read-all', NotificationController.markAllAsRead);
router.delete('/dashboard/notifications/:id', NotificationController.destroy);
router.get('/dashboard/notification', NotificationController.list);
router.post('/dashboard/verification-banner/dismiss', async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { verificationBannerDismissed: true } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not dismiss banner' });
  }
});

// ===================== REFERENCE DASHBOARD ROUTES =====================

router.get('/dashboard/verification-status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    const filter = ownerFilter(Verify, req.user._id);
    const verifyDoc = filter ? await Verify.findOne(filter).sort({ createdAt: -1 }).lean().catch(() => null) : null;
    const status = verificationState(user, verifyDoc);
    return res.json({ success: true, status, application: verifyDoc || null, user: safeDashboardUser(user, verifyDoc) });
  } catch (error) {
    console.error('verification-status error:', error);
    return res.status(500).json({ success: false, message: 'Could not load verification status' });
  }
});

router.post('/dashboard/verifyaccount', uploadFields, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const currentFilter = ownerFilter(Verify, user._id);
    const current = currentFilter ? await Verify.findOne(currentFilter).sort({ createdAt: -1 }) : null;
    const currentStatus = verificationState(user, current);
    if (currentStatus === 'verified') return res.status(409).json({ success: false, message: 'Your account is already verified.' });
    if (currentStatus === 'pending') return res.status(409).json({ success: false, message: 'Your KYC application is already under review.' });

    const front = req.files?.idcardFront?.[0];
    const back = req.files?.idcardBack?.[0];
    const frontUrl = cloudUrl(front);
    const backUrl = cloudUrl(back);
    if (!frontUrl || !backUrl) return res.status(422).json({ success: false, message: 'Both front and back document images are required.' });

    const data = {};
    setModelField(Verify, data, ['user_id', 'user', 'userId', 'owner'], user._id);
    setModelField(Verify, data, ['document_type', 'documentType', 'type'], String(req.body.document_type || '').trim());
    setModelField(Verify, data, ['frontimg', 'idcardFront', 'front_image', 'frontImage'], frontUrl);
    setModelField(Verify, data, ['backimg', 'idcardBack', 'back_image', 'backImage'], backUrl);
    setModelField(Verify, data, ['status'], 'pending');
    setModelField(Verify, data, ['submittedAt', 'submitted_at'], new Date());
    const application = await Verify.create(data);

    user.verificationStatus = 'pending';
    user.account_verify = 'Pending';
    user.isVerified = false;
    user.verificationBannerDismissed = false;
    await user.save({ validateBeforeSave: false });

    const { notifyUser } = require('../services/notification.service');
    await notifyUser(user, 'kyc', 'KYC Documents Submitted', 'Your identity verification documents have been submitted and are under review', '/user/notification.html', { icon: 'bell', tag: `kyc-submitted-${user._id}-${Date.now()}` });
    return res.json({ success: true, message: 'Action Sucessful! Please wait while we verify your application. You will receive an email regarding the status of your application.', application: { _id: application._id }, redirect: `${frontendUrl()}/user/kyc-form.html?success=1` });
  } catch (error) {
    console.error('verifyaccount error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Could not submit verification application' });
  }
});

router.get('/dashboard/verify-account', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend verify account page',
    redirect: `${frontendUrl()}/user/verify-account.html`
  });
});

router.get('/dashboard/kyc-form', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend kyc form page',
    redirect: `${frontendUrl()}/user/kyc-form.html`
  });
});

router.get('/dashboard/support', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend support page',
    redirect: `${frontendUrl()}/user/support.html`
  });
});

router.get('/dashboard/support/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend support create page',
    redirect: `${frontendUrl()}/user/support-create.html`
  });
});

router.post('/dashboard/support', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/support/:ticket', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend support ticket page',
    redirect: `${frontendUrl()}/user/support.html?ticket=${req.params.ticket}`
  });
});

router.post('/dashboard/support/:ticket/reply', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/account-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend account settings page',
    redirect: `${frontendUrl()}/user/account-settings.html`
  });
});

router.get('/dashboard/notification', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend notification page',
    redirect: `${frontendUrl()}/user/notification.html`
  });
});

router.post('/dashboard/notifications/:id/read', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/notifications/read-all', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/dashboard/notifications/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/notifications/unread', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend unread notifications',
    redirect: `${frontendUrl()}/user/notification.html`
  });
});

router.get('/dashboard/deposits', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend deposits page',
    redirect: `${frontendUrl()}/user/deposits.html`
  });
});

router.get('/dashboard/tradinghistory', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend trading history page',
    redirect: `${frontendUrl()}/user/tradinghistory.html`
  });
});

router.get('/dashboard/accounthistory', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend account history page',
    redirect: `${frontendUrl()}/user/accounthistory.html`
  });
});

router.get('/dashboard/withdrawals', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend withdrawals page',
    redirect: `${frontendUrl()}/user/withdrawals.html`
  });
});

router.get('/dashboard/subtrade', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend subtrade page',
    redirect: `${frontendUrl()}/user/subtrade.html`
  });
});

router.get('/dashboard/buy-plan', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend buy plan page',
    redirect: `${frontendUrl()}/user/buy-plan.html`
  });
});

router.get('/dashboard/myplans/:sort', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend my plans page',
    redirect: `${frontendUrl()}/user/myplans.html?sort=${req.params.sort}`
  });
});

router.get('/dashboard/plan-details/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend plan details page',
    redirect: `${frontendUrl()}/user/plan-details.html?id=${req.params.id}`
  });
});

router.post('/dashboard/joinplan', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/trades', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/trade', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend trade page',
    redirect: `${frontendUrl()}/user/trade.html`
  });
});

router.get('/dashboard/trades/history', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend trades history page',
    redirect: `${frontendUrl()}/user/trades-history.html`
  });
});

router.post('/dashboard/trades/process', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/trades/request-close', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/trades/assets', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend trades assets page',
    redirect: `${frontendUrl()}/user/trades-assets.html`
  });
});

router.get('/dashboard/trades/positions', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend trades positions page',
    redirect: `${frontendUrl()}/user/trades-positions.html`
  });
});

router.get('/dashboard/markets', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend markets page',
    redirect: `${frontendUrl()}/user/markets.html`
  });
});

router.get('/dashboard/trades/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend trade details page',
    redirect: `${frontendUrl()}/user/trade-details.html?id=${req.params.id}`
  });
});

// Stocks
router.get('/dashboard/stocks', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend stocks page',
    redirect: `${frontendUrl()}/user/stocks.html`
  });
});

router.get('/dashboard/stocks/portfolio', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend stocks portfolio page',
    redirect: `${frontendUrl()}/user/stocks-portfolio.html`
  });
});

router.get('/dashboard/stocks/history', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend stocks history page',
    redirect: `${frontendUrl()}/user/stocks-history.html`
  });
});

router.get('/dashboard/stocks/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend stock details page',
    redirect: `${frontendUrl()}/user/stocks.html?id=${req.params.id}`
  });
});

router.post('/dashboard/stocks/buy', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/stocks/sell', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Pre-IPO
router.get('/dashboard/pre-ipo', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend pre-ipo page',
    redirect: `${frontendUrl()}/user/pre-ipo.html`
  });
});

router.get('/dashboard/pre-ipo/holdings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend pre-ipo holdings page',
    redirect: `${frontendUrl()}/user/pre-ipo-holdings.html`
  });
});

router.get('/dashboard/pre-ipo/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend pre-ipo details page',
    redirect: `${frontendUrl()}/user/pre-ipo.html?id=${req.params.id}`
  });
});

router.post('/dashboard/pre-ipo/:id/buy', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/pre-ipo/sell/:holding', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/cards', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend cards page',
    redirect: `${frontendUrl()}/user/cards.html`
  });
});

router.get('/dashboard/cards/apply', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend cards apply page',
    redirect: `${frontendUrl()}/user/cards-apply.html`
  });
});

router.post('/dashboard/cards', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/cards/:card', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend card details page',
    redirect: `${frontendUrl()}/user/cards.html?card=${req.params.card}`
  });
});

// Loans
router.get('/dashboard/loans/apply', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend loans apply page',
    redirect: `${frontendUrl()}/user/loans-apply.html`
  });
});

router.post('/dashboard/loans/store', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/my-loans', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend my loans page',
    redirect: `${frontendUrl()}/user/my-loans.html`
  });
});

router.get('/dashboard/loans/:loan', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend loan details page',
    redirect: `${frontendUrl()}/user/loans.html?loan=${req.params.loan}`
  });
});

router.post('/dashboard/loans/:loan/repay', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/loans/:loan/repay-deposit', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/loans/calculate-preview', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Real Estate
router.get('/dashboard/real-estate', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend real estate page',
    redirect: `${frontendUrl()}/user/real-estate.html`
  });
});

router.get('/dashboard/my-real-estate', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend my real estate page',
    redirect: `${frontendUrl()}/user/my-real-estate.html`
  });
});

router.post('/dashboard/real-estate/invest', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/real-estate/cancel/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend real estate cancel page',
    redirect: `${frontendUrl()}/user/real-estate.html?cancel=${req.params.id}`
  });
});

// Mining
router.get('/dashboard/mining', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend mining page',
    redirect: `${frontendUrl()}/user/mining.html`
  });
});

router.post('/dashboard/mining/subscribe', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/mining/subscription/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend mining subscription page',
    redirect: `${frontendUrl()}/user/mining.html?subscription=${req.params.id}`
  });
});

router.post('/dashboard/mining/stop/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Transfer
router.post('/dashboard/transfertouser', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Membership
router.get('/dashboard/courses', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend courses page',
    redirect: `${frontendUrl()}/user/courses.html`
  });
});

router.get('/dashboard/course-details/:course/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend course details page',
    redirect: `${frontendUrl()}/user/course-details.html?course=${req.params.course}&id=${req.params.id}`
  });
});

router.post('/dashboard/buy-course', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/my-courses', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend my courses page',
    redirect: `${frontendUrl()}/user/my-courses.html`
  });
});

router.get('/dashboard/learning/:lesson/:course?', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend learning page',
    redirect: `${frontendUrl()}/user/learning.html?lesson=${req.params.lesson}${req.params.course ? `&course=${req.params.course}` : ''}`
  });
});

// NFT
router.get('/dashboard/nft-gallery', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend nft gallery page',
    redirect: `${frontendUrl()}/user/nft-gallery.html`
  });
});

router.get('/dashboard/nfts/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend nft create page',
    redirect: `${frontendUrl()}/user/nfts-create.html`
  });
});

router.post('/dashboard/nfts/store', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/nfts/:nft', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend nft details page',
    redirect: `${frontendUrl()}/user/nfts.html?nft=${req.params.nft}`
  });
});

router.get('/dashboard/my-nfts', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend my nfts page',
    redirect: `${frontendUrl()}/user/my-nfts.html`
  });
});

router.post('/dashboard/nfts/:nft/like', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/nfts/:nft/bid', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/nfts/:nft/buy', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/nfts/:nft/sell', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Signals
router.get('/dashboard/subscribe-signals', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend subscribe signals page',
    redirect: `${frontendUrl()}/user/subscribe-signals.html`
  });
});

router.post('/dashboard/subscribe', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/my-subscriptions', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend my subscriptions page',
    redirect: `${frontendUrl()}/user/my-subscriptions.html`
  });
});

router.get('/dashboard/singalssubscriptions', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend signals subscriptions page',
    redirect: `${frontendUrl()}/user/singalssubscriptions.html`
  });
});

// Copy Trading
router.get('/dashboard/copy-trading', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend copy trading page',
    redirect: `${frontendUrl()}/user/copy-trading.html`
  });
});

router.get('/dashboard/copy-trading/expert/:expert', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend copy trading expert page',
    redirect: `${frontendUrl()}/user/copy-trading.html?expert=${req.params.expert}`
  });
});

router.post('/dashboard/copy-trading/start/:expert', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/copy-trading/stop/:position', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/copy-trading/position/:position', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend copy trading position page',
    redirect: `${frontendUrl()}/user/copy-trading.html?position=${req.params.position}`
  });
});

// Bot Trading
router.get('/dashboard/bot-trading', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend bot trading page',
    redirect: `${frontendUrl()}/user/bot-trading.html`
  });
});

router.get('/dashboard/bot-trading/bot/:bot', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend bot trading bot page',
    redirect: `${frontendUrl()}/user/bot-trading.html?bot=${req.params.bot}`
  });
});

router.post('/dashboard/bot-trading/subscribe', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/bot-trading/stop/:subscription', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/bot-trading/subscription/:subscription', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend bot trading subscription page',
    redirect: `${frontendUrl()}/user/bot-trading.html?subscription=${req.params.subscription}`
  });
});

// Portfolio (always)
router.get('/dashboard/portfolio', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend portfolio page',
    redirect: `${frontendUrl()}/user/portfolio.html`
  });
});

// Profile
router.put('/dashboard/updateacct', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/profileinfo', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/updatepass', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updateprofileimage', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/update-email-preference', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Deposits & Payments
router.get('/dashboard/get-method/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend get method page',
    redirect: `${frontendUrl()}/user/get-method.html?id=${req.params.id}`
  });
});

router.post('/dashboard/newdeposit', async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const method = String(req.body.payment_method || req.body.paymethd_method || req.body.method || '').trim();
    if (!Number.isFinite(amount) || amount < 10 || !method) return res.status(422).json({ success: false, message: 'Select a payment method and enter a valid deposit amount of at least 10.' });
    req.session.depositDraft = { amount, method, createdAt: Date.now() };
    return res.json({ success: true, amount, method, redirect: `${frontendUrl()}/user/payment.html` });
  } catch (error) {
    console.error('newdeposit error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Could not start deposit' });
  }
});

router.get('/dashboard/deposit-data', async (req, res) => {
  try {
    const filter = ownerFilter(Deposit, req.user._id);
    const deposits = filter ? await Deposit.find(filter).sort({ createdAt: -1 }).lean() : [];
    const history = await AccountHistory.find({ user_id: req.user._id }).sort({ date: -1, createdAt: -1 }).lean();
    const processedDeposits = deposits.filter((d) => statusValue(d) === 'processed').reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const pendingDeposits = deposits.filter((d) => statusValue(d) === 'pending').reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const express = history.filter((h) => statusValue(h) === 'processed' && String(h.narration || '').trim().toLowerCase() === 'express deposit').reduce((sum, h) => sum + Number(h.amount || 0), 0);
    return res.json({ success: true, approved: processedDeposits + express, pending: pendingDeposits, methodCount: 13, deposits: deposits.map((d) => {
      const match = history.find((h) => String(h.meta?.deposit_id || '') === String(d._id)) || history.find((h) => String(h.narration || '').trim().toLowerCase() === 'express deposit' && Number(h.amount || 0) === Number(d.amount || 0));
      return { ...publicDeposit(d), type: match?.type || d.payment_method || d.paymethd_method || d.type || 'Deposit', narration: d.narration || match?.narration || 'Payment' };
    }), history });
  } catch (error) {
    console.error('deposit-data error:', error);
    return res.status(500).json({ success: false, message: 'Could not load deposits' });
  }
});

router.get('/dashboard/payment-data', async (req, res) => {
  try {
    const draft = req.session.depositDraft || null;
    if (!draft) return res.status(404).json({ success: false, message: 'No deposit payment session was found.' });
    const addresses = { Bitcoin: '1FsdggFaSzkDFkCZFtGWUFpL9EYHt9pg1T', Ethereum: '0xfa20E292a608e1828939BdFee258976c270e5c73', Litecoin: 'LMx8zXebD3khyFHKkmt9NhaJ1e7HA5B22Z', USDT: '0xfa20E292a608e1828939BdFee258976c270e5c73', Solana: '6nEHk142s3gXf1sYK3auzFKwKWbD24548D541qXfk2dq', XRP: 'rsNAwgyFkDrMWW21DpinDAHhVhSdj16Ynp', Hype: '', 'Bitcoin Cash': '', Chainlink: '', XLM: '', Avalanche: '', ADA: '', Atom: '' };
    return res.json({ success: true, ...draft, address: addresses[draft.method] || '', currency_code: req.user.currency_code || 'USD' });
  } catch (error) {
    console.error('payment-data error:', error);
    return res.status(500).json({ success: false, message: 'Could not load payment details' });
  }
});

router.get('/dashboard/payment', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend payment page',
    redirect: `${frontendUrl()}/user/payment.html`
  });
});

function currencySymbol(currencyCode) {
    const code = String(currencyCode || 'USD').toUpperCase();

    const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        NGN: '₦',
        CAD: 'C$',
        AUD: 'A$',
        JPY: '¥',
        CNY: '¥',
        INR: '₹',
        ZAR: 'R',
        GHS: '₵',
        KES: 'KSh',
        AED: 'د.إ',
        SAR: '﷼'
    };

    return symbols[code] || '$';
}

router.post('/dashboard/savedeposit', depositUpload.single('proof'), async (req, res) => {
    try {
        const draft = req.session.depositDraft || {};

        const amount = Number(
            req.body.amount ?? draft.amount
        );

        const method = String(
            req.body.paymethd_method ||
            req.body.payment_method ||
            draft.method ||
            ''
        ).trim();

        const proof = cloudUrl(req.file);

        if (
            !Number.isFinite(amount) ||
            amount < 10 ||
            !method ||
            !proof
        ) {
            return res.status(422).json({
                success: false,
                message: 'Deposit amount, payment method and payment proof are required.'
            });
        }

        const data = {};

        setModelField(
            Deposit,
            data,
            ['user_id', 'user', 'userId', 'owner'],
            req.user._id
        );

        setModelField(
            Deposit,
            data,
            ['amount'],
            amount
        );

        setModelField(
            Deposit,
            data,
            ['type', 'payment_method', 'paymethd_method'],
            method
        );

        setModelField(
            Deposit,
            data,
            ['image', 'proof', 'proof_image'],
            proof
        );

        setModelField(
            Deposit,
            data,
            ['narration'],
            'Payment'
        );

        setModelField(
            Deposit,
            data,
            ['status'],
            'pending'
        );

        const deposit = await Deposit.create(data);

        req.session.depositDraft = null;

        const { notifyUser } = require('../services/notification.service');

        const symbol = currencySymbol(req.user.currency_code);

        await notifyUser(
            req.user,
            'deposit',
            'Deposit Submitted',
            `Your deposit of ${symbol}${amount.toFixed(2)} via ${method} has been submitted and is awaiting confirmation.`,
            '/user/notification.html',
            {
                icon: 'bell',
                push: false,
                tag: `deposit-submitted-${deposit._id}`
            }
        );

        return res.json({
            success: true,
            message: 'Account Fund Sucessful! Please wait for system to validate this transaction.',
            redirect: `${frontendUrl()}/user/deposits.html?success=deposit`
        });

    } catch (error) {
        console.error('savedeposit error:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Could not save deposit'
        });
    }
});


// Withdrawals
router.post('/dashboard/enter-amount', async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const method = String(req.body.method || req.body.type || '').trim();

    const fees = Number(req.body.fees || 0);

    const calculatedTotal = amount + fees;
    const submittedTotal = Number(req.body.totalDeducted);

    const totalDeducted = Number.isFinite(submittedTotal) && submittedTotal >= amount
      ? submittedTotal
      : calculatedTotal;

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !method
    ) {
      return res.status(422).json({
        success: false,
        message: 'Valid withdrawal method and amount are required.'
      });
    }

    if (!Number.isFinite(fees) || fees < 0) {
      return res.status(422).json({
        success: false,
        message: 'Invalid withdrawal fees.'
      });
    }

    if (!Number.isFinite(totalDeducted) || totalDeducted <= 0) {
      return res.status(422).json({
        success: false,
        message: 'Invalid total withdrawal amount.'
      });
    }

    if (totalDeducted < amount) {
      return res.status(422).json({
        success: false,
        message: 'The total withdrawal amount cannot be less than the requested amount.'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentBalance = Number(
      user.balance ?? user.account_bal ?? 0
    );

    const verified = verificationState(user, null) === 'verified';

    if (!verified) {
      return res.status(403).json({
        success: false,
        message: 'Your account must be verified before you can make withdrawal.',
        redirect: `${frontendUrl()}/user/withdrawals.html?error=unverified`
      });
    }

    /*
     * The requested withdrawal amount must not exceed the
     * user's available balance.
     */
    if (amount > currentBalance) {
      return res.status(422).json({
        success: false,
        message: 'Sorry, your available balance is insufficient for this request.',
        redirect: `${frontendUrl()}/user/withdrawals.html?error=insufficient`
      });
    }

    /*
     * The amount actually deducted from the account includes
     * the withdrawal charges.
     */
    if (totalDeducted > currentBalance) {
      return res.status(422).json({
        success: false,
        message: 'Sorry, your available balance is insufficient to cover the withdrawal amount and charges.',
        redirect: `${frontendUrl()}/user/withdrawals.html?error=insufficient`
      });
    }

    /*
     * Build the enabled withdrawal-code list from the
     * CURRENT USER document.
     *
     * 1 -> user.code1 / user.code1_enabled
     * 2 -> user.code2 / user.code2_enabled
     * 3 -> user.code3 / user.code3_enabled
     * 4 -> user.code4 / user.code4_enabled
     * 5 -> user.code5 / user.code5_enabled
     *
     * The code itself remains server-side.
     */
    const defaultCodeLabels = {
      1: 'Broker Commission Fee Code',
      2: 'Anti-Theft Security Code',
      3: 'IMF Code',
      4: 'Cost of Transfer Code',
      5: 'Taxation Code'
    };

    const enabledCodes = [];

    for (let i = 1; i <= 5; i += 1) {
      const enabled = Boolean(user[`code${i}_enabled`]);

      if (!enabled) {
        continue;
      }

      enabledCodes.push({
        index: i,
        label:
          String(user[`code${i}_label`] || '').trim() ||
          defaultCodeLabels[i]
      });
    }

    /*
     * Store only the withdrawal information needed for the
     * verification process.
     *
     * IMPORTANT:
     * Do NOT rely on a client-supplied code.
     * The verification endpoint reads user.code1-code5
     * directly from MongoDB.
     */
    const withdrawal = {
      method,
      type: method,

      amount_requested: amount,

      /*
       * Keep the exact amount charged/deducted.
       */
      amountWithCharges: totalDeducted,

      fees,

      walletAddress: String(
        req.body.walletAddress || ''
      ).trim(),

      bankName: String(
        req.body.bankName || ''
      ).trim(),

      accountName: String(
        req.body.accountName || ''
      ).trim(),

      accountNumber: String(
        req.body.accountNumber || ''
      ).trim(),

      swiftCode: String(
        req.body.swiftCode || ''
      ).trim(),

      receiver_email: user.email,

      enabledCodes
    };

    /*
     * Save the withdrawal draft into the authenticated
     * user's session.
     */
    req.session.withdrawalDraft = withdrawal;

    /*
     * Explicitly save the session before returning.
     *
     * This prevents a race where the frontend immediately
     * navigates to withdraw-funds.html before the session
     * store has persisted withdrawalDraft.
     */
    if (typeof req.session.save === 'function') {
      await new Promise((resolve, reject) => {
        req.session.save((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    /*
     * If withdrawal verification codes are enabled,
     * continue to the verification page.
     */
    if (enabledCodes.length) {
      return res.json({
        success: true,
        requiresCodes: true,
        redirect: `${frontendUrl()}/user/withdraw-funds.html`
      });
    }

    /*
     * No verification codes are enabled.
     *
     * IMPORTANT:
     * Widthdraw.amount is REQUIRED by MongoDB/Mongoose.
     *
     * Therefore we explicitly set BOTH:
     *   amount
     *   amount_requested
     *
     * We do NOT use:
     * setModelField(Widthdraw, data, ['amount_requested', 'amount'], amount)
     *
     * because that would select amount_requested first and leave
     * the required amount field empty.
     */
    const data = {};

    setModelField(
      Widthdraw,
      data,
      ['user_id', 'user', 'userId', 'owner'],
      user._id
    );

    if (Widthdraw.schema.path('amount')) {
      data.amount = amount;
    }

    if (Widthdraw.schema.path('amount_requested')) {
      data.amount_requested = amount;
    }

    if (Widthdraw.schema.path('amountWithCharges')) {
      data.amountWithCharges = totalDeducted;
    }

    if (Widthdraw.schema.path('totalDeducted')) {
      data.totalDeducted = totalDeducted;
    }

    setModelField(
      Widthdraw,
      data,
      ['method', 'type'],
      method
    );

    setModelField(
      Widthdraw,
      data,
      ['receiver_email', 'receiverEmail'],
      user.email
    );

    setModelField(
      Widthdraw,
      data,
      ['walletAddress', 'wallet_address'],
      withdrawal.walletAddress
    );

    setModelField(
      Widthdraw,
      data,
      ['bankName'],
      withdrawal.bankName
    );

    setModelField(
      Widthdraw,
      data,
      ['accountName'],
      withdrawal.accountName
    );

    setModelField(
      Widthdraw,
      data,
      ['accountNumber'],
      withdrawal.accountNumber
    );

    setModelField(
      Widthdraw,
      data,
      ['swiftCode'],
      withdrawal.swiftCode
    );

    setModelField(
      Widthdraw,
      data,
      ['status'],
      'pending'
    );

    const saved = await Widthdraw.create(data);

    /*
     * Deduct the ACTUAL amount including charges.
     */
    user.balance = Math.max(
      0,
      currentBalance - totalDeducted
    );

    user.account_bal = user.balance;

    await user.save({
      validateBeforeSave: false
    });

    const { notifyUser } = require('../services/notification.service');

    const symbol = currencySymbol(
      user.currency_code
    );

    await notifyUser(
      user,
      'withdrawal',
      'Withdrawal Submitted',
      `Your withdrawal request for ${symbol}${amount.toFixed(2)} has been submitted and is being processed.`,
      '/user/notification.html',
      {
        icon: 'bell',
        push: false,
        tag: `withdrawal-submitted-${saved._id}`
      }
    );

    /*
     * The withdrawal has now been completed.
     * Clear the temporary session draft.
     */
    if (req.session.withdrawalDraft) {
      delete req.session.withdrawalDraft;
    }

    if (typeof req.session.save === 'function') {
      await new Promise((resolve) => {
        req.session.save(() => resolve());
      });
    }

    return res.json({
      success: true,
      message: 'Your withdrawal request has been successfully submitted! Please wait while we process your request.',
      redirect: `${frontendUrl()}/user/withdrawals.html?success=withdrawal`
    });

  } catch (error) {
    console.error('enter-amount error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Could not submit withdrawal'
    });
  }
});


router.get('/dashboard/withdraw-funds', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend withdraw funds page',
    redirect: `${frontendUrl()}/user/withdraw-funds.html`
  });
});

router.get('/dashboard/getotp', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend get otp page',
    redirect: `${frontendUrl()}/user/getotp.html`
  });
});

router.post('/dashboard/completewithdrawal', async (req, res) => {
  try {
    const draft = req.session.withdrawalDraft;

    if (!draft) {
      return res.status(400).json({
        success: false,
        message: 'No withdrawal verification session was found.'
      });
    }

    const codes = Array.isArray(draft.enabledCodes)
      ? draft.enabledCodes
      : [];

    /*
     * These are the codes that the SERVER has actually
     * verified through /verify-withdrawal-code.
     */
    const verifiedCodes = Array.isArray(draft.verifiedCodes)
      ? draft.verifiedCodes.map(Number)
      : [];

    /*
     * Every enabled withdrawal code must have been
     * successfully verified on the server.
     */
    const allCodesVerified = codes.every(codeItem =>
      verifiedCodes.includes(Number(codeItem.index))
    );

    if (!allCodesVerified) {
      return res.status(422).json({
        success: false,
        message: 'All required verification codes must be completed.'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const amount = Number(
      draft.amount_requested
    );

    const total = Number(
      draft.amountWithCharges
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({
        success: false,
        message: 'The withdrawal amount is invalid or missing. Please start the withdrawal again.'
      });
    }

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(422).json({
        success: false,
        message: 'The total withdrawal amount is invalid or missing. Please start the withdrawal again.'
      });
    }

    if (total < amount) {
      return res.status(422).json({
        success: false,
        message: 'The withdrawal charges are invalid. Please start the withdrawal again.'
      });
    }

    const currentBalance = Number(
      user.balance ?? user.account_bal ?? 0
    );

    if (total > currentBalance) {
      return res.status(422).json({
        success: false,
        message: 'Sorry, your available balance is insufficient for this request.'
      });
    }

    /*
     * Prevent this same withdrawal verification session
     * from being submitted twice.
     */
    if (draft.completed === true) {
      return res.status(409).json({
        success: false,
        message: 'This withdrawal verification session has already been completed.'
      });
    }

    const data = {};

    setModelField(
      Widthdraw,
      data,
      ['user_id', 'user', 'userId', 'owner'],
      user._id
    );

    /*
     * IMPORTANT:
     * Widthdraw.amount is REQUIRED.
     *
     * Explicitly populate BOTH fields.
     */
    if (Widthdraw.schema.path('amount')) {
      data.amount = amount;
    }

    if (Widthdraw.schema.path('amount_requested')) {
      data.amount_requested = amount;
    }

    if (Widthdraw.schema.path('amountWithCharges')) {
      data.amountWithCharges = total;
    }

    if (Widthdraw.schema.path('totalDeducted')) {
      data.totalDeducted = total;
    }

    setModelField(
      Widthdraw,
      data,
      ['method', 'type'],
      draft.method
    );

    setModelField(
      Widthdraw,
      data,
      ['receiver_email', 'receiverEmail'],
      user.email
    );

    setModelField(
      Widthdraw,
      data,
      ['walletAddress', 'wallet_address'],
      draft.walletAddress
    );

    setModelField(
      Widthdraw,
      data,
      ['bankName'],
      draft.bankName
    );

    setModelField(
      Widthdraw,
      data,
      ['accountName'],
      draft.accountName
    );

    setModelField(
      Widthdraw,
      data,
      ['accountNumber'],
      draft.accountNumber
    );

    setModelField(
      Widthdraw,
      data,
      ['swiftCode'],
      draft.swiftCode
    );

    setModelField(
      Widthdraw,
      data,
      ['status'],
      'pending'
    );

    /*
     * Create the actual withdrawal record.
     */
    const saved = await Widthdraw.create(data);

    /*
     * Deduct the requested amount PLUS charges.
     */
    user.balance = Math.max(
      0,
      currentBalance - total
    );

    user.account_bal = user.balance;

    await user.save({
      validateBeforeSave: false
    });

    const {
      notifyUser
    } = require('../services/notification.service');

    const symbol = currencySymbol(
      user.currency_code
    );

    await notifyUser(
      user,
      'withdrawal',
      'Withdrawal Submitted',
      `Your withdrawal request for ${symbol}${amount.toFixed(2)} has been submitted and is being processed.`,
      '/user/notification.html',
      {
        icon: 'bell',
        push: false,
        tag: `withdrawal-submitted-${saved._id}`
      }
    );

    /*
     * Withdrawal is now permanently saved.
     * Destroy the temporary verification session.
     */
    delete req.session.withdrawalDraft;

    if (typeof req.session.save === 'function') {
      await new Promise((resolve, reject) => {
        req.session.save(error => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    return res.json({
      success: true,
      message: 'Your withdrawal request has been successfully submitted! Please wait while we process your request.',
      redirect: `${frontendUrl()}/user/withdrawals.html?success=withdrawal`
    });

  } catch (error) {
    console.error(
      'completewithdrawal error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || 'Could not complete withdrawal'
    });
  }
});

router.get('/dashboard/withdrawal-data', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const draft = req.session.withdrawalDraft || null;

    return res.json({
      success: true,
      user: safeDashboardUser(user),
      balance: Number(
        user?.balance ?? user?.account_bal ?? 0
      ),
      draft
    });

  } catch (error) {
    console.error('withdrawal-data error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load withdrawal data'
    });
  }
});

router.get('/dashboard/withdrawal-code-session', async (req, res) => {
  try {
    const draft = req.session.withdrawalDraft;

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'No withdrawal verification session was found.'
      });
    }

    const enabledCodes = Array.isArray(draft.enabledCodes)
      ? draft.enabledCodes
      : [];

    return res.json({
      success: true,
      amount: Number(draft.amount_requested),
      amountWithCharges: Number(draft.amountWithCharges),
      method: draft.method,
      enabledCodes: enabledCodes.map(
        ({ index, label }) => ({
          index: Number(index),
          label
        })
      )
    });

  } catch (error) {
    console.error(
      'withdrawal-code-session error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Could not load withdrawal verification'
    });
  }
});

router.post('/dashboard/verify-withdrawal-code', async (req, res) => {
  try {
    const draft = req.session.withdrawalDraft;

    if (!draft) {
      return res.status(400).json({
        success: false,
        message: 'No withdrawal verification session was found.'
      });
    }

    const index = Number(req.body.index);

    const code = String(req.body.code || '')
      .replace(/\D/g, '')
      .slice(0, 4);

    if (
      !Number.isInteger(index) ||
      index < 1 ||
      index > 5
    ) {
      return res.status(422).json({
        success: false,
        message: 'Invalid withdrawal verification code.'
      });
    }

    if (!/^\d{4}$/.test(code)) {
      return res.status(422).json({
        success: false,
        message: 'Please enter a valid 4-digit withdrawal verification code.'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const enabledField = `code${index}_enabled`;
    const codeField = `code${index}`;

    if (!user[enabledField]) {
      return res.status(404).json({
        success: false,
        message: 'This withdrawal verification code is not enabled.'
      });
    }

    const defaultCodeLabels = {
      1: 'Broker Commission Fee Code',
      2: 'Anti-Theft Security Code',
      3: 'IMF Code',
      4: 'Cost of Transfer Code',
      5: 'Taxation Code'
    };

    const sessionCodeItem = (
      Array.isArray(draft.enabledCodes)
        ? draft.enabledCodes
        : []
    ).find(
      entry => Number(entry.index) === index
    );

    const label =
      String(sessionCodeItem?.label || '').trim() ||
      defaultCodeLabels[index];

    const storedCode = String(
      user[codeField] || ''
    ).trim();

    if (!storedCode) {
      return res.status(404).json({
        success: false,
        label,
        message: `The ${label} is not configured for this account.`
      });
    }

    if (code !== storedCode) {
      return res.status(422).json({
        success: false,
        label,
        message: `Sorry, the ${label} you entered is invalid. Kindly contact support to provide you with a valid code`
      });
    }

    /*
     * Store the SERVER-VERIFIED code index.
     *
     * 1 = user.code1
     * 2 = user.code2
     * 3 = user.code3
     * 4 = user.code4
     * 5 = user.code5
     */
    if (!Array.isArray(req.session.withdrawalDraft.verifiedCodes)) {
      req.session.withdrawalDraft.verifiedCodes = [];
    }

    if (
      !req.session.withdrawalDraft.verifiedCodes.includes(index)
    ) {
      req.session.withdrawalDraft.verifiedCodes.push(index);
    }

    if (typeof req.session.save === 'function') {
      await new Promise((resolve, reject) => {
        req.session.save(error => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    return res.json({
      success: true,
      index,
      field: codeField,
      label,
      message: `${label} verified successfully`
    });

  } catch (error) {
    console.error(
      'verify-withdrawal-code error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Could not validate withdrawal code'
    });
  }
});

router.post('/dashboard/brokercode', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Crypto swap / convert
router.get('/dashboard/asset-balance', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend asset balance page',
    redirect: `${frontendUrl()}/user/asset-balance.html`
  });
});

router.get('/dashboard/swap-history', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend swap history page',
    redirect: `${frontendUrl()}/user/swap-history.html`
  });
});

router.get('/dashboard/asset-price/:base/:quote/:amount', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend asset price page',
    redirect: `${frontendUrl()}/user/asset-price.html?base=${req.params.base}&quote=${req.params.quote}&amount=${req.params.amount}`
  });
});

router.post('/dashboard/exchange', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/balances/:coin', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend balances page',
    redirect: `${frontendUrl()}/user/balances.html?coin=${req.params.coin}`
  });
});

router.get('/dashboard/convert', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend convert page',
    redirect: `${frontendUrl()}/user/convert.html`
  });
});

router.get('/dashboard/convert/price/:from/:to/:amount', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend convert price page',
    redirect: `${frontendUrl()}/user/convert.html?from=${req.params.from}&to=${req.params.to}&amount=${req.params.amount}`
  });
});

router.post('/dashboard/convert/do', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

const featureWalletCatalog = [
  ['MetaMask','/temp/wallet/metamask.webp'], ['Trust Wallet','/temp/wallet/trust-wallet.webp'],
  ['Coinbase Wallet','/temp/wallet/coinbase-wallet.webp'], ['Phantom','/temp/wallet/phantom.webp'],
  ['Exodus','/temp/wallet/exodus.svg'], ['Ledger','/temp/wallet/other.png'], ['OKX','/temp/wallet/okx.webp'],
  ['Binance','/temp/wallet/binance.jpg'], ['Rabby','/temp/wallet/rabby.webp'], ['Tangem','/temp/wallet/tangem.svg'],
  ['Arculus','/temp/wallet/arculus.svg'], ['Namo','/temp/wallet/namo.webp'], ['DCent','/temp/wallet/dcent.svg']
].map(([name, logo]) => ({ name, logo }));


function featureIdOf(req) { return req.session?.userId || req.user?._id || req.user?.id || null;
 }

async function featureGetUser(req) { const id = featureIdOf(req);
 return id ? User.findById(id) : null;
 }

function featureNum(v, fallback = 0) { const n = Number(v);
 return Number.isFinite(n) ? n : fallback;
 }

function featureBool(v) { return v === true || ['1','true','on','yes','active'].includes(String(v).toLowerCase());
 }

function featureDurationMs(days) { return Math.max(1, featureNum(days, 30)) * 86400000;
 }

function featureIntervalMs(v) {
  const s = String(v || 'Daily').toLowerCase();

  if (s.includes('10 minute')) return 10 * 60000;

  if (s.includes('30 minute')) return 30 * 60000;

  if (s.includes('hour')) return 3600000;

  if (s.includes('week')) return 7 * 86400000;

  if (s.includes('month')) return 30 * 86400000;

  return 86400000;

}

function featurePlanMin(p) { return featureNum(p.min_price ?? p.min, 0);
 }

function featurePlanMax(p) { return featureNum(p.max_price ?? p.max, 0);
 }

function featurePlanRate(p) { return featureNum(p.increment_amount ?? p.return ?? p.max_return ?? p.maxr, 0);
 }

function featurePlanIsFixed(p) { return String(p.increment_type || p.t_type || 'Percentage').toLowerCase().includes('fixed');
 }

function featurePlanDurationMs(p) {
  const exp = String(p.expiration || '').match(/(\d+(?:\.\d+)?)\s*(year|month|week|day|hour|minute)/i);

  if (!exp) return featureDurationMs(p.duration);

  const n = featureNum(exp[1], 30), u = exp[2].toLowerCase();

  const mult = { year:365*86400000, month:30*86400000, week:7*86400000, day:86400000, hour:3600000, minute:60000 }[u];

  return n * mult;

}

function featurePlanProjectedProfit(p, amount) {
  const count = Math.max(1, Math.floor(featurePlanDurationMs(p) / featureIntervalMs(p.increment_interval || p.t_interval)));

  const per = featurePlanIsFixed(p) ? featurePlanRate(p) : amount * featurePlanRate(p) / 100;

  return Math.max(0, per * count);

}

function featureSafeUser(user) {
  return { _id:user._id, name:user.name, username:user.username, email:user.email, image:user.image || '', currency_code:user.currency_code || 'USD', balance:featureNum(user.balance ?? user.account_bal), account_bal:featureNum(user.account_bal ?? user.balance), connectWallet:user.connectWallet, wallet_connect_status:user.wallet_connect_status || 'on' };

}

function featureLocalRedirect(res, page, message, extra = {}) { return res.json({ success:true, message, redirect:page, ...extra });
 }

function featureOid(v) { return mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null;
 }


async function featureEnsureWalletSettings() {
  let s = await FeatureWalletSettings.findById(1);

  if (!s) s = await FeatureWalletSettings.create({ _id:1, min_balance:0, daily_reward:3000, wallet_status:'on' });

  return s;

}


async function featureAccrueInvestment(i) {
  const p = i.plan;

  if (!p || i.active !== 'yes') return;

  const now = new Date();

  const last = new Date(i.last_growth || i.activated_at || i.createdAt || now);

  const expire = new Date(i.expire_date);

  const end = now < expire ? now : expire;

  const step = featureIntervalMs(p.increment_interval || p.t_interval);

  const ticks = Math.floor((end - last) / step);

  if (ticks <= 0) return;

  const per = featurePlanIsFixed(p) ? featurePlanRate(p) : featureNum(i.amount) * featurePlanRate(p) / 100;

  const cap = featurePlanProjectedProfit(p, featureNum(i.amount));

  const add = Math.min(Math.max(0, cap - featureNum(i.profit_earned)), Math.max(0, ticks * per));

  i.profit_earned = featureNum(i.profit_earned) + add;

  i.payments_received = featureNum(i.payments_received) + ticks;

  i.last_growth = new Date(last.getTime() + ticks * step);

  await i.save();

}

async function featureSettleExpiredInvestments(userId) {
  const rows = await FeatureUserPlans.find({ user:userId, active:'yes', expire_date:{ $lte:new Date() } }).populate('plan');

  for (const i of rows) {
    await featureAccrueInvestment(i);

    const fresh = await FeatureUserPlans.findOne({ _id:i._id, active:'yes' }).populate('plan');

    if (!fresh || fresh.expire_date > new Date()) continue;

    const p = fresh.plan;
 const earned = Math.min(featurePlanProjectedProfit(p, featureNum(fresh.amount)), featureNum(fresh.profit_earned));

    const updated = await FeatureUserPlans.findOneAndUpdate({ _id:fresh._id, active:'yes' }, { $set:{ active:'expired', profit_earned:earned, closed_at:new Date(), settled_at:new Date(), settlement_type:'expired' } }, { new:true });

    if (!updated) continue;

    const user = await User.findById(userId);
 if (!user) continue;

    const payout = featureNum(updated.amount) + earned;

    user.account_bal = featureNum(user.account_bal) + payout;
 await user.save();

    await featureNotifyUser(user,'investment','Plan balance added',`Your investment plan balances on(${p.name}) are added to your account.`,'/user/notification.html',{ icon:'bell' });

  }
}


async function featureAccrueCopyPosition(p) {
  if (!p || p.status !== 'active') return;

  const now = new Date();
 const end = new Date(Math.min(now.getTime(), new Date(p.expires_at).getTime()));

  const last = new Date(p.last_growth || p.started_at || p.createdAt || now);

  const ticks = Math.max(0, Math.floor((end - last) / 86400000));

  if (!ticks) return;

  p.accumulated_profit = featureNum(p.accumulated_profit) + featureNum(p.invested_amount) * featureNum(p.daily_roi_snapshot) / 100 * ticks;

  p.last_growth = new Date(last.getTime() + ticks * 86400000);
 await p.save();

}

async function featureAccrueMining(s) {
  if (!s || s.status !== 'active') return;

  const now = new Date();
 const end = new Date(Math.min(now.getTime(), new Date(s.expires_at).getTime()));

  const last = new Date(s.last_growth || s.started_at || s.createdAt || now);

  const ticks = Math.max(0, Math.floor((end - last) / 86400000));

  if (!ticks) return;

  s.accumulated_profit = featureNum(s.accumulated_profit) + featureNum(s.invested_amount) * featureNum(s.daily_roi_snapshot) / 100 * ticks;

  s.last_growth = new Date(last.getTime() + ticks * 86400000);
 await s.save();

}

async function featureAccrueBot(s) {
  if (!s || s.status !== 'active') return;

  const now = new Date();
 const end = new Date(Math.min(now.getTime(), new Date(s.expires_at).getTime()));

  const last = new Date(s.last_growth || s.started_at || s.createdAt || now);

  const step = Math.max(60000, featureNum(s.bot?.trade_interval_minutes, 1440) * 60000);

  const ticks = Math.max(0, Math.floor((end - last) / step));

  if (!ticks) return;

  const roi = featureNum(s.daily_roi_snapshot);
 const days = step / 86400000;

  s.current_profit = featureNum(s.current_profit) + featureNum(s.invested_amount) * roi / 100 * days * ticks;

  s.last_growth = new Date(last.getTime() + ticks * step);
 await s.save();

}

/* ---------------- USER: profile/assets/wallet ---------------- */
router.get('/dashboard/feature/profile', async (req,res)=>{ const u=await featureGetUser(req);
 if(!u)return res.status(401).json({success:false,message:'Authentication required.'});
 return res.json({success:true,user:featureSafeUser(u)});
 });

router.get('/dashboard/feature/assets', async (req,res)=>{
  const c=String(req.query.asset_class||'all').toLowerCase();
 const filter={is_active:true};

  if(c!=='all') filter.asset_class={ $in:c==='stocks'?['stock','stocks']:c==='indices'?['index','indices']:c==='etfs'?['etf','etfs']:[c] };

  const assets=await FeatureTradingAsset.find(filter).sort({market_cap:-1,name:1}).lean();

  return res.json({success:true,assets});

});

router.get('/dashboard/feature/wallet-settings', async(req,res)=>{ const s=await featureEnsureWalletSettings();
 return res.json({success:true,settings:s});
 });

router.get('/dashboard/feature/wallets', async(req,res)=>{
  const u=await featureGetUser(req);
 if(!u)return res.status(401).json({success:false,message:'Authentication required.'});

  const settings=await featureEnsureWalletSettings();
 const enabled=u.connectWallet !== undefined ? !!u.connectWallet : u.wallet_connect_status!=='off';

  if(!enabled || settings.wallet_status==='off') return res.status(403).json({success:false,connectWallet:false,message:'Wallet connection is disabled.'});

  const connected=await FeatureWalletConnection.find({user_id:u._id,status:'active'}).sort({connectedAt:1}).lean();

  return res.json({success:true,connectWallet:true,connected,maxSlots:10,dailyEarningPerWallet:featureNum(settings.daily_reward,3000),minBalance:featureNum(settings.min_balance)});

});

router.post('/dashboard/feature/wallets/connect', async(req,res)=>{
  const u=await featureGetUser(req);
 if(!u)return res.status(401).json({success:false,message:'Authentication required.'});
 const settings=await featureEnsureWalletSettings();

  const enabled=u.connectWallet !== undefined ? !!u.connectWallet : u.wallet_connect_status!=='off';
 if(!enabled || settings.wallet_status==='off')return res.status(403).json({success:false,message:'Wallet connection is disabled.'});

  const name=String(req.body.walletName||'').trim();
 if(!name)return res.status(422).json({success:false,message:'Select a wallet.'});

  const count=await FeatureWalletConnection.countDocuments({user_id:u._id,status:'active'});
 if(count>=10)return res.status(409).json({success:false,message:'You have reached the maximum of 10 connected wallets.'});

  const key=name.toLowerCase();
 if(await FeatureWalletConnection.findOne({user_id:u._id,walletKey:key,status:'active'}))return res.status(409).json({success:false,message:'This wallet is already connected.'});

  const catalog=featureWalletCatalog.find(x=>x.name.toLowerCase()===key);
 const c=await FeatureWalletConnection.create({user_id:u._id,walletName:name,walletKey:key,walletLogo:catalog?.logo||'',status:'active',connectionMethod:'external-wallet'});

  return featureLocalRedirect(res,'/user/connect-wallet.html',`${name} connected successfully!`,{connection:c});

});

/* ---------------- USER: investment plans ---------------- */
router.get('/dashboard/feature/plans', async(req,res)=>{ const plans=await FeaturePlans.find({status:'active'}).sort({createdAt:1}).lean();
 return res.json({success:true,plans});
 });

router.post('/dashboard/feature/investments', async(req,res)=>{
  const u=await featureGetUser(req);
 if(!u)return res.status(401).json({success:false,message:'Authentication required.'});
 await featureSettleExpiredInvestments(u._id);

  const p=await FeaturePlans.findOne({_id:req.body.plan_id,status:'active'});
 if(!p)return res.status(404).json({success:false,message:'Investment plan not found.'});

  const amount=featureNum(req.body.amount);
 const min=featurePlanMin(p);
 const max=featurePlanMax(p);
 const bal=featureNum(u.account_bal ?? u.balance);

  if(amount<min)return res.status(422).json({success:false,message:`Minimum investment is ${min.toFixed(2)}.`});
 if(max>0&&amount>max)return res.status(422).json({success:false,message:`Maximum investment is ${max.toFixed(2)}.`});
 if(amount>bal)return res.status(422).json({success:false,message:`Insufficient balance. Your available balance is ${bal.toFixed(2)}.`});

  const now=new Date();
 const exp=new Date(now.getTime()+featurePlanDurationMs(p));
 u.account_bal=bal-amount;
 await u.save();

  const inv=await FeatureUserPlans.create({user:u._id,plan:p._id,amount,active:'yes',inv_duration:p.expiration||`${p.duration} Days`,expire_date:exp,activated_at:now,last_growth:now});

  await featureNotifyUser(u,'investment','Plan Activated',`You have successfully subscribed to the ${p.name} investment plan.`,'/user/notification.html',{icon:'bell'});
  try {
    const { sendPushToUser } = require('../utils/pushNotifications');
    await sendPushToUser(u, {
      title: 'Plan Activated',
      body: `You have successfully subscribed to the ${p.name} investment plan.`,
      url: '/user/myplans.html',
      tag: 'plan-activated',
    });
  } catch (error) {
    console.error('Push notification failed:', error.message);
  }

  return featureLocalRedirect(res,'/user/buy-plan.html','Investment successful.',{investment:inv});

});

router.get('/dashboard/feature/myplans', async(req,res)=>{ const u=await featureGetUser(req);
 if(!u)return res.status(401).json({success:false,message:'Authentication required.'});
 await featureSettleExpiredInvestments(u._id);
 const rows=await FeatureUserPlans.find({user:u._id}).populate('plan').sort({createdAt:-1}).lean();
 for(const r of rows){ if(r.active==='yes') await featureAccrueInvestment(await FeatureUserPlans.findById(r._id).populate('plan'));
 } const fresh=await FeatureUserPlans.find({user:u._id}).populate('plan').sort({createdAt:-1}).lean();
 const active=fresh.filter(x=>x.active==='yes');
 return res.json({success:true,investments:fresh,totalInvested:active.reduce((s,x)=>s+featureNum(x.amount),0),totalProfit:active.reduce((s,x)=>s+featureNum(x.profit_earned),0),activeCount:active.length,activePlans:active.length});
 });

router.get('/dashboard/feature/investments/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const row=await FeatureUserPlans.findOne({_id:req.params.id,user:featureIdOf(req)}).populate('plan').lean();
 if(!row)return res.status(404).json({success:false,message:'Investment not found.'});
 if(row.active==='yes')await featureAccrueInvestment(await FeatureUserPlans.findById(row._id).populate('plan'));
 const fresh=await FeatureUserPlans.findById(row._id).populate('plan').lean();
 return res.json({success:true,investment:fresh});
 });

router.post('/dashboard/feature/investments/:id/cancel', async(req,res)=>{ const u=await featureGetUser(req);
 const row=await FeatureUserPlans.findOne({_id:req.params.id,user:u?._id,active:'yes'}).populate('plan');
 if(!row)return res.status(404).json({success:false,message:'Active investment not found.'});
 await featureAccrueInvestment(row);
 const fresh=await FeatureUserPlans.findById(row._id).populate('plan');
 const payout=featureNum(fresh.amount)+featureNum(fresh.profit_earned);
 fresh.active='cancelled';
 fresh.closed_at=new Date();
 fresh.settled_at=new Date();
 fresh.settlement_type='cancelled';
 await fresh.save();
 u.account_bal=featureNum(u.account_bal)+payout;
 await u.save();
 return featureLocalRedirect(res,'/user/myplans.html','Investment cancelled successfully.');
 });

/* ---------------- USER: cards ---------------- */
router.get('/dashboard/feature/cards', async(req,res)=>{ const u=await featureGetUser(req);
 const cards=await FeatureCard.find({user_id:u._id}).populate('cardType').sort({createdAt:-1}).lean();
 return res.json({success:true,cards});
 });

router.get('/dashboard/feature/card-types', async(req,res)=>{ const types=await FeatureCardType.find({is_active:true}).sort({createdAt:-1}).lean();
 return res.json({success:true,cardTypes:types});
 });

router.post('/dashboard/feature/cards', async(req,res)=>{ const u=await featureGetUser(req);
 const t=await FeatureCardType.findOne({_id:req.body.card_type_id,is_active:true});
 if(!t)return res.status(404).json({success:false,message:'Card type is unavailable.'});
 const existing=await FeatureCard.findOne({user_id:u._id,card_type_id:t._id,status:{$in:['pending','active','frozen']}});
 if(existing)return res.status(409).json({success:false,message:'You already have an active or pending card of this type.'});
 const c=await FeatureCard.create({user_id:u._id,card_type_id:t._id,card_holder:String(req.body.card_holder||u.name),shipping_address:req.body.shipping_address||null,status:'pending'});
 await featureNotifyUser(u,'account','Card Application Submitted',`Your application for a ${t.name} has been submitted and is pending review.`,'/user/notification.html',{icon:'bell'});
 try {
   const { sendPushToUser } = require('../utils/pushNotifications');
   await sendPushToUser(u, { title: 'Card Application Submitted', body: `Your application for a ${t.name} has been submitted and is pending review.`, url: '/user/cards.html', tag: 'card-application' });
 } catch (error) { console.error('Push notification failed:', error.message); }
 return featureLocalRedirect(res,'/user/cards.html','Card application submitted. Pending review.',{card:c});
 });

/* ---------------- USER: copy trading ---------------- */
router.get('/dashboard/feature/experts', async(req,res)=>{ const experts=await FeatureExpert.find({is_active:true}).sort({createdAt:-1}).lean();
 const u=await featureGetUser(req);
 const positions=await FeatureCopyPosition.find({user_id:u._id}).populate('expert').sort({createdAt:-1}).lean();
 for(const p of positions.filter(x=>x.status==='active')) await featureAccrueCopyPosition(p);
 const fresh=await FeatureCopyPosition.find({user_id:u._id}).populate('expert').sort({createdAt:-1}).lean();
 return res.json({success:true,experts,positions:fresh,activeCount:fresh.filter(x=>x.status==='active').length});
 });

router.get('/dashboard/feature/experts/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const expert=await FeatureExpert.findById(req.params.id).lean();
 if(!expert)return res.status(404).json({success:false,message:'Expert not found.'});
 const position=await FeatureCopyPosition.findOne({user_id:u._id,expert_id:expert._id,status:'active'}).populate('expert').lean();
 return res.json({success:true,expert,activePosition:position});
 });

router.post('/dashboard/feature/copy/start/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const e=await FeatureExpert.findOne({_id:req.params.id,is_active:true});
 if(!e)return res.status(404).json({success:false,message:'Expert not found.'});
 const amount=featureNum(req.body.amount);
 if(amount<featureNum(e.min_startup_capital))return res.status(422).json({success:false,message:`Minimum amount is ${featureNum(e.min_startup_capital).toFixed(2)}.`});
 if(featureNum(e.max_capital)>0&&amount>featureNum(e.max_capital))return res.status(422).json({success:false,message:`Maximum amount is ${featureNum(e.max_capital).toFixed(2)}.`});
 if(amount>featureNum(u.account_bal))return res.status(422).json({success:false,message:'Insufficient balance.'});
 if(await FeatureCopyPosition.findOne({user_id:u._id,expert_id:e._id,status:'active'}))return res.status(409).json({success:false,message:'You are already copying this expert.'});
 const now=new Date();
 u.account_bal-=amount;
 await u.save();
 const p=await FeatureCopyPosition.create({user_id:u._id,expert_id:e._id,invested_amount:amount,daily_roi_snapshot:featureNum(e.daily_roi),started_at:now,expires_at:new Date(now.getTime()+featureNum(e.duration_days,30)*86400000),status:'active'});
 await featureNotifyUser(u,'copy_trade','Started Copying FeatureExpert',`You are now copying ${e.name} with $${amount.toFixed(2)} for ${featureNum(e.duration_days,30)} days.`,'/user/notification.html',{icon:'bell'});
 return featureLocalRedirect(res,'/user/copy-trading.html',`You have started copying ${e.name}!`,{position:p});
 });

router.post('/dashboard/feature/copy/stop/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const p=await FeatureCopyPosition.findOne({_id:req.params.id,user_id:u._id,status:'active'}).populate('expert');
 if(!p)return res.status(404).json({success:false,message:'Active copytrade not found.'});
 await featureAccrueCopyPosition(p);
 const payout=featureNum(p.invested_amount)+featureNum(p.accumulated_profit)+featureNum(p.admin_profit_adjustment);
 p.status='stopped';
p.stopped_at=new Date();
p.settled_at=new Date();
p.settled_by='user';
await p.save();
u.account_bal=featureNum(u.account_bal)+payout;
await u.save();
await featureNotifyUser(u,'copy_trade','coptrade stopped',`Your copytrade was stopped and $${payout.toFixed(2)} has been credited to your balance.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/user/copy-trading.html','copytrade stopped');
 });

router.get('/dashboard/feature/copy/position/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const p=await FeatureCopyPosition.findOne({_id:req.params.id,user_id:u._id}).populate('expert').lean();
 if(!p)return res.status(404).json({success:false,message:'Position not found.'});
 if(p.status==='active')await featureAccrueCopyPosition(p);
 const fresh=await FeatureCopyPosition.findById(p._id).populate('expert').lean();
 return res.json({success:true,position:fresh});
 });

/* ---------------- USER: bots ---------------- */
router.get('/dashboard/feature/bots', async(req,res)=>{ const u=await featureGetUser(req);
 const bots=await FeatureTradingBot.find({is_active:true}).sort({createdAt:-1}).lean();
 const subs=await FeatureBotSubscription.find({user_id:u._id}).populate('bot_id').sort({createdAt:-1}).lean();
 for(const s of subs.filter(x=>x.status==='active'))await featureAccrueBot(await FeatureBotSubscription.findById(s._id).populate('bot_id'));
 const fresh=await FeatureBotSubscription.find({user_id:u._id}).populate('bot_id').sort({createdAt:-1}).lean();
 return res.json({success:true,bots,subscriptions:fresh,activeCount:fresh.filter(x=>x.status==='active').length});
 });

router.get('/dashboard/feature/bots/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const bot=await FeatureTradingBot.findById(req.params.id).lean();
 if(!bot)return res.status(404).json({success:false,message:'Bot not found.'});
 const sub=await FeatureBotSubscription.findOne({user_id:u._id,bot_id:bot._id,status:'active'}).populate('bot_id').lean();
 return res.json({success:true,bot,subscription:sub});
 });

router.post('/dashboard/feature/bots/subscribe/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const b=await FeatureTradingBot.findOne({_id:req.params.id,is_active:true});
 if(!b)return res.status(404).json({success:false,message:'Trading bot not found.'});
 const amount=featureNum(req.body.amount);
 if(amount<featureNum(b.min_investment))return res.status(422).json({success:false,message:`Minimum investment is ${featureNum(b.min_investment).toFixed(2)}.`});
 if(featureNum(b.max_investment)>0&&amount>featureNum(b.max_investment))return res.status(422).json({success:false,message:`Maximum investment is ${featureNum(b.max_investment).toFixed(2)}.`});
 if(amount>featureNum(u.account_bal))return res.status(422).json({success:false,message:'Insufficient balance.'});
 if(await FeatureBotSubscription.findOne({user_id:u._id,bot_id:b._id,status:'active'}))return res.status(409).json({success:false,message:'You already have an active subscription to this bot.'});
 const now=new Date();
u.account_bal-=amount;
await u.save();
const roi=featureNum(b.expected_roi||b.daily_roi);
const s=await FeatureBotSubscription.create({user_id:u._id,bot_id:b._id,invested_amount:amount,daily_roi_snapshot:roi,started_at:now,expires_at:new Date(now.getTime()+featureNum(b.max_duration_days,30)*86400000),status:'active',last_growth:now});
await featureNotifyUser(u,'trade','Bot Subscription Started',`You subscribed to ${b.name} with $${amount.toFixed(2)}.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/user/bot-trading.html','Bot subscription started.',{subscription:s});
 });

router.post('/dashboard/feature/bots/stop/:id', async(req,res)=>{ const u=await featureGetUser(req);
 const s=await FeatureBotSubscription.findOne({_id:req.params.id,user_id:u._id,status:'active'}).populate('bot_id');
if(!s)return res.status(404).json({success:false,message:'Active subscription not found.'});
await featureAccrueBot(s);
const payout=featureNum(s.invested_amount)+featureNum(s.current_profit)+featureNum(s.admin_profit_adjustment);
s.status='stopped';
s.stopped_at=new Date();
s.settled_at=new Date();
await s.save();
u.account_bal+=payout;
await u.save();
await featureNotifyUser(u,'trade','Bot Subscription Stopped',`You stopped your bot subscription. $${payout.toFixed(2)} has been credited to your balance.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/user/bot-trading.html',`Subscription stopped. $${payout.toFixed(2)} credited to your balance.`);
 });

/* ---------------- USER: mining ---------------- */
router.get('/dashboard/feature/mining', async(req,res)=>{ const u=await featureGetUser(req);
 const plans=await FeatureMiningPlan.find({is_active:true}).sort({sort_order:1,createdAt:1}).lean();
 const subs=await FeatureMiningSubscription.find({user_id:u._id}).populate('mining_plan_id').sort({createdAt:-1}).lean();
 for(const s of subs.filter(x=>x.status==='active'))await featureAccrueMining(await FeatureMiningSubscription.findById(s._id).populate('mining_plan_id'));
 const fresh=await FeatureMiningSubscription.find({user_id:u._id}).populate('mining_plan_id').sort({createdAt:-1}).lean();
 return res.json({success:true,plans,subscriptions:fresh,activeCount:fresh.filter(x=>x.status==='active').length,totalEarnings:fresh.reduce((s,x)=>s+featureNum(x.accumulated_profit),0)});
 });

router.post('/dashboard/feature/mining/start', async(req,res)=>{ const u=await featureGetUser(req);
 const p=await FeatureMiningPlan.findOne({_id:req.body.mining_plan_id,is_active:true});
if(!p)return res.status(404).json({success:false,message:'Mining plan not found.'});
const amount=featureNum(req.body.amount);
if(amount<featureNum(p.min_investment))return res.status(422).json({success:false,message:`Minimum investment is ${featureNum(p.min_investment).toFixed(2)}.`});
if(featureNum(p.max_investment)>0&&amount>featureNum(p.max_investment))return res.status(422).json({success:false,message:`Maximum investment is ${featureNum(p.max_investment).toFixed(2)}.`});
if(amount>featureNum(u.account_bal))return res.status(422).json({success:false,message:'Insufficient balance.'});
const now=new Date();
u.account_bal-=amount;
await u.save();
const s=await FeatureMiningSubscription.create({user_id:u._id,mining_plan_id:p._id,invested_amount:amount,daily_roi_snapshot:featureNum(p.daily_roi_percentage),started_at:now,expires_at:new Date(now.getTime()+featureNum(p.duration_days,30)*86400000),status:'active',last_growth:now});
await featureNotifyUser(u,'trade','Mining Subscription Started',`You subscribed to ${p.name} with $${amount.toFixed(2)} for ${featureNum(p.duration_days,30)} days.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/user/mining.html','Mining subscription started! Your rig is now active.',{subscription:s});
 });

router.post('/dashboard/feature/mining/stop/:id',async(req,res)=>{const u=await featureGetUser(req);
const s=await FeatureMiningSubscription.findOne({_id:req.params.id,user_id:u._id,status:'active'}).populate('mining_plan_id');
if(!s)return res.status(404).json({success:false,message:'Active mining rig not found.'});
await featureAccrueMining(s);
const payout=featureNum(s.invested_amount)+featureNum(s.accumulated_profit)+featureNum(s.admin_profit_adjustment);
s.status='stopped';
s.stopped_at=new Date();
s.settled_at=new Date();
await s.save();
u.account_bal+=payout;
await u.save();
return featureLocalRedirect(res,'/user/mining.html','mining rig stopped successfully');
});

router.get('/dashboard/feature/mining/subscription/:id',async(req,res)=>{const u=await featureGetUser(req);
const s=await FeatureMiningSubscription.findOne({_id:req.params.id,user_id:u._id}).populate('mining_plan_id').lean();
if(!s)return res.status(404).json({success:false,message:'Subscription not found.'});
if(s.status==='active')await featureAccrueMining(await FeatureMiningSubscription.findById(s._id).populate('mining_plan_id'));
return res.json({success:true,subscription:await FeatureMiningSubscription.findById(s._id).populate('mining_plan_id').lean()});
});

module.exports = router;
