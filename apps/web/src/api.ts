// src/api.ts

export interface CrudItem {
  id?: number | string;
  name: string;
  description: string;
}

const BASE_URL = 'http://localhost:3000'; // Update if needed

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  async getAll(type: 'mysql' | 'mongo'): Promise<CrudItem[]> {
    return fetchJSON<CrudItem[]>(`${BASE_URL}/${type}`);
  },

  async create(type: 'mysql' | 'mongo', data: CrudItem): Promise<CrudItem> {
    return fetchJSON<CrudItem>(`${BASE_URL}/${type}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(type: 'mysql' | 'mongo', id: string | number, data: CrudItem): Promise<CrudItem> {
    return fetchJSON<CrudItem>(`${BASE_URL}/${type}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(type: 'mysql' | 'mongo', id: string | number): Promise<void> {
    await fetchJSON<void>(`${BASE_URL}/${type}/${id}`, {
      method: 'DELETE',
    });
  },
};
