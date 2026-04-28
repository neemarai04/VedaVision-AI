import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

// MUI Components - For a professional UI
import {
    CssBaseline, Box, Typography, Tabs, Tab, TextField, Button, CircularProgress, Card, CardContent,
    CardMedia, List, ListItem, ListItemText, Paper, Avatar, RadioGroup, FormControlLabel, Radio,
    FormControl, FormLabel, Alert, AppBar
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// MUI Icons
import SendIcon from '@mui/icons-material/Send';
import PestControlRodentIcon from '@mui/icons-material/PestControlRodent';
import SpaIcon from '@mui/icons-material/Spa';
import PsychologyIcon from '@mui/icons-material/Psychology';

// --- Configuration ---
// IMPORTANT: Update this to the URL where your FastAPI backend is running
const API_BASE_URL = 'http://127.0.0.1:8000';

// A modern, clean theme for the application
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2E7D32', // A deeper, more sophisticated green
        },
        secondary: {
            main: '#FF8F00', // A vibrant orange for contrast
        },
        background: {
            default: '#F5F5F5', // A very light grey for the background
            paper: '#FFFFFF',
        },
        text: {
            primary: '#333333',
            secondary: '#555555',
        }
    },
    typography: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 700,
            fontFamily: '"Merriweather", "serif"',
        },
        h5: {
            fontWeight: 600,
            fontFamily: '"Merriweather", "serif"',
        },
        button: {
            textTransform: 'none', // Buttons with normal casing
            fontWeight: 600,
        }
    },
    components: {
        MuiTab: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12, // Rounded corners for cards
                    boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)', // A softer shadow
                },
            },
        },
    },
});

// ==============================================================================
// 1. API Service (Helper functions to talk to the backend)
// This part would typically be in its own file, e.g., `src/api.js`
// ==============================================================================
const api = {
    predictPlant: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return await axios.post(`${API_BASE_URL}/predict`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    sendMessageToChatbot: async (message) => {
        return await axios.post(`${API_BASE_URL}/chat`, { message });
    },
    getPrakritiQuestions: async () => {
        return await axios.get(`${API_BASE_URL}/prakriti-questions`);
    },
    analyzePrakriti: async (answers) => {
        return await axios.post(`${API_BASE_URL}/analyze-prakriti`, answers);
    },
};


// ==============================================================================
// 2. Main Layout Component (Navigation and Structure)
// This would be in `src/components/Layout.js`
// ==============================================================================
function Layout({ children }) {
    const location = useLocation();
    // Determine the active tab based on the current URL path
    const activeTab = () => {
        if (location.pathname === '/recognize') return 1;
        if (location.pathname === '/prakriti') return 2;
        return 0; // Default to chatbot
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
            <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'background.paper' }}>
                <Typography variant="h4" component="h1" align="center" sx={{ p: 2, color: 'primary.main' }}>
                    🌿 Veda Vision AI
                </Typography>
                <Tabs value={activeTab()} centered textColor="primary" indicatorColor="primary">
                    <Tab label="Remedy Chatbot" icon={<PsychologyIcon />} component={Link} to="/" />
                    <Tab label="Plant Recognition" icon={<SpaIcon />} component={Link} to="/recognize" />
                    <Tab label="Prakriti Analysis" icon={<PestControlRodentIcon />} component={Link} to="/prakriti" />
                </Tabs>
            </AppBar>
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, overflowY: 'auto' }}>
                {children}
            </Box>
        </Box>
    );
}

