const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  parentesco: String,
  numeroCaso: String,
  nombres: String,
  cedula: String,
  correo: String,
  telefono: String,
  direccion: String
});

module.exports = mongoose.model('Cliente', clienteSchema);
