import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {
  getAffiliateSettings,
  updateAffiliateSettings,
  getAffiliateOverview,
  getAffiliateLeaderboard,
  getAffiliateStats,
  getWalletSummary,
  getAffiliatesList,
  getAffiliateById,
  getPayoutsList,
  createManualPayout,
  updatePayoutStatus,
} from '../controllers/affiliate.controller.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/settings', getAffiliateSettings);
router.put('/settings', updateAffiliateSettings);
router.get('/overview', getAffiliateOverview);
router.get('/leaderboard', getAffiliateLeaderboard);
router.get('/stats', getAffiliateStats);
router.get('/wallet-summary', getWalletSummary);

router.get('/list', getAffiliatesList);
router.get('/affiliates/:id', getAffiliateById);

router.get('/payouts', getPayoutsList);
router.post('/payouts/manual', createManualPayout);
router.put('/payouts/:id', updatePayoutStatus);

export default router;
