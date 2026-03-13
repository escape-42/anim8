import io
import logging
from PIL import Image

logger = logging.getLogger(__name__)


def allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if a filename has a permitted extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def create_gif(
    file_streams: list[io.BytesIO],
    duration: int = 500,
    max_size: tuple[int, int] = (800, 800),
) -> io.BytesIO:
    """
    Stitch a list of in-memory image streams into a looping animated GIF.

    Returns a BytesIO buffer containing the finished GIF.
    """
    if len(file_streams) < 2:
        raise ValueError("At least 2 images are required")

    frames = []
    # Determine canvas size from the first image (capped by max_size)
    first = Image.open(file_streams[0])
    first = first.convert("RGBA")
    first.thumbnail(max_size, Image.LANCZOS)
    canvas_w, canvas_h = first.size
    file_streams[0].seek(0)

    logger.info("GIF canvas: %dx%d, %d frames, %dms duration", canvas_w, canvas_h, len(file_streams), duration)

    for i, stream in enumerate(file_streams):
        try:
            img = Image.open(stream)
            img = img.convert("RGBA")
            img.thumbnail(max_size, Image.LANCZOS)
            # Center on a white-background canvas
            canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 255))
            offset_x = (canvas_w - img.width) // 2
            offset_y = (canvas_h - img.height) // 2
            canvas.paste(img, (offset_x, offset_y), img)
            # Convert to RGB then palette mode for GIF compatibility
            frames.append(canvas.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=256))
        except Exception:
            logger.exception("Failed to process image at index %d", i)
            raise

    # Write GIF to memory buffer
    buf = io.BytesIO()
    frames[0].save(
        buf,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
    )
    buf.seek(0)

    logger.info("GIF created in memory: %d bytes", buf.getbuffer().nbytes)
    return buf
