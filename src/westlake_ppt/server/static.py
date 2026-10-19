"""Explicit public asset inventory; no directory or research-file exposure."""
import json
import re

def public_files(base_dir, deck_name):
    # A deployment-time inventory, never a directory listing or extension-only permission.
    public = {deck_name, "assets/chat.js", "assets/chat.css", "assets/i18n.js", "assets/pet.js", "assets/pet.css",
        "assets/thumbnails.js", "assets/thumbnails.css",
        "assets/highlights.js", "assets/highlights.css",
        "assets/vendor/lucide/highlighter.svg", "assets/vendor/lucide/eraser.svg",
        "assets/vendor/lucide/undo-2.svg", "assets/vendor/lucide/x.svg",
        "assets/classroom.js", "assets/classroom.css", "assets/archive.js",
        "assets/vendor/fflate/fflate.js", "assets/vendor/qrcode/qrcode.js",
        "assets/region.js", "assets/region.css", "assets/vendor/html2canvas/html2canvas.min.js", "assets/vendor/lucide/scan.svg",
        "assets/improvements.js", "assets/improvements.css",
        "assets/vendor/marked/lib/marked.umd.js",
        "assets/vendor/dompurify/dist/purify.min.js",
        "assets/vendor/mathjax/es5/tex-chtml.js"}
    public.update(str(p.relative_to(base_dir)) for p in (base_dir / "assets").glob("*")
                        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    public.update(str(p.relative_to(base_dir)) for p in
        (base_dir / "assets/vendor/mathjax/es5/output/chtml/fonts/woff-v2").glob("*.woff"))
    public.update({'assets/learning.js', 'assets/learning.css'})
    public.update({'presenter.html', 'assets/presenter.js', 'assets/presenter-view.js',
                   'assets/presenter.css', 'assets/presentation.js', 'assets/presentation.css', 'assets/print.js'})
    public.update({'courses.html', 'assets/courses.js', 'assets/courses.css',
                   'assets/catalog-link.js', 'assets/course-player.js', 'assets/course-player.css'})
    public.update({'assets/source-lecture.js', 'assets/source-lecture.css'})
    # Only image/PDF paths registered in the catalog; never grant an asset directory.
    inventory = base_dir / 'assets/courses.json'
    if inventory.is_file():
        pattern = re.compile(r'assets/lectures/[a-z0-9-]+/(?:source\.pdf|(?:page|thumb)-[0-9]{2}\.webp)')
        for course in json.loads(inventory.read_text(encoding='utf-8')):
            for lecture in course['lectures']:
                paths = [lecture.get('source', {}).get('file', '')]
                for slide in lecture['slides']:
                    paths.extend((slide.get('image', ''), slide.get('thumbnail', '')))
                public.update(path for path in paths if pattern.fullmatch(path))
    return public
