FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY orbit ./orbit
RUN pip install --no-cache-dir .
COPY alembic.ini ./
COPY alembic ./alembic
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn orbit.main:app --host 0.0.0.0 --port 8000"]
