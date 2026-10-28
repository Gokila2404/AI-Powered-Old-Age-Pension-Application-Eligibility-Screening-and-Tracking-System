import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const projectRoot = path.resolve(process.cwd());
const envFiles = [
  path.join(projectRoot, '.env'),
  path.join(projectRoot, 'backend', '.env')
];

for (const envFile of envFiles) {
  if (!fs.existsSync(envFile)) {
    continue;
  }

  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}

export const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
export const databaseName = process.env.DB_NAME || 'pension_seva_db';

mongoose.set('strictQuery', true);

export async function connectMongoDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri, {
    dbName: databaseName,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000)
  });

  return mongoose.connection;
}

export async function disconnectMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export default mongoose;
