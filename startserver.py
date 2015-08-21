#!/usr/bin/env python3

import argparse
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

def run(bind=("", 8080)):
    os.chdir("www")
    httpd = HTTPServer(bind, SimpleHTTPRequestHandler)
    httpd.serve_forever()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Starts the test http server for the delegator web client")
    parser.add_argument("--port", "-bp", dest="port", type=int, default=8080, help="The port to bind to")
    parser.add_argument("--host", "-bh", dest="host", default="", help="The hostname to bind to")

    args = parser.parse_args()
    run((args.host, args.port))
