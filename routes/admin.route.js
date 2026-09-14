const mongoose = require('mongoose');
const router = require('express').Router();

const User = require('../models/user.model');
const Deposit = require('../models/depositSchema');
const Widthdraw = require('../models/widthdrawSchema');
const Trade = require('../models/livetradingSchema');
// const Upgrade = require('../models/upgradeSchema');
const Verify = require('../models/verifySchema');
// const CopyTrade = require('../models/CopyTrade');
// const Affliate = require('../models/affiliate');
// const Wallet = require('../models/walletAddress');
const bcrypt = require('bcrypt');
const { Resend } = require('resend');
const AccountHistory = require('../models/AccountHistory');
const Notification = require('../models/Notification');
const { notifyUser } = require('../services/notification.service');
const { createToken } = require('../utils/authMiddleware');

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
const { refreshAsset, refreshAllAssets } = require('../services/marketPrice.service');


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

function cloudUrl(file) {
  if (!file) return null;
  return file.path || file.secure_url || file.url || null;
}

const copyTraderStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pocket/copytraders',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `copytrader_${Date.now()}`
  }
});
const uploadCopyTrader = multer({ storage: copyTraderStorage });

const walletStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pocket/wallets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `wallet_${file.fieldname}_${Date.now()}`
  }
});
const uploadWallet = multer({ storage: walletStorage });

const frontendUrl = () => String(process.env.FRONTEND_URL || '').replace(/\/$/, '');

// ===================== ADMIN LOGIN (GUEST) =====================

router.get('/adminlogin/remedylogin', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin login page',
    redirect: `${frontendUrl()}/admin/adminlogin.html`
  });
});

router.post('/adminlogin/login', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/adminlogin/logout', async (req, res) => {
  try {
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
      secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SAMESITE === 'none',
      path: '/'
    });
    return res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/adminlogin/dashboard', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin dashboard page',
    redirect: `${frontendUrl()}/admin/adminDashboard.html`
  });
});

// ===================== TWO-FACTOR =====================

router.get('/2fa', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin 2fa page',
    redirect: `${frontendUrl()}/admin/2fa.html`
  });
});

router.post('/twofa', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== FORGOT PASSWORD =====================

router.get('/forgot-password', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin forgot password page',
    redirect: `${frontendUrl()}/admin/forgot-password.html`
  });
});

router.post('/send-request', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/reset-password/:email', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin reset password page',
    redirect: `${frontendUrl()}/admin/reset-password.html?email=${encodeURIComponent(req.params.email)}`
  });
});

router.post('/reset-password-admin', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== HOME / DASHBOARD VIEWS =====================

router.get('/dashboard', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin dashboard page',
    redirect: `${frontendUrl()}/admin/adminDashboard.html`
  });
});

router.get('/dashboard/plans', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin plans page',
    redirect: `${frontendUrl()}/admin/plans.html`
  });
});

router.get('/dashboard/new-plan', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin new plan page',
    redirect: `${frontendUrl()}/admin/new-plan.html`
  });
});

router.get('/dashboard/edit-plan/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin edit plan page',
    redirect: `${frontendUrl()}/admin/edit-plan.html?id=${req.params.id}`
  });
});

router.get('/dashboard/manageusers', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage users page',
    redirect: `${frontendUrl()}/admin/manageusers.html`
  });
});

router.get('/dashboard/manage-crypto-assets', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage crypto assets page',
    redirect: `${frontendUrl()}/admin/manage-crypto-assets.html`
  });
});

router.get('/dashboard/active-investments', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin active investments page',
    redirect: `${frontendUrl()}/admin/active-investments.html`
  });
});

router.get('/dashboard/calendar', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin calendar page',
    redirect: `${frontendUrl()}/admin/calendar.html`
  });
});

router.get('/dashboard/task', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin task page',
    redirect: `${frontendUrl()}/admin/task.html`
  });
});

router.get('/dashboard/mtask', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mtask page',
    redirect: `${frontendUrl()}/admin/mtask.html`
  });
});

router.get('/dashboard/viewtask', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin view task page',
    redirect: `${frontendUrl()}/admin/viewtask.html`
  });
});

router.get('/dashboard/customer', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin customer page',
    redirect: `${frontendUrl()}/admin/customer.html`
  });
});

router.get('/dashboard/leads', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin leads page',
    redirect: `${frontendUrl()}/admin/leads.html`
  });
});

router.get('/dashboard/leadsassign', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin leads assign page',
    redirect: `${frontendUrl()}/admin/leadsassign.html`
  });
});

router.get('/dashboard/user-plans/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin user plans page',
    redirect: `${frontendUrl()}/admin/user-plans.html?id=${req.params.id}`
  });
});

router.get('/dashboard/email-services', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin email services page',
    redirect: `${frontendUrl()}/admin/email-services.html`
  });
});

router.get('/dashboard/about', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin about page',
    redirect: `${frontendUrl()}/admin/about.html`
  });
});

router.get('/dashboard/mwithdrawals', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage withdrawals page',
    redirect: `${frontendUrl()}/admin/mwithdrawals.html`
  });
});

router.get('/dashboard/mdeposits', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage deposits page',
    redirect: `${frontendUrl()}/admin/mdeposits.html`
  });
});

router.get('/dashboard/agents', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin agents page',
    redirect: `${frontendUrl()}/admin/agents.html`
  });
});

router.get('/dashboard/addmanager', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin add manager page',
    redirect: `${frontendUrl()}/admin/addmanager.html`
  });
});

router.get('/dashboard/madmin', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage admin page',
    redirect: `${frontendUrl()}/admin/madmin.html`
  });
});

router.get('/dashboard/msubtrade', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage subtrade page',
    redirect: `${frontendUrl()}/admin/msubtrade.html`
  });
});

router.get('/dashboard/settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin settings page',
    redirect: `${frontendUrl()}/admin/settings.html`
  });
});

router.get('/dashboard/frontpage', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin frontpage page',
    redirect: `${frontendUrl()}/admin/frontpage.html`
  });
});

router.get('/dashboard/adduser', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin add user page',
    redirect: `${frontendUrl()}/admin/adduser.html`
  });
});

router.get('/dashboard/kyc-applications', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin kyc applications page',
    redirect: `${frontendUrl()}/admin/kyc-applications.html`
  });
});

router.get('/dashboard/kyc-application/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin view kyc application page',
    redirect: `${frontendUrl()}/admin/kyc-application.html?id=${req.params.id}`
  });
});

router.get('/dashboard/adminprofile', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin profile page',
    redirect: `${frontendUrl()}/admin/adminprofile.html`
  });
});


// ===================== FUNCTIONAL USER MANAGEMENT OVERRIDES =====================
const adminResend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const adminFrom = process.env.FROM_EMAIL || 'support@digital-grownt.com';

function wantsJson(req) {
  return String(req.get('accept') || '').includes('application/json') || req.xhr || req.body?._ajax === '1';
}
function frontendAdmin(req, path) {
  const base = String(process.env.FRONTEND_URL || '').replace(/\/$/, '');
  return `${base}${path}`;
}
function adminResult(req, res, message, extra = {}) {
  if (wantsJson(req)) return res.json({ success: true, message, ...extra });
  return res.redirect('back');
}
function currencySymbol(code) {
  const map = { USD: '$', NGN: '₦', GBP: '£', EUR: '€', CAD: '$', AUD: '$', JPY: '¥', CNY: '¥', INR: '₹', ZAR: 'R', GHS: '₵', KES: 'KSh' };
  return map[String(code || 'USD').toUpperCase()] || `${String(code || 'USD').toUpperCase()} `;
}
function userAmount(user) { return Number(user.balance ?? user.account_bal ?? 0); }
function setBalances(user, value) {
  const v = Math.max(0, Number(value) || 0);
  user.balance = v;
  user.account_bal = v;
}
async function createHistory(user, amount, type, narration, status = 'processed', meta = {}) {
  return AccountHistory.create({ user_id: user._id, amount: Number(amount), type, narration, status, date: new Date(), meta });
}
async function createCreditNotification(user, amount, type, url = '/user/accounthistory.html') {
  const symbol = currencySymbol(user.currency_code);
  return notifyUser(
    user,
    'account',
    'Account Credited',
    `Your account has been credited with ${symbol}${Number(amount).toFixed(2)} (${type}).`,
    url,
    { icon: 'user', tag: `account-credited-${user._id}-${Date.now()}` }
  );
}

function adminModelPath(Model, names) {
  return names.find((name) => Boolean(Model?.schema?.path(name))) || null;
}
function adminSetField(Model, target, names, value) {
  const key = adminModelPath(Model, names);
  if (key) target[key] = value;
  return key;
}
function adminOwnerPath(Model) {
  return adminModelPath(Model, ['user_id', 'user', 'userId', 'owner']);
}
function adminOwnerFilter(Model, id) {
  const key = adminOwnerPath(Model);
  return key ? { [key]: id } : null;
}
async function adminUsersForDocs(Model, docs) {
  const path = adminOwnerPath(Model);
  if (!path || !docs.length) return new Map();
  const ids = [...new Set(docs.map((d) => String(d[path] || '')).filter(Boolean))];
  const users = await User.find({ _id: { $in: ids } }).lean();
  return new Map(users.map((u) => [String(u._id), u]));
}
function adminDepositView(d, user) {
  return {
    _id: d._id,
    amount: Number(d.amount || 0),
    payment_method: d.payment_method || d.paymethd_method || d.type || 'Deposit',
    type: d.payment_method || d.paymethd_method || d.type || 'Deposit',
    proof: d.proof || d.image || d.proof_image || '',
    image: d.image || d.proof || d.proof_image || '',
    status: String(d.status || 'pending').toLowerCase(),
    narration: d.narration || 'Payment',
    createdAt: d.createdAt || d.date || d.updatedAt,
    user: user ? { _id: user._id, name: user.name, email: user.email, currency_code: user.currency_code || 'USD' } : null,
  };
}
function adminWithdrawalView(d, user) {
  return {
    _id: d._id,
    amount_requested: Number(d.amount_requested ?? d.amount ?? 0),
    amountWithCharges: Number(d.amountWithCharges ?? d.totalDeducted ?? d.amount_requested ?? d.amount ?? 0),
    method: d.method || d.type || 'Withdrawal',
    type: d.type || d.method || 'Withdrawal',
    receiver_email: d.receiver_email || d.receiverEmail || user?.email || '',
    status: String(d.status || 'pending').toLowerCase(),
    createdAt: d.createdAt || d.date || d.updatedAt,
    user: user ? { _id: user._id, name: user.name, email: user.email, currency_code: user.currency_code || 'USD' } : null,
  };
}

function normalizeFourDigitCode(value) {
  const s = String(value ?? '').replace(/\D/g, '');
  return s.slice(0, 4);
}

// Fetch all users with working search/filter/sort/pagination.
router.get('/dashboard/fetchusers', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const requestedSort = String(req.query.sort || 'createdAt');
    const sort = ({ id: '_id', created_at: 'createdAt', createdAt: 'createdAt', name: 'name', username: 'username', email: 'email', status: 'status', balance: 'balance' })[requestedSort] || 'createdAt';
    const direction = String(req.query.direction || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const query = search ? { $or: [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ] } : {};
    const [users, total] = await Promise.all([
      User.find(query).sort({ [sort]: direction }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(query)
    ]);
    return res.json({ success: true, data: users, users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('fetchusers error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch users' });
  }
});

router.get('/dashboard/getusers/:num/:item/:order', async (req, res) => {
  req.query.limit = req.params.num;
  req.query.sort = req.params.item;
  req.query.direction = req.params.order;
  return res.json((await User.find().sort({ [req.params.item]: req.params.order === 'asc' ? 1 : -1 }).limit(Number(req.params.num) || 20).lean()));
});

// Admin-only create user; registration-only fields receive safe defaults.
router.post('/dashboard/saveuser', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const username = String(req.body.username || '').trim().toLowerCase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !/^[a-z0-9_.-]{3,40}$/.test(username) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      return res.status(422).json({ success: false, message: 'Name, valid username, valid email and a password of at least 6 characters are required.' });
    }
    const exists = await User.findOne({ $or: [{ email }, { username }] }).select('email username');
    if (exists) return res.status(409).json({ success: false, message: exists.email === email ? 'Email already registered' : 'Username already taken' });
    const user = await User.create({
      name, username, email, password,
      phone: 'Not provided', gender: 'Others', country: 'Not specified', currency_code: 'USD',
      account: ['Forex Trading'], role: 'CLIENT', status: 'active',
      balance: 0, account_bal: 0, verificationStatus: 'not_verified', account_verify: 'Not Verified'
    });
    return adminResult(req, res, 'User created successfully', { user: { _id: user._id, name: user.name, username: user.username, email: user.email } });
  } catch (error) {
    console.error('saveuser error:', error);
    return res.status(500).json({ success: false, message: 'Could not create user' });
  }
});

