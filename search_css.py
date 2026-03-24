
import os

with open(r"d:\project ai of world\styles.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if ".webview-container" in line or ".view-panel" in line:
        print(f"Line {i+1}: {line.strip()}")
        # print the next 15 lines too
        for j in range(1, 15):
            if i+j < len(lines):
                print(f"Line {i+j+1}: {lines[i+j].strip()}")
                if "}" in lines[i+j]:
                    break
        print("---")
