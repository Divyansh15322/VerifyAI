import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, verifications, admin

# Create Database tables (simple migrations for dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Universal Multimodal Evidence Verification Platform API",
    version="1.0.0"
)

# CORS configuration
# Allow React local development port (typically 5173) and any other client interfaces
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. In prod, lock this down.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory as static assets if necessary
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(verifications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Initialize the RAG knowledge base from the knowledge_base/ directory."""
    import logging
    from app.services.knowledge_base import get_knowledge_base
    logger = logging.getLogger("startup")
    logger.info("🚀 VerifyAI Startup: Initializing RAG Knowledge Base...")
    kb = get_knowledge_base()
    if kb._initialized:
        logger.info(f"✓ Knowledge Base ready: {len(kb.all_chunks)} chunks indexed.")
    else:
        logger.warning("⚠ Knowledge Base has no documents. Add files to knowledge_base/ directory.")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
