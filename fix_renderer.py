
import os

file_path = "renderer.js"

try:
    with open(file_path, 'rb') as f:
        data = f.read()
    
    # Remove null bytes
    clean_data = data.replace(b'\x00', b'')
    
    # Specific fix for the "return;" issue if it still exists in the bytes
    # We want to remove any "return;" that is NOT inside a function.
    # But since the file is 3450 lines, it's safer to just look for the known ones.
    
    if b'    return;' in clean_data:
        print("Found illegal return in binary! Cleaning...")
        clean_data = clean_data.replace(b'\r\n    return;\r\n', b'\r\n')
        clean_data = clean_data.replace(b'\n    return;\n', b'\n')

    # Truncate and write back
    with open(file_path, 'wb') as f:
        f.write(clean_data)
        
    print("Local Repair attempt finished.")

except Exception as e:
    print(f"Error: {e}")
