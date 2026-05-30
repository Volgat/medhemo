# Production Dockerfile for Hemo Backend (Root-level)
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install (from hemo_backend)
COPY hemo_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (from hemo_backend)
COPY hemo_backend/ .

# Set environment variables (Defaults to port 8000)
ENV PORT=8000
ENV HOST=0.0.0.0

# Expose the default port
EXPOSE 8000

# Run the application using shell form to resolve environment variables
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
