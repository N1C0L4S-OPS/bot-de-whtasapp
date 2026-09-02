const express = require('express');
const { webhooksController } = require('./controllers/webhooksController');

const router = express.Router();

// Sin authenticateToken a propósito — estas rutas las llama Meta, no un usuario logueado.
// La seguridad acá es la verificación de hub.verify_token (GET) y de firma X-Hub-Signature-256
// (POST), no un JWT.
router.get('/:channel', webhooksController.verify);
router.post('/:channel', webhooksController.receive);

module.exports = router;
