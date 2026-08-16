import StudySession from '../models/StudySession.js';

export async function recordStudySession(data) {
  return StudySession.create(data);
}