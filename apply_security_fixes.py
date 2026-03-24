
import os

# Fix index.html
html_path = r"d:\project ai of world\index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add CSP tag if not present
csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' https: wss:; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com; object-src \'none\';">'
if csp not in content and 'Content-Security-Policy' not in content:
    content = content.replace('<head>', '<head>\n    ' + csp)

# Remove ' allowpopups'
content = content.replace(' allowpopups>', '>')
content = content.replace(' allowpopups></webview>', '></webview>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix renderer.js
js_path = r"d:\project ai of world\renderer.js"
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

js_content = js_content.replace(' allowpopups>', '>')
js_content = js_content.replace(' allowpopups></webview>', '></webview>')

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Security fixes applied!")
