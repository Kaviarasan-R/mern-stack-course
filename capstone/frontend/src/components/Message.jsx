export default function Message({ message }) {
    const { role, mode, content, sources, steps, error } = message;

    return (
        <div className={`message ${role} ${error ? "error" : ""}`}>
            {role === "assistant" && <span className="badge">{mode === "rag" ? "RAG" : "AI Agent"}</span>}
            <p>{content}</p>

            {/* RAG answers: which pages were used */}
            {sources?.length > 0 && (
                <small className="muted">Sources: {sources.map((source) => `doc ${source.documentId} p.${source.page}`).join(", ")}</small>
            )}

            {/* Agent answers: which tools the AI decided to call */}
            {steps?.length > 0 && (
                <small className="muted">Tools used: {steps.map((step) => step.tool).join(", ")}</small>
            )}
        </div>
    );
}
