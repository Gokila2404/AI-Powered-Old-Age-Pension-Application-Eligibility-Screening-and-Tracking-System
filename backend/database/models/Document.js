import mongoose from '../mongoose.js';

const { Schema } = mongoose;

const documentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'PensionApplication',
      required: true,
      index: true
    },
    documentType: { type: String, required: true, trim: true, index: true },
    fileName: { type: String, required: true, trim: true },
    filePath: { type: String, required: true, trim: true },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', 'Needs Review'],
      default: 'Pending',
      index: true
    },
    extractedData: { type: Schema.Types.Mixed, default: {} },
    uploadedAt: { type: Date, default: Date.now, index: true }
  },
  {
    versionKey: false
  }
);

documentSchema.index({ userId: 1, applicationId: 1 });
documentSchema.index({ applicationId: 1, documentType: 1 }, { unique: true });

export default mongoose.models.Document || mongoose.model('Document', documentSchema);
