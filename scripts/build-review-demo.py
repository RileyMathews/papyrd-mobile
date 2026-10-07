"""Build a deterministic, original MIT-licensed review EPUB. Generated via opencode."""

from pathlib import Path
import io
import sys
import zipfile
from xml.etree import ElementTree
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / "docs/review-demo/papyrd-demo.epub"


def build_epub():
    license_text = escape((ROOT / "LICENSE.md").read_text())
    files = {
        "mimetype": "application/epub+zip",
        "META-INF/container.xml": '''<?xml version="1.0" encoding="utf-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
<rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>''',
        "EPUB/package.opf": '''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">urn:papyrd:review-demo:1</dc:identifier>
<dc:title>A Small Guide to Papyrd</dc:title><dc:creator>Papyrd contributors</dc:creator>
<dc:language>en</dc:language><dc:rights>Copyright 2026 Riley Mathews. MIT license.</dc:rights>
<meta property="dcterms:modified">2026-10-06T00:00:00Z</meta>
</metadata><manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="chapter-one" href="chapter-one.xhtml" media-type="application/xhtml+xml"/>
<item id="chapter-two" href="chapter-two.xhtml" media-type="application/xhtml+xml"/>
</manifest><spine><itemref idref="chapter-one"/><itemref idref="chapter-two"/></spine>
</package>''',
        "EPUB/nav.xhtml": '''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>
<li><a href="chapter-one.xhtml">Your own reading shelf</a></li>
<li><a href="chapter-two.xhtml">Reading your way</a></li>
</ol></nav></body></html>''',
        "EPUB/chapter-one.xhtml": '''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>Your own reading shelf</title></head>
<body><h1>A Small Guide to Papyrd</h1><p>Generated via opencode.</p>
<h2>Your own reading shelf</h2>
<p>A reading shelf can be small: one book, a quiet afternoon, and a place to begin.
This sample book is an original guide written for the Papyrd review demo. It is
not copied from a commercial publication and can be freely distributed under
the license included in the next chapter.</p>
<p>Papyrd connects to libraries that speak OPDS, the Open Publication Distribution
System. A catalog describes books and provides links to their downloads. You can
use a library you host yourself or a compatible service you have permission to use.</p>
<p>Adding a catalog does not download every book. Browse the catalog, choose a
publication, and download it. A downloaded book appears in your local Library,
where you can open it even when you are offline.</p>
<p>For this demonstration, the catalog and sample book are served as static files
from the public Papyrd source repository. No account is needed. You can replace
this catalog with your own OPDS library whenever you like.</p>
<p>Try opening this book from Library, leaving the reader, and opening it again.
Try moving to the second chapter and changing the text size. These ordinary
actions help check that a reader is comfortable before a longer reading session.</p>
</body></html>''',
        "EPUB/chapter-two.xhtml": f'''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>Reading your way</title></head>
<body><h1>Reading your way</h1>
<p>A good reading session does not have to look the same on every device. Larger
type can make a small screen easier to read. A different layout can make a tablet
feel more like an open book. Choose the preferences that work for you.</p>
<p>Papyrd also offers optional KOSync-compatible reading-progress synchronization.
It is disabled by default and is not required for browsing, downloading, or reading
this sample. If you enable it, use a server and credentials you trust.</p>
<p>Your chosen servers handle the network connections you make. The app has no
developer analytics or advertising. Read the privacy policy in Settings to learn
about local storage and server connections.</p>
<p>When you finish the demonstration, you can delete the book from your local
library and remove the demo catalog from OPDS settings. Keep your own books and
your own servers, and make the reading shelf your own.</p>
<h2>License</h2><pre>{license_text}</pre>
</body></html>''',
    }
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, contents in files.items():
            if name.endswith((".xml", ".opf", ".xhtml")):
                ElementTree.fromstring(contents)
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 6, 0, 0, 0))
            # This tiny fixture uses stored entries so zlib versions cannot change
            # its bytes between developer machines and CI. EPUB permits this.
            entry.compress_type = zipfile.ZIP_STORED
            entry.create_system = 3
            entry.external_attr = 0o600 << 16
            archive.writestr(entry, contents.encode("utf-8"))
    return output.getvalue()


if __name__ == "__main__":
    data = build_epub()
    if "--check" in sys.argv:
        if not DESTINATION.exists() or DESTINATION.read_bytes() != data:
            raise SystemExit("Demo EPUB is missing or outdated; run python3 scripts/build-review-demo.py")
    else:
        DESTINATION.write_bytes(data)
