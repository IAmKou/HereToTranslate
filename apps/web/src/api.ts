import axios from 'axios';

export interface CrudItem {
  id?: number | string;
  name: string;
}

const BASE_URL = 'http://localhost:3000/api';

export const api = {
  async getAll(type: 'test' | 'mongo'): Promise<CrudItem[]> {
    const res = await axios.get<CrudItem[]>(`${BASE_URL}/${type}`);
    return res.data;
  },

  async create(type: 'test' | 'mongo', data: CrudItem): Promise<CrudItem> {
    const res = await axios.post<CrudItem>(`${BASE_URL}/${type}`, data);
    return res.data;
  },

  async update(type: 'test' | 'mongo', id: string | number, data: CrudItem): Promise<CrudItem> {
    const res = await axios.put<CrudItem>(`${BASE_URL}/${type}/${id}`, data);
    return res.data;
  },

  async remove(type: 'test' | 'mongo', id: string | number): Promise<void> {
    await axios.delete(`${BASE_URL}/${type}/${id}`);
  },
};
