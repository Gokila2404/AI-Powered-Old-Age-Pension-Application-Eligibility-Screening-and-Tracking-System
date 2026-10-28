import mongoose from '../mongoose.js';

const ageCriteriaSchema = new mongoose.Schema(
  {
    minAge: { type: Number, min: 0 },
    maxAge: { type: Number, min: 0 }
  },
  { _id: false }
);

const incomeCriteriaSchema = new mongoose.Schema(
  {
    maxAnnualIncome: { type: Number, min: 0 },
    incomeSourcesAllowed: [{ type: String, trim: true }]
  },
  { _id: false }
);

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, required: true, trim: true },
    eligibility: { type: mongoose.Schema.Types.Mixed, default: {} },
    ageCriteria: { type: ageCriteriaSchema, default: undefined },
    incomeCriteria: { type: incomeCriteriaSchema, default: undefined },
    benefits: { type: mongoose.Schema.Types.Mixed, default: {} },
    requiredDocuments: [{ type: String, trim: true }],
    active: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

schemeSchema.index({ active: 1, name: 1 });
schemeSchema.index({ 'ageCriteria.minAge': 1, 'incomeCriteria.maxAnnualIncome': 1 });

export default mongoose.models.Scheme || mongoose.model('Scheme', schemeSchema);
