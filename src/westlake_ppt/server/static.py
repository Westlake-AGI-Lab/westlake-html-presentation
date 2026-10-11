"""Explicit public asset inventory; no directory or research-file exposure."""

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
    return public
