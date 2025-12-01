from ultralytics import YOLO
import os

MODEL_PATH = "runs/detect/train2/weights/best.pt"
TEST_IMAGE = "../data/images/11.jpg"  #

print("Modelo existe?:", os.path.exists(MODEL_PATH))
print("Imagen existe?:", os.path.exists(TEST_IMAGE))

model = YOLO(MODEL_PATH)

results = model.predict(
    source=TEST_IMAGE,
    save=True,   # guarda la imagen en runs/detect/predict
    conf=0.1     # bajamos el umbral para ver si detecta algo
)

r = results[0]
boxes = r.boxes

print("Cajas detectadas:", boxes)
if boxes is not None and len(boxes) > 0:
    print("xyxy:", boxes.xyxy)
    print("conf:", boxes.conf)
else:
    print("NO DETECTÓ NINGUNA PLACA")
    print("La imagen que ves es igual a la original porque no hubo detecciones.")

print("Imagen resultante guardada en:", r.save_dir)
