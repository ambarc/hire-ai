# generate_openapi_yaml.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
import yaml

from server import app  # your FastAPI instance (replace with actual import)

def export_openapi_yaml(app: FastAPI, file_name: str = "openapi.yaml"):
    # Generate the schema directly from FastAPI’s utility
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Dump it to YAML
    with open(file_name, "w") as f:
        yaml.dump(
            openapi_schema,
            f,
            sort_keys=False
        )

if __name__ == "__main__":
    export_openapi_yaml(app)
