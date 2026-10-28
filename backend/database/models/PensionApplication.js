import mongoose from '../mongoose.js';

const { Schema } = mongoose;

const pensionApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    personalDetails: { type: Schema.Types.Mixed, default: {} },
    addressDetails: { type: Schema.Types.Mixed, default: {} },
    incomeDetails: { type: Schema.Types.Mixed, default: {} },
    benefitsDetails: { type: Schema.Types.Mixed, default: {} },
    bankDetails: { type: Schema.Types.Mixed, default: {} },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    eligibilityScore: { type: Number, min: 0, max: 100, default: 0 },
    eligibilityStatus: {
      type: String,
      enum: ['Eligible', 'Likely Eligible', 'Needs Review', 'Not Eligible', 'Unknown'],
      default: 'Unknown',
      index: true
    },
    applicationStatus: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'],
      default: 'Draft',
      index: true
    },
    adminRemarks: { type: String, trim: true, default: '' },
    submittedAt: { type: Date }
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false
  }
);

pensionApplicationSchema.index({ userId: 1, applicationStatus: 1 });
pensionApplicationSchema.index({ submittedAt: -1 });
pensionApplicationSchema.index({ eligibilityStatus: 1, eligibilityScore: -1 });

export default mongoose.models.PensionApplication ||
  mongoose.model('PensionApplication', pensionApplicationSchema);
