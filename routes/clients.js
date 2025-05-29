import express from 'express';
import {
  getClients,
  searchClients,
  createClient,
  addRelative,
  deleteClient,
  updateClient,
  getClientFamily,
  deleteRelative,
  updateRelative
} from '../controllers/clients.js';

const router = express.Router();

router.get('/', getClients);
router.get('/search', searchClients);
router.post('/', createClient);
router.post('/:clientId/relatives', addRelative);
router.delete('/:clientId', deleteClient);      // ✅ eliminar cliente
router.put('/:clientId', updateClient);         // ✅ editar cliente
router.get('/:clientId/family', getClientFamily);
router.delete('/:clientId/relatives/:relativeId', deleteRelative);   // ✅ eliminar relación
router.put('/:clientId/relatives', updateRelative);




export default router;
