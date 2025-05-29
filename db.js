import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
let client;
let db;

export async function connectDB() {
  if (db) return db;  // Reusar conexión si ya existe

  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();

  // Conectar a la base de datos, aquí puedes cambiar el nombre si quieres uno específico
  db = client.db('juridics'); 

  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
