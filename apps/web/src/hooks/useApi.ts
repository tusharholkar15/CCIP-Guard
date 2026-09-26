'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.dashboard.getStats,
    refetchInterval: 30000,
  });
}

export function useChains() {
  return useQuery({
    queryKey: ['chains'],
    queryFn: api.chains.list,
    refetchInterval: 30000,
  });
}

export function useLanes() {
  return useQuery({
    queryKey: ['lanes'],
    queryFn: api.lanes.list,
    refetchInterval: 30000,
  });
}

export function useMessages(params?: Parameters<typeof api.messages.list>[0]) {
  return useQuery({
    queryKey: ['messages', params],
    queryFn: () => api.messages.list(params),
    refetchInterval: 15000,
  });
}

export function useMessage(id: string) {
  return useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.messages.get(id),
    enabled: !!id,
  });
}

export function useIncidents(params?: Parameters<typeof api.incidents.list>[0]) {
  return useQuery({
    queryKey: ['incidents', params],
    queryFn: () => api.incidents.list(params),
    refetchInterval: 15000,
  });
}

export function useAlerts(params?: Parameters<typeof api.alerts.list>[0]) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => api.alerts.list(params),
    refetchInterval: 15000,
  });
}

export function useResponses(params?: Parameters<typeof api.responses.list>[0]) {
  return useQuery({
    queryKey: ['responses', params],
    queryFn: () => api.responses.list(params),
    refetchInterval: 15000,
  });
}

export function useAuditLogs(params?: Parameters<typeof api.audit.list>[0]) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => api.audit.list(params),
    refetchInterval: 30000,
  });
}

export function useCreateResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.responses.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useApproveResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.responses.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useRejectResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.responses.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSimulationScenarios() {
  return useQuery({
    queryKey: ['simulation', 'scenarios'],
    queryFn: api.simulation.getScenarios,
    staleTime: 60000,
  });
}

export function useDetectorConfig() {
  return useQuery({
    queryKey: ['simulation', 'config'],
    queryFn: api.simulation.getConfig,
    staleTime: 60000,
  });
}

export function useRunSimulationDetect() {
  return useMutation({
    mutationFn: api.simulation.detect,
  });
}

export function useRunSimulationIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenarioId: string) => api.simulation.runIncidentSimulation(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

