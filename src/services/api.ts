import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/constants';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/helpers';

const logger = createLogger('ApiClient');

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request – attach auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      logger.debug(`→ ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response – auto-refresh on 401
    this.client.interceptors.response.use(
      (res) => {
        logger.debug(`← ${res.status} ${res.config.url}`);
        return res;
      },
      async (error: AxiosError) => {
        const original = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const newToken = await this.refreshToken();
            this.client.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            return this.client(original);
          } catch {
            await this.clearAuth();
            return Promise.reject(error);
          }
        }

        logger.error(`API error ${error.response?.status}`, {
          url: error.config?.url,
          message: (error.response?.data as { message?: string })?.message,
        });

        return Promise.reject(error);
      },
    );
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) throw new Error('No refresh token');

      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { token } = res.data;
      await SecureStore.setItemAsync('auth_token', token);
      return token;
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async clearAuth() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(async () => {
      const res = await this.client.get<T>(url, config);
      return res.data;
    });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(async () => {
      const res = await this.client.post<T>(url, data, config);
      return res.data;
    });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(async () => {
      const res = await this.client.put<T>(url, data, config);
      return res.data;
    });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return withRetry(async () => {
      const res = await this.client.delete<T>(url, config);
      return res.data;
    });
  }

  async uploadFile<T>(
    url: string,
    fileUri: string,
    fieldName = 'file',
    onProgress?: (pct: number) => void,
  ): Promise<T> {
    const form = new FormData();
    const filename = fileUri.split('/').pop() ?? 'file';
    const ext = filename.split('.').pop() ?? 'bin';
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4', mp3: 'audio/mpeg', jpg: 'image/jpeg',
      jpeg: 'image/jpeg', png: 'image/png', webm: 'video/webm',
    };

    form.append(fieldName, {
      uri: fileUri,
      name: filename,
      type: mimeTypes[ext] ?? 'application/octet-stream',
    } as unknown as Blob);

    const res = await this.client.post<T>(url, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
    return res.data;
  }
}

export const api = new ApiClient();
