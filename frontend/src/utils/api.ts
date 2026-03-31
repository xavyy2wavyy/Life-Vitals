const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_URL}/api${endpoint}`);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  },
  
  post: async (endpoint: string, data?: any) => {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  },
  
  delete: async (endpoint: string) => {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  },
};

export const getToday = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};
