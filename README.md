# Veda Vision AI

Veda Vision AI is a web application that combines computer vision and natural language processing to provide information about Ayurvedic plants and personalized health recommendations.

## Features

*   **Plant Identification:** Identify Ayurvedic plants from images.
*   **Ayurvedic Information:** Get detailed information about Ayurvedic plants, including their benefits, allergens, and remedies.
*   **Prakriti Analysis:** Determine your Ayurvedic constitution (Prakriti) by answering a series of questions.
*   **RAG-powered Chatbot:** Get answers to your health-related questions from a chatbot powered by a Retrieval-Augmented Generation (RAG) model.

## Tech Stack

*   **Backend:** Python, FastAPI, PyTorch, Transformers, LangChain, FAISS, Google Generative AI
*   **Frontend:** React, Material-UI, Axios, React Router
*   **Database:** FAISS vector store

## Getting Started

### Prerequisites

*   Python 3.12 or later
*   Node.js and npm
*   A Google API key with the "Generative Language API" enabled.

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Ayushpk01/VEDA-VISION-AI-V1.git
    ```
2.  **Create a virtual environment and activate it:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```
3.  **Install the Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Create a `.env` file in the root directory and add your Google API key:**
    ```
    GEMINI_API_KEY="your-google-api-key"
    ```
5.  **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```
    The backend server will be running at `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ayurveda-frontend
    ```
2.  **Install the npm dependencies:**
    ```bash
    npm install
    ```
3.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend development server will be running at `http://localhost:3000`.

## API Endpoints

The following API endpoints are available:

*   `GET /`: Home endpoint for API status check.
*   `POST /predict`: Predict the name of a plant from an image.
*   `POST /chat`: Chat with the RAG-powered chatbot.
*   `GET /prakriti-questions`: Get a list of questions for Prakriti analysis.
*   `POST /analyze-prakriti`: Analyze the answers to the Prakriti questions.

## Project Structure
```
.
├── ayurveda-frontend/
│   ├── public/
│   └── src/
├── test/
├── vectorstore/
│   └── db_faiss/
├── .env
├── 2.jpg
├── ayurvedic_data.csv
├── class_names.json
├── main.py
├── plant_vit_model.pth
├── prakriti_questions.json
├── requirements.txt
└── veda.jpg
```
