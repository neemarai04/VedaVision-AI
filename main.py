import io
import os
import json
from typing import List, Dict
from collections import Counter

# --- Core ML/AI Libraries ---
import torch
from torchvision import transforms
from transformers import ViTForImageClassification, ViTImageProcessor
import pandas as pd
from PIL import Image
import google.generativeai as genai

# --- FastAPI Framework ---
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- LangChain RAG Imports ---
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# ==============================================================================
# 1. APPLICATION INITIALIZATION & CONFIGURATION
# ==============================================================================

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="Ayurvedic Plant Intelligence API",
    description="An API for identifying Ayurvedic plants, providing information, and analyzing Prakriti with a RAG-powered chatbot.",
    version="1.1.0"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# 2. MODEL AND DATA LOADING (RUNS ONCE AT STARTUP)
# ==============================================================================

# --- Vision Transformer (ViT) Model for Plant Identification ---
MODEL_PATH = 'plant_vit_model.pth'
MODEL_NAME = 'google/vit-base-patch16-224-in21k'
CLASS_NAMES = ['Aloevera', 'Amla', 'Amruthaballi', 'Arali', 'Astma_weed', 'Badipala', 'Balloon_Vine', 'Bamboo', 'Beans', 'Betel', 'Bhrami', 'Bringaraja', 'Caricature', 'Castor', 'Catharanthus', 'Chakte', 'Chilly', 'Citron lime (herelikai)', 'Coffee', 'Common rue(naagdalli)', 'Coriender', 'Curry', 'Doddpathre', 'Drumstick', 'Ekka', 'Eucalyptus', 'Ganigale', 'Ganike', 'Gasagase', 'Ginger', 'Globe Amarnath', 'Guava', 'Henna', 'Hibiscus', 'Honge', 'Insulin', 'Jackfruit', 'Jasmine', 'Kambajala', 'Kasambruga', 'Kohlrabi', 'Lantana', 'Lemon', 'Lemongrass', 'Malabar_Nut', 'Malabar_Spinach', 'Mango', 'Marigold', 'Mint', 'Neem', 'Nelavembu', 'Nerale', 'Nooni', 'Onion', 'Padri', 'Palak(Spinach)', 'Papaya', 'Parijatha', 'Pea', 'Pepper', 'Pomoegranate', 'Pumpkin', 'Raddish', 'Rose', 'Sampige', 'Sapota', 'Seethaashoka', 'Seethapala', 'Spinach1', 'Tamarind', 'Taro', 'Tecoma', 'Thumbe', 'Tomato', 'Tulsi', 'Turmeric', 'ashoka', 'camphor', 'kamakasturi', 'kepala']

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device for ViT model: {device}")

try:
    num_classes = len(CLASS_NAMES)
    model = ViTForImageClassification.from_pretrained(MODEL_NAME, num_labels=num_classes, ignore_mismatched_sizes=True)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()

    image_processor = ViTImageProcessor.from_pretrained(MODEL_NAME)
    transform = transforms.Compose([
        transforms.Resize(image_processor.size['height']),
        transforms.CenterCrop(image_processor.size['height']),
        transforms.ToTensor(),
        transforms.Normalize(mean=image_processor.image_mean, std=image_processor.image_std),
    ])
except Exception as e:
    print(f"Error loading ViT model: {e}")
    model = None

# --- Ayurvedic Data Loading ---
try:
    df_ayurveda = pd.read_csv("ayurvedic_data.csv")
except FileNotFoundError:
    print("Warning: ayurvedic_data.csv not found. Plant info will not be available.")
    df_ayurveda = pd.DataFrame()

# --- Prakriti Questions Loading ---
try:
    with open("prakriti_questions.json", "r") as f:
        prakriti_questions = json.load(f)
except FileNotFoundError:
    print("Warning: prakriti_questions.json not found. Prakriti analysis will not be available.")
    prakriti_questions = []

# --- Gemini API Configuration ---
# CORRECTED: Load key securely from the environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY environment variable not set. Chat functionality will be disabled.")

# --- RAG Chatbot Configuration and Initialization ---
DB_FAISS_PATH = "vectorstore/db_faiss"
rag_chain = None

