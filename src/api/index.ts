import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'http://138.249.7.176:8000';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// Token interceptor
client.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('w_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// ── Auth ────────────────────────────────────────────────────────────────────
export async function apiLogin(username: string, password: string): Promise<string> {
  // OAuth2 form-encoded
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const res = await client.post('/login', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const token = res.data.access_token || res.data.token;
    if (token) await SecureStore.setItemAsync('w_token', token);
    return token;
  } catch {
    // JSON fallback
    const res = await client.post('/login', { username, password });
    const token = res.data.access_token || res.data.token;
    if (token) await SecureStore.setItemAsync('w_token', token);
    return token;
  }
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function apiRegister(data: {
  username: string;
  password: string;
  full_name?: string;
  class_name?: string;
  phone?: string;
  role?: string;
}): Promise<any> {
  const res = await client.post('/users', data);
  return res.data;
}

// ── Devices ──────────────────────────────────────────────────────────────────
export async function apiGetDevice(deviceId: string): Promise<any> {
  const res = await client.get(`/devices/${deviceId}`);
  return res.data;
}

export async function apiSendData(deviceId: string, data: Record<string, any>): Promise<any> {
  const res = await client.post(`/devices/${deviceId}/data`, data);
  return res.data;
}

export async function apiGetDevices(): Promise<any[]> {
  const res = await client.get('/devices');
  return Array.isArray(res.data) ? res.data : res.data?.data || [];
}

export async function apiServerStatus(): Promise<boolean> {
  try {
    await client.get('/', { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}
