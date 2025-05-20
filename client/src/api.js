import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000', // your backend server URL
});

// Attach token to every request if present
API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  return req;
});

export default API;
