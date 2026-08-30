import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  connectPortal,
  getPortalStatus,
  syncPortalData,
  getAcademicCalendar,
  disconnectPortal,
  getTodayAttendance,
  markAttendanceCode,
  getTimetableData,
} from './portalClient.js';

export const getPortalStatusQueryKey = () => ['portal', 'status'];
export const getCalendarQueryKey = () => ['portal', 'calendar'];
export const getTodayAttendanceQueryKey = () => ['portal', 'attendance', 'today'];
export const getTimetableQueryKey = () => ['portal', 'timetable'];

export const useGetPortalStatus = (options) =>
  useQuery({
    queryKey: getPortalStatusQueryKey(),
    queryFn: getPortalStatus,
    ...options,
  });

export const useConnectPortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectPortal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTimetableQueryKey() });
    },
  });
};

export const useSyncPortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPortalData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTimetableQueryKey() });
    },
  });
};

export const useGetAcademicCalendar = (options) =>
  useQuery({
    queryKey: getCalendarQueryKey(),
    queryFn: getAcademicCalendar,
    ...options,
  });

export const useDisconnectPortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectPortal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTimetableQueryKey() });
    },
  });
};

export const useGetTodayAttendance = (options) =>
  useQuery({
    queryKey: getTodayAttendanceQueryKey(),
    queryFn: getTodayAttendance,
    ...options,
  });

export const useMarkAttendanceCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAttendanceCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
    },
  });
};

export const useGetTimetable = (options) =>
  useQuery({
    queryKey: getTimetableQueryKey(),
    queryFn: getTimetableData,
    ...options,
  });
