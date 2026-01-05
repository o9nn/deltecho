#!/usr/bin/env python3
"""
Automated TypeScript issue fixer for deltecho repository
Fixes common ESLint and TypeScript issues
"""

import os
import re
from pathlib import Path

def fix_unused_imports(file_path):
    """Remove unused imports from test files"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove unused imports
    patterns = [
        r"import\s+.*_Memory.*from.*;\n",
        r"import\s+.*Sys6Stage.*from.*;\n",
        r"import\s+.*Glyph.*from.*;\n",
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

def fix_unused_variables(file_path):
    """Fix unused variables by prefixing with underscore"""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    modified = False
    for i, line in enumerate(lines):
        # Fix unused const declarations
        if re.search(r"const\s+(\w+)\s*=", line):
            # Check if it's marked as unused in comments
            if i > 0 and 'is assigned a value but never used' in lines[i-1]:
                lines[i] = re.sub(r"const\s+(\w+)", r"const _\1", line)
                modified = True
        
        # Fix unused function parameters
        if re.search(r"function.*\(.*\w+.*\)", line) or re.search(r"\(.*\w+.*\)\s*=>", line):
            # This needs manual review, skip for now
            pass
    
    if modified:
        with open(file_path, 'w') as f:
            f.writelines(lines)

def fix_floating_promises(file_path):
    """Add void operator to floating promises"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Look for common patterns like store.enable()
    # This is complex and needs manual review
    pass

def process_file(file_path):
    """Process a single TypeScript file"""
    try:
        fix_unused_imports(file_path)
        fix_unused_variables(file_path)
        fix_floating_promises(file_path)
        print(f"Processed: {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    """Main function to process all TypeScript files"""
    deltecho_path = Path('/home/ubuntu/deltecho')
    
    # Find all TypeScript test files
    test_files = list(deltecho_path.rglob('*.test.ts'))
    test_files += list(deltecho_path.rglob('*.spec.ts'))
    
    # Exclude node_modules and dist
    test_files = [f for f in test_files if 'node_modules' not in str(f) and 'dist' not in str(f)]
    
    print(f"Found {len(test_files)} test files to process")
    
    for file_path in test_files:
        process_file(file_path)
    
    print("Automated fixes complete!")

if __name__ == '__main__':
    main()
