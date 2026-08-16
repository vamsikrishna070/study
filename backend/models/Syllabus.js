import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completed: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
});

const unitSchema = new mongoose.Schema({
  unitNumber: { type: String, required: true },
  name: { type: String, required: true },
  contactHours: { type: Number, default: 0 },
  topics: [topicSchema]
});

const syllabusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  fileName: { type: String },
  fileUrl: { type: String },
  units: [unitSchema]
}, { timestamps: true });

export default mongoose.models.Syllabus || mongoose.model('Syllabus', syllabusSchema);
