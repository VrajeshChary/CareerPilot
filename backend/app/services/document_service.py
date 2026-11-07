import os
import re
from fastapi import UploadFile, HTTPException

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from docx import Document
except ImportError:
    Document = None

class DocumentService:
    @staticmethod
    async def parse_upload(file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or "")[1].lower()
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        text = ""
        try:
            if ext == ".pdf":
                if fitz is None:
                    raise HTTPException(status_code=500, detail="PyMuPDF is not installed on the server.")
                doc = fitz.open(stream=content, filetype="pdf")
                pages_text = []
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    page_text = page.get_text("text")
                    if page_text:
                        pages_text.append(page_text.strip())
                text = "\n\n".join(pages_text)
                
            elif ext in [".docx", ".doc"]:
                if Document is None:
                    raise HTTPException(status_code=500, detail="python-docx is not installed on the server.")
                from io import BytesIO
                doc = Document(BytesIO(content))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                # Also include table text
                table_texts = []
                for table in doc.tables:
                    for row in table.rows:
                        row_vals = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_vals:
                            table_texts.append(" | ".join(row_vals))
                text = "\n".join(paragraphs + table_texts)
                
            elif ext in [".txt", ".md", ".rtf", ".json"]:
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError:
                    text = content.decode("latin-1", errors="ignore")
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file format '{ext}'. Please upload a PDF, DOCX, or TXT file."
                )

            # Clean and normalize text
            text = text.replace("\x00", "")
            # Normalize whitespace while preserving single newlines
            text = re.sub(r"[ \t]+", " ", text)
            text = re.sub(r"\n{3,}", "\n\n", text).strip()
            
            if len(text) < 20:
                raise HTTPException(
                    status_code=400, 
                    detail="Could not extract readable text from this file. Please ensure it is not a scanned image PDF."
                )
                
            return text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")
