import cv2
import numpy as np
import easyocr
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

EASYOCR_LANGS = ["es"]   # idioma del OCR
reader = easyocr.Reader(EASYOCR_LANGS)

def find_plate_roi(image: np.ndarray):
    """Detecta una zona rectangular que podría ser una placa."""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)  # suaviza pero conserva bordes
    edges = cv2.Canny(gray, 30, 200)              # detección de bordes tipo Canny

    # busca contornos a partir de los bordes
    contours_info = cv2.findContours(edges.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = contours_info[0] if len(contours_info) == 2 else contours_info[1]

    if not contours:
        return None

    # ordenamos por tamaño (los más grandes primero)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

    for cnt in contours:
        # perímetro del contorno (básicamente la longitud del borde)
        peri = cv2.arcLength(cnt, True)

        # approxPolyDP intenta “simplificar” el contorno
        # usa el peri * 0.02 como tolerancia → mientras más grande, más simplifica
        # sirve para ver si el contorno se parece a una figura con pocos lados
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        # si tiene 4 lados, probablemente es un rectángulo
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)  # rectángulo que encierra la figura

            if w == 0 or h == 0:
                continue

            # relación ancho/alto → las placas tienen forma alargada
            aspect_ratio = w / float(h)

            # valores típicos para placas (heurística rápida)
            if 1.8 < aspect_ratio < 6.5 and w > 80 and h > 25:
                return image[y:y + h, x:x + w]  # recorte de la placa detectada

    return None

def clean_plate_text(text: str) -> str:
    """Limpia y normaliza el texto: mayúsculas, sin espacios ni símbolos."""
    text = text.upper().replace(" ", "").replace("-", "")
    allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(ch for ch in text if ch in allowed)

def is_plate_like(text: str) -> bool:
    """Reglas básicas para saber si un texto parece una placa."""
    if not (5 <= len(text) <= 8):
        return False
    has_letter = any(c.isalpha() for c in text)
    has_digit = any(c.isdigit() for c in text)
    return has_letter and has_digit

def choose_best_plate(results):
    """Elige el texto que más parece placa según confianza y formato."""
    best_plate = ""
    best_conf = 0.0

    for bbox, text, conf in results:
        cleaned = clean_plate_text(text)
        if is_plate_like(cleaned) and conf > best_conf:
            best_conf = conf
            best_plate = cleaned

    if best_plate:
        return best_plate

    # si no hay candidatos “válidos”, toma el más confiable
    if results:
        _, text, conf = max(results, key=lambda r: r[2])
        return clean_plate_text(text)

    return ""

def read_plate(image: np.ndarray) -> str:
    """Busca la placa y usa OCR para leerla."""
    roi = find_plate_roi(image)
    target = roi if roi is not None else image
    results = reader.readtext(target)
    return choose_best_plate(results)

def main():
    """Carga imagen y muestra la lectura."""
    filename = "ejemplos/9.jpg"
    image = cv2.imread(filename)

    if image is None:
        print("[ERROR] No se encontró la imagen en el root.")
        return

    plate = read_plate(image)

    print("----------------------------------------")
    print(f"[RESULTADO] Placa detectada (local): {plate if plate else '(sin lectura)'}")
    print("----------------------------------------")

if __name__ == "__main__":
    main()



