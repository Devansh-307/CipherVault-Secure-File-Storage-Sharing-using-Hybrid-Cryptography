import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth_router,
    files_router,
    shares_router,
    security_router,
    benchmark_router
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="""
    ## Industry-Grade Hybrid Cryptography Secure File Storage & Sharing API
    Combines **AES-256-GCM** authenticated symmetric encryption, **RSA-2048/4096 OAEP** key encapsulation, 
    **SHA-256** tamper-evident integrity digests, and **RSA-PSS** non-repudiation digital signatures.
    """,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(files_router, prefix=settings.API_V1_STR)
app.include_router(shares_router, prefix=settings.API_V1_STR)
app.include_router(security_router, prefix=settings.API_V1_STR)
app.include_router(benchmark_router, prefix=settings.API_V1_STR)

PROJECT_ROOT = settings.STORAGE_DIR.parent.parent
DOCX_PATH = PROJECT_ROOT / "CIPHERVAULT_PROJECT_REPORT_AND_INTERVIEW_GUIDE.docx"

@app.get("/api/download-report")
@app.get("/download-report")
@app.get("/CIPHERVAULT_PROJECT_REPORT_AND_INTERVIEW_GUIDE.docx")
async def download_word_report():
    """Direct download endpoint for the complete Word Document project report."""
    if DOCX_PATH.exists():
        return FileResponse(
            path=str(DOCX_PATH),
            filename="CIPHERVAULT_PROJECT_REPORT_AND_INTERVIEW_GUIDE.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    return JSONResponse(status_code=404, content={"error": "Word Document not found on server."})

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "author": "Devansh Rathore"
    }

# React Static Files & SPA Fallback Mount
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_STATIC = PROJECT_ROOT / "frontend"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path in ["download-report", "api/download-report", "CIPHERVAULT_PROJECT_REPORT_AND_INTERVIEW_GUIDE.docx"]:
            return await download_word_report()
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

elif FRONTEND_STATIC.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_STATIC), name="static")

    @app.get("/")
    async def serve_fallback_index():
        index_file = FRONTEND_STATIC / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "CipherVault Backend Running"}
