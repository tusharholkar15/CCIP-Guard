import os
import re

files_to_process = [
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/overview/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/network/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/messages/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/lanes/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/incidents/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/alerts/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/responses/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/app/audit/page.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/components/security/simulation-modal.tsx",
    "c:/Users/HP/OneDrive/Documents/ccip-Guard/apps/web/src/components/security/security-signals-tree.tsx"
]

def prefactor_style_transform(content):
    # Flatten borders and radii
    content = re.sub(r'\brounded-(?:xl|2xl|3xl|lg|md)\b', 'rounded-sm', content)
    
    # Remove shadows
    content = re.sub(r'\bshadow-(?:sm|md|lg|xl|2xl|inner)\b', '', content)
    
    # Restrained dark interface colors
    # Make sure border is subtle
    content = re.sub(r'\bborder-border\b(?!\/)', 'border-border/40', content)
    
    # Generous spacing
    content = re.sub(r'\bp-3\b', 'p-4', content)
    content = re.sub(r'\bp-4\b', 'p-6', content)
    content = re.sub(r'\bp-5\b', 'p-8', content)
    
    # Analytical panels background
    content = re.sub(r'\bbg-surface-primary\b', 'bg-[#05070A]', content)
    content = re.sub(r'\bbg-bg-secondary\b', 'bg-[#0A0C10]', content)
    content = re.sub(r'\bbg-surface-secondary\b', 'bg-[#0A0C10]', content)
    content = re.sub(r'\bbg-surface-tertiary\b', 'bg-[#0F1115]', content)
    
    # Typography
    # Make sure small headers are mono and tracked
    # This might be too aggressive, but let's see.
    # Replace some font-semibold with font-medium for cleaner look
    content = re.sub(r'\bfont-semibold\b', 'font-medium', content)
    
    # Clean up double spaces created by removed classes
    content = re.sub(r' +', ' ', content)
    content = re.sub(r' " ', '"', content)
    content = re.sub(r' \'', '\'', content)
    
    return content

for path in files_to_process:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = prefactor_style_transform(content)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
print("Done processing files.")
