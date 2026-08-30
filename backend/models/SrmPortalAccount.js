import mongoose from 'mongoose';

const selfExamPerformanceSchema = new mongoose.Schema({
  examCode: { type: String, required: true },
  examName: { type: String, default: '' },
  scoreObtained: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 100 },
  percentage: { type: Number, default: 0 },
  rating: { 
    type: String, 
    enum: ['Excellent', 'Good', 'Average', 'Needs Improvement', ''], 
    default: '' 
  },
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const srmPortalAccountSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true, 
    index: true 
  },
  srmUsername: { type: String, required: true, trim: true },
  encryptedPassword: { type: String, required: true, select: false },
  encryptedSessionId: { type: String, default: '' },
  sessionTime: { type: String, default: '' },
  connectionStatus: { 
    type: String, 
    enum: ['connected', 'expired', 'disconnected'], 
    default: 'connected' 
  },
  lastSuccessfulSync: { type: Date, default: null },
  profileCache: { type: Object, default: {} },
  attendanceCache: { type: Array, default: [] },
  attendanceHistoryCache: { type: Array, default: [] },
  timetableCache: { type: Array, default: [] },
  subjectsCache: { type: Array, default: [] },
  examsCache: { type: Array, default: [] },
  resultsCache: { type: Array, default: [] },
  cgpaCache: { type: Object, default: {} },
  selfExamPerformance: [selfExamPerformanceSchema]
}, { timestamps: true });

export default mongoose.model('SrmPortalAccount', srmPortalAccountSchema);
