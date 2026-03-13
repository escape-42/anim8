import base64
import io
import logging
import signal
import sys

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_file,
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config
from gif_maker import allowed_file, create_gif

# --- Structured logging to stdout ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Rate limiting
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=[app.config["RATE_LIMIT"]],
        storage_uri="memory://",
    )

    # --- Routes ---

    @app.route("/")
    def index():
        return render_template("index.html", config=app.config)

    @app.route("/upload", methods=["POST"])
    @limiter.limit(app.config["RATE_LIMIT"])
    def upload():
        files = request.files.getlist("images")

        if len(files) < app.config["MIN_IMAGES"]:
            return jsonify(error=f"Upload at least {app.config['MIN_IMAGES']} images"), 400
        if len(files) > app.config["MAX_IMAGES"]:
            return jsonify(error=f"Maximum {app.config['MAX_IMAGES']} images allowed"), 400

        for f in files:
            if not f.filename or not allowed_file(f.filename, app.config["ALLOWED_EXTENSIONS"]):
                return jsonify(error=f"Invalid file type: {f.filename}"), 400

        # Read uploads into memory
        streams = []
        for f in files:
            buf = io.BytesIO(f.read())
            streams.append(buf)

        # Parse optional duration from form
        try:
            duration = int(request.form.get("duration", app.config["DEFAULT_FRAME_DURATION"]))
            duration = max(50, min(duration, 5000))
        except (ValueError, TypeError):
            duration = app.config["DEFAULT_FRAME_DURATION"]

        # Create GIF in memory
        try:
            gif_buf = create_gif(streams, duration=duration)
        except Exception:
            logger.exception("GIF creation failed")
            return jsonify(error="Failed to create GIF. Please try different images."), 500

        logger.info("Serving GIF: %d frames, %dms", len(streams), duration)
        return send_file(gif_buf, mimetype="image/gif", download_name="anim8.gif")

    @app.route("/draw")
    def draw():
        return render_template("draw.html", config=app.config)

    @app.route("/draw/export", methods=["POST"])
    @limiter.limit(app.config["RATE_LIMIT"])
    def draw_export():
        data = request.get_json(silent=True)
        if not data or "frames" not in data:
            return jsonify(error="No frame data received"), 400

        frame_list = data["frames"]
        if len(frame_list) < app.config["MIN_IMAGES"]:
            return jsonify(error=f"Draw at least {app.config['MIN_IMAGES']} frames"), 400
        if len(frame_list) > app.config["MAX_DRAW_FRAMES"]:
            return jsonify(error=f"Maximum {app.config['MAX_DRAW_FRAMES']} frames allowed"), 400

        try:
            duration = int(data.get("duration", app.config["DEFAULT_FRAME_DURATION"]))
            duration = max(50, min(duration, 5000))
        except (ValueError, TypeError):
            duration = app.config["DEFAULT_FRAME_DURATION"]

        streams = []
        for i, data_url in enumerate(frame_list):
            try:
                header, encoded = data_url.split(",", 1)
                raw = base64.b64decode(encoded)
                streams.append(io.BytesIO(raw))
            except Exception:
                logger.exception("Failed to decode frame %d", i)
                return jsonify(error=f"Invalid frame data at index {i}"), 400

        try:
            gif_buf = create_gif(streams, duration=duration)
        except Exception:
            logger.exception("GIF creation failed for draw export")
            return jsonify(error="Failed to create GIF. Please try different frames."), 500

        logger.info("Serving drawn GIF: %d frames, %dms", len(streams), duration)
        return send_file(gif_buf, mimetype="image/gif", download_name="anim8_draw.gif")

    # --- Error handlers ---

    @app.errorhandler(413)
    def too_large(e):
        return jsonify(error="File too large. Maximum total upload is 16 MB."), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify(error="Too many requests. Please slow down."), 429

    @app.errorhandler(404)
    def not_found(e):
        return render_template("base.html"), 404

    return app


# --- Graceful shutdown ---
def _shutdown_handler(signum, frame):
    name = signal.Signals(signum).name
    logger.info("Received %s — shutting down gracefully", name)
    sys.exit(0)


signal.signal(signal.SIGINT, _shutdown_handler)
signal.signal(signal.SIGTERM, _shutdown_handler)


# --- Entry point ---
if __name__ == "__main__":
    app = create_app()
    logger.info("anim8 starting on %s:%s", Config.HOST, Config.PORT)
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
