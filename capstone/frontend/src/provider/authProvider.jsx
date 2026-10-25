import { useEffect, useState } from "react";
import AuthContext from "../context/authContext";
import api from "../api/axios";

// Get a new access token a bit before it expires (backend ACCESS_TOKEN_EXPIRES_IN=15m)
const REFRESH_EVERY = 14 * 60 * 1000;

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // { id, username }
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Uses the refresh token cookie (sent automatically) to get a new access token
    async function refresh() {
        try {
            const { data } = await api.get("/auth/refresh");
            setAccessToken(data.accessToken);
            setUser(data.user);
        } catch {
            // no cookie / expired, user has to login again
            setAccessToken(null);
            setUser(null);
        }
    }

    // On page reload: the access token is gone (it was only in state), but the cookie is still there
    useEffect(() => {
        refresh().finally(() => setLoading(false));
    }, []);

    // While logged in, refresh the access token every 14 minutes
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(refresh, REFRESH_EVERY);
        return () => clearInterval(interval);
    }, [user]);

    async function login(username, password) {
        const { data } = await api.post("/auth/login", { username, password });
        setAccessToken(data.accessToken);
        setUser(data.user);
    }

    async function register(username, password) {
        await api.post("/auth/register", { username, password });
        await login(username, password); // login directly after register
    }

    async function logout() {
        await api.post("/auth/logout");
        setAccessToken(null);
        setUser(null);
    }

    // Pass this as the last argument of every protected call: api.get("/documents", authHeader)
    const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

    return (
        <AuthContext.Provider value={{ user, loading, authHeader, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
