# Use Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set Python unbuffered mode
ENV PYTHONUNBUFFERED=1

# Copy requirements first for better caching
COPY tesserin-mcp-server/requirements.txt .

# Install dependencies (retries for flaky PyPI connections)
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt

# Copy the server code
COPY tesserin-mcp-server/tesserin_server.py .

# Create non-root user
RUN useradd -m -u 1000 mcpuser && \
    chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Run the server
CMD ["python", "tesserin_server.py"]
