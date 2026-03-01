from rembg import remove
from PIL import Image
import os

files = [
    r"C:\Users\samsung-user\.gemini\antigravity\brain\8c6cb889-245a-45bb-a52e-f07885740dad\media__1772334895589.png", # LOBBY
    r"C:\Users\samsung-user\.gemini\antigravity\brain\8c6cb889-245a-45bb-a52e-f07885740dad\media__1772334899848.jpg", # CUSTOM
    r"C:\Users\samsung-user\.gemini\antigravity\brain\8c6cb889-245a-45bb-a52e-f07885740dad\media__1772334914193.jpg", # SCHEDULE
    r"C:\Users\samsung-user\.gemini\antigravity\brain\8c6cb889-245a-45bb-a52e-f07885740dad\media__1772334920332.jpg", # TRAINING
]
labels = ["nav_lobby", "nav_custom", "nav_schedule", "nav_training"]

os.makedirs("public/nav", exist_ok=True)

for path, label in zip(files, labels):
    print(f"Processing {label}...")
    try:
        input_img = Image.open(path)
        # Using rembg to remove the background
        output_img = remove(input_img)
        output_img.save(f"public/nav/{label}.png")
        print(f"Saved {label}.png")
    except Exception as e:
        print(f"Error processing {label}: {e}")
