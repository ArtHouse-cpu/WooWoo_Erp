import {asyncHandler} from '../utils/asyncHandler.js';
import {sendSuccess} from '../utils/response.js';
import * as paymentService from '../services/payment.service.js';

export const initiatePayment = asyncHandler(async (req, res) => {
  const data = await paymentService.initiateMembershipPayment(
    req,
    req.customer._id,
    req.body,
  );
  return sendSuccess(res, {
    message:
      data.mode === 'free'
        ? 'Membership activated (no payment due)'
        : 'PayU payment initialized',
    data,
  });
});

export const payuSuccess = asyncHandler(async (req, res) => {
  return paymentService.handlePayuCallback(req, res, {expectedSuccess: true});
});

export const payuFailure = asyncHandler(async (req, res) => {
  return paymentService.handlePayuCallback(req, res, {expectedSuccess: false});
});

export const paymentStatus = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentStatus(
    req.customer._id,
    req.params.txnid,
  );
  return sendSuccess(res, {
    message: 'Payment status fetched',
    data,
  });
});
