import { useContext, useEffect, useRef, useState } from "react";
import AuthContext from "../context/authContext";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Message from "../components/Message";

export default function ChatPage() {
    const { user, authHeader } = useContext(AuthContext);
    const storageKey = `chats_${user.id}`; // every user has their own chats in localStorage

    // Function inside useState = runs only once, so chats are loaded BEFORE the save effect below runs
    // Title = first question (fixes old chats saved with a cut title)
    const [chats, setChats] = useState(() =>
        (JSON.parse(localStorage.getItem(storageKey)) ?? []).map((chat) => ({
            ...chat,
            title: chat.messages.find((message) => message.role === "user")?.content ?? chat.title,
        }))
    );
    const [activeId, setActiveId] = useState(chats[0]?.id ?? null);
    const [mode, setMode] = useState("rag"); // "rag" -> /api/chat, "agent" -> /api/agent
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const bottomRef = useRef(null);
    const activeChat = chats.find((chat) => chat.id === activeId);

    // Save to localStorage whenever chats change
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(chats));
    }, [chats, storageKey]);

    // Scroll to the latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeChat?.messages.length, loading]);

    function addMessage(chatId, message) {
        // prev => ..., so we always update the latest chats (two messages are added one after another)
        setChats((prev) => prev.map((chat) => chat.id === chatId ? { ...chat, messages: [...chat.messages, message] } : chat));
    }

    function deleteChat(chatId) {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        if (chatId === activeId) setActiveId(null);
    }

    async function sendMessage(e) {
        e.preventDefault();
        const query = input.trim();
        if (!query || loading) return;

        // No chat selected -> start a new one, first question becomes the title
        let chatId = activeId;
        if (!chatId) {
            chatId = Date.now().toString();
            setChats((prev) => [{ id: chatId, title: query, messages: [] }, ...prev]);
            setActiveId(chatId);
        }

        addMessage(chatId, { role: "user", content: query });
        setInput("");
        setLoading(true);

        try {
            const { data } = await api.post(mode === "rag" ? "/chat" : "/agent", { query }, authHeader);
            addMessage(chatId, { role: "assistant", mode, content: data.answer, sources: data.sources, steps: data.steps });
        } catch (error) {
            addMessage(chatId, { role: "assistant", mode, content: error.response?.data?.message ?? "Something went wrong", error: true });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="chat-card">
            <Sidebar
                chats={chats}
                activeId={activeId}
                onSelect={setActiveId}
                onNew={() => setActiveId(null)}
                onDelete={deleteChat}
            />

            <main className="chat">
                <header className="chat-header">
                    <h2 title={activeChat?.title}>{activeChat?.title ?? "New chat"}</h2>

                    {/* RAG = fixed steps (search -> answer), Agent = AI decides which tool to use */}
                    <div className="mode-switch">
                        <button className={mode === "rag" ? "active" : ""} onClick={() => setMode("rag")}>RAG</button>
                        <button className={mode === "agent" ? "active" : ""} onClick={() => setMode("agent")}>AI Agent</button>
                    </div>
                </header>

                <div className="messages">
                    {!activeChat && <p className="empty">Upload a PDF and ask anything about it.</p>}
                    {activeChat?.messages.map((message, i) => <Message key={i} message={message} />)}
                    {loading && <p className="muted">Thinking...</p>}
                    <div ref={bottomRef} />
                </div>

                <form className="chat-input" onSubmit={sendMessage}>
                    <input
                        placeholder={mode === "rag" ? "Ask about your documents..." : "Ask the agent anything..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button className="primary" disabled={loading || !input.trim()}>Send</button>
                </form>
            </main>
        </div>
    );
}
