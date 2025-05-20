import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000/api', // adjust your API base URL
});

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); // Or your storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
