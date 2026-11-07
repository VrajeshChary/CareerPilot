import os
import re
from typing import List, Dict, Any, Optional
import chromadb
from app.core.config import settings

os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
_chroma_client: Optional[chromadb.PersistentClient] = None

def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_DIR)
    return _chroma_client

def get_collection(collection_name: str):
    client = get_chroma_client()
    return client.get_or_create_collection(name=collection_name)

def process_text_to_chunks(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    """Split text into overlapping chunks respecting paragraph and sentence boundaries."""
    if not text:
        return []
    
    # First split by paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If paragraph itself is too long, split by sentences or lines
            if len(para) > chunk_size:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                sub_chunk = ""
                for s in sentences:
                    if len(sub_chunk) + len(s) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {s}".strip()
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = s
                if sub_chunk:
                    chunks.append(sub_chunk)
                current_chunk = ""
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    # In case no chunks were produced (e.g. single block without newlines)
    if not chunks and text:
        step = max(chunk_size - chunk_overlap, 100)
        chunks = [text[i:i + chunk_size] for i in range(0, len(text), step)]

    return chunks

def add_document_to_vectorstore(text: str, user_id: int, resume_id: int) -> int:
    """Chunks text and upserts vectors into user collection."""
    collection_name = f"user_{user_id}_resumes"
    collection = get_collection(collection_name)
    
    chunks = process_text_to_chunks(text)
    if not chunks:
        return 0

    ids = [f"res_{resume_id}_chk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"user_id": int(user_id), "resume_id": int(resume_id), "chunk_index": i} 
        for i in range(len(chunks))
    ]

    collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=metadatas
    )
    return len(chunks)

def query_vectorstore(user_id: int, query: str, top_k: int = 5, resume_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Query semantic vector store for user's indexed resumes."""
    collection_name = f"user_{user_id}_resumes"
    try:
        collection = get_collection(collection_name)
        count = collection.count()
        if count == 0:
            return []

        where_filter = {"resume_id": int(resume_id)} if resume_id is not None else None
        
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, count),
            where=where_filter
        )

        retrieved: List[Dict[str, Any]] = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else [{}] * len(docs)
            dists = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)
            
            for doc, meta, dist in zip(docs, metas, dists):
                retrieved.append({
                    "content": doc,
                    "metadata": meta,
                    "distance": dist
                })
        return retrieved
    except Exception as e:
        print(f"[RAG Engine] Query error: {e}")
        return []

def delete_resume_vectors(user_id: int, resume_id: int):
    """Deletes all vector embeddings associated with a resume."""
    collection_name = f"user_{user_id}_resumes"
    try:
        collection = get_collection(collection_name)
        # Chroma supports where filter in delete
        collection.delete(where={"resume_id": int(resume_id)})
    except Exception as e:
        print(f"[RAG Engine] Delete error: {e}")
