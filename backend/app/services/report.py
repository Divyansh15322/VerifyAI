import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def clean_markdown_for_pdf(text: str) -> str:
    """Very basic cleaner to convert simple markdown syntax to ReportLab HTML tags."""
    if not text:
        return ""
    # Replace markdown headers
    lines = text.split("\n")
    processed_lines = []
    for line in lines:
        if line.startswith("### "):
            processed_lines.append(f"<b><font size='14'>{line[4:]}</font></b>")
        elif line.startswith("## "):
            processed_lines.append(f"<b><font size='16'>{line[3:]}</font></b>")
        elif line.startswith("# "):
            processed_lines.append(f"<b><font size='18'>{line[2:]}</font></b>")
        elif line.startswith("- "):
            processed_lines.append(f"&bull; {line[2:]}")
        elif line.startswith("* "):
            processed_lines.append(f"&bull; {line[2:]}")
        else:
            # Bold formatting
            l = line
            # Simple bold search and replace
            while "**" in l:
                l = l.replace("**", "<b>", 1).replace("**", "</b>", 1)
            processed_lines.append(l)
            
    return "<br/>".join(processed_lines)

def generate_verification_pdf(verification: Any, files: List[Any], user_email: str) -> io.BytesIO:
    """
    Generates a beautifully styled PDF report for a verification record.
    Returns a BytesIO stream.
    """
    buffer = io.BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette Matching UX Guidelines
    c_cream = colors.HexColor("#F7F3EC")
    c_surface = colors.HexColor("#FFFDF9")
    c_primary = colors.HexColor("#29524A")
    c_accent = colors.HexColor("#C97B36")
    c_charcoal = colors.HexColor("#2D2D2D")
    
    # Status-specific colors
    status_upper = verification.status.upper()
    if "SUPPORTED" in status_upper:
        status_bg = colors.HexColor("#E2F0D9")
        status_text_color = colors.HexColor("#385723")
    elif "REVIEW" in status_upper:
        status_bg = colors.HexColor("#FFF2CC")
        status_text_color = colors.HexColor("#7F6000")
    else: # Insufficient
        status_bg = colors.HexColor("#FCE4D6")
        status_text_color = colors.HexColor("#C65911")
        
    # Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=c_primary,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#666666"),
        spaceAfter=20
    )
    
    section_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=c_primary,
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        textColor=c_charcoal,
        leading=14,
        spaceAfter=8
    )
    
    badge_style = ParagraphStyle(
        'Badge',
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=status_text_color,
        alignment=TA_CENTER
    )
    
    story = []
    
    # 1. Header (VerifyAI branding + Metadata Table)
    story.append(Paragraph("VerifyAI Audit Certificate", title_style))
    created_str = verification.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Audit Record ID: VER-{verification.id}", subtitle_style))
    
    # Metadata grid
    metadata_data = [
        [
            Paragraph("<b>Submitter:</b>", body_style), Paragraph(user_email, body_style),
            Paragraph("<b>Industry:</b>", body_style), Paragraph(verification.industry.title(), body_style)
        ],
        [
            Paragraph("<b>Date Submitted:</b>", body_style), Paragraph(created_str, body_style),
            Paragraph("<b>Verification Type:</b>", body_style), Paragraph(verification.verification_type.replace('_', ' ').title(), body_style)
        ]
    ]
    
    meta_table = Table(metadata_data, colWidths=[100, 160, 110, 160])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_cream),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E0E0E0")),
    ]))
    
    story.append(meta_table)
    story.append(Spacer(1, 20))
    
    # 2. Results Block (Status Badge + Confidence Score)
    status_para = Paragraph(f"STATUS: {verification.status.upper()}", badge_style)
    score_para = Paragraph(f"CONFIDENCE SCORE: <b>{verification.confidence_score}%</b>", ParagraphStyle('Score', fontName='Helvetica', fontSize=12, alignment=TA_CENTER, textColor=c_charcoal))
    
    status_table_data = [
        [status_para, score_para]
    ]
    status_table = Table(status_table_data, colWidths=[260, 270])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), status_bg),
        ('BACKGROUND', (1,0), (1,0), c_cream),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, c_primary),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    
    story.append(status_table)
    story.append(Spacer(1, 20))
    
    # 3. AI Explanation Section
    story.append(Paragraph("AI Reasoning & Assessment", section_title))
    cleaned_explanation = clean_markdown_for_pdf(verification.explanation)
    story.append(Paragraph(cleaned_explanation, body_style))
    story.append(Spacer(1, 15))
    
    # 4. Verification Checklist
    import json
    try:
        checklist_items = json.loads(verification.checklist) if verification.checklist else []
    except Exception:
        checklist_items = []
        
    if checklist_items:
        story.append(Paragraph("Criteria Checklist", section_title))
        checklist_table_data = [["Criteria Item", "Status"]]
        
        for item in checklist_items:
            chk_status = item.get("status", "Unclear").upper()
            if chk_status == "VERIFIED":
                status_cell = Paragraph("<font color='green'><b>VERIFIED</b></font>", body_style)
            elif chk_status == "MISSING":
                status_cell = Paragraph("<font color='red'><b>MISSING</b></font>", body_style)
            else:
                status_cell = Paragraph("<font color='orange'><b>INCOMPLETE</b></font>", body_style)
                
            checklist_table_data.append([
                Paragraph(item.get("item", ""), body_style),
                status_cell
            ])
            
        chk_table = Table(checklist_table_data, colWidths=[380, 150])
        chk_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_primary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_cream]),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E0E0E0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        # Need to fix textcolor of header
        for i in range(2):
            chk_table.setStyle(TableStyle([
                ('TEXTCOLOR', (i,0), (i,0), colors.white)
            ]))
        story.append(chk_table)
        story.append(Spacer(1, 15))
        
    # 5. Recommendations
    try:
        recs = json.loads(verification.recommendations) if verification.recommendations else []
    except Exception:
        recs = []
        
    if recs:
        story.append(Paragraph("Required Actions & Recommendations", section_title))
        for r in recs:
            story.append(Paragraph(f"&bull; {r}", body_style))
        story.append(Spacer(1, 15))
        
    # 6. Submitted Files
    if files:
        story.append(Paragraph("Attached Evidence Files", section_title))
        files_table_data = [["Filename", "File Type"]]
        for f in files:
            files_table_data.append([
                Paragraph(f.file_name, body_style),
                Paragraph(f.file_type, body_style)
            ])
        files_table = Table(files_table_data, colWidths=[380, 150])
        files_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E6DFD3")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_cream]),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E0E0E0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(files_table)
        
    # Build Document
    doc.build(story)
    buffer.seek(0)
    return buffer
