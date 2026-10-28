import mongoose from '../mongoose.js';

const { Schema } = mongoose;

const applicationHistorySchema = new Schema(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'PensionApplication',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'],
      required: true,
      index: true
    },
    remarks: { type: String, trim: true, default: '' },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    changedAt: { type: Date, default: Date.now, index: true }
  },
  {
    versionKey: false
  }
);

applicationHistorySchema.index({ applicationId: 1, changedAt: -1 });
applicationHistorySchema.index({ changedBy: 1, changedAt: -1 });

export default mongoose.models.ApplicationHistory ||
  mongoose.model('ApplicationHistory', applicationHistorySchema);
