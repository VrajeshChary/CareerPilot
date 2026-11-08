import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosAdapter } from "axios";
import { isMockModeActive, handleMockRequest, getCustomApiUrl } from "./mockBackend";

const defaultAdapter = axios.defaults.adapter;

const hybridAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  // If sandbox / mock mode is explicitly active or forced
  if (isMockModeActive()) {
    try {
      const data = await handleMockRequest(
        config.url || "",
        (config.method || "get").toLowerCase(),
        config.data,
        config.params
      );
      return {
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    } catch (err: any) {
      if (err.response) {
        return Promise.reject(err);
      }
      return Promise.reject({
        response: {
          status: 500,
          data: { detail: err.message || "Sandbox internal error" },
        },
        config,
      });
    }
  }

  // Otherwise, use standard network adapter
  if (typeof defaultAdapter === "function") {
    try {
      return await defaultAdapter(config);
    } catch (err: any) {
      if (!err.response) {
        err.isNetworkError = true;
      }
      return Promise.reject(err);
    }
  }

  // Fallback to fetch
  const fullUrl = (config.baseURL || "") + (config.url || "");
  try {
    const res = await fetch(fullUrl, {
      method: (config.method || "GET").toUpperCase(),
      headers: config.headers as any,
      body: config.data ? (typeof config.data === "string" ? config.data : JSON.stringify(config.data)) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const error: any = new Error(`Request failed with status code ${res.status}`);
      error.response = { status: res.status, data: json };
      return Promise.reject(error);
    }
    return {
      data: json,
      status: res.status,
      statusText: res.statusText,
      headers: {},
      config,
    } as AxiosResponse;
  } catch (err: any) {
    err.isNetworkError = true;
    return Promise.reject(err);
  }
};

const api = axios.create({
  adapter: hybridAdapter,
});

api.interceptors.request.use((config) => {
  const currentBaseUrl = getCustomApiUrl();
  config.baseURL = currentBaseUrl ? `${currentBaseUrl}/api/v1` : "/api/v1";

  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid or expired
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
