from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.config import settings

# Load embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def get_vectorstore(collection_name: str):
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_DB_DIR
    )

def process_text_to_chunks(text: str, chunk_size: int = 1000, chunk_overlap: int = 200):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return text_splitter.split_text(text)

def add_document_to_vectorstore(text: str, user_id: int, resume_id: int):
    collection_name = f"user_{user_id}_resumes"
    vectorstore = get_vectorstore(collection_name)
    
    chunks = process_text_to_chunks(text)
    metadatas = [{"user_id": user_id, "resume_id": resume_id} for _ in chunks]
    
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    return True
