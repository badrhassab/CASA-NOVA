import base64
import pathlib
import re
import zlib

def extract(path: str) -> None:
    raw = pathlib.Path(path).read_bytes()
    print("FILE", path, "bytes", len(raw))
    for m in re.finditer(br"/Length (\d+)\s*>>\s*stream\n", raw):
        length = int(m.group(1))
        start = m.end()
        blob = raw[start : start + length]
        if not blob.startswith(b"Gb"):
            continue
        try:
            data = zlib.decompress(base64.a85decode(blob, adobe=True))
        except Exception as exc:
            print("decode fail", exc)
            continue
        s = data.decode("latin1", "replace")
        texts = re.findall(r"\((?:\\.|[^\\)])*\)", s)
        words = []
        for t in texts:
            try:
                words.append(bytes(t[1:-1], "latin1").decode("unicode_escape"))
            except Exception:
                words.append(t[1:-1])
        print("".join(words))
        print("---")

extract(r"C:\Users\HP\Documents\nasa_astronaut_health_roadmap.pdf")
