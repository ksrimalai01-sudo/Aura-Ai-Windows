
import os

mac_ua_str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# 1. Update index.html
html_path = r"d:\project ai of world\index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Just strip out the useragent attribute completely so main.js takes over
content = content.replace(f' useragent="{mac_ua_str}"', '')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update renderer.js
js_path = r"d:\project ai of world\renderer.js"
with open(js_path, 'r', encoding='utf-8') as f:
    renderer_content = f.read()

renderer_content = renderer_content.replace(f' useragent="{mac_ua_str}"', '')

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(renderer_content)

# 3. Update main.js
main_path = r"d:\project ai of world\main.js"
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

new_ua_logic = """
        const isMac = process.platform === 'darwin';
        const chromeUA = isMac 
            ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
"""

# Replace the single line definition with the dynamic one
main_content = main_content.replace(f"const chromeUA = '{mac_ua_str}';", new_ua_logic)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)

print("User-Agent fixes applied successfully!")
