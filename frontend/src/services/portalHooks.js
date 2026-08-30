import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  connectPortal,
  getPortalStatus,
  syncPortalData,
  getAcademicCalendar,
  disconnectPortal,
} from './portalClient.js';

export const getPortalStatusQueryKey = () => ['portal', 'status'];
export const getCalendarQueryKey = () => ['portal', 'calendar'];

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
    },
  });
};

export const useSyncPortal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPortalData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPortalStatusQueryKey() });
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
    },
  });
};
