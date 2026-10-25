import axios from "axios";

// One axios instance for the whole app, every call goes to our backend
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // send the refresh token cookie (jwt) to the backend
});

export default api;
