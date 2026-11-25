from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from orbit.api import agents, auth, chat, projects, tasks
from orbit.errors import DomainError

app = FastAPI(title="ORBIT API", version="0.1.0")


@app.exception_handler(DomainError)
def domain_error(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.message, "code": exc.code}
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


for module in (auth, agents, projects, tasks, chat):
    app.include_router(module.router)
