import { useContext, useEffect, useRef, useState } from "react";
import AuthContext from "../context/authContext";
import api from "../api/axios";

export default function Sidebar({ chats, activeId, onSelect, onNew, onDelete }) {
    const { user, authHeader, logout } = useContext(AuthContext);
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);

    const fileRef = useRef(null); // hidden <input type="file">, opened by the upload button

    async function fetchDocuments() {
        try {
            const { data } = await api.get("/documents", authHeader);
            setDocuments(data);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        fetchDocuments();
    }, []);

    async function handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file); // same field name as uploadFile.single("file") in the backend

        setUploading(true);
        try {
            await api.post("/documents/upload", formData, authHeader);
            await fetchDocuments();
        } catch (error) {
            alert(error.response?.data?.message ?? "Upload failed");
        } finally {
            setUploading(false);
            e.target.value = ""; // allow uploading the same file again
        }
    }

    async function removeDocument(id) {
        if (!confirm("Delete this document?")) return;
        await api.delete(`/documents/${id}`, authHeader);
        await fetchDocuments();
    }

    return (
        <aside className="sidebar">
            <button className="primary" onClick={onNew}>+ New chat</button>

            <h3>Chats</h3>
            <ul className="list">
                {chats.length === 0 && <li className="muted">No chats yet</li>}
                {chats.map((chat) => (
                    <li key={chat.id} className={chat.id === activeId ? "active" : ""} onClick={() => onSelect(chat.id)}>
                        <span title={chat.title}>{chat.title}</span>
                        <button className="icon" onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}>×</button>
                    </li>
                ))}
            </ul>

            <h3>Documents</h3>
            <ul className="list">
                {documents.length === 0 && <li className="muted">No documents yet</li>}
                {documents.map((document) => (
                    <li key={document.id} title={`${document.pages} pages, ${document._count.chunks} chunks`}>
                        <span>{document.filename}</span>
                        <button className="icon" onClick={() => removeDocument(document.id)}>×</button>
                    </li>
                ))}
            </ul>

            <input type="file" accept="application/pdf" ref={fileRef} onChange={handleUpload} hidden />
            <button onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload PDF"}
            </button>

            <div className="user">
                <span>{user.username}</span>
                <button onClick={logout}>Logout</button>
            </div>
        </aside>
    );
}
