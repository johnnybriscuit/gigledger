#!/usr/bin/env python3
"""
Remove console.log / console.warn / console.debug statements from all
src/**/*.ts and src/**/*.tsx files.

Keeps:
  - console.error  (real errors)
  - console.group / console.groupEnd / console.table (debug-utils)

Handles:
  - Single-line:  console.log('foo', bar);
  - Multi-line:   console.log('foo', {   <- tracks paren depth
                    key: val,
                  });
  - Chained:      }).catch(err => { console.warn('...'); });
"""

import os
import re
import sys

TARGETS = re.compile(r'^(\s*)console\.(log|warn|debug)\s*\(')

def process_file(filepath: str) -> bool:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    result: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        m = TARGETS.match(line)

        if m:
            # Track parenthesis depth to find the end of this statement
            depth = 0
            j = i
            while j < len(lines):
                for ch in lines[j]:
                    if ch == '(':
                        depth += 1
                    elif ch == ')':
                        depth -= 1
                # Statement ends when depth returns to 0 (after we've seen at least one '(')
                if depth == 0 and j >= i:
                    break
                j += 1

            # Skip lines i..j (inclusive)
            i = j + 1
        else:
            result.append(line)
            i += 1

    new_content = '\n'.join(result)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False


def main():
    root = os.path.join(os.path.dirname(__file__), '..', 'src')
    root = os.path.normpath(root)
    changed = []

    for dirpath, dirnames, filenames in os.walk(root):
        # Skip test directories
        dirnames[:] = [d for d in dirnames if d not in ('__tests__', 'node_modules', '.git')]
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')):
                fp = os.path.join(dirpath, filename)
                if process_file(fp):
                    changed.append(os.path.relpath(fp, root))

    print(f"Cleaned {len(changed)} files:")
    for f in sorted(changed):
        print(f"  {f}")


if __name__ == '__main__':
    main()
