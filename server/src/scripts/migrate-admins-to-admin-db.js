import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const SOURCE_COLLECTION = 'admins';
const TARGET_DB = 'admin';
const TARGET_COLLECTION = 'admin';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
const shouldDropSource = process.argv.includes('--drop-source');

const run = async () => {
  await mongoose.connect(uri);

  const sourceDb = mongoose.connection.db;
  const source = sourceDb.collection(SOURCE_COLLECTION);
  const target = mongoose.connection.getClient().db(TARGET_DB).collection(TARGET_COLLECTION);

  const oldAdmins = await source.find({}).toArray();
  if (oldAdmins.length) {
    await target.bulkWrite(
      oldAdmins.map((admin) => ({
        updateOne: {
          filter: { username: admin.username || admin.email || String(admin._id) },
          update: {
            $setOnInsert: {
              ...admin,
              username: admin.username || String(admin.email || admin.name || admin._id).trim().toLowerCase(),
              name: admin.name || admin.username || 'Admin',
            },
          },
          upsert: true,
        },
      }))
    );
  }

  await Admin.init();

  if (shouldDropSource) {
    await source.drop().catch((error) => {
      if (error?.codeName !== 'NamespaceNotFound') throw error;
    });
  }

  console.log(`Migrated ${oldAdmins.length} admin record(s) from ${sourceDb.databaseName}.${SOURCE_COLLECTION} to ${TARGET_DB}.${TARGET_COLLECTION}.`);
  console.log(shouldDropSource ? `Dropped ${sourceDb.databaseName}.${SOURCE_COLLECTION}.` : `Kept ${sourceDb.databaseName}.${SOURCE_COLLECTION}. Add --drop-source to remove it.`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