router.get('/dashboard/user-details/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (wantsJson(req)) return res.json({ success: true, user });
    return res.json({ success: true, message: 'Use the frontend admin user details page', redirect: frontendAdmin(req, `/admin/user-details.html?id=${encodeURIComponent(req.params.id)}`), user });
  } catch (error) {
    console.error('user-details error:', error);
    return res.status(500).json({ success: false, message: 'Could not load user' });
  }
});

router.get('/dashboard/uublock/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.status = 'blocked';
    await user.save();
    return adminResult(req, res, 'User has been blocked');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not block user' }); }
});
router.get('/dashboard/uunblock/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.status = 'active';
    await user.save();
    return adminResult(req, res, 'User has been unblocked');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not unblock user' }); }
});

router.get('/dashboard/usertrademode/:id/:action', async (req, res) => {
  try {
    if (!['on', 'off'].includes(req.params.action)) return res.status(422).json({ success: false, message: 'Invalid trade mode' });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { trade_mode: req.params.action } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, `User trade mode turned ${req.params.action}`);
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update trade mode' }); }
});

router.get('/dashboard/userwalletstatus/:id/:action', async (req, res) => {
  try {
    if (!['on', 'off'].includes(req.params.action)) return res.status(422).json({ success: false, message: 'Invalid wallet status' });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { wallet_connect_status: req.params.action, connectWallet: req.params.action === 'on' } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, `User wallet connect has been turned ${req.params.action === 'on' ? 'on' : 'off'}`);
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update wallet status' }); }
});

// Credit/debit. Bonus, profit and ref_bonus credit the field AND account balance.
// Deposit/account balance credit only changes account balance. Deposit debit is forbidden.
router.post('/dashboard/topup', async (req, res) => {
  try {
    const user = await User.findById(req.body.user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const amount = Number(req.body.amount);
    const field = String(req.body.type || req.body.column || '').trim();
    const operation = String(req.body.t_type || req.body.operation || '').trim().toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0) return res.status(422).json({ success: false, message: 'Amount must be greater than zero' });
    const fieldMap = { Bonus: 'bonus', Profit: 'profit', Ref_Bonus: 'ref_bonus', ROI: 'roi', balance: 'balance', Deposit: 'balance' };
    const target = fieldMap[field];
    if (!target) return res.status(422).json({ success: false, message: 'Select a valid account field' });
    if (operation === 'debit' && (field === 'balance' || field === 'Deposit')) {
      return res.status(422).json({ success: false, message: 'Deposit field cannot be debited' });
    }
    if (!['credit', 'debit'].includes(operation)) return res.status(422).json({ success: false, message: 'Select Credit or Debit' });

    const current = Number(user[target] || 0);
    if (operation === 'debit' && current < amount) return res.status(422).json({ success: false, message: `Insufficient ${field} balance` });

    if (operation === 'credit') {
      user[target] = current + amount;
      if (target !== 'balance') setBalances(user, userAmount(user) + amount);
      else setBalances(user, current + amount);
    } else {
      user[target] = current - amount;
      setBalances(user, userAmount(user) - amount);
    }
    await user.save({ validateBeforeSave: false });

    const narration = operation === 'credit' ? (field === 'balance' || field === 'Deposit' ? 'Express Deposit' : 'Credit') : 'Credit Reversal';
    await createHistory(user, operation === 'credit' ? amount : -amount, field === 'balance' || field === 'Deposit' ? 'express deposit' : target, narration, operation === 'credit' ? 'processed' : 'processed', { source: 'admin', operation, field });
    if (operation === 'credit') await createCreditNotification(user, amount, field === 'balance' || field === 'Deposit' ? 'Deposit' : field.replace('_', ' '));
    return adminResult(req, res, operation === 'credit' ? 'Account credited successfully' : 'Account debited successfully');
  } catch (error) { console.error('topup error:', error); return res.status(500).json({ success: false, message: 'Could not update account' }); }
});

router.post('/dashboard/AddHistory', async (req, res) => {
  try {
    const user = await User.findById(req.body.user_id);
    const amount = Number(req.body.amount);
    const type = String(req.body.type || '').trim();
    const plan = String(req.body.plan || '').trim();
    if (!user || !plan || !['Bonus', 'ROI'].includes(type) || !Number.isFinite(amount) || amount <= 0) return res.status(422).json({ success: false, message: 'Valid plan, type and positive amount are required' });
    user.profit = Number(user.profit || 0) + amount;
    user.roi = Number(user.roi || 0) + (type === 'ROI' ? amount : 0);
    setBalances(user, userAmount(user) + amount);
    await user.save({ validateBeforeSave: false });
    await createHistory(user, amount, type, plan, 'processed', { source: 'admin-trading-history', plan });
    await createCreditNotification(user, amount, type);
    return adminResult(req, res, 'Trading history added successfully');
  } catch (error) { console.error('AddHistory error:', error); return res.status(500).json({ success: false, message: 'Could not add trading history' }); }
});

router.post('/dashboard/winRate', async (req, res) => {
  try {
    const value = Number(req.body.winrate);
    if (!Number.isFinite(value) || value < 0 || value > 100) return res.status(422).json({ success: false, message: 'Win rate must be between 0 and 100' });
    const user = await User.findByIdAndUpdate(req.body.user_id, { $set: { win_rate: value } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, 'Win Rate Updated Successfully!');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update win rate' }); }
});
router.post('/dashboard/signalStrength', async (req, res) => {
  try {
    const value = Number(req.body.signal_strength_score);
    if (!Number.isFinite(value) || value < 0 || value > 100) return res.status(422).json({ success: false, message: 'Signal strength must be between 0 and 100' });
    const user = await User.findByIdAndUpdate(req.body.user_id, { $set: { signal_strength_score: value, signal_strength: value, signal_strength_enabled: ['1','true','on'].includes(String(req.body.signal_strength_enabled).toLowerCase()) } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, 'Signal Strength Updated Successfully!');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update signal strength' }); }
});
router.post('/dashboard/tradingProgress', async (req, res) => {
  try {
    const value = Number(req.body.trading_progress_score);
    if (!Number.isFinite(value) || value < 0 || value > 100) return res.status(422).json({ success: false, message: 'Trading progress must be between 0 and 100' });
    const user = await User.findByIdAndUpdate(req.body.user_id, { $set: { trading_progress_score: value, trade_prog: value, trading_progress_enabled: ['1','true','on'].includes(String(req.body.trading_progress_enabled).toLowerCase()) } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, 'Trading Progress Updated Successfully!');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update trading progress' }); }
});
router.post('/dashboard/withdrawalcode', async (req, res) => {
  try {
    const data = {};
    for (let i = 1; i <= 5; i += 1) {
      const code = normalizeFourDigitCode(req.body[`code${i}`]);
      const enabled = ['1','true','on'].includes(String(req.body[`code${i}_enabled`]).toLowerCase());
      if (enabled && code.length !== 4) return res.status(422).json({ success: false, message: `Code ${i} must contain exactly 4 digits when enabled` });
      data[`code${i}`] = code;
      data[`code${i}_enabled`] = enabled;
      data[`code${i}_label`] = String(req.body[`code${i}_label`] || '').trim().slice(0, 120);
    }
    const user = await User.findByIdAndUpdate(req.body.user_id, { $set: data }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, 'Withdrawal Code Updated Successfully');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update withdrawal codes' }); }
});
router.post('/dashboard/notify', async (req, res) => {
  try {
    const enabled = ['1','true','on'].includes(String(req.body.banner_enabled).toLowerCase());
    const type = ['warning','success','danger'].includes(String(req.body.banner_type)) ? String(req.body.banner_type) : 'warning';
    const user = await User.findByIdAndUpdate(req.body.user_id, { $set: { dashboard_banner_message: String(req.body.notify || ''), dashboard_banner_type: type, dashboard_banner_enabled: enabled } }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return adminResult(req, res, 'Dashboard banner updated successfully!');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update dashboard banner' }); }
});

router.post('/dashboard/edituser', async (req, res) => {
  try {
    const user = await User.findById(req.body.user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const next = {
      username: String(req.body.username || '').trim().toLowerCase(),
      name: String(req.body.name || '').trim(),
      email: String(req.body.email || '').trim().toLowerCase(),
      phone: String(req.body.phone || '').trim(),
      country: String(req.body.country || '').trim(),
      win_rate: Number(req.body.win_rate),
      ref_link: String(req.body.ref_link || '').trim(),
    };
    if (!/^[a-z0-9_.-]{3,40}$/.test(next.username) || !/^\S+@\S+\.\S+$/.test(next.email) || !next.name || !Number.isFinite(next.win_rate) || next.win_rate < 0 || next.win_rate > 100) return res.status(422).json({ success: false, message: 'Invalid user details' });
    const duplicate = await User.findOne({ $or: [{ username: next.username }, { email: next.email }], _id: { $ne: user._id } });
    if (duplicate) return res.status(409).json({ success: false, message: 'Username or email already belongs to another user' });
    const changed = Object.keys(next).some((key) => String(user[key] ?? '') !== String(next[key] ?? ''));
    if (!changed) return res.status(422).json({ success: false, message: 'Make at least one change before submitting' });
    Object.assign(user, next);
    await user.save({ validateBeforeSave: false });
    return adminResult(req, res, 'User details updated Successfully!');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not update user details' }); }
});

router.post('/dashboard/sendmailsingle', async (req, res) => {
  try {
    const user = await User.findById(req.body.user_id);
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    if (!user || !subject || !message) return res.status(422).json({ success: false, message: 'Recipient, subject and message are required' });
    if (adminResend) {
      await adminResend.emails.send({ from: adminFrom, to: user.email, subject, html: `
        <div style="margin:0;background:#f4f7f8;padding:32px 16px;font-family:Arial,sans-serif;color:#17202a">
          <div style="max-width:620px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7ecef">
            <div style="background:#0052ff;padding:26px;text-align:center"><img src="${process.env.BRAND_LOGO_URL || ''}" alt="Digital-grownt" style="max-height:52px;max-width:220px"></div>
            <div style="padding:34px"><h2 style="margin:0 0 18px">${subject.replace(/[<>&"]/g,'')}</h2><div style="white-space:pre-line;line-height:1.7;color:#4b5563">${message.replace(/[<>&"]/g,'')}</div>
              <p style="margin:28px 0 0;text-align:center"><a href="${String(process.env.FRONTEND_URL || '').replace(/\/$/,'')}/user/notification.html" style="display:inline-block;background:#0052ff;color:#fff;padding:13px 22px;border-radius:9px;text-decoration:none;font-weight:700">View message on dashboard</a></p>
            </div>
          </div>
        </div>` });
    }
    await notifyUser(user, 'message', subject, message, '/user/notification.html', { icon: 'bell', tag: `admin-message-${Date.now()}` });
    return adminResult(req, res, 'Your message was sent successfully!');
  } catch (error) { console.error('sendmailsingle error:', error); return res.status(500).json({ success: false, message: 'Could not send message' }); }
});

router.get('/dashboard/resetpswd/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const generatedPassword = 'user01236';
    user.password = generatedPassword;
    await user.save({ validateBeforeSave: false });
    return adminResult(req, res, 'user password updated successfully!');
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not reset password' }); }
});

router.get('/dashboard/clearacct/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    setBalances(user, 0);
    user.profit = 0; user.roi = 0; user.bonus = 0; user.ref_bonus = 0;
    await user.save({ validateBeforeSave: false });
    return adminResult(req, res, `${currencySymbol(user.currency_code)}0.00`, { message: `Account cleared to ${currencySymbol(user.currency_code)}0.00(amount)` });
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not clear account' }); }
});

router.get('/dashboard/switchuser/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Blocked users cannot be impersonated' });
    res.cookie('jwt', createToken(user._id), { httpOnly: true, sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'), secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SAMESITE === 'none', maxAge: 3 * 24 * 60 * 60 * 1000, path: '/' });
    if (wantsJson(req)) return res.json({ success: true, message: `Logged in as ${user.name}`, redirect: frontendAdmin(req, '/user/dashboard.html') });
    return res.redirect(frontendAdmin(req, '/user/dashboard.html'));
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not login as user' }); }
});

router.get('/dashboard/delsystemuser/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const models = [Deposit, Widthdraw, Trade, Verify, CopyTrade, Affliate, Wallet, Notification, AccountHistory];
    for (const Model of models) {
      for (const field of ['user', 'user_id', 'userId']) {
        try { await Model.deleteMany({ [field]: user._id }); } catch (_) {}
      }
    }
    await User.findByIdAndDelete(id);
    if (wantsJson(req)) return res.json({ success: true, message: 'User Account and all associated records deleted successfully!', redirect: frontendAdmin(req, '/manageusers.html') });
    return res.redirect(frontendAdmin(req, '/manageusers.html'));
  } catch (error) { console.error(error); return res.status(500).json({ success: false, message: 'Could not delete user' }); }
});

// ===================== KYC =====================

router.get('/dashboard/fetchkyc', async (req, res) => {
  try {
    const applications = await Verify.find().sort({ createdAt: -1 }).lean();
    const users = await adminUsersForDocs(Verify, applications);
    return res.json({ success: true, applications: applications.map((k) => ({ ...k, user: users.get(String(k[adminOwnerPath(Verify)] || '')) || null })) });
  } catch (error) {
    console.error('fetchkyc error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch KYC applications' });
  }
});

router.get('/dashboard/kyc-application/:id/data', async (req, res) => {
  try {
    const application = await Verify.findById(req.params.id).lean();
    if (!application) return res.status(404).json({ success: false, message: 'KYC application not found' });
    const owner = adminOwnerPath(Verify);
    const user = owner ? await User.findById(application[owner]).lean() : null;
    return res.json({ success: true, application: { ...application, user } });
  } catch (error) {
    console.error('kyc application data error:', error);
    return res.status(500).json({ success: false, message: 'Could not load KYC application' });
  }
});

router.post('/dashboard/processkyc', async (req, res) => {
  try {
    const application = await Verify.findById(req.body.kyc_id);
    if (!application) return res.status(404).json({ success: false, message: 'KYC application not found' });
    const owner = adminOwnerPath(Verify);
    const userId = owner ? application[owner] : null;
    const user = userId ? await User.findById(userId) : null;
    if (!user) return res.status(404).json({ success: false, message: 'KYC user not found' });
    const action = String(req.body.action || '').toLowerCase();
    const message = String(req.body.message || '').trim();
    const subject = String(req.body.subject || '').trim();
    if (!['accept', 'reject'].includes(action) || !message || !subject) return res.status(422).json({ success: false, message: 'Action, message and email subject are required.' });
    const { notifyUser } = require('../services/notification.service');
    if (action === 'accept') {
      if (Verify.schema.path('status')) application.status = 'verified';
      await application.save({ validateBeforeSave: false });
      user.isVerified = true; user.verificationStatus = 'verified'; user.account_verify = 'Verified'; user.verificationBannerDismissed = true;
      await user.save({ validateBeforeSave: false });
      await notifyUser(user, 'kyc', 'KYC KYC Verified', message, '/user/notification.html', { icon: 'bell', tag: `kyc-verified-${user._id}-${Date.now()}` });
      return res.json({ success: true, message: 'KYC verified successfully', redirect: `${frontendUrl()}/admin/kyc-applications.html` });
    }
    await Verify.findByIdAndDelete(application._id);
    user.isVerified = false; user.verificationStatus = 'not_verified'; user.account_verify = 'Not Verified'; user.verificationBannerDismissed = false;
    await user.save({ validateBeforeSave: false });
    await notifyUser(user, 'kyc', 'KYC Rejected', message, '/user/notification.html', { icon: 'bell', tag: `kyc-rejected-${user._id}-${Date.now()}` });
    return res.json({ success: true, message: 'KYC application rejected', redirect: `${frontendUrl()}/admin/kyc-applications.html` });
  } catch (error) {
    console.error('processkyc error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Could not process KYC' });
  }
});

// ===================== CRM =====================

router.post('/dashboard/addtask', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updatetask', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/deltask/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete task page',
    redirect: `${frontendUrl()}/admin/task.html?delete=${req.params.id}`
  });
});

router.get('/dashboard/markdone/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mark done page',
    redirect: `${frontendUrl()}/admin/task.html?done=${req.params.id}`
  });
});

