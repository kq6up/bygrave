#!/usr/bin/env python3
"""Serve the Bygrave simulator locally and open it in a browser."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import webbrowser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--no-browser", action="store_true", help="print the URL without opening a browser"
    )
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(folder))

    # Let the OS choose a free port; expose only the simulator on this computer.
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        url = f"http://127.0.0.1:{server.server_port}/"
        print(f"Bygrave simulator: {url}", flush=True)
        print("Leave this window open. Press Ctrl+C to stop.", flush=True)
        if not args.no_browser:
            Thread(target=webbrowser.open, args=(url,), daemon=True).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nSimulator server stopped.")


if __name__ == "__main__":
    main()
