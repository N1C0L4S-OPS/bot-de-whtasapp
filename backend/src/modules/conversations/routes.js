const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireModule, requirePermission } = require('../../middleware/permissions');
const { conversationsController } = require('./controllers/conversationsController');

const router = express.Router();

router.use(authenticateToken);
router.use(requireModule('messaging'));

router.get('/', requirePermission('messaging.view'), conversationsController.list);
router.get('/:id/messages', requirePermission('messaging.view'), conversationsController.getMessages);
router.post('/:id/messages', requirePermission('messaging.reply'), conversationsController.sendMessage);

module.exports = router;
