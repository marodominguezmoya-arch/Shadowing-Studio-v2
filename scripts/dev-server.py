# Serveur local de développement : comme `python3 -m http.server`, mais sans cache navigateur.
import http.server
import sys
from functools import partial


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = sys.argv[2] if len(sys.argv) > 2 else '.'
    handler = partial(NoCacheHandler, directory=root)
    http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