// ==============================================================================
// 3. Remedy Chatbot Page Component
// This would be in `src/pages/Chatbot.js`
// ==============================================================================
function RemedyChatbot() {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I help you with Ayurvedic remedies today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.sendMessageToChatbot(input);
            const botMessage = { sender: 'bot', text: response.data.answer };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', maxWidth: 800, mx: 'auto', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', mb: 2, bgcolor: '#e8f5e9', borderRadius: '8px 8px 0 0' }}>
                {messages.map((msg, index) => (
                    <Box key={index} sx={{
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        mb: 2,
                    }}>
                        <Avatar sx={{ bgcolor: msg.sender === 'user' ? 'secondary.main' : 'primary.main', mr: msg.sender === 'bot' ? 1 : 0, ml: msg.sender === 'user' ? 1 : 0 }}>
                            {msg.sender === 'user' ? 'U' : '🌿'}
                        </Avatar>
                        <Paper sx={{
                            p: 1.5,
                            bgcolor: msg.sender === 'user' ? 'secondary.light' : 'primary.light',
                            color: msg.sender === 'user' ? 'text.primary' : 'white',
                            maxWidth: '70%',
                            borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                            boxShadow: 1,
                        }}>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                        </Paper>
                    </Box>
                ))}
                {isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
                <div ref={messagesEndRef} />
            </Box>
            <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', p: 2, borderTop: '1px solid #eee' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Ask about an Ayurvedic remedy..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    sx={{ mr: 1 }}
                />
                <Button type="submit" variant="contained" color="primary" disabled={!input.trim() || isLoading}>
                    <SendIcon />
                </Button>
            </Box>
        </Box>
    );
}

