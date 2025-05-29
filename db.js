import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017'; // Cambia si es necesario
const client = new MongoClient(uri);

let db;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('jurisdiccion');
    console.log('MongoDB conectado');
  }
  return db;
}
