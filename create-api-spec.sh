# 1. Start FastAPI in the background on localhost:8000
./start-browser-service.sh

# Give the server a moment to spin up (may not be needed if your script checks readiness)
sleep 2

# 2. Fetch the OpenAPI JSON
curl http://localhost:8000/openapi.json > openapi.json

# 3. Convert to YAML with yq
yq e -P openapi.json > openapi.yaml

# (Optional) Validate or lint the resulting file
spectral lint openapi.yaml

rm openapi.json
mv openapi.yaml browser_service/
