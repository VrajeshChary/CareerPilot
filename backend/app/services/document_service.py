import os
import fitz  # PyMuPDF
from docx import Document
from fastapi import UploadFile, HTTPException

class DocumentService:
    @staticmethod
    async def parse_upload(file: UploadFile) -> str:
        text = ""
        ext = os.path.splitext(file.filename)[1].lower()
        
        try:
            content = await file.read()
            if ext == ".pdf":
                doc = fitz.open(stream=content, filetype="pdf")
                for page in doc:
                    text += page.get_text("text") + "\n"
            elif ext == ".docx":
                from io import BytesIO
                doc = Document(BytesIO(content))
                for para in doc.paragraphs:
                    text += para.text + "\n"
            elif ext == ".txt":
                text = content.decode("utf-8")
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
                
            return text.strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error parsing document: {str(e)}")
