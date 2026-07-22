import PaymentOrder from '../models/paymentOrder.model.js';
import {
  createTxnId,
  formatPayuAmount,
  generatePaymentHash,
  getPayuConfig,
  verifyPaymentWithPayu,
  verifyReverseHash,
} from './payu.service.js';
import {validateMembershipCoupon} from './coupon.service.js';
import {getMembershipOrderAmount} from '../constants/membershipPlans.js';
import {activateMembership} from './auth.service.js';
import Customer from '../../../models/customer.model.js';
import {assertActiveMembershipPlan, resolvePlanMeta} from '../../../services/membershipPlan.service.js';

const getPublicServerUrl = req => {
  const configured = String(process.env.SERVER_PUBLIC_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
};

const getCustomerAppUrl = () =>
  String(process.env.CUSTOMER_APP_URL || 'http://localhost:5174').replace(/\/$/, '');

const buildPricing = async ({customer, membershipType, couponCode}) => {
  const orderAmount = await getMembershipOrderAmount(membershipType);
  if (orderAmount == null) {
    const error = new Error('Select a valid membership plan');
    error.status = 400;
    throw error;
  }

  let discountAmount = 0;
  let normalizedCoupon = null;

  const rawCoupon = String(couponCode || '').trim();
  if (rawCoupon) {
    const validated = await validateMembershipCoupon({
      code: rawCoupon,
      membershipType,
      customerPhone: customer.mobile,
    });
    discountAmount = validated.discountAmount;
    normalizedCoupon = validated.code;
  }

  const paidAmount = Math.max(0, Math.round((orderAmount - discountAmount) * 100) / 100);
  return {orderAmount, discountAmount, paidAmount, couponCode: normalizedCoupon};
};

/**
 * Start PayU hosted checkout for membership purchase.
 * If payable is 0 (e.g. 100% coupon), activate immediately without PayU.
 */
export const initiateMembershipPayment = async (req, customerId, payload = {}) => {
  const membershipType = String(payload.membershipType || '').toLowerCase();
  const plan = await assertActiveMembershipPlan(membershipType);
  const planMeta = resolvePlanMeta(plan);

  const customer = await Customer.findOne({
    _id: customerId,
    isDeleted: {$ne: true},
    status: 'active',
  });
  if (!customer) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  const pricing = await buildPricing({
    customer,
    membershipType,
    couponCode: payload.couponCode,
  });

  // Fully discounted — no PayU needed
  if (pricing.paidAmount <= 0) {
    const result = await activateMembership(customerId, {
      membershipType,
      couponCode: pricing.couponCode || undefined,
      skipPaymentCheck: true,
    });
    return {
      mode: 'free',
      activated: true,
      customer: result.customer,
      pricing,
    };
  }

  const {key, salt, paymentUrl} = getPayuConfig();
  const txnid = createTxnId();
  const amount = formatPayuAmount(pricing.paidAmount);
  const productinfo = planMeta.label;
  const firstname = String(customer.name || 'Customer').trim().slice(0, 60) || 'Customer';
  const email =
    String(customer.email || '').trim() ||
    `${customer.mobile || 'guest'}@customer.woowoo.local`;
  const phone = String(customer.mobile || '').trim();

  const udf1 = String(customer._id);
  const udf2 = membershipType;
  const udf3 = pricing.couponCode || '';
  const udf4 = amount;
  const udf5 = txnid;

  const order = await PaymentOrder.create({
    txnid,
    customer: customer._id,
    membershipType,
    couponCode: pricing.couponCode,
    orderAmount: pricing.orderAmount,
    discountAmount: pricing.discountAmount,
    paidAmount: pricing.paidAmount,
    status: 'pending',
    gateway: 'payu',
  });

  const hash = generatePaymentHash({
    key,
    salt,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
  });

  const base = getPublicServerUrl(req);
  const params = {
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl: `${base}/api/customer/payments/payu/success`,
    furl: `${base}/api/customer/payments/payu/failure`,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    hash,
    service_provider: 'payu_paisa',
  };

  return {
    mode: 'payu',
    activated: false,
    paymentUrl,
    params,
    orderId: String(order._id),
    txnid,
    pricing,
  };
};

const redirectToCustomer = (res, query) => {
  const url = new URL(`${getCustomerAppUrl()}/payment/result`);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) {
      url.searchParams.set(k, String(v));
    }
  });
  return res.redirect(302, url.toString());
};

