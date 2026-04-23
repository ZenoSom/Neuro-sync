import os
import re

def replace_colors(directory):
    replacements = {
        r'bg-white': 'bg-[#faf8f5]',
        r'cyan-600': 'stone-700',
        r'cyan-500': 'stone-600',
        r'cyan-700': 'stone-800',
        r'cyan-300': 'stone-400',
        r'cyan-50\b': 'stone-100',
        r'cyan-100': 'stone-200',
        r'cyan-200': 'stone-300',
        r'text-white': 'text-[#faf8f5]',
        r'text-slate-900': 'text-stone-900',
        r'text-slate-800': 'text-stone-800',
        r'text-slate-700': 'text-stone-700',
        r'text-slate-600': 'text-stone-600',
        r'bg-slate-900': 'bg-stone-900',
        r'bg-slate-50\b': 'bg-[#f4f2ee]',
        r'emerald-50\b': 'stone-100',
        r'emerald-200': 'stone-300',
        r'emerald-600': 'stone-700',
        r'emerald-700': 'stone-800',
        r'emerald-500': 'stone-600',
        r'bg-emerald-500': 'bg-stone-600',
    }

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith((".jsx", ".js", ".css")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                original_content = content
                for curr, new in replacements.items():
                    content = re.sub(curr, new, content)

                if file == "index.css":
                    content = content.replace("background-color: #ffffff;", "background-color: #faf8f5;")
                    content = content.replace("background-color: #ffffff", "background-color: #faf8f5")
                    content = content.replace("#f1f5f9", "#f5f5f4")
                    content = content.replace("#cbd5e1", "#d6d3d1")
                    content = content.replace("#94a3b8", "#a8a29e")
                    content = content.replace("rgba(15, 23, 42", "rgba(28, 25, 23")

                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)

replace_colors(r"C:\Users\Kartik\Desktop\ADHD.Detection-main (2)\ADHD.Detection-main\ADHD.Detection-main\frontend\src")
print("Colors replaced successfully.")
