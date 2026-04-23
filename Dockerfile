# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file
COPY backend/requirements.txt ./requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data
RUN python -m nltk.downloader stopwords wordnet omw-1.4

# Copy all application code from backend/ to current directory
COPY backend/ .

# Expose the standard Hugging Face port
EXPOSE 7860

# Run the FastAPI server using the stable EXEC format
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
