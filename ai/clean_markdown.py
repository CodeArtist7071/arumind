"""Remove chosen text from generated Markdown, preserving original backups."""
import argparse
import os
import re
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def clean_text(text, removals=(), remove_underscores=False):
    # Preserve all other text, including the rest of a line containing the keyword.
    for phrase in removals:
        if not phrase.strip():
            raise ValueError('Removal text must not be empty')
        text = re.sub(re.escape(phrase), '', text, flags=re.IGNORECASE)
    return text.replace('_', '') if remove_underscores else text


def clean_file(path, removals=(), remove_underscores=False):
    original = path.read_bytes()
    cleaned = clean_text(original.decode('utf-8'), removals, remove_underscores).encode('utf-8')
    if cleaned == original:
        return False
    backup = path.with_name('markdown.md.bak')
    try:
        with backup.open('xb') as stream:
            stream.write(original)
    except FileExistsError:
        pass  # Keep the first original, even across repeated cleanup runs.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.markdown-clean-',
                                         suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(cleaned)
        if path.read_bytes() != original:
            raise RuntimeError(f'File changed during cleanup; retry after extraction: {path}')
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--remove', action='append', default=[], metavar='TEXT',
                        help='Literal text to remove, case-insensitively; can be repeated')
    parser.add_argument('--remove-underscores', action='store_true',
                        help='Also remove underscore characters (_)')
    parser.add_argument('folder', nargs='?', type=Path, default=ROOT / 'outputs',
                        help='Folder searched recursively (default: outputs)')
    # Support --remove-Join-on-Telegram as shorthand for --remove "Join on Telegram".
    raw = list(sys.argv[1:] if argv is None else argv)
    normalized = []
    literal_next = False
    for index, argument in enumerate(raw):
        if literal_next:
            normalized.append(argument)
            literal_next = False
        elif argument == '--':
            normalized.extend(raw[index:])
            break
        elif argument == '--remove':
            normalized.append(argument)
            literal_next = True
        elif argument.startswith('--remove-') and argument != '--remove-underscores':
            normalized.append('--remove=' + argument[len('--remove-'):].replace('-', ' '))
        else:
            normalized.append(argument)
    args = parser.parse_args(normalized)
    if not args.remove and not args.remove_underscores:
        parser.error('Choose text with --remove "Join on Telegram", or use --remove-underscores')
    if any(not phrase.strip() for phrase in args.remove):
        parser.error('Removal text must not be empty')
    if not args.folder.is_dir():
        parser.error(f'Folder does not exist: {args.folder}')
    files = sorted(args.folder.rglob('markdown.md'))
    changed, failed = 0, 0
    for path in files:
        try:
            if clean_file(path, args.remove, args.remove_underscores):
                changed += 1
                print(f'Cleaned: {path}')
        except (OSError, UnicodeError, RuntimeError) as error:
            failed += 1
            print(f'Could not clean {path}: {error}')
    print(f'{changed} cleaned, {len(files) - changed - failed} unchanged, {failed} failed. '
          'Originals are preserved as markdown.md.bak.')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
