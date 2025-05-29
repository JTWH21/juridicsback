import { ObjectId } from 'mongodb';
import { connectDB } from '../db.js';

// Helper para traer familiares de un cliente
async function getRelatives(clientId, db) {
  const relations = await db.collection('relations').find({ clientId: new ObjectId(clientId) }).toArray();

  // Buscar info de cada familiar
  const relatives = await Promise.all(
    relations.map(async rel => {
      const relative = await db.collection('clients').findOne({ _id: rel.relativeId });
      return {
        _id: relative._id,
        fullName: relative.fullName,
        relationship: rel.relationship,
      };
    })
  );
  return relatives;
}

// GET /api/clients
export async function getClients(req, res) {
  try {
    const db = await connectDB();
    const clients = await db.collection('clients').find().toArray();

    // Agregar familiares a cada cliente
    const clientsWithRelatives = await Promise.all(
      clients.map(async c => {
        const relatives = await getRelatives(c._id, db);
        return { ...c, relatives };
      })
    );

    res.json({ clients: clientsWithRelatives });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
}

// GET /api/clients/search?familyName=xxx
export async function searchClients(req, res) {
  const { familyName } = req.query;
  if (!familyName || familyName.trim() === '') {
    return res.status(400).json({ message: 'Parámetro familyName requerido' });
  }

  try {
    const db = await connectDB();

    // Encontrar clientes que coincidan con familyName
    const matchedClients = await db
      .collection('clients')
      .find({ fullName: { $regex: familyName, $options: 'i' } })
      .toArray();

    // Buscamos también sus familiares
    let allClients = [];

    for (const client of matchedClients) {
      // Cliente principal + sus familiares
      const relatives = await getRelatives(client._id, db);

      allClients.push({ ...client, relatives });
      // Agregar también familiares sin repetir
      relatives.forEach(rel => {
        if (!allClients.find(c => c._id.equals(rel._id))) {
          allClients.push(rel);
        }
      });
    }

    res.json({ clients: allClients });
  } catch (error) {
    res.status(500).json({ message: 'Error buscando clientes', error: error.message });
  }
}

// POST /api/clients
export async function createClient(req, res) {
  try {
    const db = await connectDB();
    const newClient = req.body;

    // Guardar nuevo cliente (sin validaciones extras)
    const result = await db.collection('clients').insertOne(newClient);

    res.status(201).json({ ...newClient, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Error creando cliente', error: error.message });
  }
}

// DELETE /api/clients/:clientId
export async function deleteClient(req, res) {
  try {
    const db = await connectDB();
    const { clientId } = req.params;

    if (!ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Eliminar relaciones asociadas
    await db.collection('relations').deleteMany({ clientId: new ObjectId(clientId) });
    await db.collection('relations').deleteMany({ relativeId: new ObjectId(clientId) });

    // Eliminar cliente
    const result = await db.collection('clients').deleteOne({ _id: new ObjectId(clientId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando cliente', error: error.message });
  }
}

// PUT /api/clients/:clientId
export async function updateClient(req, res) {
  try {
    const db = await connectDB();
    const { clientId } = req.params;
    const updatedData = req.body;

    if (!ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const result = await db.collection('clients').updateOne(
      { _id: new ObjectId(clientId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando cliente', error: error.message });
  }
}

// GET /api/clients/:clientId/family
export async function getClientFamily(req, res) {
  try {
    const db = await connectDB();
    const { clientId } = req.params;

    if (!ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Buscar cliente principal
    const client = await db.collection('clients').findOne({ _id: new ObjectId(clientId) });
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Obtener familiares usando la función ya creada getRelatives
    const familyMembers = await getRelatives(client._id, db);

    // Devolver cliente con familiares en propiedad familyMembers
    res.json({
      _id: client._id,
      fullName: client.fullName || client.nombres || '',  // adapta según campo real
      familyMembers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener familia', error: error.message });
  }
}

export async function deleteRelative(req, res) {
  try {
    const db = await connectDB();
    const { clientId, relativeId } = req.params;

    if (!ObjectId.isValid(clientId) || !ObjectId.isValid(relativeId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const result = await db.collection('relations').deleteOne({
      clientId: new ObjectId(clientId),
      relativeId: new ObjectId(relativeId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Relación no encontrada' });
    }

    res.json({ message: 'Relación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando relación', error: error.message });
  }
}



// POST /api/clients/:clientId/relatives
export async function addRelative(req, res) {
  try {
    const db = await connectDB();
    const { clientId } = req.params;
    const { relativeId, relationship } = req.body;

    if (!ObjectId.isValid(clientId) || !ObjectId.isValid(relativeId) || !relationship) {
      return res.status(400).json({ message: 'Datos inválidos' });
    }

    // Verificar que existan ambos clientes
    const clientExists = await db.collection('clients').findOne({ _id: new ObjectId(clientId) });
    const relativeExists = await db.collection('clients').findOne({ _id: new ObjectId(relativeId) });

    if (!clientExists || !relativeExists) {
      return res.status(404).json({ message: 'Cliente o familiar no encontrado' });
    }

    // Insertar relación
    await db.collection('relations').insertOne({
      clientId: new ObjectId(clientId),
      relativeId: new ObjectId(relativeId),
      relationship,
    });

    res.status(201).json({ message: 'Familiar agregado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error agregando familiar', error: error.message });
  }
}


export async function updateRelative(req, res) {
  try {
    const db = await connectDB();
    const { clientId } = req.params;
    const { relativeId, relationship } = req.body;

    if (!ObjectId.isValid(clientId) || !ObjectId.isValid(relativeId) || !relationship) {
      return res.status(400).json({ message: 'Datos inválidos' });
    }

    // Verificar que existan ambos clientes
    const clientExists = await db.collection('clients').findOne({ _id: new ObjectId(clientId) });
    const relativeExists = await db.collection('clients').findOne({ _id: new ObjectId(relativeId) });

    if (!clientExists || !relativeExists) {
      return res.status(404).json({ message: 'Cliente o familiar no encontrado' });
    }

    // Eliminar todas las relaciones previas del cliente
    await db.collection('relations').deleteMany({ clientId: new ObjectId(clientId) });

    // Insertar la nueva relación (reemplazo)
    await db.collection('relations').insertOne({
      clientId: new ObjectId(clientId),
      relativeId: new ObjectId(relativeId),
      relationship,
    });

    res.status(200).json({ message: 'Familiar actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando familiar', error: error.message });
  }
}