router.post('/dashboard/updateuser', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/convert/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin convert page',
    redirect: `${frontendUrl()}/admin/convert.html?id=${req.params.id}`
  });
});

router.post('/dashboard/assign', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== MANAGE USERS =====================

router.get('/dashboard/user-wallet/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin user wallet page',
    redirect: `${frontendUrl()}/admin/user-wallet.html?id=${req.params.id}`
  });
});












router.get('/dashboard/login-activity/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin login activity page',
    redirect: `${frontendUrl()}/admin/login-activity.html?id=${req.params.id}`
  });
});

router.get('/dashboard/clear-activity/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin clear activity page',
    redirect: `${frontendUrl()}/admin/clear-activity.html?id=${req.params.id}`
  });
});

router.get('/dashboard/add-referral/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin add referral page',
    redirect: `${frontendUrl()}/admin/add-referral.html?id=${req.params.id}`
  });
});

router.post('/dashboard/add-referral', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});





router.get('/dashboard/email-verify/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin email verify page',
    redirect: `${frontendUrl()}/admin/email-verify.html?id=${req.params.id}`
  });
});






router.post('/dashboard/sendmailtoall', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/deleteplan/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete plan page',
    redirect: `${frontendUrl()}/admin/deleteplan.html?id=${req.params.id}`
  });
});

router.get('/dashboard/approveplan/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin approve plan page',
    redirect: `${frontendUrl()}/admin/approveplan.html?id=${req.params.id}`
  });
});

router.get('/dashboard/markas/:status/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mark plan as page',
    redirect: `${frontendUrl()}/admin/markas.html?status=${req.params.status}&id=${req.params.id}`
  });
});

// ===================== DEPOSITS =====================


router.get('/dashboard/fetchdeposits', async (req, res) => {
  try {
    const rows = await Deposit.find().sort({ createdAt: -1 }).lean();
    const users = await adminUsersForDocs(Deposit, rows);
    const owner = adminOwnerPath(Deposit);
    return res.json({ success: true, deposits: rows.map((d) => adminDepositView(d, owner ? users.get(String(d[owner] || '')) : null)) });
  } catch (error) {
    console.error('fetchdeposits error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch deposits' });
  }
});

router.post('/dashboard/processdeposit/:id', async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    const previous = String(deposit.status || 'pending').toLowerCase();
    if (previous === 'processed') return res.json({ success: true, message: 'Deposit is already processed' });
    const owner = adminOwnerPath(Deposit);
    const user = owner ? await User.findById(deposit[owner]) : null;
    if (!user) return res.status(404).json({ success: false, message: 'Deposit user not found' });
    const amount = Number(deposit.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(422).json({ success: false, message: 'Invalid deposit amount' });
    if (Deposit.schema.path('status')) deposit.status = 'processed';
    await deposit.save({ validateBeforeSave: false });
    setBalances(user, userAmount(user) + amount);
    await user.save({ validateBeforeSave: false });
    await createHistory(user, amount, 'deposit', 'Deposit', 'processed', { source: 'admin-deposit', deposit_id: String(deposit._id), payment_method: deposit.payment_method || deposit.type || '' });
    const symbol = currencySymbol(user.currency_code);
    await notifyUser(user, 'deposit', 'Deposit Approved', `Your deposit of ${symbol}${amount.toFixed(2)} has been approved and credited to your account.`, '/user/notification.html', { icon: 'bell', tag: `deposit-approved-${deposit._id}` });
    return res.json({ success: true, message: 'Deposit processed successfully', redirect: `${frontendUrl()}/admin/mdeposits.html` });
  } catch (error) {
    console.error('processdeposit error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Could not process deposit' });
  }
});

router.delete('/dashboard/deldeposit/:id', async (req, res) => {
  try {
    const result = await Deposit.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Deposit not found' });
    return res.json({ success: true, message: 'Deposit deleted successfully' });
  } catch (error) {
    console.error('deldeposit error:', error);
    return res.status(500).json({ success: false, message: 'Could not delete deposit' });
  }
});

router.get('/dashboard/deldeposit/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete deposit page',
    redirect: `${frontendUrl()}/admin/deldeposit.html?id=${req.params.id}`
  });
});

router.get('/dashboard/pdeposit/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin process deposit page',
    redirect: `${frontendUrl()}/admin/pdeposit.html?id=${req.params.id}`
  });
});

router.get('/dashboard/viewimage/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin view deposit image page',
    redirect: `${frontendUrl()}/admin/viewimage.html?id=${req.params.id}`
  });
});

router.post('/dashboard/editamount', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== WITHDRAWALS =====================


router.get('/dashboard/fetchwithdrawals', async (req, res) => {
  try {
    const rows = await Widthdraw.find().sort({ createdAt: -1 }).lean();
    const users = await adminUsersForDocs(Widthdraw, rows);
    const owner = adminOwnerPath(Widthdraw);
    return res.json({ success: true, withdrawals: rows.map((d) => adminWithdrawalView(d, owner ? users.get(String(d[owner] || '')) : null)) });
  } catch (error) {
    console.error('fetchwithdrawals error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch withdrawals' });
  }
});

router.post('/dashboard/processwithdrawal/:id', async (req, res) => {
  try {
    const withdrawal = await Widthdraw.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    if (String(withdrawal.status || '').toLowerCase() === 'processed') return res.json({ success: true, message: 'Withdrawal is already processed' });
    if (Widthdraw.schema.path('status')) withdrawal.status = 'processed';
    await withdrawal.save({ validateBeforeSave: false });
    const owner = adminOwnerPath(Widthdraw);
    const user = owner ? await User.findById(withdrawal[owner]) : null;
    if (user) {
      const amount = Number(withdrawal.amount_requested ?? withdrawal.amount ?? 0);
      const symbol = currencySymbol(user.currency_code);
      await notifyUser(user, 'withdrawal', 'Withdrawal Approved', `Your withdrawal of ${symbol}${amount.toFixed(2)} has been processed and approved.`, '/user/notification.html', { icon: 'bell', tag: `withdrawal-approved-${withdrawal._id}` });
    }
    return res.json({ success: true, message: 'Withdrawal processed successfully', redirect: `${frontendUrl()}/admin/mwithdrawals.html` });
  } catch (error) {
    console.error('processwithdrawal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Could not process withdrawal' });
  }
});

router.post('/dashboard/rejectwithdrawal/:id', async (req, res) => {
  try {
    const withdrawal = await Widthdraw.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    const previous = String(withdrawal.status || 'pending').toLowerCase();
    if (previous !== 'rejected') {
      if (Widthdraw.schema.path('status')) withdrawal.status = 'rejected';
      await withdrawal.save({ validateBeforeSave: false });
      const owner = adminOwnerPath(Widthdraw);
      const user = owner ? await User.findById(withdrawal[owner]) : null;
      if (user && previous === 'pending') {
        const amount = Number(withdrawal.amountWithCharges ?? withdrawal.totalDeducted ?? withdrawal.amount_requested ?? withdrawal.amount ?? 0);
        if (amount > 0) { setBalances(user, userAmount(user) + amount); await user.save({ validateBeforeSave: false }); }
        const symbol = currencySymbol(user.currency_code);
        await notifyUser(user, 'withdrawal', 'Withdrawal Rejected', `Your withdrawal of ${symbol}${Number(withdrawal.amount_requested ?? withdrawal.amount ?? 0).toFixed(2)} has been rejected.`, '/user/notification.html', { icon: 'bell', tag: `withdrawal-rejected-${withdrawal._id}` });
      }
    }
    return res.json({ success: true, message: 'Withdrawal rejected successfully', redirect: `${frontendUrl()}/admin/mwithdrawals.html` });
  } catch (error) {
    console.error('rejectwithdrawal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Could not reject withdrawal' });
  }
});