def initialize_rag_chain():
    """Creates the complete Retrieval-Augmented Generation chain."""
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )

        if not os.path.exists(DB_FAISS_PATH):
            print(f"FATAL: Vector store path not found at '{DB_FAISS_PATH}'")
            return None
            
        db = FAISS.load_local(
            DB_FAISS_PATH, 
            embeddings, 
            allow_dangerous_deserialization=True
        )
        
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            # CORRECTED: Use the key loaded from the environment
            google_api_key=GEMINI_API_KEY, 
            temperature=0.2,
            convert_system_message_to_human=True
        )

        prompt_template = """
        Answer as an Ayurvedic practitioner.
        use your knowlege about human conversation and respond for human queries like hi,bye,thank you etc in a friendly manner.
        For health questions, I will provide a simple, structured home remedy using only common Indian names for plant-based and Ayurvedic ingredients, and I will be sure not to use the word "namaste" or any asterisk symbols.
        When a user asks about a health issue, give a structured, simple home remedy using only plant-based and Ayurvedic ingredients. Use only common Indian names, not scientific ones. The answer should be in this clear format:
        use new lines to separate sections.


Condition: [name of the issue]



Remedy: [step-by-step preparation or use of 1–3 herbs(use common name and herbs), plants, or spices easily available at home]



Dosage or Usage: [how and when to take or apply it]



Duration: [how long to continue]



Caution: [any precaution if needed]


If you do not know the remedy, respond with: "Consult a qualified Ayurvedic doctor for proper guidance."
Keep every response short, clear, and strictly within Ayurvedic and home remedy traditions.
do not use asterisks or special characters.
 Context: {context}
 Question: {question}
        """
        prompt = PromptTemplate(
            template=prompt_template, input_variables=["context", "question"]
        )
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type='stuff',
            retriever=db.as_retriever(search_kwargs={'k': 3}),
            return_source_documents=False,
            chain_type_kwargs={'prompt': prompt}
        )
        
        print("✅ RAG Chatbot chain initialized successfully.")
        return qa_chain

    except Exception as e:
        print(f"Error initializing RAG chain: {e}")
        return None

# --- Call the initialization function at startup ---
if GEMINI_API_KEY:
    rag_chain = initialize_rag_chain()
else:
    print("Warning: GEMINI_API_KEY not set, RAG chatbot is disabled.")

# ==============================================================================
# 3. API ENDPOINTS (No changes needed below this line)
# ==============================================================================

@app.get("/")
def home():
    """Home endpoint for API status check."""
    return {"message": "Welcome to the Ayurvedic Plant Intelligence API"}

@app.post("/predict")
async def predict_plant(file: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=503, detail="Plant identification model is not available.")
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_tensor = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = model(img_tensor).logits
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            if torch.isnan(probabilities).any() or probabilities.numel() == 0:
                raise HTTPException(status_code=500, detail="Model produced an invalid output.")
            top_confidences, top_indices = torch.topk(probabilities, 5)
            top_confidences_list = top_confidences.squeeze().tolist()
            top_indices_list = top_indices.squeeze().tolist()
            if top_confidences_list[0] < 0.10:
                return { "plant_name": "Unknown / Not in Dataset", "matches": [], "benefits": "The plant could not be identified with high confidence. Please try again with a clearer image." }
            top_matches = [{"class_name": CLASS_NAMES[idx], "confidence": f"{conf:.2%}"} for conf, idx in zip(top_confidences_list, top_indices_list)]
            predicted_class = top_matches[0]['class_name']
            plant_info = {}
            if not df_ayurveda.empty:
                plant_records = df_ayurveda[df_ayurveda['plant_name'].str.lower() == predicted_class.lower()].to_dict(orient='records')
                if plant_records:
                    plant_info = plant_records[0]
            return { "plant_name": predicted_class, "matches": top_matches, "benefits": plant_info.get("benefits", "Details not available."), "allergens": plant_info.get("allergens", "Details not available."), "remedies": plant_info.get("remedies", "Details not available.") }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/chat")
async def chat(payload: Dict):
    if not rag_chain:
        raise HTTPException(status_code=503, detail="Chat functionality is disabled due to a configuration error.")
    try:
        message = payload.get("message", "")
        if not message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty.")
        result = rag_chain.invoke(message)
        answer = result.get('result', "Sorry, I couldn't process your request at the moment.")
        return {"question": message, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error with generative model: {str(e)}")

@app.get("/prakriti-questions")
async def get_prakriti_questions():
    if not prakriti_questions:
        raise HTTPException(status_code=404, detail="Prakriti questions not found.")
    return prakriti_questions

@app.post("/analyze-prakriti")
async def analyze_prakriti(answers: List[str]):
    if not prakriti_questions or len(answers) != len(prakriti_questions):
        raise HTTPException(status_code=400, detail="Invalid number of answers provided.")
    try:
        scores = Counter(answers)
        dosha_scores = {"Vata": scores.get('A', 0), "Pitta": scores.get('B', 0), "Kapha": scores.get('C', 0)}
        dominant_dosha = max(dosha_scores, key=dosha_scores.get)
        descriptions = { "Vata": "Your constitution is dominated by Vata (Air & Ether). You are likely energetic, creative, and light. Balance is key to managing potential dryness and inconsistency.", "Pitta": "Your constitution is dominated by Pitta (Fire & Water). You are likely intelligent, focused, and intense. Staying cool and managing stress is important for your well-being.", "Kapha": "Your constitution is dominated by Kapha (Earth & Water). You are likely calm, steady, and loyal. Regular activity and stimulation help balance your inherent stability." }
        return { "scores": { "vata": dosha_scores["Vata"], "pitta": dosha_scores["Pitta"], "kapha": dosha_scores["Kapha"] }, "dominant_dosha": dominant_dosha, "description": descriptions.get(dominant_dosha) }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")