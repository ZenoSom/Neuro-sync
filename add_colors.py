import os
import re

def replace_colors(directory):
    # Mapping old brown/amber minimalist classes to vibrant modern UI classes
    replacements = {
        r'text-amber-950': 'text-slate-900',
        r'text-amber-900': 'text-slate-800',
        r'text-amber-800': 'text-indigo-600',
        r'text-amber-700': 'text-slate-600',
        r'text-amber-400': 'text-indigo-400',
        r'bg-amber-950': 'bg-slate-900',
        r'bg-amber-900': 'bg-indigo-700',
        r'bg-amber-800': 'bg-indigo-600',
        r'hover:bg-amber-900': 'hover:bg-indigo-700',
        r'hover:bg-amber-800': 'hover:bg-indigo-600',
        r'bg-amber-200': 'bg-indigo-200',
        r'bg-amber-100': 'bg-indigo-100',
        r'bg-amber-50': 'bg-indigo-50/50',
        r'border-amber-200': 'border-indigo-100',
        r'border-amber-100': 'border-slate-100',
        r'shadow-amber-900/30': 'shadow-indigo-600/30',
        r'shadow-amber-700/25': 'shadow-indigo-500/25',
        r'shadow-\[0_0_50px_rgba\(180,83,9,0\.4\)\]': 'shadow-[0_0_50px_rgba(99,102,241,0.4)]',
        r'shadow-\[0_0_70px_rgba\(180,83,9,0\.6\)\]': 'shadow-[0_0_70px_rgba(99,102,241,0.6)]',
        r'text-amber-300': 'text-fuchsia-500',
        r'bg-amber-400': 'bg-fuchsia-500',
        # Inject some gradients for CTAs instead of solid indigo if desired, but solid indigo is clean.
        # Let's change the Start Assessment button to a vibrant gradient
        r'bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-full': 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 hover:from-violet-700 hover:via-fuchsia-700 hover:to-orange-600 text-white px-10 py-5 rounded-full',
    }

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith((".jsx", ".js", ".css")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                original_content = content
                
                # Apply tailwind utility replacements
                for curr, new in replacements.items():
                    content = re.sub(curr, new, content)

                # Update the font back to Outfit for a modern feel
                if file == "index.css":
                    content = re.sub(r"@import url\('https://fonts\.googleapis\.com/css2\?family=Lora[^']+'\);\n", 
                                     "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap');\n", content)
                    content = re.sub(r"font-family: 'Lora', serif;", "font-family: 'Outfit', sans-serif;", content)

                # For JSX explicit inline font classes if any:
                if file.endswith(".jsx"):
                    content = re.sub(r"font-\['Lora'\]", "font-['Outfit']", content)
                    
                    # Make headings a bit more colorful with text-transparent bg-clip-text
                    content = re.sub(r'className="text-6xl md:text-8xl lg:text-9xl font-black text-slate-900', 
                                     r'className="text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-900 via-purple-700 to-fuchsia-600', content)
                    content = re.sub(r'className="text-5xl font-black text-slate-900', 
                                     r'className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600', content)

                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)

replace_colors(r"C:\Users\Kartik\Desktop\ADHD.Detection-main (2)\ADHD.Detection-main\ADHD.Detection-main\frontend\src")
print("Colorful UI applied.")