const finalizeSuccessfulPayment = async (order, body) => {
  if (order.status === 'success' && order.activatedAt) {
    return {alreadyActivated: true, order};
  }

  order.status = 'success';
  order.mihpayid = body.mihpayid || order.mihpayid;
  order.bankRefNum = body.bank_ref_num || order.bankRefNum;
  order.paymentMode = body.mode || order.paymentMode;
  order.gatewayStatus = body.status || 'success';
  order.rawResponse = body;
  order.errorMessage = null;
  await order.save();

  await activateMembership(order.customer, {
    membershipType: order.membershipType,
    couponCode: order.couponCode || undefined,
    paymentOrderId: order._id,
    skipPaymentCheck: true,
  });

  order.activatedAt = new Date();
  await order.save();

  return {alreadyActivated: false, order};
};

/**
 * Handle PayU browser POST redirect (success / failure).
 */
export const handlePayuCallback = async (req, res, {expectedSuccess}) => {
  const body = req.body || {};
  const txnid = String(body.txnid || '').trim();
  const status = String(body.status || '').toLowerCase();

  if (!txnid) {
    return redirectToCustomer(res, {
      status: 'failed',
      message: 'Missing transaction id from PayU',
    });
  }

  let config;
  try {
    config = getPayuConfig();
  } catch (err) {
    return redirectToCustomer(res, {
      status: 'failed',
      txnid,
      message: err.message || 'PayU not configured',
    });
  }

  const hashOk = verifyReverseHash(body, config.salt, config.key);
  if (!hashOk) {
    console.error('[PayU] Reverse hash mismatch for txnid', txnid);
    return redirectToCustomer(res, {
      status: 'failed',
      txnid,
      message: 'Payment verification failed (hash mismatch)',
    });
  }

  const order = await PaymentOrder.findOne({txnid});
  if (!order) {
    return redirectToCustomer(res, {
      status: 'failed',
      txnid,
      message: 'Payment order not found',
    });
  }

  // Amount check
  const expectedAmount = formatPayuAmount(order.paidAmount);
  if (String(body.amount) !== expectedAmount) {
    order.status = 'failed';
    order.errorMessage = `Amount mismatch: expected ${expectedAmount}, got ${body.amount}`;
    order.rawResponse = body;
    await order.save();
    return redirectToCustomer(res, {
      status: 'failed',
      txnid,
      message: 'Payment amount mismatch',
    });
  }

  const isSuccess = status === 'success';

  if (expectedSuccess && isSuccess) {
    try {
      // Best-effort live verify (non-blocking for redirect if API fails)
      try {
        const verified = await verifyPaymentWithPayu(txnid);
        const detail = verified?.transaction_details?.[txnid];
        if (detail && String(detail.status).toLowerCase() === 'failure') {
          order.status = 'failed';
          order.gatewayStatus = detail.status;
          order.rawResponse = {callback: body, verify: verified};
          order.errorMessage = 'PayU verify_payment reported failure';
          await order.save();
          return redirectToCustomer(res, {
            status: 'failed',
            txnid,
            message: 'Payment not confirmed by PayU',
          });
        }
      } catch (verifyErr) {
        console.warn('[PayU] verify_payment skipped:', verifyErr?.message || verifyErr);
      }

      await finalizeSuccessfulPayment(order, body);
      return redirectToCustomer(res, {
        status: 'success',
        txnid,
        membershipType: order.membershipType,
        amount: expectedAmount,
        message: 'Membership payment successful',
      });
    } catch (err) {
      console.error('[PayU] Activate after payment failed:', err);
      return redirectToCustomer(res, {
        status: 'failed',
        txnid,
        message: err.message || 'Could not activate membership after payment',
      });
    }
  }

  order.status = isSuccess ? 'success' : 'failed';
  order.gatewayStatus = body.status || status;
  order.mihpayid = body.mihpayid || null;
  order.bankRefNum = body.bank_ref_num || null;
  order.paymentMode = body.mode || null;
  order.errorMessage =
    body.error_Message || body.error || (isSuccess ? null : 'Payment failed');
  order.rawResponse = body;
  await order.save();

  return redirectToCustomer(res, {
    status: 'failed',
    txnid,
    message: order.errorMessage || 'Payment failed or cancelled',
  });
};

export const getPaymentStatus = async (customerId, txnid) => {
  const order = await PaymentOrder.findOne({
    txnid: String(txnid || '').trim().toUpperCase(),
    customer: customerId,
  }).lean();

  if (!order) {
    const error = new Error('Payment not found');
    error.status = 404;
    throw error;
  }

  return {
    txnid: order.txnid,
    status: order.status,
    membershipType: order.membershipType,
    paidAmount: order.paidAmount,
    discountAmount: order.discountAmount,
    orderAmount: order.orderAmount,
    couponCode: order.couponCode,
    activatedAt: order.activatedAt,
    mihpayid: order.mihpayid,
  };
};
