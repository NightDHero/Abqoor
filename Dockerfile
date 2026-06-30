FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ABQOOR_HOST=0.0.0.0 \
    ABQOOR_PORT=8080 \
    ABQOOR_STORAGE_DIR=/data

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY . .

RUN mkdir -p /data/data /data/uploads

EXPOSE 8080

CMD ["python", "bot.py"]