import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/authContext";

// Same form for /login and /register, `type` decides which one
export default function AuthPage({ type }) {
    const { login, register } = useContext(AuthContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const isLogin = type === "login";

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isLogin) await login(username, password);
            else await register(username, password);
            // No navigate needed, App sees the user and redirects to /chat
        } catch (error) {
            setError(error.response?.data?.message ?? "Something went wrong");
            setLoading(false);
        }
    }

    return (
        <div className="auth-card">
            <h1>AI Research Assistant</h1>
            <p className="muted">{isLogin ? "Login to continue" : "Create a new account"}</p>

            <form onSubmit={handleSubmit}>
                <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

                {error && <p className="error">{error}</p>}

                <button className="primary" disabled={loading}>
                    {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
                </button>
            </form>

            <p className="muted">
                {isLogin ? "No account? " : "Already registered? "}
                <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Register" : "Login"}</Link>
            </p>
        </div>
    );
}
