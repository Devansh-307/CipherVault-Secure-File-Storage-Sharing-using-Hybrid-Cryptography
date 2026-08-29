from typing import Dict, Any
from pydantic import BaseModel, Field

class BenchmarkRequest(BaseModel):
    file_size_kb: int = Field(default=1024, ge=10, le=51200)  # 10KB up to 50MB
    rsa_key_size: int = Field(default=2048)

class BenchmarkResponse(BaseModel):
    payload_size_kb: int
    payload_size_formatted: str
    results: Dict[str, Any]
    analysis: Dict[str, Any]
