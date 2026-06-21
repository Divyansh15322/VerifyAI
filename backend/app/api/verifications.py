import os
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.api.auth import get_current_user
from app.models.database import User, Verification, VerificationFile, AuditLog
from app.schemas.verification import VerificationResponse, VerificationSummary
from app.services.agentic_pipeline import run_agentic_verification
from app.services.report import generate_verification_pdf

router = APIRouter(prefix="/verifications", tags=["verifications"])

@router.post("/", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
def create_verification(
    industry: str = Form(...),
    verification_type: str = Form(...),
    description: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Create directory structure for user uploads
    user_upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)
    
    saved_files_metadata = []
    saved_db_files = []
    
    # 2. Save physical files
    for file in files:
        # Generate unique file name to prevent collision
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(user_upload_dir, unique_filename)
        
        try:
            with open(file_path, "wb") as f:
                content = file.file.read()
                f.write(content)
                
            file_meta = {
                "path": file_path,
                "name": file.filename,
                "mime_type": file.content_type or "application/octet-stream"
            }
            saved_files_metadata.append(file_meta)
        except Exception as e:
            # Clean up previously saved files in this request
            for f_meta in saved_files_metadata:
                if os.path.exists(f_meta["path"]):
                    os.remove(f_meta["path"])
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save uploaded file '{file.filename}': {e}"
            )
            
    # 3. Trigger Agentic AI Pipeline (7-Agent RAG orchestration)
    start_time = datetime.now()
    try:
        ai_result = run_agentic_verification(
            industry=industry,
            verification_type=verification_type,
            description=description or "",
            files=saved_files_metadata
        )
    except Exception as e:
        # Cleanup
        for f_meta in saved_files_metadata:
            if os.path.exists(f_meta["path"]):
                os.remove(f_meta["path"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agentic AI pipeline processing error: {e}"
        )
    end_time = datetime.now()
    latency_ms = int((end_time - start_time).total_seconds() * 1000)
    
    # 4. Save to Database
    verification = Verification(
        user_id=current_user.id,
        industry=industry,
        verification_type=verification_type,
        description=description,
        status=ai_result.get("status", "Needs Review"),
        confidence_score=ai_result.get("confidence_score", 50),
        explanation=ai_result.get("explanation", ""),
        checklist=json.dumps(ai_result.get("checklist", [])),
        timeline=json.dumps(ai_result.get("timeline", [])),
        recommendations=json.dumps(ai_result.get("recommendations", [])),
        retrieved_context=json.dumps(ai_result.get("retrieved_context", []))
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)
    
    # Save file entries
    for file_meta, upload_file in zip(saved_files_metadata, files):
        db_file = VerificationFile(
            verification_id=verification.id,
            file_path=file_meta["path"],
            file_name=file_meta["name"],
            file_type=file_meta["mime_type"]
        )
        db.add(db_file)
        saved_db_files.append(db_file)
        
    # Log Audit Detail
    audit = AuditLog(
        user_id=current_user.id,
        action="submit_verification",
        details=json.dumps({
            "verification_id": verification.id,
            "industry": industry,
            "status": verification.status,
            "confidence_score": verification.confidence_score,
            "files_count": len(files),
            "latency_ms": latency_ms
        })
    )
    db.add(audit)
    db.commit()
    
    # Construct response model
    verification.files = saved_db_files
    # Unpack JSON strings for schema validation
    verification.checklist = json.loads(verification.checklist)
    verification.timeline = json.loads(verification.timeline)
    verification.recommendations = json.loads(verification.recommendations)
    
    return verification

@router.get("/", response_model=List[VerificationSummary])
def get_verifications(
    industry: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Verification)
    
    # Normal users can only see their own history, admins see everything
    if current_user.role != "admin":
        query = query.filter(Verification.user_id == current_user.id)
        
    if industry:
        query = query.filter(Verification.industry.ilike(f"%{industry}%"))
        
    if status:
        query = query.filter(Verification.status == status)
        
    if search:
        query = query.filter(
            or_(
                Verification.description.ilike(f"%{search}%"),
                Verification.verification_type.ilike(f"%{search}%")
            )
        )
        
    # Order by newest
    query = query.order_by(Verification.created_at.desc())
    return query.all()

@router.get("/{verification_id}", response_model=VerificationResponse)
def get_verification_details(
    verification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verification = db.query(Verification).filter(Verification.id == verification_id).first()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification record not found"
        )
        
    # Check permissions
    if current_user.role != "admin" and verification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_430_FORBIDDEN,
            detail="Access denied to this verification record"
        )
        
    # Unpack JSON strings
    verification.checklist = json.loads(verification.checklist) if verification.checklist else []
    verification.timeline = json.loads(verification.timeline) if verification.timeline else []
    verification.recommendations = json.loads(verification.recommendations) if verification.recommendations else []
    verification.retrieved_context = json.loads(verification.retrieved_context) if getattr(verification, "retrieved_context", None) else []
    
    return verification

@router.get("/{verification_id}/report")
def download_verification_report(
    verification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verification = db.query(Verification).filter(Verification.id == verification_id).first()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification record not found"
        )
        
    # Check permissions
    if current_user.role != "admin" and verification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_430_FORBIDDEN,
            detail="Access denied to this verification record"
        )
        
    # Get user email
    user = db.query(User).filter(User.id == verification.user_id).first()
    user_email = user.email if user else "unknown@verifyai.com"
    
    files = verification.files
    
    pdf_buffer = generate_verification_pdf(verification, files, user_email)
    
    filename = f"verifyai_report_VER-{verification_id}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
