import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;
const query = (key, fn, options) =>
  useQuery({ queryKey: key, queryFn: async () => unwrap(await fn()), ...options });
const mutation = (fn, options) =>
  useMutation({
    mutationFn: async (payload) => unwrap(await fn(payload)),
    ...options,
  });

export const getGetDashboardQueryKey = () => ['dashboard'];
export const getGetSubjectsQueryKey = () => ['subjects'];
export const getGetNotesQueryKey = (params = {}) => ['notes', params];
export const getGetTasksQueryKey = () => ['tasks'];
export const getGetExamsQueryKey = () => ['exams'];
export const getGetResourcesQueryKey = () => ['resources'];
export const getGetProgressQueryKey = () => ['progress'];
export const getGetSyllabiQueryKey = () => ['syllabi'];

export const useGetDashboard = (options) =>
  query(getGetDashboardQueryKey(), () => apiClient.get('/dashboard'), options);
export const useGetSubjects = (options) =>
  query(getGetSubjectsQueryKey(), () => apiClient.get('/subjects'), options);
export const useGetSyllabi = (options) =>
  query(getGetSyllabiQueryKey(), () => apiClient.get('/syllabus'), options);
export const useGetNotes = (params, options) =>
  query(getGetNotesQueryKey(params), () => apiClient.get('/notes', { params }), options);
export const useGetTasks = (options) =>
  query(getGetTasksQueryKey(), () => apiClient.get('/tasks'), options);
export const useGetExams = (options) =>
  query(getGetExamsQueryKey(), () => apiClient.get('/exams'), options);
export const useGetResources = (options) =>
  query(getGetResourcesQueryKey(), () => apiClient.get('/resources'), options);
export const useGetProgress = (options) =>
  query(getGetProgressQueryKey(), () => apiClient.get('/progress'), options);

export const getProgress = () => apiClient.get('/progress').then(res => res.data.data);

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data.data;
};

export const useCreateSubject = () => mutation((payload) => apiClient.post('/subjects', payload.data));
export const useUpdateSubject = () => mutation(({ id, data }) => apiClient.patch(`/subjects/${id}`, data));
export const useDeleteSubject = () => mutation(({ id }) => apiClient.delete(`/subjects/${id}`));

export const useCreateNote = () => mutation((payload) => apiClient.post('/notes', payload.data));
export const useUpdateNote = () => mutation(({ id, data }) => apiClient.patch(`/notes/${id}`, data));
export const useDeleteNote = () => mutation(({ id }) => apiClient.delete(`/notes/${id}`));

export const useCreateUnit = () => mutation((payload) => apiClient.post('/units', payload.data));
export const useCreateTopic = () => mutation((payload) => apiClient.post('/topics', payload.data));
export const useCreateImportantPoint = () => mutation((payload) => apiClient.post('/important-points', payload.data));

export const useSubscribePush = () => mutation((payload) => apiClient.post('/notifications/subscribe', payload));

export const useCreateTask = () => mutation((payload) => apiClient.post('/tasks', payload.data));
export const useUpdateTask = () => mutation(({ id, data }) => apiClient.patch(`/tasks/${id}`, data));
export const useDeleteTask = () => mutation(({ id }) => apiClient.delete(`/tasks/${id}`));

export const useCreateExam = () => mutation((payload) => apiClient.post('/exams', payload.data));
export const useUpdateExam = () => mutation(({ id, data }) => apiClient.patch(`/exams/${id}`, data));
export const useDeleteExam = () => mutation(({ id }) => apiClient.delete(`/exams/${id}`));

export const useCreateResource = () => mutation((payload) => apiClient.post('/resources', payload.data));
export const useUpdateResource = () => mutation(({ id, data }) => apiClient.patch(`/resources/${id}`, data));
export const useDeleteResource = () => mutation(({ id }) => apiClient.delete(`/resources/${id}`));

// Recordings
export const getGetRecordingsQueryKey = (params = {}) => ['recordings', params];
export const useGetRecordings = (params, options) => query(getGetRecordingsQueryKey(params), () => apiClient.get('/recordings', { params }), options);
export const useCreateRecording = () => mutation((payload) => apiClient.post('/recordings', payload.data));
export const useDeleteRecording = () => mutation(({ id }) => apiClient.delete(`/recordings/${id}`));

// Reminders
export const getGetRemindersQueryKey = () => ['reminders'];
export const useGetReminders = (options) => query(getGetRemindersQueryKey(), () => apiClient.get('/reminders'), options);
export const useCreateReminder = () => mutation((payload) => apiClient.post('/reminders', payload.data));
export const useUpdateReminder = () => mutation(({ id, data }) => apiClient.patch(`/reminders/${id}`, data));
export const useDeleteReminder = () => mutation(({ id }) => apiClient.delete(`/reminders/${id}`));

// Search
export const getSearchQueryKey = (q) => ['search', q];
export const useSearch = (q, options) => query(getSearchQueryKey(q), () => apiClient.get('/search', { params: { q } }), { enabled: !!q, ...options });

// Study Sessions / Study Log
export const getGetStudySessionsQueryKey = (params = {}) => ['study-sessions', params];
export const useGetStudySessions = (params, options) => query(getGetStudySessionsQueryKey(params), () => apiClient.get('/study-sessions', { params }), options);
export const useDeleteStudySession = () => mutation(({ id }) => apiClient.delete(`/study-sessions/${id}`));