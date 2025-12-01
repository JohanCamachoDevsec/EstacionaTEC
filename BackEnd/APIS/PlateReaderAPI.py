import cv2
import easyocr
import numpy as np
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

"""
¿Por qué usar EasyOCR y no otras librerías o modelos?

Hay varias opciones para OCR: Tesseract, PaddleOCR, Keras-OCR, modelos de visión de
Deep Learning de HuggingFace, etc. Pero muchas requieren entrenamientos extra, más
preprocesamiento, o setups más pesados. EasyOCR funciona “plug and play”: levanta rápido,
no necesita entrenar nada y reconoce texto realista desde el primer intento, incluso si
la foto está borrosa, inclinada o con mala luz.

Otras alternativas conocidas:
- Tesseract -> muy sensible al ruido, funciona mejor con imágenes limpias.
- PaddleOCR -> muy potente pero más complejo de configurar (muchos modelos y steps).
- Keras-OCR -> requiere entrenar o cargar pipelines más pesados.
- Modelos de visión (Transformers) -> excelente calidad, pero consumen muchos recursos.
- OCR de OpenCV puro -> básico, sirve solo para casos simples.

Ventajas prácticas de EasyOCR:
- Ya viene entrenado con miles de ejemplos reales.
- Maneja inclinación, sombras, ruido y variaciones del mundo real.
- No necesita un pipeline complejo de preprocesamiento.
- Devuelve texto + bounding boxes + confianza en una sola operación.
- Ideal para placas, letreros, documentos rápidos o apps que solo quieren “leer algo”.

porque no un modelo propio  entrenado con placas del estado de sinaloa 

Un modelo propio solo conviene si tenemos muchos datos de tu dominio en este caso miles de
placas en circulacion en sinaloa Ahí puede superar a EasyOCR porque aprende justo ese patrón.
Pero implica dedicar tiempo a etiquetar, entrenar, ajustar hiperparámetros y mantener
el modelo. Para la mayoría de proyectos, EasyOCR es la opción rápida y precisa 
"""
EASYOCR_LANGS = ["es"]
reader = easyocr.Reader(EASYOCR_LANGS)

