import axios from 'axios';
import type {EntryPass, PassPerson} from '../components/exhibition/entryPass';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const publicApi = axios.create({
  baseURL: `${API_BASE_URL}/public/exhibition`,
  headers: {'Content-Type': 'application/json'},
  timeout: 20000,
});

type RegisterPassesResponse = {
  success: boolean;
  message: string;
  data: EntryPass[];
};

/** Phone numbers the server rejected because they already have a pass (HTTP 409). */
export const getDuplicatePhones = (error: unknown): string[] => {
  if (!axios.isAxiosError<{duplicatePhones?: string[]}>(error) || error.response?.status !== 409) {
    return [];
  }
  return error.response.data?.duplicatePhones ?? [];
};

export const registerExhibitionPasses = async (people: PassPerson[]) => {
  const {data} = await publicApi.post<RegisterPassesResponse>('/passes', {people});
  return data.data;
};
