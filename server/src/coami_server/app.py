"""Minimal ASGI entry point for the repository baseline."""

from fastapi import FastAPI

app = FastAPI(title="Coami")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
