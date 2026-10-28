import { connectMongoDB, databaseName, disconnectMongoDB, mongoUri } from './mongoose.js';
import models from './models/index.js';

const modelNames = Object.keys(models);

try {
  console.log(`Loaded Mongoose models: ${modelNames.join(', ')}`);

  const connection = await connectMongoDB();
  await connection.db.admin().ping();

  console.log(`MongoDB connection verified: ${mongoUri}/${databaseName}`);
  console.log('All models load correctly without errors.');
} catch (error) {
  console.error('Database model verification failed.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await disconnectMongoDB();
}
