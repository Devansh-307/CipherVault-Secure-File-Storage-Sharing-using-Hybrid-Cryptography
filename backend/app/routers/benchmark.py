from fastapi import APIRouter, Depends, Body
from app.schemas.benchmark import BenchmarkRequest, BenchmarkResponse
from app.crypto.benchmark import CryptoBenchmarkEngine
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/benchmark", tags=["Cryptographic Performance Benchmarking"])

@router.post("/run", response_model=BenchmarkResponse)
def run_crypto_benchmark(
    payload: BenchmarkRequest = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Executes live performance benchmarking comparing:
    - Pure AES-256-GCM
    - Pure RSA-2048 (Chunked)
    - Proposed Hybrid Cryptosystem (AES-256-GCM + RSA-OAEP + SHA-256 Signatures)
    """
    results = CryptoBenchmarkEngine.run_comprehensive_benchmark(file_size_kb=payload.file_size_kb)
    return BenchmarkResponse(**results)
