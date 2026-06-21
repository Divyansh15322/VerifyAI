import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.auth import get_admin_user
from app.models.database import User, Verification, AuditLog

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_admin_statistics(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Computes system-wide performance and user metrics for the admin dashboard:
    1. Total/Active Users
    2. Verification counts by status, industry, and average confidence
    3. AI pipeline average latency (extracted from submit_verification audit logs)
    4. Time series data of verifications (last 7 days)
    """
    # 1. User stats
    total_users = db.query(User).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    
    # 2. Verification metrics
    total_verifications = db.query(Verification).count()
    
    status_counts = db.query(
        Verification.status, func.count(Verification.id)
    ).group_by(Verification.status).all()
    status_distribution = {status: count for status, count in status_counts}
    # Ensure default zeros
    for s in ["Supported", "Needs Review", "Insufficient Evidence"]:
        status_distribution.setdefault(s, 0)
        
    avg_confidence = db.query(func.avg(Verification.confidence_score)).scalar() or 0.0
    avg_confidence = round(float(avg_confidence), 1)
    
    industry_counts = db.query(
        Verification.industry, func.count(Verification.id)
    ).group_by(Verification.industry).all()
    industry_distribution = {ind.title(): count for ind, count in industry_counts}
    
    # 3. Latency & Feedback from Audit Logs
    submit_logs = db.query(AuditLog).filter(AuditLog.action == "submit_verification").all()
    latencies = []
    for log in submit_logs:
        try:
            details = json.loads(log.details)
            if "latency_ms" in details:
                latencies.append(details["latency_ms"])
        except Exception:
            pass
            
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    avg_latency_ms = round(avg_latency, 1)
    
    # 4. Latency breakdown (historical trend - last 10 submissions)
    recent_latencies = []
    for log in submit_logs[-10:]:
        try:
            details = json.loads(log.details)
            if "latency_ms" in details:
                recent_latencies.append({
                    "id": details.get("verification_id"),
                    "latency": details["latency_ms"],
                    "timestamp": log.created_at.strftime("%H:%M:%S")
                })
        except Exception:
            pass
            
    # 5. Timeline trend (Last 7 Days)
    today = datetime.now(timezone.utc).date()
    daily_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(day, datetime.max.time(), tzinfo=timezone.utc)
        
        count = db.query(Verification).filter(
            Verification.created_at >= day_start,
            Verification.created_at <= day_end
        ).count()
        daily_trend.append({
            "date": day.strftime("%b %d"),
            "count": count
        })

    return {
        "users": {
            "total": total_users,
            "admins": admin_users,
            "consumers": total_users - admin_users
        },
        "verifications": {
            "total": total_verifications,
            "by_status": status_distribution,
            "by_industry": industry_distribution,
            "average_confidence": avg_confidence
        },
        "performance": {
            "average_latency_ms": avg_latency_ms,
            "recent_latencies": recent_latencies
        },
        "trends": {
            "daily_volume_7d": daily_trend
        }
    }

@router.get("/logs")
def get_audit_logs(
    limit: int = 50,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Retrieves system audit logs for administrative monitoring."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    formatted_logs = []
    for log in logs:
        # Load user email
        user_email = "System/Anonymous"
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                user_email = user.email
                
        try:
            details_obj = json.loads(log.details) if log.details else {}
        except Exception:
            details_obj = {"raw": log.details}
            
        formatted_logs.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": user_email,
            "action": log.action,
            "details": details_obj,
            "created_at": log.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        })
        
    return formatted_logs
