const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireModule, requirePermission } = require('../../middleware/permissions');
const { configController } = require('./controllers/configController');

const router = express.Router();

router.use(authenticateToken);
router.use(requireModule('messaging'));

router.get('/channel-configs', requirePermission('messaging.view'), configController.list);
router.put('/channel-configs/:id', requirePermission('messaging.manage_config'), configController.update);

module.exports = router;