router.delete('/dashboard/delwithdrawal/:id', async (req, res) => {
  try {
    const result = await Widthdraw.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    return res.json({ success: true, message: 'Withdrawal deleted successfully' });
  } catch (error) {
    console.error('delwithdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Could not delete withdrawal' });
  }
});

router.post('/dashboard/pwithdrawal', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/process-withdrawal-request/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin process withdrawal request page',
    redirect: `${frontendUrl()}/admin/process-withdrawal-request.html?id=${req.params.id}`
  });
});

// ===================== PAYMENT SETTINGS =====================

router.post('/dashboard/addwdmethod', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/updatewdmethod', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/edit-method/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin edit payment method page',
    redirect: `${frontendUrl()}/admin/edit-method.html?id=${req.params.id}`
  });
});

router.get('/dashboard/delete-method/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete payment method page',
    redirect: `${frontendUrl()}/admin/delete-method.html?id=${req.params.id}`
  });
});

router.get('/dashboard/toggle-method-status/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin toggle payment method status page',
    redirect: `${frontendUrl()}/admin/toggle-method-status.html?id=${req.params.id}`
  });
});

router.put('/dashboard/update-method', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/paypreference', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/updatecpd', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/updategateway', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/update-transfer-settings', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/settings/payment-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin payment settings page',
    redirect: `${frontendUrl()}/admin/payment-settings.html`
  });
});

// ===================== TOPUP =====================


// ===================== WALLET CONNECT =====================

router.get('/dashboard/mwalletconnect', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin wallet connect page',
    redirect: `${frontendUrl()}/admin/mwalletconnect.html`
  });
});

router.get('/dashboard/mwalletsettings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin wallet settings page',
    redirect: `${frontendUrl()}/admin/mwalletsettings.html`
  });
});

router.get('/dashboard/mwalletdelete/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin wallet delete page',
    redirect: `${frontendUrl()}/admin/mwalletdelete.html?id=${req.params.id}`
  });
});

router.post('/dashboard/mwalletconnectsave', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/user-wallet-disconnect/:walletId', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin user wallet disconnect page',
    redirect: `${frontendUrl()}/admin/user-wallet-disconnect.html?walletId=${req.params.walletId}`
  });
});

// ===================== IP ADDRESS =====================

router.get('/dashboard/ipaddress', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin ip address page',
    redirect: `${frontendUrl()}/admin/ipaddress.html`
  });
});

router.get('/dashboard/allipaddress', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin all ip address page',
    redirect: `${frontendUrl()}/admin/allipaddress.html`
  });
});

router.get('/dashboard/delete-ip/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete ip page',
    redirect: `${frontendUrl()}/admin/delete-ip.html?id=${req.params.id}`
  });
});

router.post('/dashboard/add-ip', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== SETTINGS =====================

router.post('/dashboard/updatesettings', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updateasset', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updatemarket', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updatefee', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/deletewdmethod/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete wd method page',
    redirect: `${frontendUrl()}/admin/deletewdmethod.html?id=${req.params.id}`
  });
});

// ===================== MANAGE ADMINS =====================

router.get('/dashboard/unblock/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin unblock admin page',
    redirect: `${frontendUrl()}/admin/unblock.html?id=${req.params.id}`
  });
});

router.get('/dashboard/ublock/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin block admin page',
    redirect: `${frontendUrl()}/admin/ublock.html?id=${req.params.id}`
  });
});

router.get('/dashboard/deleletadmin/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete admin page',
    redirect: `${frontendUrl()}/admin/deleletadmin.html?id=${req.params.id}`
  });
});

router.post('/dashboard/editadmin', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/adminchangepassword', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin change password page',
    redirect: `${frontendUrl()}/admin/adminchangepassword.html`
  });
});

router.post('/dashboard/adminupdatepass', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/resetadpwd/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin reset admin password page',
    redirect: `${frontendUrl()}/admin/resetadpwd.html?id=${req.params.id}`
  });
});

router.post('/dashboard/sendmail', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/changestyle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/saveadmin', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/update-profile', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== FRONTEND CONTENT =====================

router.post('/dashboard/savefaq', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/savetestimony', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/saveimg', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/savecontents', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updatefaq', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updatetestimony', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updatecontents', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updateimg', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/delfaq/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete faq page',
    redirect: `${frontendUrl()}/admin/delfaq.html?id=${req.params.id}`
  });
});

router.get('/dashboard/deltestimony/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete testimony page',
    redirect: `${frontendUrl()}/admin/deltestimony.html?id=${req.params.id}`
  });
});

router.get('/dashboard/privacy-policy', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin privacy policy page',
    redirect: `${frontendUrl()}/admin/privacy-policy.html`
  });
});

router.post('/dashboard/privacy-policy', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== INVESTMENT PLANS =====================

router.post('/dashboard/addplan', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/updateplan', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/trashplan/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin trash plan page',
    redirect: `${frontendUrl()}/admin/trashplan.html?id=${req.params.id}`
  });
});

// ===================== AGENTS =====================

router.post('/dashboard/addagent', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/viewagent/:agent', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin view agent page',
    redirect: `${frontendUrl()}/admin/viewagent.html?agent=${req.params.agent}`
  });
});

router.get('/dashboard/delagent/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin delete agent page',
    redirect: `${frontendUrl()}/admin/delagent.html?id=${req.params.id}`
  });
});

// ===================== APP SETTINGS =====================

router.put('/dashboard/updatewebinfo', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/updatepreference', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/updateemail', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/settings/app-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin app settings page',
    redirect: `${frontendUrl()}/admin/app-settings.html`
  });
});

router.post('/update-theme', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/update-api-keys', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/test-api-connection', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/settings/convert-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin convert settings page',
    redirect: `${frontendUrl()}/admin/convert-settings.html`
  });
});

router.post('/dashboard/settings/convert-settings', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== CONVERSIONS =====================

router.get('/dashboard/conversions', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin conversions page',
    redirect: `${frontendUrl()}/admin/conversions.html`
  });
});

// ===================== REFERRAL SETTINGS =====================

router.put('/dashboard/update-bonus', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/settings/referral-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin referral settings page',
    redirect: `${frontendUrl()}/admin/referral-settings.html`
  });
});

router.put('/dashboard/other-bonus', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== IMPORT =====================

router.get('/download-doc', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin download doc page',
    redirect: `${frontendUrl()}/admin/download-doc.html`
  });
});

router.post('/dashboard/fileImport', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== SUBSCRIPTION SETTINGS =====================

router.put('/dashboard/updatesubfee', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/dashboard/settings/subscription-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin subscription settings page',
    redirect: `${frontendUrl()}/admin/subscription-settings.html`
  });
});

// ===================== THEME COLORS =====================

router.get('/dashboard/settings/color-settings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin color settings page',
    redirect: `${frontendUrl()}/admin/color-settings.html`
  });
});

router.put('/dashboard/update-colors', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/reset-colors', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== EXCHANGE RATES =====================

router.get('/dashboard/settings/exchange-rates', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin exchange rates page',
    redirect: `${frontendUrl()}/admin/exchange-rates.html`
  });
});

router.put('/dashboard/settings/exchange-rates/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/settings/exchange-rates/:id/toggle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/settings/exchange-rates/fetch', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/dashboard/settings/exchange-rates/:id/reset', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== CRYPTO ASSETS =====================

router.get('/dashboard/setcryptostatus/:asset/:status', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin set crypto status page',
    redirect: `${frontendUrl()}/admin/setcryptostatus.html?asset=${req.params.asset}&status=${req.params.status}`
  });
});

router.get('/dashboard/useexchange/:value', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin use exchange page',
    redirect: `${frontendUrl()}/admin/useexchange.html?value=${req.params.value}`
  });
});

router.post('/dashboard/exchangefee', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== MEMBERSHIP / COURSES =====================

router.get('/courses', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin courses page',
    redirect: `${frontendUrl()}/admin/courses.html`
  });
});

router.post('/add-course', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.patch('/update-course', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/delete-course/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.patch('/toggle-publish/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/courses-lessons/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin courses lessons page',
    redirect: `${frontendUrl()}/admin/courses-lessons.html?id=${req.params.id}`
  });
});

router.post('/add-lesson', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.patch('/update-lesson', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/delete-lesson/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.patch('/reorder-lesson', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/categories', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin categories page',
    redirect: `${frontendUrl()}/admin/categories.html`
  });
});

router.post('/add-category', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/delete-cat/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/lessons-without-course', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin lessons without course page',
    redirect: `${frontendUrl()}/admin/lessons-without-course.html`
  });
});

// ===================== SIGNALS =====================

router.get('/signal', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin signal page',
    redirect: `${frontendUrl()}/admin/signal.html`
  });
});

router.get('/signal-plans', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin signal plans page',
    redirect: `${frontendUrl()}/admin/signal-plans.html`
  });
});

// ===================== TRADES =====================

router.get('/managetrades', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage trades page',
    redirect: `${frontendUrl()}/admin/managetrades.html`
  });
});

router.get('/managetrades/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin manage trade details page',
    redirect: `${frontendUrl()}/admin/managetrades.html?id=${req.params.id}`
  });
});

router.get('/trades/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin create trade page',
    redirect: `${frontendUrl()}/admin/trades-create.html`
  });
});

router.post('/trades/store', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/users/search', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin users search page',
    redirect: `${frontendUrl()}/admin/users-search.html`
  });
});

router.get('/trades/:trade/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin edit trade page',
    redirect: `${frontendUrl()}/admin/trades-edit.html?trade=${req.params.trade}`
  });
});

router.put('/trades/:trade', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/mangetrades/:id/update-profit-loss', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/trades/bulk-settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== TRADING ASSETS =====================

router.get('/assets', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin assets page',
    redirect: `${frontendUrl()}/admin/assets.html`
  });
});

router.post('/assets', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/assets/:id/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin edit asset page',
    redirect: `${frontendUrl()}/admin/assets-edit.html?id=${req.params.id}`
  });
});

router.put('/assets/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/assets/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/assets/:id/toggle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/assets/:id/price', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/assets/refresh', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin assets refresh page',
    redirect: `${frontendUrl()}/admin/assets.html?refresh=1`
  });
});

// ===================== EXPERTS & COPY TRADING =====================

router.get('/experts', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin experts page',
    redirect: `${frontendUrl()}/admin/experts.html`
  });
});

router.get('/copy-trades', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin copy trades page',
    redirect: `${frontendUrl()}/admin/copy-trades.html`
  });
});

router.get('/copy-trades/:position', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin copy trade position page',
    redirect: `${frontendUrl()}/admin/copy-trades.html?position=${req.params.position}`
  });
});

router.post('/copy-trades/:position/settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/copy-trades/:position/stop', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/copy-trades/:position/adjust', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/copy-trades/bulk-settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== BOT TRADING =====================

router.get('/bot-trading', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin bot trading page',
    redirect: `${frontendUrl()}/admin/bot-trading.html`
  });
});

router.get('/bot-trading/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin bot trading create page',
    redirect: `${frontendUrl()}/admin/bot-trading-create.html`
  });
});

router.post('/bot-trading', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/bot-trading/:bot/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin bot trading edit page',
    redirect: `${frontendUrl()}/admin/bot-trading-edit.html?bot=${req.params.bot}`
  });
});

router.put('/bot-trading/:bot', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/bot-trading/:bot', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/bot-trading/:bot/toggle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/bot-trading/subscriptions', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin bot trading subscriptions page',
    redirect: `${frontendUrl()}/admin/bot-trading-subscriptions.html`
  });
});

