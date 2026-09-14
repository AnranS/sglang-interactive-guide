"""Build a standalone HTML from the editable local source files."""
from pathlib import Path
root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (root / 'style.css').read_text() + '</style>')
for name in ['content.js', 'app.js']:
    html = html.replace(f'<script src="{name}"></script>', '<script>' + (root / name).read_text().replace('</script', '<\\/script') + '</script>')
(root / '打开学习指南.html').write_text(html)
print('Built 打开学习指南.html')
