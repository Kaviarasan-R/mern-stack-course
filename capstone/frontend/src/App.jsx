import { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthContext from "./context/authContext";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";

function App() {
    const { user, loading } = useContext(AuthContext);

    // Wait until we know if the refresh token cookie is still valid
    if (loading) return <p className="loading">Loading...</p>;

    // Logged in -> chat page, logged out -> login page
    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/chat" /> : <AuthPage type="login" />} />
            <Route path="/register" element={user ? <Navigate to="/chat" /> : <AuthPage type="register" />} />
            <Route path="/chat" element={user ? <ChatPage /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={user ? "/chat" : "/login"} />} />
        </Routes>
    );
}

export default App;
