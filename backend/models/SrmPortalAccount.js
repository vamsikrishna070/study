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
  srmUsername: { type: String, required: true, trim: true, index: true },
  encryptedPassword: { type: String, required: true, select: false },
  encryptedSessionId: { type: String, default: '' },
  sessionTime: { type: String, default: '' },
  connectionStatus: { 
    type: String, 
    enum: ['connected', 'expired', 'disconnected'], 
    default: 'connected' 
  },
  lastSuccessfulSync: { type: Date, default: null },
  profileCache: { type: mongoose.Schema.Types.Mixed, default: {} },
  attendanceCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  todayAttendanceCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  attendanceHistoryCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  timetableCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  subjectsCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  examsCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  resultsCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  cgpaCache: { type: mongoose.Schema.Types.Mixed, default: {} },
  selfExamPerformance: [selfExamPerformanceSchema]
}, { timestamps: true });

export default mongoose.model('SrmPortalAccount', srmPortalAccountSchema);
