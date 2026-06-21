from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user") # 'user' or 'admin'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    verifications = relationship("Verification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    industry = Column(String, nullable=False)
    verification_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="Needs Review")  # "Supported", "Needs Review", "Insufficient Evidence"
    confidence_score = Column(Integer, default=0)
    explanation = Column(Text, nullable=True)
    checklist = Column(Text, nullable=True)          # JSON array of checklist items
    timeline = Column(Text, nullable=True)           # JSON array of timeline steps
    recommendations = Column(Text, nullable=True)    # JSON array of recommendation strings
    retrieved_context = Column(Text, nullable=True)  # JSON array of retrieved RAG context blocks
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="verifications")
    files = relationship("VerificationFile", back_populates="verification", cascade="all, delete-orphan")

class VerificationFile(Base):
    __tablename__ = "verification_files"
    
    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("verifications.id"), nullable=False)
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # e.g. "image/png", "application/pdf"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    verification = relationship("Verification", back_populates="files")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False) # e.g. "submit_verification", "login", "register"
    details = Column(Text, nullable=True)  # JSON string of details
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
