import crypto from 'crypto';
import PaymentTransaction from '../models/PaymentTransaction.js';
import User from '../models/User.js';
import Vinyl from '../models/Vinyl.js';

const KHALTI_BASE_URL = (process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2').replace(/\/+$/, '');
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';
const DEFAULT_APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

const userIdFromRequest = (req) => req.user?.id || req.user?._id;

const sanitizeOrigin = (value = '') => {
  const text = String(value || '').trim();
  if (!/^https?:\/\//i.test(text)) return '';
  return text.replace(/\/+$/, '');
};

const getWebsiteBaseUrl = (req) => {
  const originHeader = sanitizeOrigin(req.headers.origin);
  if (originHeader) return originHeader;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  return sanitizeOrigin(DEFAULT_APP_BASE_URL) || 'http://localhost:3000';
};

const khaltiHeaders = () => {
  if (!KHALTI_SECRET_KEY) {
    const error = new Error('Khalti secret key is not configured');
    error.status = 500;
    throw error;
  }

  return {
    Authorization: `Key ${KHALTI_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
};

const callKhalti = async (path, payload) => {
  const response = await fetch(`${KHALTI_BASE_URL}${path}`, {
    method: 'POST',
    headers: khaltiHeaders(),
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.detail || data?.message || 'Khalti request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

const ensureUserOwnsVinyl = async (userId, vinylId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const alreadyOwned = user.purchased_vinyls.some((ownedVinylId) => String(ownedVinylId) === String(vinylId));
  if (!alreadyOwned) {
    user.purchased_vinyls.push(vinylId);
  }

  user.active_vinyl = vinylId;
  await user.save();

  return user;
};

export const initiateKhaltiVinylPayment = async (req, res) => {
  try {
    const userId = userIdFromRequest(req);
    const { vinylId } = req.body || {};

    if (!vinylId) {
      return res.status(400).json({ message: 'vinylId is required' });
    }

    const [user, vinyl] = await Promise.all([
      User.findById(userId).lean(),
      Vinyl.findById(vinylId).lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }

    if (!vinyl.is_available) {
      return res.status(400).json({ message: 'This vinyl is not available for purchase' });
    }

    const alreadyOwned = (user.purchased_vinyls || []).some((ownedVinylId) => String(ownedVinylId) === String(vinylId));
    if (alreadyOwned) {
      return res.status(400).json({ message: 'Vinyl already purchased' });
    }

    const websiteUrl = getWebsiteBaseUrl(req);
    const returnUrl = `${websiteUrl}/payment/khalti/callback`;
    const amountRupees = Number(vinyl.price || 0);
    const amountPaisa = Math.round(amountRupees * 100);

    if (!Number.isFinite(amountPaisa) || amountPaisa <= 0) {
      return res.status(400).json({ message: 'Vinyl price is invalid for payment' });
    }

    const purchaseOrderId = `vinyl-${vinylId}-${crypto.randomUUID()}`;
    const purchaseOrderName = `${vinyl.name} vinyl`;

    const payload = {
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: amountPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: {
        name: user.name || user.username || 'Vinyl Demo User',
        email: user.email || '',
        phone: user.phone || '9800000001',
      },
      amount_breakdown: [
        {
          label: 'Vinyl price',
          amount: amountPaisa,
        },
      ],
      product_details: [
        {
          identity: String(vinyl._id),
          name: vinyl.name,
          total_price: amountPaisa,
          quantity: 1,
          unit_price: amountPaisa,
        },
      ],
      merchant_vinyl_id: String(vinyl._id),
      merchant_user_id: String(user._id),
    };

    const khaltiResponse = await callKhalti('/epayment/initiate/', payload);

    const payment = await PaymentTransaction.create({
      provider: 'khalti',
      user: user._id,
      vinyl: vinyl._id,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      pidx: khaltiResponse.pidx,
      amount_paisa: amountPaisa,
      amount_rupees: amountRupees,
      status: 'Initiated',
      payment_url: khaltiResponse.payment_url || '',
      website_url: websiteUrl,
      return_url: returnUrl,
      customer_info: payload.customer_info,
      lookup_payload: khaltiResponse,
    });

    return res.status(201).json({
      payment_id: payment._id,
      pidx: payment.pidx,
      payment_url: payment.payment_url,
      expires_at: khaltiResponse.expires_at || null,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to initiate Khalti payment',
      error: error.details || error.message,
    });
  }
};

export const verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx, callback = {} } = req.body || {};

    if (!pidx) {
      return res.status(400).json({ message: 'pidx is required' });
    }

    const payment = await PaymentTransaction.findOne({ provider: 'khalti', pidx }).populate('vinyl').populate('user');
    if (!payment) {
      return res.status(404).json({ message: 'Payment transaction not found' });
    }

    if (payment.status === 'Completed') {
      return res.json({
        message: 'Payment already verified',
        status: payment.status,
        vinyl: payment.vinyl,
        redirect_to: '/library',
      });
    }

    const lookupResponse = await callKhalti('/epayment/lookup/', { pidx });

    payment.callback_payload = callback;
    payment.lookup_payload = lookupResponse;
    payment.status = lookupResponse.status || payment.status;
    payment.transaction_id = lookupResponse.transaction_id || payment.transaction_id;
    payment.fee = Number(lookupResponse.fee || 0);
    payment.refunded = Boolean(lookupResponse.refunded);

    const amountMatches = Number(lookupResponse.total_amount) === Number(payment.amount_paisa);
    if (!amountMatches) {
      payment.status = 'Amount mismatch';
      await payment.save();
      return res.status(400).json({ message: 'Khalti amount mismatch during verification', status: payment.status });
    }

    if (lookupResponse.status === 'Completed') {
      await ensureUserOwnsVinyl(payment.user._id, payment.vinyl._id);
      payment.completed_at = new Date();
      await payment.save();

      return res.json({
        message: 'Khalti payment verified successfully',
        status: payment.status,
        vinyl: payment.vinyl,
        redirect_to: '/library',
      });
    }

    await payment.save();
    return res.status(400).json({
      message: 'Payment not completed',
      status: payment.status,
      lookup: lookupResponse,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to verify Khalti payment',
      error: error.details || error.message,
    });
  }
};
