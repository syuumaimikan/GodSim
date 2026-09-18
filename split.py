import os
import re

html_file = 'code_artifact.html'

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract CSS
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if style_match:
    css_content = style_match.group(1).strip()
    os.makedirs('css', exist_ok=True)
    with open('css/style.css', 'w', encoding='utf-8') as f:
        f.write(css_content)
    
    # Remove style block from HTML
    content = content.replace(f'<style>{style_match.group(1)}</style>', '<link rel="stylesheet" href="css/style.css">')

# Extract JS
script_match = re.search(r'<script>\s*(const CONFIG.*?)</script>', content, re.DOTALL)
if script_match:
    js_content = script_match.group(1)
    
    # We will write the whole JS to js/main.js for now if it's too complex to split by script
    # But wait, it's better to manually split JS by exporting objects or just keep it in one file for now
    # to guarantee it works. Let's start by separating it into js/main.js
    os.makedirs('js', exist_ok=True)
    with open('js/main.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    # Replace script tag with src
    # Note: re.sub is better because of exact whitespace
    pass

# Better replacement for script
content = re.sub(r'<script>\s*const CONFIG.*?</script>', '<script type="module" src="js/main.js"></script>', content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Split completed successfully.")
