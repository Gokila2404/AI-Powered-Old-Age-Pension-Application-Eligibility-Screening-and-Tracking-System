import mongoose from '../mongoose.js';

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    villageTown: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: addressSchema, default: undefined }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1, role: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
