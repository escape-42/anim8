# ⚙️ [anim8](https://anim8.entropicsystems.net/)

> Crude GIFs, maximum vibes.

Created by [@escape42](https://x.com/escape42) with the help of Claude Code

Try it [here](https://anim8.entropicsystems.net/)

---

## Features

### 📷 Upload Mode
- Drag & drop or browse to select **2–8 images**
- Supports **PNG, JPG, WebP, BMP, and GIF** (first frame extracted from GIFs)
- Drag thumbnails to **reorder frames** before stitching
- Adjustable **frame speed** (50ms – 2s per frame)

### ✏️ Draw Mode
- Freehand canvas drawing with **marker and eraser** tools
- **16-color palette** + custom color picker
- Three brush sizes
- **Onion skinning** — ghost the previous frame as a drawing guide
- Up to **50 frames**
- Frame strip with thumbnail preview, add, delete, and jump-to navigation

### 🔒 Privacy
- Uploaded images are **never written to disk** — processed entirely in RAM
- Drawn frames never leave the browser until you choose to export
- The server streams your GIF as raw bytes and immediately discards it
- Close the tab and everything is gone. Zero traces.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, Flask, Pillow |
| Rate limiting | flask-limiter |
| Frontend | Vanilla JS, HTML5 Canvas |
| Serving | Gunicorn |

---

## Quick Start

```bash
# Clone and enter the project
git clone <your-repo-url>
cd anim8

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set a strong SECRET_KEY

# Run (development)
python app.py

# Run (production)
gunicorn -w 4 -b 0.0.0.0:7222 "app:create_app()"
```

Then open [http://localhost:7222](http://localhost:7222).

---

## Configuration

All settings are controlled via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | — | Flask secret key (**required in production**) |
| `MAX_CONTENT_LENGTH` | `16777216` | Max upload size in bytes (16 MB) |
| `ALLOWED_EXTENSIONS` | `png,jpg,jpeg,webp,bmp,gif` | Accepted file types |
| `MAX_IMAGES` | `8` | Max frames for upload mode |
| `MAX_DRAW_FRAMES` | `50` | Max frames for draw mode |
| `MIN_IMAGES` | `2` | Minimum frames required |
| `DEFAULT_FRAME_DURATION` | `500` | Default frame delay in ms |
| `RATE_LIMIT` | `20/minute` | Per-IP rate limit on upload endpoints |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `7222` | Bind port |

---

## Project Structure

```
anim8/
├── app.py              # Flask app factory, routes
├── gif_maker.py        # In-memory GIF stitching (Pillow)
├── config.py           # Configuration from environment
├── requirements.txt
├── .env.example
├── static/
│   ├── css/
│   │   ├── base.css    # Global styles, theme, shared components
│   │   ├── index.css   # Upload page styles
│   │   └── draw.css    # Draw page styles
│   └── js/
│       ├── base.js     # Theme toggle, help modal
│       ├── index.js    # Upload flow, drag/drop, blob result
│       └── draw.js     # Canvas drawing, frame management, export
└── templates/
    ├── base.html       # Shared layout, nav, help modal
    ├── index.html      # Upload page
    └── draw.html       # Draw page
```

---

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Upload page |
| `POST` | `/upload` | Accepts multipart images, returns GIF blob |
| `GET` | `/draw` | Draw page |
| `POST` | `/draw/export` | Accepts JSON frame data, returns GIF blob |

