import axios from 'axios';

// Define the Category interface
export interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define DTO interfaces
export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

// API Base URL
const API_URL = 'http://localhost:3000/api/categories';

// Category Service
export const categoryService = {
  // Get all categories
  async getCategories(): Promise<Category[]> {
    const response = await axios.get<Category[]>(API_URL);
    return response.data;
  },

  // Get a specific category by ID
  async getCategory(id: number): Promise<Category> {
    const response = await axios.get<Category>(`${API_URL}/${id}`);
    return response.data;
  },

  // Create a new category
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await axios.post<Category>(API_URL, data);
    return response.data;
  },

  // Update an existing category
  async updateCategory(id: number, data: UpdateCategoryRequest): Promise<Category> {
    const response = await axios.patch<Category>(`${API_URL}/${id}`, data);
    return response.data;
  },

  // Delete a category
  async deleteCategory(id: number): Promise<void> {
    await axios.delete(`${API_URL}/${id}`);
  }
};