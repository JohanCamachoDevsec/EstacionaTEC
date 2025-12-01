FROM python:3.12-slim

WORKDIR /app

# Dependencias del sistema que a veces necesita opencv/easyocr
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "plate_api:app", "--host", "0.0.0.0", "--port", "8000"]
