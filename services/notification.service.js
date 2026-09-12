const Notification = require('../models/Notification');
const { sendPushToUser } = require('../utils/pushNotifications');

function normalizeUrl(url) {
  if (!url) return null;
  const value = String(url).trim();
  if (!value) return null;
  if (value.startsWith('/frontend/')) return value;
  if (value.startsWith('/user/')) return '/frontend' + value;
  if (value.startsWith('/admin/')) return '/frontend' + value;

  const configured = String(process.env.FRONTEND_URL || '').replace(/\/$/, '');
  let path = value;
  if (configured && value.startsWith(configured + '/')) {
    path = value.slice(configured.length);
  }

  const routes = {
    '/dashboard': '/frontend/user/dashboard.html',
    '/dashboard/account-settings': '/frontend/user/account-settings.html',
    '/dashboard/verify-account': '/frontend/user/verify-account.html',
    '/dashboard/connect-wallet': '/frontend/user/connect-wallet.html',
    '/dashboard/deposits': '/frontend/user/deposits.html',
    '/dashboard/withdrawals': '/frontend/user/withdrawals.html',
    '/dashboard/withdraw-funds': '/frontend/user/withdraw-funds.html',
    '/dashboard/buy-plan': '/frontend/user/buy-plan.html',
    '/dashboard/cards': '/frontend/user/cards.html',
    '/dashboard/portfolio': '/frontend/user/portfolio.html',
    '/dashboard/copy-trading': '/frontend/user/copy-trading.html',
    '/dashboard/bot-trading': '/frontend/user/bot-trading.html',
    '/dashboard/markets': '/frontend/user/markets.html',
    '/dashboard/mining': '/frontend/user/mining.html',
    '/dashboard/trade': '/frontend/user/trade.html',
    '/dashboard/real-estate': '/frontend/user/real-estate.html',
    '/dashboard/my-loans': '/frontend/user/my-loans.html',
    '/dashboard/stocks': '/frontend/user/stocks.html',
    '/dashboard/courses': '/frontend/user/courses.html',
    '/dashboard/singalssubscriptions': '/frontend/user/singalssubscriptions.html',
    '/dashboard/accounthistory': '/frontend/user/accounthistory.html',
    '/dashboard/tradinghistory': '/frontend/user/tradinghistory.html',
    '/dashboard/transfer-funds': '/frontend/user/transfertouser.html',
    '/dashboard/support': '/frontend/user/support.html',
    '/dashboard/notification': '/frontend/user/notification.html',
    '/dashboard/convert': '/frontend/user/convert.html',
    '/dashboard/trades/history': '/frontend/user/trades-history.html'
  };

  if (path === '/user/notification.html') return '/frontend/user/notification.html';
  if (path === '/user/dashboard.html') return '/frontend/user/dashboard.html';
  if (routes[path]) return routes[path];
  if (path.startsWith('/dashboard/')) {
    const tail = path.slice('/dashboard/'.length).replace(/^\/+|\/+$/g, '');
    if (!tail) return '/frontend/user/dashboard.html';
    return '/frontend/user/' + tail.replace(/\//g, '-') + '.html';
  }
  return value;
}

async function notifyUser(user, type, title, message, actionUrl = null, options = {}) {
  const userId = user?._id || user?.id || user;
  if (!userId) throw new Error('A user is required to create a notification');

  const notification = await Notification.create({
    user_id: userId,
    type: type || 'account',
    title: String(title || 'Notification'),
    message: String(message || ''),
    icon: options.icon || (type === 'kyc' ? 'shield' : type === 'account' ? 'user' : 'bell'),
    action_url: normalizeUrl(actionUrl),
    data: {
      title: String(title || 'Notification'),
      message: String(message || ''),
      type: type || 'account',
      icon: options.icon || (type === 'kyc' ? 'shield' : type === 'account' ? 'user' : 'bell'),
      action_url: normalizeUrl(actionUrl),
    },
  });

  if (options.push !== false) {
    try {
      await sendPushToUser(user, {
        title: notification.title,
        body: notification.message,
        url: notification.action_url || '/frontend/user/dashboard.html',
        tag: options.tag || `digital-grownt-${notification.type}-${notification._id}`,
        icon: options.pushIcon,
        badge: options.pushBadge,
      });
    } catch (error) {
      if (error.code !== 'PUSH_NOT_CONFIGURED') console.error('Push notification failed:', error.message);
    }
  }

  return notification;
}

module.exports = { notifyUser, normalizeUrl };
