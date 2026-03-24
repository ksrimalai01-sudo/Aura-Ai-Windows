
import os

html_path = r"d:\project ai of world\index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('></webview>', ' allowpopups></webview>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

js_path = r"d:\project ai of world\renderer.js"
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

js_content = js_content.replace('></webview>', ' allowpopups></webview>')

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

main_path = r"d:\project ai of world\main.js"
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

old_handler = """                contents.setWindowOpenHandler(({ url }) => {
                    shell.openExternal(url);
                    return { action: 'deny' };
                });"""

new_handler = """                contents.setWindowOpenHandler(({ url }) => {
                    if (url.includes('accounts.google.com') || url.includes('appleid.apple.com') || url.includes('microsoft.com') || url.includes('auth')) {
                        return { action: 'allow' };
                    }
                    shell.openExternal(url);
                    return { action: 'deny' };
                });"""

if old_handler in main_content:
    main_content = main_content.replace(old_handler, new_handler)
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_content)
    print("Main handler updated.")

print("Restored allowpopups!")
