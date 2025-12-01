from ultralytics import YOLO
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
data_yaml = BASE_DIR / "placa.yaml"

model = YOLO("yolov8n.pt")

model.train(
    data=str(data_yaml),
    epochs=20,
    imgsz=640
)
