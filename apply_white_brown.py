import os
import re

def replace_colors(directory):
    replacements = {
        r'bg-\[\#faf8f5\]': 'bg-white',
        r'text-\[\#faf8f5\]': 'text-white',
        r'stone-700': 'amber-800',
        r'stone-600': 'amber-700',
        r'stone-800': 'amber-900',
        r'stone-400': 'amber-400',
        r'stone-100': 'amber-50',
        r'stone-200': 'amber-100',
        r'stone-300': 'amber-200',
        r'stone-900': 'amber-950',
        r'bg-\[\#f4f2ee\]': 'bg-amber-50',
    }

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith((".jsx", ".js", ".css")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                original_content = content
                
                # Replace CSS specific values
                if file == "index.css":
                    content = content.replace("background-color: #faf8f5;", "background-color: #ffffff;")
                    content = content.replace("background-color: #faf8f5", "background-color: #ffffff")
                    
                    font_import = "@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap');\n"
                    if "fonts.googleapis.com/css2?family=Lora" not in content:
                        content = font_import + content

                    content = re.sub(r"font-family:\s*'Outfit',\s*Inter,\s*system-ui,\s*Avenir,\s*Helvetica,\s*Arial,\s*sans-serif;", "font-family: 'Lora', serif;", content)
                    content = re.sub(r'font-\[\'Outfit\'\]', 'font-[\'Lora\']', content) # for JSX
                
                # Apply tailwind utility replacements
                for curr, new in replacements.items():
                    content = re.sub(curr, new, content)

                # For JSX explicit inline font classes if any:
                if file.endswith(".jsx"):
                    content = re.sub(r'font-\[\'Outfit\'\]', 'font-[\'Lora\']', content)


                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)

replace_colors(r"C:\Users\Kartik\Desktop\ADHD.Detection-main (2)\ADHD.Detection-main\ADHD.Detection-main\frontend\src")
print("Fonts and White/Brown layout applied.")