"""
API FastAPI
"""
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def find_plate_roi(image: np.ndarray):
    """
    Busca una región rectangular que podría ser una placa usando contornos.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    edges = cv2.Canny(gray, 30, 200)

    contours_info = cv2.findContours(edges.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = contours_info[0] if len(contours_info) == 2 else contours_info[1]

    if not contours:
        return None

    # Nos quedamos con los contornos más grandes
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

    h_img, w_img = image.shape[:2]

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            if w == 0 or h == 0:
                continue

            aspect_ratio = w / float(h)

            # Heurística de placa: rectángulo, proporción y tamaño mínimos
            if 1.8 < aspect_ratio < 6.5 and w > 80 and h > 25:
                # Además, descartamos cosas muy arriba (logos, etc.)
                cy = y + h / 2
                if cy < h_img * 0.3:
                    continue
                return image[y:y + h, x:x + w]

    return None


def crop_bottom_region(image: np.ndarray) -> np.ndarray:
    """
    Recorta la parte baja y central de la imagen, donde suele estar la placa.
    Sirve como respaldo si el ROI por contornos falla.
    """
    h, w = image.shape[:2]
    y0 = int(h * 0.45)   # mitad hacia abajo
    y1 = h
    x0 = int(w * 0.05)
    x1 = int(w * 0.95)
    return image[y0:y1, x0:x1]


def clean_plate_text(text: str) -> str:
    """
    Normaliza el texto: mayúsculas y solo letras/números.
    """
    text = text.upper().replace(" ", "").replace("-", "")
    allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(ch for ch in text if ch in allowed)


def is_plate_like_basic(text: str) -> bool:
    """
    Chequeo básico: longitud y mezcla letras/dígitos.
    """
    if not (5 <= len(text) <= 8):
        return False

    has_letter = any(c.isalpha() for c in text)
    has_digit = any(c.isdigit() for c in text)
    return has_letter and has_digit


def plate_format_score(text: str) -> int:
    """
    Asigna un puntaje si el texto coincide con formatos típicos de placas MX.
    Ejemplos:
      VJE865A -> 3 letras + 3 dígitos + 1 letra
      ABC1234 -> 3 letras + 4 dígitos
    """
    if not is_plate_like_basic(text):
        return 0

    score = 1  # cumple lo básico

    # 3 letras + 3 dígitos + 1 letra (caso Sinaloa de la foto: VJE865A)
    if re.fullmatch(r"[A-Z]{3}\d{3}[A-Z]", text):
        score += 3

    # 3 letras + 4 dígitos
    elif re.fullmatch(r"[A-Z]{3}\d{4}", text):
        score += 3

    # Algo genérico: 1-3 letras, 2-4 dígitos, opcional 1 letra al final
    elif re.fullmatch(r"[A-Z]{1,3}\d{2,4}[A-Z]?", text):
        score += 2

    return score


def choose_best_plate(results):
    """
        Elige el candidato que realmente parezca placa.
        Si ningún texto cumple el patrón, devuelve "".
    """
    best_plate = ""
    best_conf = 0.0

    for bbox, text, conf in results:
        cleaned = clean_plate_text(text)

        # Longitud y mezcla de letras/dígitos
        if not (5 <= len(cleaned) <= 8):
            continue
        if not any(c.isalpha() for c in cleaned):
            continue
        if not any(c.isdigit() for c in cleaned):
            continue

        if conf > best_conf:
            best_conf = conf
            best_plate = cleaned

    return best_plate  # puede ser "" si no parece placa



def read_plate(image: np.ndarray):
    """
    Detecta la placa (ROI) y corre el OCR.
    Devuelve (plate, status), donde:
        plate: str o None
        status: "ok", "no_plate_region" o "no_plate_text"
    """
    roi = find_plate_roi(image)

    # 1) Intento principal: ROI por contornos (si existe)
    if roi is not None:
        results_roi = reader.readtext(roi)
        plate_roi = choose_best_plate(results_roi)
        if plate_roi:
            return plate_roi, "ok"

        # 2) Fallback: recortamos parte baja de la imagen completa
        bottom = crop_bottom_region(image)
        results_bottom = reader.readtext(bottom)
        plate_bottom = choose_best_plate(results_bottom)
        if plate_bottom:
            return plate_bottom, "ok"

        # Hay región que parece placa, pero el texto OCR no sigue formato de placa
        return None, "no_plate_text"

    # Si no hubo ninguna región tipo placa, probamos directo en la parte baja
    bottom = crop_bottom_region(image)
    results_bottom = reader.readtext(bottom)
    plate_bottom = choose_best_plate(results_bottom)
    if plate_bottom:
        return plate_bottom, "ok"

    # No encontramos ni región de placa ni texto con formato de placa
    return None, "no_plate_region"


@app.post("/read-plate")
async def read_plate_api(file: UploadFile = File(...)):
    """
    Endpoint que recibe una imagen y regresa la placa leída
    y un estado de error entendible para el frontend.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg", "image/webp"):
        raise HTTPException(status_code=400, detail="Tipo de archivo no soportado")

    content = await file.read()
    npimg = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")

    plate, status = read_plate(image)

    if plate:
        return {
            "success": True, "plate": plate
        }

    # No lanzamos HTTP error, pero indicamos el tipo para que el frontend decida
    # qué mensaje mostrar.
    return {
        "success": False, "error": "no_plate_found"
    }


if __name__ == "__main__":
    """
    Permite ejecutar FastAPI directamente desde el IDE o terminal.
    """
    host = "0.0.0.0"   # escucha en toda la red local
    port = 8000

    print()
    print("======================================")
    print(" Levantando API de lectura de placas ")
    print("======================================")
    print(f"  Local:   http://127.0.0.1:{port}")
    print(f"  LAN:     http://{host}:{port}")
    print(f"  Docs:    http://127.0.0.1:{port}/docs")
    print("======================================")
    print()

    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=False
    )
