import axios from 'axios';
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || ''}/api`
});
export const runPipeline = payload => api.post('/pipeline/run', payload).then(r => r.data);
export const getPipelineStatus = runId => api.get(`/pipeline/status/${runId}`).then(r => r.data);
export const getHistory = () => api.get('/history').then(r => r.data);
