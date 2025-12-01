"""
codigo usado en produccion por el servidor este es el que correra en docker y sera
escuchado por la pagina web y estara publicado en web
"""
import cv2
import easyocr
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Idioma y inicialización del OCR
EASYOCR_LANGS = ["es"]
reader = easyocr.Reader(EASYOCR_LANGS)

# Creamos la app FastAPI
app = FastAPI()

# CORS: por ahora abierto. En producción podrás limitar orígenes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # luego aquí pones tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def find_plate_roi(image: np.ndarray):
    """
    Busca una región con forma de placa usando contornos.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    edges = cv2.Canny(gray, 30, 200)

    contours_info = cv2.findContours(edges.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = contours_info[0] if len(contours_info) == 2 else contours_info[1]

    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            if w == 0 or h == 0:
                continue

            aspect_ratio = w / float(h)
            if 1.8 < aspect_ratio < 6.5 and w > 80 and h > 25:
                return image[y:y + h, x:x + w]

    return None


def clean_plate_text(text: str) -> str:
    """
    Normaliza el texto: mayúsculas y solo letras/números.
    """
    text = text.upper().replace(" ", "").replace("-", "")
    allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(ch for ch in text if ch in allowed)


def is_plate_like(text: str) -> bool:
    """
    Heurística simple para ver si el texto parece una placa.
    """
    if not (5 <= len(text) <= 8):
        return False

    has_letter = any(c.isalpha() for c in text)
    has_digit = any(c.isdigit() for c in text)
    return has_letter and has_digit


def choose_best_plate(results):
    """
    Elige el candidato más probable de placa según confianza y formato.
    """
    best_plate = ""
    best_conf = 0.0

    for bbox, text, conf in results:
        cleaned = clean_plate_text(text)
        if is_plate_like(cleaned) and conf > best_conf:
            best_conf = conf
            best_plate = cleaned

    if best_plate:
        return best_plate

    if results:
        _, text, conf = max(results, key=lambda r: r[2])
        return clean_plate_text(text)

    return ""


def read_plate(image: np.ndarray) -> str:
    """
    Detecta la placa (ROI) y corre el OCR.
    """
    roi = find_plate_roi(image)
    target = roi if roi is not None else image
    results = reader.readtext(target)
    return choose_best_plate(results)


@app.post("/read-plate")
async def read_plate_api(file: UploadFile = File(...)):
    """
    Endpoint que recibe una imagen y regresa la placa leída.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg", "image/webp"):
        raise HTTPException(status_code=400, detail="Tipo de archivo no soportado")

    content = await file.read()
    npimg = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")

    plate = read_plate(image)
    return {"plate": plate or ""}


@app.get("/health")
async def health():
    """
    Endpoint simple para revisar que el servicio está vivo.
    """
    return {"status": "ok"}


if __name__ == "__main__":
    """
    Permite ejecutar FastAPI directamente.
    """
    uvicorn.run(
        "plate_api:app",  # nombre_archivo:objeto_app
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