router.get('/bot-trading/subscriptions/:subscription', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin bot trading subscription details page',
    redirect: `${frontendUrl()}/admin/bot-trading-subscriptions.html?subscription=${req.params.subscription}`
  });
});

router.post('/bot-trading/subscriptions/:subscription/settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/bot-trading/subscriptions/:subscription/adjust', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/bot-trading/subscriptions/bulk-settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== SUPPORT =====================

router.get('/dashboard/support-tickets', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin support tickets page',
    redirect: `${frontendUrl()}/admin/support-tickets.html`
  });
});

router.get('/dashboard/support-tickets/:ticket', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin support ticket details page',
    redirect: `${frontendUrl()}/admin/support-tickets.html?ticket=${req.params.ticket}`
  });
});

router.post('/dashboard/support-tickets/:ticket/reply', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/dashboard/support-tickets/:ticket/status', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== NFT MODULE =====================

router.get('/nfts', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nfts page',
    redirect: `${frontendUrl()}/admin/nfts.html`
  });
});

router.get('/nfts/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nfts create page',
    redirect: `${frontendUrl()}/admin/nfts-create.html`
  });
});

router.post('/nfts', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/nfts/:nft/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nfts edit page',
    redirect: `${frontendUrl()}/admin/nfts-edit.html?nft=${req.params.nft}`
  });
});

router.put('/nfts/:nft', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/nfts/:nft', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/nfts/:nft/toggle-featured', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/nfts/:nft/toggle-approval', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/nfts/sold', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nfts sold page',
    redirect: `${frontendUrl()}/admin/nfts-sold.html`
  });
});

router.get('/nfts/transfers', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nfts transfers page',
    redirect: `${frontendUrl()}/admin/nfts-transfers.html`
  });
});

// NFT Categories
router.get('/nft-categories', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nft categories page',
    redirect: `${frontendUrl()}/admin/nft-categories.html`
  });
});

router.post('/nft-categories', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/nft-categories/:category', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/nft-categories/:category', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// NFT Collections
router.get('/nft-collections', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nft collections page',
    redirect: `${frontendUrl()}/admin/nft-collections.html`
  });
});

router.get('/nft-collections/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nft collections create page',
    redirect: `${frontendUrl()}/admin/nft-collections-create.html`
  });
});

router.post('/nft-collections', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/nft-collections/:collection/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin nft collections edit page',
    redirect: `${frontendUrl()}/admin/nft-collections-edit.html?collection=${req.params.collection}`
  });
});

router.put('/nft-collections/:collection', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/nft-collections/:collection', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/nft-collections/:collection/toggle-featured', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== LOANS =====================

router.get('/loan-plans', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin loan plans page',
    redirect: `${frontendUrl()}/admin/loan-plans.html`
  });
});

router.get('/loan-plans/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin loan plans create page',
    redirect: `${frontendUrl()}/admin/loan-plans-create.html`
  });
});

router.post('/loan-plans', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/loan-plans/:plan/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin loan plans edit page',
    redirect: `${frontendUrl()}/admin/loan-plans-edit.html?plan=${req.params.plan}`
  });
});

router.put('/loan-plans/:plan', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/loan-plans/:plan/toggle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/loans/:loan', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin loan details page',
    redirect: `${frontendUrl()}/admin/loans.html?loan=${req.params.loan}`
  });
});

router.put('/loans/:loan/approve', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/loans/:loan/reject', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/loans/:loan/default', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== DIGITAL CARDS =====================

router.get('/cards', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin cards page',
    redirect: `${frontendUrl()}/admin/cards.html`
  });
});

router.get('/cards/types/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin cards types create page',
    redirect: `${frontendUrl()}/admin/cards-types-create.html`
  });
});

router.post('/cards/types', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/cards/types/:cardType/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin cards types edit page',
    redirect: `${frontendUrl()}/admin/cards-types-edit.html?cardType=${req.params.cardType}`
  });
});

router.put('/cards/types/:cardType', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/cards/types/:cardType/toggle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/cards/:card/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin cards edit page',
    redirect: `${frontendUrl()}/admin/cards-edit.html?card=${req.params.card}`
  });
});

router.put('/cards/:card', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/cards/:card', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin card details page',
    redirect: `${frontendUrl()}/admin/cards.html?card=${req.params.card}`
  });
});

router.post('/cards/:card/approve', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/cards/:card/reject', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/cards/:card/freeze', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/cards/:card/unfreeze', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/cards/:card/cancel', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/cards/:card/fund', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/cards/:card/debit', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== BIDS =====================

router.get('/bids', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin bids page',
    redirect: `${frontendUrl()}/admin/bids.html`
  });
});

router.post('/bids/:bid/approve', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/bids/:bid/reject', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== PRE-IPO =====================

router.get('/pre-ipo', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo page',
    redirect: `${frontendUrl()}/admin/pre-ipo.html`
  });
});

router.get('/pre-ipo/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo create page',
    redirect: `${frontendUrl()}/admin/pre-ipo-create.html`
  });
});

router.post('/pre-ipo', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/pre-ipo/all/holdings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo all holdings page',
    redirect: `${frontendUrl()}/admin/pre-ipo-holdings.html`
  });
});

router.get('/pre-ipo/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo details page',
    redirect: `${frontendUrl()}/admin/pre-ipo.html?id=${req.params.id}`
  });
});

router.get('/pre-ipo/:id/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo edit page',
    redirect: `${frontendUrl()}/admin/pre-ipo-edit.html?id=${req.params.id}`
  });
});

router.put('/pre-ipo/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/pre-ipo/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/pre-ipo/:id/status', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/pre-ipo/:id/price', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/pre-ipo/:id/holdings', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo holdings page',
    redirect: `${frontendUrl()}/admin/pre-ipo-holdings.html?id=${req.params.id}`
  });
});

router.get('/pre-ipo/:id/price-history', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin pre-ipo price history page',
    redirect: `${frontendUrl()}/admin/pre-ipo-price-history.html?id=${req.params.id}`
  });
});

// ===================== STOCK SHARES =====================

router.get('/stock-shares', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin stock shares page',
    redirect: `${frontendUrl()}/admin/stock-shares.html`
  });
});

router.get('/stock-shares/trades', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin stock shares trades page',
    redirect: `${frontendUrl()}/admin/stock-shares-trades.html`
  });
});

router.get('/stock-shares/user/:userId', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin stock shares user positions page',
    redirect: `${frontendUrl()}/admin/stock-shares-user.html?userId=${req.params.userId}`
  });
});

router.post('/stock-shares/positions', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/stock-shares/positions/:id/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin stock shares position edit page',
    redirect: `${frontendUrl()}/admin/stock-shares-positions-edit.html?id=${req.params.id}`
  });
});

router.put('/stock-shares/positions/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/stock-shares/positions/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ===================== CLEAR CACHE =====================

router.get('/dashboard/clearcache', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin clear cache page',
    redirect: `${frontendUrl()}/admin/clearcache.html`
  });
});

// ===================== REAL ESTATE =====================

router.get('/real-estate', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin real estate page',
    redirect: `${frontendUrl()}/admin/real-estate.html`
  });
});

router.get('/real-estate/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin real estate create page',
    redirect: `${frontendUrl()}/admin/real-estate-create.html`
  });
});

router.post('/real-estate', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/real-estate/investments', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin real estate investments page',
    redirect: `${frontendUrl()}/admin/real-estate-investments.html`
  });
});

router.get('/real-estate/:id/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin real estate edit page',
    redirect: `${frontendUrl()}/admin/real-estate-edit.html?id=${req.params.id}`
  });
});

router.post('/real-estate/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/real-estate/:id/delete', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin real estate delete page',
    redirect: `${frontendUrl()}/admin/real-estate.html?delete=${req.params.id}`
  });
});

// ===================== CLOUD MINING =====================

router.get('/mining/plans', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mining plans page',
    redirect: `${frontendUrl()}/admin/mining-plans.html`
  });
});

router.get('/mining/plans/create', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mining plans create page',
    redirect: `${frontendUrl()}/admin/mining-plans-create.html`
  });
});

router.post('/mining/plans', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/mining/plans/:id/edit', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mining plans edit page',
    redirect: `${frontendUrl()}/admin/mining-plans-edit.html?id=${req.params.id}`
  });
});

router.put('/mining/plans/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/mining/plans/:id', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/mining/subscriptions', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend admin mining subscriptions page',
    redirect: `${frontendUrl()}/admin/mining-subscriptions.html`
  });
});

router.post('/mining/subscriptions/:id/adjust', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/mining/subscriptions/:id/settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/mining/subscriptions/bulk-settle', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});



router.get('/all-wallets', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend all wallets page',
    redirect: `${frontendUrl()}/admin/wallets.html`
  });
});

router.get('/all-wallets/data', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/add-wallet', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend add wallet page',
    redirect: `${frontendUrl()}/admin/add-wallet.html`
  });
});