// ==============================================================================
// 4. Plant Recognition Page Component
// This would be in `src/pages/ImageRecognition.js`
// ==============================================================================
function PlantRecognition() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
            setError('');
        }
    };

    const handlePredict = async () => {
        if (!file) {
            setError('Please select an image file first.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await api.predictPlant(file);
            setResult(response.data);
        } catch (err) {
            setError('Failed to get prediction. Please try another image.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h5" gutterBottom align="center" color="primary.main">Upload a Leaf Image</Typography>
            <Card variant="outlined" sx={{ mt: 3, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Button variant="contained" component="label" size="large">
                    Choose Image
                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </Button>
                {preview && (
                    <Box sx={{ mt: 2, border: '2px dashed', borderColor: 'primary.light', p: 1, borderRadius: 2 }}>
                        <CardMedia component="img" image={preview} alt="Preview" sx={{ maxHeight: 300, maxWidth: '100%', objectFit: 'contain', borderRadius: 1 }} />
                    </Box>
                )}
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handlePredict}
                    disabled={!file || isLoading}
                    size="large"
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SpaIcon />}
                >
                    {isLoading ? 'Identifying...' : 'Identify Leaf'}
                </Button>
                {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
            </Card>

            {result && (
                <Card variant="outlined" sx={{ mt: 4, p: 3 }}>
                    <Typography variant="h5" color="primary.main" gutterBottom>Prediction: {result.plant_name}</Typography>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6">Benefits:</Typography>
                        <Typography variant="body1" color="text.secondary">{result.benefits}</Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6">Possible Allergens:</Typography>
                        <Typography variant="body1" color="text.secondary">{result.allergens}</Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6">Common Remedies:</Typography>
                        <Typography variant="body1" color="text.secondary">{result.remedies}</Typography>
                    </Box>
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6">Top Matches:</Typography>
                        <List dense>
                            {result.matches.map((match, index) => (
                                <ListItem key={index} divider={index < result.matches.length - 1}>
                                    <ListItemText primary={match.class_name}/>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Card>
            )}
        </Box>
    );
}

// ==============================================================================
// 5. Prakriti Analysis Page Component
// This would be in `src/pages/PrakritiAnalysis.js`
// ==============================================================================
function PrakritiAnalysis() {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await api.getPrakritiQuestions();
                setQuestions(response.data);
                setIsLoading(false);
            } catch (err) {
                setError('Could not load the Prakriti questions. Please try again later.');
                setIsLoading(false);
            }
        };
        fetchQuestions();
    }, []);

    const handleAnswerChange = (e) => {
        setAnswers({ ...answers, [currentQuestionIndex]: e.target.value });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Ensure answers are in the correct order for the API
            const orderedAnswers = questions.map((_, index) => answers[index] || null);
            const response = await api.analyzePrakriti(orderedAnswers);
            setResult(response.data);
        } catch (err) {
            setError('Failed to analyze your results. Please ensure all questions are answered.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && questions.length === 0) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
    if (error) return <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto', my: 4 }}>{error}</Alert>;
    if (result) {
        return (
            <Card sx={{ maxWidth: 600, mx: 'auto', p: 3, mt: 4 }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom align="center" color="primary.main">Your Prakriti Analysis</Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 2 }}>Dominant Dosha: {result.dominant_dosha}</Typography>
                    <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>{result.description}</Typography>
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6">Scores:</Typography>
                        <List dense>
                            <ListItemText primary={`Vata (A): ${result.scores.vata}`} />
                            <ListItemText primary={`Pitta (B): ${result.scores.pitta}`} />
                            <ListItemText primary={`Kapha (C): ${result.scores.kapha}`} />
                        </List>
                    </Box>
                    <Button sx={{ mt: 3 }} variant="contained" color="primary" onClick={() => { setResult(null); setAnswers({}); setCurrentQuestionIndex(0); }}>
                        Take Quiz Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const allQuestionsAnswered = Object.keys(answers).length === questions.length;

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h5" gutterBottom align="center" color="primary.main">Discover Your Dosha</Typography>
            {questions.length > 0 && (
                <Card variant="outlined" sx={{ mt: 3, p: 3 }}>
                    <CardContent>
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel component="legend" sx={{ mb: 2, fontSize: '1.2rem', color: 'primary.dark' }}>
                                {`Question ${currentQuestionIndex + 1}/${questions.length}: ${currentQuestion.question}`}
                            </FormLabel>
                            <RadioGroup value={answers[currentQuestionIndex] || ''} onChange={handleAnswerChange}>
                                <FormControlLabel value="A" control={<Radio color="primary" />} label={currentQuestion.options.A} />
                                <FormControlLabel value="B" control={<Radio color="primary" />} label={currentQuestion.options.B} />
                                <FormControlLabel value="C" control={<Radio color="primary" />} label={currentQuestion.options.C} />
                            </RadioGroup>
                        </FormControl>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            {!isLastQuestion && (
                                <Button variant="contained" onClick={handleNext} disabled={!answers[currentQuestionIndex]} color="primary">
                                    Next
                                </Button>
                            )}
                            {isLastQuestion && (
                                <Button variant="contained" color="secondary" onClick={handleSubmit} disabled={!allQuestionsAnswered || isLoading}>
                                    {isLoading ? <CircularProgress size={24} /> : 'Analyze My Dosha'}
                                </Button>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}


function WelcomePage({ onStart }) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                bgcolor: 'primary.main',
                color: 'white',
                textAlign: 'center',
                p: 3,
            }}
        >
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                🌿 Veda Vision AI
            </Typography>
            <Typography variant="h5" component="p" sx={{ mb: 4, maxWidth: 600 }}>
                Your personal guide to Ayurvedic wisdom. Discover plant remedies, analyze your prakriti, and chat with our AI.
            </Typography>
            <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={onStart}
                sx={{
                    p: '15px 30px',
                    fontSize: '1.2rem',
                    borderRadius: '30px',
                    boxShadow: '0 4px 12px 0 rgba(0,0,0,0.2)',
                    '&:hover': {
                        boxShadow: '0 6px 16px 0 rgba(0,0,0,0.3)',
                    },
                }}
            >
                Get Started
            </Button>
        </Box>
    );
}

// ==============================================================================
// 6. Main App Component (Routing)
// This is the root component that ties everything together.
// ==============================================================================
export default function App() {
    const [showWelcome, setShowWelcome] = useState(true);

    const handleStart = () => {
        setShowWelcome(false);
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {showWelcome ? (
                <WelcomePage onStart={handleStart} />
            ) : (
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout><RemedyChatbot /></Layout>} />
                        <Route path="/recognize" element={<Layout><PlantRecognition /></Layout>} />
                        <Route path="/prakriti" element={<Layout><PrakritiAnalysis /></Layout>} />
                    </Routes>
                </BrowserRouter>
            )}
        </ThemeProvider>
    );
}