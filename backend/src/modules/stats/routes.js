const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireModule, requirePermission } = require('../../middleware/permissions');
const { statsController } = require('./controllers/statsController');

const router = express.Router();

router.use(authenticateToken);
router.use(requireModule('messaging'));
router.use(requirePermission('messaging.view'));

router.get('/', statsController.get);
router.get('/reminders', statsController.recentReminders);

module.exports = router;
