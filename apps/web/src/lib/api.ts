import type {
  DashboardStats,
  Chain,
  Lane,
  PaginatedResponse,
  Message,
  Incident,
  Alert,
  ResponseProposal,
  AuditLog,
} from '@bridgeguard/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const operatorToken = localStorage.getItem('bridgeguard_operator_token');
    const operatorId = localStorage.getItem('bridgeguard_operator_id') || 'viewer';
    const operatorRole = localStorage.getItem('bridgeguard_operator_role') || 'viewer';
    const operatorName = localStorage.getItem('bridgeguard_operator_name') || 'Guest Viewer';

    if (operatorToken) {
      headers['Authorization'] = `Bearer ${operatorToken}`;
      headers['x-operator-token'] = operatorToken;
    }
    if (operatorId) headers['x-operator-id'] = operatorId;
    if (operatorRole) headers['x-operator-role'] = operatorRole;
    if (operatorName) headers['x-operator-name'] = operatorName;
  }

  try {
    const response = await fetch(url, { ...init, headers, cache: 'no-store' });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Error',
        message: response.statusText,
        statusCode: response.status,
      }));
      throw error;
    }

    return response.json();
  } catch (err) {
    console.error(`[API] Failed to fetch ${endpoint}:`, err);
    throw err;
  }
}

// Dashboard
export const api = {
  dashboard: {
    getStats: () => fetchApi<DashboardStats>('/api/dashboard/stats'),
  },
  chains: {
    list: () => fetchApi<{ data: Chain[] }>('/api/chains'),
    get: (id: string) => fetchApi<Chain>(`/api/chains/${id}`),
  },
  lanes: {
    list: () => fetchApi<{ data: Lane[] }>('/api/lanes'),
    get: (id: string) => fetchApi<Lane>(`/api/lanes/${id}`),
  },
  messages: {
    list: (params?: {
      page?: number;
      pageSize?: number;
      search?: string;
      state?: string;
      sourceChainId?: number;
      destinationChainId?: number;
      sortBy?: string;
      sortOrder?: string;
    }) => fetchApi<PaginatedResponse<Message>>('/api/messages', { params: params as any }),
    get: (id: string) => fetchApi<Message>(`/api/messages/${id}`),
  },
  incidents: {
    list: (params?: { page?: number; pageSize?: number; status?: string; type?: string }) =>
      fetchApi<PaginatedResponse<Incident>>('/api/incidents', { params: params as any }),
    get: (id: string) => fetchApi<Incident>(`/api/incidents/${id}`),
    update: (id: string, data: { status: string }) =>
      fetchApi<Incident>(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  alerts: {
    list: (params?: { page?: number; pageSize?: number; status?: string }) =>
      fetchApi<PaginatedResponse<Alert>>('/api/alerts', { params: params as any }),
    get: (id: string) => fetchApi<Alert>(`/api/alerts/${id}`),
    update: (id: string, data: { status: string }) =>
      fetchApi<Alert>(`/api/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  responses: {
    list: (params?: { page?: number; pageSize?: number; status?: string }) =>
      fetchApi<PaginatedResponse<ResponseProposal>>('/api/responses', { params: params as any }),
    get: (id: string) => fetchApi<ResponseProposal>(`/api/responses/${id}`),
    create: (data: { type: string; target: string; reason: string; incidentId?: string }) =>
      fetchApi<ResponseProposal>('/api/responses', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) =>
      fetchApi<ResponseProposal>(`/api/responses/${id}/approve`, { method: 'POST', body: '{}' }),
    reject: (id: string, reason?: string) =>
      fetchApi<ResponseProposal>(`/api/responses/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },
  audit: {
    list: (params?: { page?: number; pageSize?: number; search?: string }) =>
      fetchApi<PaginatedResponse<AuditLog>>('/api/audit', { params: params as any }),
  },
  simulation: {
    getScenarios: () => fetchApi<{ data: any[] }>('/api/simulation/scenarios'),
    getConfig: () => fetchApi<any>('/api/simulation/config'),
    detect: (data: { scenarioId?: string; customContext?: any }) =>
      fetchApi<{ scenario?: any; result: any; notice: string }>('/api/simulation/detect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    runIncidentSimulation: (scenarioId: string) =>
      fetchApi<{
        success: boolean;
        notice: string;
        riskResult: any;
        incident?: any;
        alert?: any;
        alreadyExisted?: boolean;
        message?: string;
      }>('/api/simulation/incident', {
        method: 'POST',
        body: JSON.stringify({ scenarioId }),
      }),
  },
};
