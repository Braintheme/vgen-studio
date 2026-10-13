import axios, { type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { toApiRequestError } from './errors';

/** The one configured HTTP client. Every failure is rejected as ApiRequestError. */
export const http = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiRequestError(error)),
);

/** Options every endpoint function accepts (Vue Query passes its AbortSignal). */
export interface RequestOptions {
  readonly signal?: AbortSignal;
}

/**
 * Typed request helpers: the response is validated with the shared zod schema, so a
 * contract drift between API and admin fails loudly instead of rendering garbage.
 */
export const getJson = async <S extends z.ZodType>(
  schema: S,
  url: string,
  config: AxiosRequestConfig = {},
): Promise<z.output<S>> => schema.parse((await http.get<unknown>(url, config)).data);

export const postJson = async <S extends z.ZodType>(
  schema: S,
  url: string,
  body?: unknown,
  config: AxiosRequestConfig = {},
): Promise<z.output<S>> => schema.parse((await http.post<unknown>(url, body, config)).data);

export const deleteResource = async (url: string, config: AxiosRequestConfig = {}): Promise<void> => {
  await http.delete(url, config);
};
