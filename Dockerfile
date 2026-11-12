FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/src ./src
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 SMARTBCG_DB=/app/var/smartbcg.sqlite3
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python -m pip install --no-cache-dir -r backend/requirements.txt \
    && groupadd --gid 10001 smartbcg \
    && useradd --uid 10001 --gid 10001 --no-create-home smartbcg \
    && mkdir /app/var && chown 10001:10001 /app/var
COPY backend/smartbcg /app/backend/smartbcg
COPY --from=frontend /app/frontend/dist /app/frontend/dist
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "smartbcg.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
