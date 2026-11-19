try:
    # try to import flask, or return error if has not been installed
    from flask import Flask
    from flask import send_from_directory
except ImportError:
    print("You don't have Flask installed, run `$ pip3 install flask` and try again")
    exit(1)

import os

# Anchor paths to the script directory (safe, not CWD-dependent)
_basedir = os.path.dirname(os.path.realpath(__file__))
static_file_dir = _basedir
public_file_dir = os.path.join(_basedir, 'public')
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # disable cache

# Guard: ensure requested path stays inside an allowed directory
def _is_safe(path, allowed_dir):
    resolved = os.path.realpath(os.path.join(allowed_dir, path))
    return resolved.startswith(os.path.realpath(allowed_dir))

# Serving the index file
@app.route('/', methods=['GET'])
def serve_dir_directory_index():
    # Serve index.html from static root, then fall back to public/
    for candidate_dir in (static_file_dir, public_file_dir):
        index_path = os.path.join(candidate_dir, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(candidate_dir, 'index.html')
    return "<h1 align='center'>404</h1><h2 align='center'>Missing index.html file</h2>"

# Serving any other static file
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    # Reject path-traversal attempts early
    if '..' in path or path.startswith('/'):
        return "Forbidden", 403

    for directory in (public_file_dir, static_file_dir):
        if os.path.isfile(os.path.join(directory, path)):
            if _is_safe(path, directory):
                response = send_from_directory(directory, path)
                response.cache_control.max_age = 0
                return response

    return "Not found", 404

app.run(host='0.0.0.0', port=3000, debug=True,
        extra_files=[os.path.join(_basedir, 'index.html'),
                     os.path.join(_basedir, 'dashboard.js'),
                     os.path.join(_basedir, 'dashboard.css'),
                     os.path.join(_basedir, 'chart-renderer.mjs')])
