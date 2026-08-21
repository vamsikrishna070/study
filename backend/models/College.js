import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true, 
      maxlength: 250,
      index: true 
    },
    normalizedName: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true,
      index: true 
    },
    shortName: { 
      type: String, 
      trim: true, 
      default: '', 
      maxlength: 50,
      index: true 
    },
    type: { 
      type: String, 
      enum: [
        'University', 
        'Institute of National Importance', 
        'Deemed University', 
        'Autonomous College', 
        'College', 
        'Other'
      ], 
      default: 'College',
      index: true 
    },
    state: { 
      type: String, 
      required: true, 
      trim: true, 
      maxlength: 100,
      index: true 
    },
    city: { 
      type: String, 
      trim: true, 
      default: '', 
      maxlength: 100,
      index: true 
    },
    district: { 
      type: String, 
      trim: true, 
      default: '', 
      maxlength: 100 
    },
    website: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    isActive: { 
      type: Boolean, 
      default: true, 
      index: true 
    },
  },
  { 
    timestamps: true 
  }
);

// Compound index for state-scoped alphabetical browsing and filtering
collegeSchema.index({ state: 1, normalizedName: 1 });

// Unique compound constraint to prevent duplicate institutions within the same state and city
collegeSchema.index({ normalizedName: 1, state: 1, city: 1 }, { unique: true });

// Text index for fast multi-field keyword search
collegeSchema.index({ name: 'text', shortName: 'text', city: 'text' });

export default mongoose.model('College', collegeSchema);
