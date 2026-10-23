from pathlib import Path
from xml.sax.saxutils import escape
import re
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from pypdf import PdfReader

root=Path(__file__).resolve().parent
target=root/'QA_SUMMARY.pdf'
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyQA',fontName='Helvetica',fontSize=9.3,leading=13.7,spaceAfter=9,textColor=colors.HexColor('#253047'),splitLongWords=True))
styles.add(ParagraphStyle(name='TitleQA',fontName='Helvetica-Bold',fontSize=23,leading=27,spaceAfter=18,textColor=colors.HexColor('#3e3161')))
styles.add(ParagraphStyle(name='HeadingQA',fontName='Helvetica-Bold',fontSize=12,leading=16,spaceBefore=10,spaceAfter=8,textColor=colors.HexColor('#3e3161')))
story=[]
for part in (root/'QA_SUMMARY.md').read_text(encoding='utf8').split('\n\n'):
    part=part.strip()
    if not part: continue
    if part.startswith('# '):
        story.append(Paragraph(escape(part[2:]),styles['TitleQA']))
        continue
    if part.startswith('## '):
        if part == '## Release blockers': story.append(PageBreak())
        story.append(Paragraph(escape(part[3:]),styles['HeadingQA']))
        continue
    text=escape(part)
    text=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',text)
    text=text.replace('\n','<br/>')
    # Keep immutable evidence URLs usable without printing unreadably long lines.
    text=re.sub(r'https://github.com/7Localhosts/LocalHosts7/actions/runs/(\d+)',lambda m:f'<link href="{m.group(0)}" color="#4e3984">GitHub Actions run {m.group(1)}</link>',text)
    story.append(Paragraph(text,styles['BodyQA']))
def footer(canvas,doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#d8d1e5'))
    canvas.line(42,37,553,37)
    canvas.setFont('Helvetica',8)
    canvas.setFillColor(colors.HexColor('#665c75'))
    canvas.drawString(42,25,'DCIT208 | LocalHosts7 | Redacted QA summary | 23 Oct 2026 UTC')
    canvas.drawRightString(553,25,f'{doc.page}')
    canvas.restoreState()
doc=SimpleDocTemplate(str(target),pagesize=(595.28,841.89),rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=50,title="Kay's Haven D0-D10 QA summary",author='Codex QA')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(str(target))
assert len(reader.pages)>0
assert 'RELEASE CRITERIA NOT MET' in ''.join(p.extract_text() for p in reader.pages)
print(f'Created {target}; pages={len(reader.pages)}')
