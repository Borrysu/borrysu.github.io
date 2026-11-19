#!/bin/bash
# 本機預覽：開 http://localhost:8811/?mock=1（示範資料）、?mock=xss（惡意資料）、?mock=longname（長案名）。Ctrl-C 結束。
cd "$(dirname "$0")/.." && exec /usr/bin/python3 -m http.server 8811
