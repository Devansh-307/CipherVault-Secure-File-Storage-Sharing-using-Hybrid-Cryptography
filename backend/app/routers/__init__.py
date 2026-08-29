from app.routers.auth import router as auth_router
from app.routers.files import router as files_router
from app.routers.shares import router as shares_router
from app.routers.security import router as security_router
from app.routers.benchmark import router as benchmark_router

__all__ = [
    "auth_router",
    "files_router",
    "shares_router",
    "security_router",
    "benchmark_router"
]