router.post(
  '/add-wallet',
  uploadWallet.fields([
    { name: 'btc_image', maxCount: 1 },
    { name: 'eth_image', maxCount: 1 },
    { name: 'usdt_image', maxCount: 1 },
    { name: 'usdc_image', maxCount: 1 },
    { name: 'cashapp_image', maxCount: 1 },
    { name: 'paypal_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

router.get('/edit-wallet/:id', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Use the frontend edit wallet page',
    redirect: `${frontendUrl()}/admin/edit-wallet.html?id=${req.params.id}`
  });
});

router.get('/edit-wallet/:id/data', async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post(
  '/edit-wallet/:id',
  uploadWallet.fields([
    { name: 'btc_image', maxCount: 1 },
    { name: 'eth_image', maxCount: 1 },
    { name: 'usdt_image', maxCount: 1 },
    { name: 'usdc_image', maxCount: 1 },
    { name: 'cashapp_image', maxCount: 1 },
    { name: 'paypal_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

router.post('/delete-wallet/:id', async (req, res) => {
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

/* ---------------- ADMIN: plans ---------------- */
router.get('/dashboard/feature/plans',async(req,res)=>res.json({success:true,plans:await FeaturePlans.find().sort({createdAt:1}).lean()}));

router.get('/dashboard/feature/plans/:id',async(req,res)=>{const p=await FeaturePlans.findById(req.params.id).lean();
if(!p)return res.status(404).json({success:false,message:'Plan not found.'});
return res.json({success:true,plan:p});
});

router.post('/dashboard/feature/plans',async(req,res)=>{const b=req.body;
const p=await FeaturePlans.create({name:String(b.name||'').trim(),price:featureNum(b.price),min:featureNum(b.min_price??b.min),max:featureNum(b.max_price??b.max),min_price:featureNum(b.min_price??b.min),max_price:featureNum(b.max_price??b.max),min_return:featureNum(b.minr??b.min_return),max_return:featureNum(b.maxr??b.max_return),minr:featureNum(b.minr),maxr:featureNum(b.maxr),duration:featureNum(b.duration,30),expiration:String(b.expiration||`${featureNum(b.duration,30)} Days`),return:featureNum(b.return??b.increment_amount),type:String(b.type||'Main'),status:featureBool(b.status===undefined?true:b.status)?'active':'inactive',tag:String(b.tag||''),icon:String(b.icon||'chart-bar'),increment_interval:String(b.t_interval||b.increment_interval||'Daily'),increment_type:String(b.t_type||b.increment_type||'Percentage'),increment_amount:featureNum(b.t_amount??b.increment_amount??b.return),gift:featureNum(b.gift)});
return featureLocalRedirect(res,'/admin/plans.html','Plan created successfully.',{plan:p});
});

router.put('/dashboard/feature/plans/:id',async(req,res)=>{const p=await FeaturePlans.findById(req.params.id);
if(!p)return res.status(404).json({success:false,message:'Plan not found.'});
const b=req.body;
Object.assign(p,{name:String(b.name||p.name).trim(),price:featureNum(b.price,p.price),min:featureNum(b.min_price??b.min,p.min),max:featureNum(b.max_price??b.max,p.max),min_price:featureNum(b.min_price??b.min,p.min_price),max_price:featureNum(b.max_price??b.max,p.max_price),minr:featureNum(b.minr,p.minr),maxr:featureNum(b.maxr,p.maxr),min_return:featureNum(b.minr??b.min_return,p.min_return),max_return:featureNum(b.maxr??b.max_return,p.max_return),duration:featureNum(b.duration,p.duration),expiration:String(b.expiration||p.expiration),status:featureBool(b.status===undefined?p.status:b.status)?'active':'inactive',tag:String(b.tag??p.tag),increment_interval:String(b.t_interval||b.increment_interval||p.increment_interval),increment_type:String(b.t_type||b.increment_type||p.increment_type),increment_amount:featureNum(b.t_amount??b.increment_amount??b.return,p.increment_amount),return:featureNum(b.return??b.increment_amount,p.return),gift:featureNum(b.gift,p.gift)});
await p.save();
return featureLocalRedirect(res,'/admin/plans.html','Plan Successfully Updated',{plan:p});
});

router.delete('/dashboard/feature/plans/:id',async(req,res)=>{await FeaturePlans.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/plans.html','Investment Plan deleted Successfully!');
});

/* ---------------- ADMIN: wallet ---------------- */
router.get('/dashboard/feature/wallet-settings',async(req,res)=>res.json({success:true,settings:await featureEnsureWalletSettings()}));

router.put('/dashboard/feature/wallet-settings',async(req,res)=>{let s=await featureEnsureWalletSettings();
s.min_balance=featureNum(req.body.min_balance,s.min_balance);
s.daily_reward=featureNum(req.body.min_return??req.body.daily_reward,s.daily_reward);
s.wallet_status=['on','off'].includes(String(req.body.wallet_status).toLowerCase())?String(req.body.wallet_status).toLowerCase():s.wallet_status;
await s.save();
return featureLocalRedirect(res,'/admin/mwalletsettings.html','Wallet settings updated successfully.');
});

router.get('/dashboard/feature/wallet-connections',async(req,res)=>res.json({success:true,wallets:await FeatureWalletConnection.find().populate('user_id','name email').sort({createdAt:-1}).lean()}));

router.delete('/dashboard/feature/wallet-connections/:id',async(req,res)=>{await FeatureWalletConnection.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/mwalletconnect.html','Wallet deleted Sucessful!');
});

router.get('/dashboard/feature/user/:id/wallet-status',async(req,res)=>{const u=await User.findById(req.params.id).lean();
if(!u)return res.status(404).json({success:false,message:'User not found.'});
return res.json({success:true,connectWallet:u.connectWallet!==undefined?!!u.connectWallet:u.wallet_connect_status!=='off'});
});

router.put('/dashboard/feature/user/:id/wallet-status',async(req,res)=>{const u=await User.findById(req.params.id);
if(!u)return res.status(404).json({success:false,message:'User not found.'});
const on=featureBool(req.body.enabled);
u.connectWallet=on;
u.wallet_connect_status=on?'on':'off';
await u.save();
return res.json({success:true,message:`Wallet Connect ${on?'enabled':'disabled'}.`,connectWallet:on});
});

router.get('/dashboard/feature/user/:id/investments',async(req,res)=>{const rows=await FeatureUserPlans.find({user:req.params.id,active:'yes'}).populate('plan').sort({createdAt:-1}).lean();
return res.json({success:true,investments:rows});
});

/* ---------------- ADMIN: cards ---------------- */
router.get('/dashboard/feature/cards',async(req,res)=>{const types=await FeatureCardType.find().sort({createdAt:-1}).lean();
const cards=await FeatureCard.find().populate('user_id','name email').populate('card_type_id').sort({createdAt:-1}).lean();
return res.json({success:true,types,cards,stats:{pending:cards.filter(x=>x.status==='pending').length,active:cards.filter(x=>x.status==='active').length,frozen:cards.filter(x=>x.status==='frozen').length,types:types.length}});
});

router.get('/dashboard/feature/card-types/:id',async(req,res)=>{const t=await FeatureCardType.findById(req.params.id).lean();
if(!t)return res.status(404).json({success:false,message:'Card type not found.'});
return res.json({success:true,type:t});
});

router.post('/dashboard/feature/card-types',async(req,res)=>{const b=req.body;
const t=await FeatureCardType.create({name:String(b.name||'').trim(),type:String(b.type||'Physical'),network:String(b.network||'Visa'),fee:featureNum(b.fee),issuance_fee:featureNum(b.fee),delivery_days:featureNum(b.delivery_days),description:String(b.description||''),is_active:featureBool(b.is_active)});
return featureLocalRedirect(res,'/admin/admin-cards.html','Card type created successfully.',{type:t});
});

router.put('/dashboard/feature/card-types/:id',async(req,res)=>{const t=await FeatureCardType.findById(req.params.id);
if(!t)return res.status(404).json({success:false,message:'Card type not found.'});
const b=req.body;
Object.assign(t,{name:String(b.name??t.name),type:String(b.type??t.type),network:String(b.network??t.network),fee:featureNum(b.fee,t.fee),issuance_fee:featureNum(b.fee,t.issuance_fee),delivery_days:featureNum(b.delivery_days,t.delivery_days),description:String(b.description??t.description),is_active:featureBool(b.is_active===undefined?t.is_active:b.is_active)});
await t.save();
return featureLocalRedirect(res,'/admin/admin-cards.html','Card type updated successfully.');
});

router.post('/dashboard/feature/card-types/:id/toggle',async(req,res)=>{const t=await FeatureCardType.findById(req.params.id);
if(!t)return res.status(404).json({success:false,message:'Card type not found.'});
t.is_active=!t.is_active;
await t.save();
return featureLocalRedirect(res,'/admin/admin-cards.html',`Card type ${t.is_active?'enabled':'disabled'}.`);
});

router.delete('/dashboard/feature/card-types/:id',async(req,res)=>{await FeatureCardType.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/admin-cards.html','Card type deleted successfully.');
});

router.get('/dashboard/feature/cards/:id',async(req,res)=>{const c=await FeatureCard.findById(req.params.id).populate('user_id','name email currency_code').populate('card_type_id').lean();
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
return res.json({success:true,card:c});
});


function cardNumber(){return Array.from({length:16},()=>crypto.randomInt(0,10)).join('');
}

function cvv(){return String(crypto.randomInt(0,1000)).padStart(3,'0');
}
router.post('/dashboard/feature/cards/:id/approve',async(req,res)=>{const c=await FeatureCard.findById(req.params.id).populate('user_id').populate('card_type_id');
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
if(c.status!=='pending')return res.status(409).json({success:false,message:'Card is not pending.'});
const fee=featureNum(c.card_type_id?.fee??c.card_type_id?.issuance_fee);
if(fee>featureNum(c.user_id.account_bal))return res.status(422).json({success:false,message:'User balance is insufficient for the card fee.'});
if(fee){c.user_id.account_bal-=fee;
await c.user_id.save();
await FeatureCardTransaction.create({card_id:c._id,user_id:c.user_id._id,amount:-fee,type:'card_fee',narration:'Card issuance fee',status:'processed'});
}const now=new Date();
c.card_number=cardNumber();
c.cvv=cvv();
c.expiry_month=now.getMonth()+1;
c.expiry_year=now.getFullYear()+3;
c.issued_at=now;
c.expires_at=new Date(now.getFullYear()+3,now.getMonth(),now.getDate());
c.activated_at=now;
c.status='active';
await c.save();
await featureNotifyUser(c.user_id,'account','Card Approved',`Your ${c.card_type_id.name} card has been approved and is now active.`,'/user/notification.html',{icon:'bell'});
try { const { sendPushToUser } = require('../utils/pushNotifications'); await sendPushToUser(c.user_id, { title: 'Card Approved', body: `Your ${c.card_type_id.name} card has been approved and is now active.`, url: '/user/cards.html', tag: 'card-approved' }); } catch (error) { console.error('Push notification failed:', error.message); }
return featureLocalRedirect(res,'/admin/cards-view.html?id='+c._id,'card approved and issued successfully');
});

router.post('/dashboard/feature/cards/:id/reject',async(req,res)=>{const c=await FeatureCard.findById(req.params.id).populate('user_id').populate('card_type_id');
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
c.status='rejected';
await c.save();
await featureNotifyUser(c.user_id,'account','Card Rejected',`Your ${c.card_type_id.name} card application was rejected.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/admin/cards-view.html?id='+c._id,'Card application rejected.');
});

router.post('/dashboard/feature/cards/:id/freeze',async(req,res)=>{const c=await FeatureCard.findById(req.params.id);
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
c.status='frozen';
c.blocked_at=new Date();
c.block_reason=String(req.body.reason||'');
await c.save();
return featureLocalRedirect(res,'/admin/cards-view.html?id='+c._id,'Card frozen.');
});

router.post('/dashboard/feature/cards/:id/unfreeze',async(req,res)=>{const c=await FeatureCard.findById(req.params.id);
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
c.status='active';
c.blocked_at=null;
c.block_reason=null;
await c.save();
return featureLocalRedirect(res,'/admin/cards-view.html?id='+c._id,'Card unfrozen and set to active.');
});

router.post('/dashboard/feature/cards/:id/cancel',async(req,res)=>{const c=await FeatureCard.findById(req.params.id);
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
c.status='cancelled';
await c.save();
return featureLocalRedirect(res,'/admin/cards-view.html?id='+c._id,'Card cancelled.');
});

router.put('/dashboard/feature/cards/:id',async(req,res)=>{const c=await FeatureCard.findById(req.params.id);
if(!c)return res.status(404).json({success:false,message:'Card not found.'});
for(const k of ['card_holder','card_number','expiry_month','expiry_year','cvv','status'])if(req.body[k]!==undefined)c[k]=req.body[k];
if(req.body.balance!==undefined)c.balance=featureNum(req.body.balance);
await c.save();
return featureLocalRedirect(res,'/admin/cards-view.html?id='+c._id,'Card details updated successfully.');
});

/* ---------------- ADMIN: experts ---------------- */
router.get('/dashboard/feature/experts',async(req,res)=>res.json({success:true,experts:await FeatureExpert.find().sort({createdAt:-1}).lean()}));

router.get('/dashboard/feature/experts/:id',async(req,res)=>{const e=await FeatureExpert.findById(req.params.id).lean();
if(!e)return res.status(404).json({success:false,message:'Expert not found.'});
return res.json({success:true,expert:e,positions:await FeatureCopyPosition.find({expert_id:e._id}).populate('user_id','name email').sort({createdAt:-1}).lean()});
});

router.post('/dashboard/feature/experts', uploadCopyTrader.single('profile_picture'), async(req,res)=>{const b=req.body;
const pic=cloudUrl(req.file)||String(b.profile_picture||'');
const e=await FeatureExpert.create({name:String(b.name||'').trim(),area_of_expertise:String(b.area_of_expertise||''),bio:String(b.bio||''),profile_picture:pic,daily_roi:featureNum(b.daily_roi),duration_days:featureNum(b.duration_days,30),win_rate:featureNum(b.win_rate),min_startup_capital:featureNum(b.min_startup_capital),max_capital:featureNum(b.max_capital),profit_share_percentage:featureNum(b.profit_share_percentage),followers_count:featureNum(b.followers_count),total_roi:featureNum(b.total_roi),is_active:featureBool(b.is_active===undefined?true:b.is_active)});
return featureLocalRedirect(res,'/admin/admin-experts.html','Expert created successfully.',{expert:e});
});

router.put('/dashboard/feature/experts/:id', uploadCopyTrader.single('profile_picture'), async(req,res)=>{const e=await FeatureExpert.findById(req.params.id);
if(!e)return res.status(404).json({success:false,message:'Expert not found.'});
for(const k of ['name','area_of_expertise','bio'])if(req.body[k]!==undefined)e[k]=String(req.body[k]);
if(req.file) e.profile_picture=cloudUrl(req.file);
else if(req.body.profile_picture!==undefined) e.profile_picture=String(req.body.profile_picture);
for(const k of ['daily_roi','duration_days','win_rate','min_startup_capital','max_capital','profit_share_percentage','followers_count','total_roi'])if(req.body[k]!==undefined)e[k]=featureNum(req.body[k]);
if(req.body.is_active!==undefined)e.is_active=featureBool(req.body.is_active);
await e.save();
return featureLocalRedirect(res,'/admin/admin-experts.html','Expert updated successfully.');
});

router.post('/dashboard/feature/experts/:id/toggle',async(req,res)=>{const e=await FeatureExpert.findById(req.params.id);
if(!e)return res.status(404).json({success:false,message:'Expert not found.'});
e.is_active=!e.is_active;
await e.save();
return featureLocalRedirect(res,'/admin/admin-experts.html',`Expert ${e.is_active?'enabled':'disabled'}.`);
});

router.delete('/dashboard/feature/experts/:id',async(req,res)=>{await FeatureExpert.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/admin-experts.html','Expert deleted successfully.');
});

/* ---------------- ADMIN: bots ---------------- */

router.get('/dashboard/feature/copy-positions',async(req,res)=>{
  const positions=await FeatureCopyPosition.find().populate('user_id','name email').populate('expert_id').populate('expert').sort({createdAt:-1}).lean();
  const active=positions.filter(x=>x.status==='active');
  const settled=positions.filter(x=>['settled','completed','stopped'].includes(x.status));
  return res.json({success:true,positions,stats:{
    activeCopies:active.length,
    totalInvested:positions.reduce((s,x)=>s+featureNum(x.invested_amount),0),
    totalProfit:positions.reduce((s,x)=>s+featureNum(x.accumulated_profit||x.current_profit),0),
    settledPositions:settled.length
  }});
});
router.get('/dashboard/feature/copy-positions/:id',async(req,res)=>{
  const p=await FeatureCopyPosition.findById(req.params.id).populate('user_id','name email currency_code').populate('expert_id').populate('expert').lean();
  if(!p)return res.status(404).json({success:false,message:'Position not found.'});
  if(p.status==='active'){ const full=await FeatureCopyPosition.findById(p._id); await featureAccrueCopyPosition(full); }
  const fresh=await FeatureCopyPosition.findById(req.params.id).populate('user_id','name email currency_code').populate('expert_id').populate('expert').lean();
  return res.json({success:true,position:fresh});
});
router.post('/dashboard/feature/copy-positions/:id/adjust',async(req,res)=>{
  const p=await FeatureCopyPosition.findById(req.params.id);
  if(!p)return res.status(404).json({success:false,message:'Position not found.'});
  p.admin_profit_adjustment=featureNum(req.body.admin_profit_adjustment);
  p.admin_notes=String(req.body.admin_notes||p.admin_notes||'');
  await p.save();
  return featureLocalRedirect(res,'/admin/viewUser-copy-trades.html?id='+p._id,'Profit adjustment saved');
});
router.post('/dashboard/feature/copy-positions/:id/force-stop',async(req,res)=>{
  const p=await FeatureCopyPosition.findById(req.params.id).populate('user_id');
  if(!p)return res.status(404).json({success:false,message:'Position not found.'});
  if(p.status!=='active')return res.status(409).json({success:false,message:'Position is not active.'});
  await featureAccrueCopyPosition(p);
  p.status='stopped'; p.stopped_at=new Date(); await p.save();
  return featureLocalRedirect(res,'/admin/viewUser-copy-trades.html?id='+p._id,'Position force-stopped.');
});
router.post('/dashboard/feature/copy-positions/:id/settle',async(req,res)=>{
  const p=await FeatureCopyPosition.findById(req.params.id).populate('user_id').populate('expert_id').populate('expert');
  if(!p)return res.status(404).json({success:false,message:'Position not found.'});
  if(p.status==='settled')return res.status(409).json({success:false,message:'Already settled.'});
  if(p.status==='active') await featureAccrueCopyPosition(p);
  const payout=featureNum(p.invested_amount)+featureNum(p.accumulated_profit)+featureNum(p.admin_profit_adjustment);
  if(p.user_id){ p.user_id.account_bal=featureNum(p.user_id.account_bal)+payout; await p.user_id.save(); }
  p.status='settled'; p.settled_at=new Date(); p.settled_by='admin'; await p.save();
  try{ await featureNotifyUser(p.user_id,'copy_trade','Copy Position Settled',`Your copy position has been settled. $${payout.toFixed(2)} credited.`,'/user/notification.html',{icon:'bell'}); }catch(e){}
  return featureLocalRedirect(res,'/admin/viewUser-copy-trades.html?id='+p._id,`Position settled. $${payout.toFixed(2)} credited to user.`);
});

router.get('/dashboard/feature/bots',async(req,res)=>{const bots=await FeatureTradingBot.find().sort({createdAt:-1}).lean();
const subs=await FeatureBotSubscription.find().populate('bot_id').populate('user_id','name email').sort({createdAt:-1}).lean();
return res.json({success:true,bots,subscriptions:subs,stats:{totalBots:bots.length,activeBots:bots.filter(x=>x.is_active).length,activeSubscribers:subs.filter(x=>x.status==='active').length,totalInvested:subs.reduce((s,x)=>s+featureNum(x.invested_amount),0),totalProfit:subs.reduce((s,x)=>s+featureNum(x.current_profit),0),settled:subs.filter(x=>x.status==='settled').length}});
});

router.get('/dashboard/feature/bots/:id',async(req,res)=>{const b=await FeatureTradingBot.findById(req.params.id).lean();
if(!b)return res.status(404).json({success:false,message:'Bot not found.'});
return res.json({success:true,bot:b});
});

router.post('/dashboard/feature/bots',async(req,res)=>{const b=req.body;
const bot=await FeatureTradingBot.create({name:String(b.name||''),strategy_type:String(b.strategy_type||'Scalping'),description:String(b.description||''),win_rate:featureNum(b.win_rate),expected_roi:featureNum(b.expected_roi),trade_interval_minutes:featureNum(b.trade_interval_minutes,60),min_investment:featureNum(b.min_investment),max_investment:featureNum(b.max_investment),max_duration_days:featureNum(b.max_duration_days,30),profit_min_pct:featureNum(b.profit_min_pct),profit_max_pct:featureNum(b.profit_max_pct),loss_min_pct:featureNum(b.loss_min_pct),loss_max_pct:featureNum(b.loss_max_pct),is_active:featureBool(b.is_active)});
return featureLocalRedirect(res,'/admin/admin-bot-trading.html','Trading bot created successfully.');
});

router.put('/dashboard/feature/bots/:id',async(req,res)=>{const b=await FeatureTradingBot.findById(req.params.id);
if(!b)return res.status(404).json({success:false,message:'Bot not found.'});
for(const k of ['name','strategy_type','description'])if(req.body[k]!==undefined)b[k]=String(req.body[k]);
for(const k of ['win_rate','expected_roi','trade_interval_minutes','min_investment','max_investment','max_duration_days','profit_min_pct','profit_max_pct','loss_min_pct','loss_max_pct'])if(req.body[k]!==undefined)b[k]=featureNum(req.body[k]);
if(req.body.is_active!==undefined)b.is_active=featureBool(req.body.is_active);
await b.save();
return featureLocalRedirect(res,'/admin/admin-bot-trading.html','Trading bot updated successfully.');
});

router.post('/dashboard/feature/bots/:id/toggle',async(req,res)=>{const b=await FeatureTradingBot.findById(req.params.id);
if(!b)return res.status(404).json({success:false,message:'Bot not found.'});
b.is_active=!b.is_active;
await b.save();
return featureLocalRedirect(res,'/admin/admin-bot-trading.html',`Bot ${b.is_active?'enabled':'disabled'}.`);
});

router.delete('/dashboard/feature/bots/:id',async(req,res)=>{await FeatureTradingBot.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/admin-bot-trading.html','bot-trade deleted successfully.');
});

router.get('/dashboard/feature/bot-subscriptions',async(req,res)=>res.json({success:true,subscriptions:await FeatureBotSubscription.find().populate('bot_id').populate('user_id','name email').sort({createdAt:-1}).lean()}));

router.get('/dashboard/feature/bot-subscriptions/:id',async(req,res)=>{const s=await FeatureBotSubscription.findById(req.params.id).populate('bot_id').populate('user_id','name email').lean();
if(!s)return res.status(404).json({success:false,message:'Subscription not found.'});
return res.json({success:true,subscription:s});
});

router.put('/dashboard/feature/bot-subscriptions/:id/adjust',async(req,res)=>{const s=await FeatureBotSubscription.findById(req.params.id);
if(!s)return res.status(404).json({success:false,message:'Subscription not found.'});
s.admin_profit_adjustment=featureNum(req.body.admin_profit_adjustment);
s.admin_notes=String(req.body.admin_notes||'');
await s.save();
return featureLocalRedirect(res,'/admin/bot-trading-subscriptions-view.html?id='+s._id,'Profit adjustment saved.');
});

router.post('/dashboard/feature/bot-subscriptions/:id/settle',async(req,res)=>{const s=await FeatureBotSubscription.findById(req.params.id).populate('user_id').populate('bot_id');
if(!s)return res.status(404).json({success:false,message:'Subscription not found.'});
if(s.status==='settled')return res.status(409).json({success:false,message:'Subscription already settled.'});
await featureAccrueBot(s);
const payout=featureNum(s.invested_amount)+featureNum(s.current_profit)+featureNum(s.admin_profit_adjustment);
s.status='settled';
s.settled_at=new Date();
await s.save();
s.user_id.account_bal+=payout;
await s.user_id.save();
await featureNotifyUser(s.user_id,'trade','Bot Subscription Settled',`Your bot subscription has been settled. $${payout.toFixed(2)} has been credited to your balance.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/admin/bot-trading-subscriptions-view.html?id='+s._id,`Subscription settled. $${payout.toFixed(2)} credited to user.`);
});

/* ---------------- ADMIN: assets ---------------- */
router.get('/dashboard/feature/assets',async(req,res)=>res.json({success:true,assets:await FeatureTradingAsset.find().sort({asset_class:1,name:1}).lean(),users:await User.find({}).select('_id name email').sort({name:1}).lean()}));

router.post('/dashboard/feature/assets/refresh',async(req,res)=>{
  try{
    const result=await refreshAllAssets({
      activeOnly:req.body?.activeOnly!==false,
      assetClass: req.body?.asset_class || req.body?.assetClass || req.query?.asset_class || null
    });
    // Always 200 with payload so frontend can show toast (avoid axios 502 for partial provider failures)
    return res.status(200).json({
      success: Boolean(result.success),
      message: result.message || (result.updated ? `Updated ${result.updated} assets.` : 'Price refresh finished with no updates.'),
      updated: result.updated||0,
      failed: result.failed||0,
      total: result.total||0,
      results: result.results||[],
      failedAssets: result.failedAssets||[],
      refreshed_at: result.refreshed_at
    });
  }catch(error){
    console.error('assets/refresh error:', error);
    return res.status(500).json({success:false,message:error.message||'Price refresh failed'});
  }
});

router.post('/dashboard/feature/assets/:id/refresh',async(req,res)=>{
  try{
    const asset=await refreshAsset(req.params.id);
    return res.json({success:true,message:`${asset.symbol} price refreshed successfully.`,asset});
  }catch(error){
    const status=error.message==='Asset not found.'?404:400;
    return res.status(status).json({success:false,message:error.message});
  }
});

router.get('/dashboard/feature/assets/:id',async(req,res)=>{const a=await FeatureTradingAsset.findById(req.params.id).lean();
if(!a)return res.status(404).json({success:false,message:'Asset not found.'});
return res.json({success:true,asset:a});
});

router.post('/dashboard/feature/assets',async(req,res)=>{const b=req.body;
const source=String(b.data_source||'manual').toLowerCase();
const coingeckoId=String(b.coingecko_id||'').trim();
const twelvedataSymbol=String(b.twelvedata_symbol||'').trim();
const externalId=String(b.external_id||coingeckoId||twelvedataSymbol||'').trim();
const a=await FeatureTradingAsset.create({name:String(b.name||''),symbol:String(b.symbol||'').toUpperCase(),asset_class:String(b.asset_class||'crypto').toLowerCase(),price:featureNum(b.price),price_change_pct_24h:featureNum(b.change_24h),change_24h:featureNum(b.change_24h),is_active:featureBool(b.is_active===undefined?true:b.is_active),external_id:externalId,coingecko_id:coingeckoId,twelvedata_symbol:twelvedataSymbol,data_source:source,logo_url:String(b.logo_url||'')});
return featureLocalRedirect(res,'/admin/assets.html',`${a.symbol} created successfully`);
});

router.put('/dashboard/feature/assets/:id',async(req,res)=>{const a=await FeatureTradingAsset.findById(req.params.id);
if(!a)return res.status(404).json({success:false,message:'Asset not found.'});
for(const k of ['name','external_id','data_source','logo_url','coingecko_id','twelvedata_symbol'])if(req.body[k]!==undefined)a[k]=String(req.body[k]);
if(req.body.symbol!==undefined)a.symbol=String(req.body.symbol).toUpperCase();
if(req.body.asset_class!==undefined)a.asset_class=String(req.body.asset_class).toLowerCase();
for(const k of ['price','change_24h','price_change_pct_24h'])if(req.body[k]!==undefined)a[k]=featureNum(req.body[k]);
if(req.body.is_active!==undefined)a.is_active=featureBool(req.body.is_active);
await a.save();
return featureLocalRedirect(res,'/admin/edit-assets.html?id='+a._id,`${a.symbol} updated successfully.`);
});

router.post('/dashboard/feature/assets/:id/toggle',async(req,res)=>{const a=await FeatureTradingAsset.findById(req.params.id);
if(!a)return res.status(404).json({success:false,message:'Asset not found.'});
a.is_active=!a.is_active;
await a.save();
return featureLocalRedirect(res,'/admin/assets.html',`${a.symbol} ${a.is_active?'enabled':'disabled'}.`);
});

router.delete('/dashboard/feature/assets/:id',async(req,res)=>{await FeatureTradingAsset.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/assets.html','Asset deleted successfully.');
});

/* ---------------- ADMIN: mining ---------------- */
router.get('/dashboard/feature/mining-plans',async(req,res)=>{
const plans=await FeatureMiningPlan.find().sort({sort_order:1,createdAt:1}).lean();
const subs=await FeatureMiningSubscription.find().lean();
const plansWithCounts=plans.map(p=>{
  const count=subs.filter(s=>String(s.mining_plan_id)===String(p._id)).length;
  return {...p, subscribers:count, subscriber_count:count};
});
return res.json({success:true,plans:plansWithCounts,stats:{totalPlans:plans.length,activePlans:plans.filter(x=>x.is_active).length,activeSubscribers:subs.filter(x=>x.status==='active').length,totalInvested:subs.filter(x=>x.status==='active').reduce((s,x)=>s+featureNum(x.invested_amount),0)}});
});

router.get('/dashboard/feature/mining-plans/:id',async(req,res)=>{const p=await FeatureMiningPlan.findById(req.params.id).lean();
if(!p)return res.status(404).json({success:false,message:'Mining plan not found.'});
return res.json({success:true,plan:p});
});

router.post('/dashboard/feature/mining-plans',async(req,res)=>{const b=req.body;
const p=await FeatureMiningPlan.create({name:String(b.name||''),hashrate:String(b.hashrate||''),description:String(b.description||''),daily_roi_percentage:featureNum(b.daily_roi_percentage),duration_days:featureNum(b.duration_days,30),sort_order:featureNum(b.sort_order),min_investment:featureNum(b.min_investment),max_investment:featureNum(b.max_investment),icon_color:String(b.icon_color||''),is_active:featureBool(b.is_active)});
return featureLocalRedirect(res,'/admin/mining-plans.html','mining plan created successfully');
});

router.put('/dashboard/feature/mining-plans/:id',async(req,res)=>{const p=await FeatureMiningPlan.findById(req.params.id);
if(!p)return res.status(404).json({success:false,message:'Mining plan not found.'});
for(const k of ['name','hashrate','description','icon_color'])if(req.body[k]!==undefined)p[k]=String(req.body[k]);
for(const k of ['daily_roi_percentage','duration_days','sort_order','min_investment','max_investment'])if(req.body[k]!==undefined)p[k]=featureNum(req.body[k]);
if(req.body.is_active!==undefined)p.is_active=featureBool(req.body.is_active);
await p.save();
return featureLocalRedirect(res,'/admin/mining-plans.html','mining plan updated successfully');
});

router.post('/dashboard/feature/mining-plans/:id/toggle',async(req,res)=>{const p=await FeatureMiningPlan.findById(req.params.id);
if(!p)return res.status(404).json({success:false,message:'Mining plan not found.'});
p.is_active=!p.is_active;
await p.save();
return featureLocalRedirect(res,'/admin/mining-plans.html','Mining plan status updated.');
});

router.delete('/dashboard/feature/mining-plans/:id',async(req,res)=>{await FeatureMiningPlan.findByIdAndDelete(req.params.id);
return featureLocalRedirect(res,'/admin/mining-plans.html','mining plan deleted successfully');
});

router.get('/dashboard/feature/mining-subscriptions',async(req,res)=>{const subs=await FeatureMiningSubscription.find().populate('user_id','name username email').populate('mining_plan_id').sort({createdAt:-1}).lean();
return res.json({success:true,subscriptions:subs,stats:{active:subs.filter(x=>x.status==='active').length,totalInvested:subs.filter(x=>x.status==='active').reduce((s,x)=>s+featureNum(x.invested_amount),0),totalProfit:subs.reduce((s,x)=>s+featureNum(x.accumulated_profit),0),settled:subs.filter(x=>x.status==='settled').length}});
});

router.post('/dashboard/feature/mining-subscriptions/:id/settle',async(req,res)=>{const s=await FeatureMiningSubscription.findById(req.params.id).populate('user_id').populate('mining_plan_id');
if(!s)return res.status(404).json({success:false,message:'Subscription not found.'});
if(s.status==='settled')return res.status(409).json({success:false,message:'Subscription already settled.'});
await featureAccrueMining(s);
const payout=featureNum(s.invested_amount)+featureNum(s.accumulated_profit)+featureNum(s.admin_profit_adjustment);
s.status='settled';
s.settled_at=new Date();
await s.save();
s.user_id.account_bal+=payout;
await s.user_id.save();
await featureNotifyUser(s.user_id,'trade','Mining Settled',`Your mining subscription has been settled. $${payout.toFixed(2)} has been credited to your balance.`,'/user/notification.html',{icon:'bell'});
return featureLocalRedirect(res,'/admin/mining-subscriptions.html',`Subscription settled. $${payout.toFixed(2)} credited to user.`);
});

router.put('/dashboard/feature/mining-subscriptions/:id/adjust',async(req,res)=>{const s=await FeatureMiningSubscription.findById(req.params.id);
if(!s)return res.status(404).json({success:false,message:'Subscription not found.'});
s.admin_profit_adjustment=featureNum(req.body.admin_profit_adjustment);
s.admin_notes=String(req.body.admin_notes||'');
await s.save();
return featureLocalRedirect(res,'/admin/mining-subscriptions.html','Profit adjustment saved.');
});

/* ---------------- ADMIN: trades ---------------- */
const FeatureTrade = require('../models/livetradingSchema');

router.get('/dashboard/feature/trades',async(req,res)=>{const filter={};
if(req.query.type&&req.query.type!=='All')filter.asset_type=req.query.type;
if(req.query.status&&['open','closed'].includes(String(req.query.status).toLowerCase()))filter.status=String(req.query.status).toLowerCase();
const trades=await FeatureTrade.find(filter).populate('user_id','name email').populate('trading_asset_id').sort({createdAt:-1}).lean();
return res.json({success:true,trades,users:await User.find({}).select('_id name email').sort({name:1}).lean(),assets:await FeatureTradingAsset.find({is_active:true}).sort({name:1}).lean()});
});

router.get('/dashboard/feature/trades/:id',async(req,res)=>{const t=await FeatureTrade.findById(req.params.id).populate('user_id','name email').populate('trading_asset_id').lean();
if(!t)return res.status(404).json({success:false,message:'FeatureTrade not found.'});
return res.json({success:true,trade:t});
});

router.post('/dashboard/feature/trades',async(req,res)=>{const b=req.body;
const t=await FeatureTrade.create({user_id:b.user_id,trading_asset_id:b.trading_asset_id,asset_type:String(b.asset_type||'Crypto'),asset_name:String(b.asset_name||''),action:String(b.action||'BUY'),amount:featureNum(b.amount),leverage:featureNum(b.leverage,1),duration:featureNum(b.duration),status:String(b.status||'open').toLowerCase(),result:String(b.result||''),profit_loss:featureNum(b.profit_loss),entry_price:featureNum(b.entry_price),opened:new Date()});
return featureLocalRedirect(res,'/admin/managetrades.html','trade created successfully',{trade:t});
});

router.put('/dashboard/feature/trades/:id',async(req,res)=>{const t=await FeatureTrade.findById(req.params.id);
if(!t)return res.status(404).json({success:false,message:'FeatureTrade not found.'});
for(const k of ['user_id','trading_asset_id','asset_type','asset_name','action','amount','leverage','duration','status','result','profit_loss','entry_price'])if(req.body[k]!==undefined)t[k]=['amount','leverage','duration','profit_loss','entry_price'].includes(k)?featureNum(req.body[k]):req.body[k];
await t.save();
return featureLocalRedirect(res,'/admin/managetrades.html','trade updated successfully');
});

router.post('/dashboard/feature/trades/:id/settle',async(req,res)=>{const t=await FeatureTrade.findById(req.params.id).populate('user_id');
if(!t)return res.status(404).json({success:false,message:'FeatureTrade not found.'});
const pl=featureNum(req.body.profit_loss,t.profit_loss);
t.profit_loss=pl;
t.result=String(req.body.result|| (pl>=0?'WIN':'LOSS'));
t.status='closed';
t.settled_by='Admin';
t.settled_at=new Date();
await t.save();
if(t.user_id){t.user_id.account_bal+=pl;
await t.user_id.save();
await featureNotifyUser(t.user_id,'trade','FeatureTrade Settled',`Your trade has been settled with ${pl>=0?'+':''}$${pl.toFixed(2)}.`,'/user/notification.html',{icon:'bell'});
}return featureLocalRedirect(res,'/admin/view-trade.html?id='+t._id,'profit adjusted successfully');
});

router.get('/dashboard/feature/active-investments',async(req,res)=>{
  const rows=await FeatureUserPlans.find({active:'yes'}).populate('user','name email').populate('plan').sort({createdAt:-1}).lean();

  return res.json({success:true,investments:rows});

});

router.get('/dashboard/feature/investments/:id',async(req,res)=>{
  const row=await FeatureUserPlans.findById(req.params.id).populate('user','name email').populate('plan').lean();

  if(!row)return res.status(404).json({success:false,message:'Investment not found.'});

  return res.json({success:true,investment:row});

});

router.post('/dashboard/feature/investments/:id/settle',async(req,res)=>{
  const row=await FeatureUserPlans.findById(req.params.id).populate('user').populate('plan');

  if(!row)return res.status(404).json({success:false,message:'Investment not found.'});

  if(row.active!=='yes')return res.status(409).json({success:false,message:'Investment is no longer active.'});

  await featureAccrueInvestment(row);

  const fresh=await FeatureUserPlans.findById(row._id).populate('user').populate('plan');

  const payout=featureNum(fresh.amount)+featureNum(fresh.profit_earned);

  fresh.active='expired';
fresh.closed_at=new Date();
fresh.settled_at=new Date();
fresh.settlement_type='admin';
await fresh.save();

  fresh.user.account_bal+=payout;
await fresh.user.save();

  await featureNotifyUser(fresh.user,'investment','Plan Settled',`Your ${fresh.plan.name} investment has been settled and ${payout.toFixed(2)} has been credited.`,'/user/notification.html',{icon:'bell'});

  return featureLocalRedirect(res,'/admin/active-investments.html','Investment settled successfully.');

});


module.exports = router;
