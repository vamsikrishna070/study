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
  getAttendancePlanner,
  verifyPortalSession,
} from './portalClient.js';

export const getPortalStatusQueryKey = () => ['portal', 'status'];
export const getPortalVerifyQueryKey = () => ['portal', 'verify'];
export const getCalendarQueryKey = () => ['portal', 'calendar'];
export const getTodayAttendanceQueryKey = () => ['portal', 'attendance', 'today'];
export const getTimetableQueryKey = () => ['portal', 'timetable'];
export const getAttendancePlannerQueryKey = () => ['portal', 'attendance', 'planner'];

export const useGetPortalStatus = (options) =>
  useQuery({
    queryKey: getPortalStatusQueryKey(),
    queryFn: getPortalStatus,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useVerifyPortal = (options) =>
  useQuery({
    queryKey: getPortalVerifyQueryKey(),
    queryFn: verifyPortalSession,
    staleTime: 5 * 60 * 1000,
    retry: 0,
    ...options,
  });

export const useConnectPortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectPortal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getPortalVerifyQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTimetableQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAttendancePlannerQueryKey() });
    },
  });
};

export const useSyncPortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPortalData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getPortalVerifyQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTimetableQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAttendancePlannerQueryKey() });
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
      queryClient.invalidateQueries({ queryKey: getPortalVerifyQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getTimetableQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAttendancePlannerQueryKey() });
    },
  });
};

export const useGetTodayAttendance = (options) =>
  useQuery({
    queryKey: getTodayAttendanceQueryKey(),
    queryFn: getTodayAttendance,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useMarkAttendanceCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAttendanceCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getTodayAttendanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getPortalVerifyQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAttendancePlannerQueryKey() });
    },
  });
};

export const useGetTimetable = (options) =>
  useQuery({
    queryKey: getTimetableQueryKey(),
    queryFn: getTimetableData,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const useGetAttendancePlanner = (options) =>
  useQuery({
    queryKey: getAttendancePlannerQueryKey(),
    queryFn: getAttendancePlanner,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
