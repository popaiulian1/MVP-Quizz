const { ipcRenderer } = require('electron');

interface QuizQuestion {
    question: string;
    answers: Record<string, string>;
    correct: string[];
}

interface QuizData {
    questions: QuizQuestion[];
}

interface QuizState {
    currentQuestionIndex: number;
    score: number;
    selectedAnswers: string[];
    isQuizCompleted: boolean;
}

class QuizApp {
    private quizData: QuizData = { questions: [] };
    private state: QuizState = {
        currentQuestionIndex: 0,
        score: 0,
        selectedAnswers: [],
        isQuizCompleted: false
    };
    private isProcessingQuestion: boolean = false;

    private elements = {
        // Landing page elements
        landingContainer: document.getElementById('landing-container')!,
        startQuizBtn: document.getElementById('start-quiz-btn')! as HTMLButtonElement,
        totalQuestionsSpan: document.getElementById('total-questions')!,
        
        // Quiz elements
        questionCounter: document.getElementById('question-counter')!,
        scoreDisplay: document.getElementById('score')!,
        questionText: document.getElementById('question-text')!,
        answersContainer: document.getElementById('answers-container')!,
        nextBtn: document.getElementById('next-btn')! as HTMLButtonElement,
        finishBtn: document.getElementById('finish-btn')! as HTMLButtonElement,
        quizContainer: document.getElementById('quiz-container')!,
        resultsContainer: document.getElementById('results-container')!,
        finalScore: document.getElementById('final-score')!,
        restartBtn: document.getElementById('restart-btn')! as HTMLButtonElement
    };

    constructor() {
        this.initializeEventListeners();
        this.loadQuizData();
    }

    private initializeEventListeners(): void {
        this.elements.startQuizBtn.addEventListener('click', () => this.startQuiz());
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.elements.finishBtn.addEventListener('click', () => this.finishQuiz());
        this.elements.restartBtn.addEventListener('click', () => this.restartQuiz());
    }

    private async loadQuizData(): Promise<void> {
        try {
            console.log('Requesting quiz data...');
            this.quizData = await ipcRenderer.invoke('load-quiz-data');
            console.log('Received quiz data:', this.quizData);
            
            if (this.quizData.questions && this.quizData.questions.length > 0) {
                console.log('Questions found:', this.quizData.questions.length);
                this.shuffleQuestions();
                this.setupLandingPage();
            } else {
                console.error('No questions in data:', this.quizData);
                this.elements.totalQuestionsSpan.textContent = 'No questions available';
                this.elements.startQuizBtn.innerHTML = '<span class="btn-text">Error loading quiz</span>';
            }
        } catch (error) {
            console.error('Error loading quiz data:', error);
            this.elements.totalQuestionsSpan.textContent = 'Error loading questions';
            this.elements.startQuizBtn.innerHTML = '<span class="btn-text">Error loading quiz</span>';
        }
    }

    private shuffleQuestions(): void {
        for (let i = this.quizData.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.quizData.questions[i], this.quizData.questions[j]] = 
            [this.quizData.questions[j], this.quizData.questions[i]];
        }
        console.log('Questions shuffled');
    }

    private setupLandingPage(): void {
        this.elements.totalQuestionsSpan.textContent = `${this.quizData.questions.length} questions`;
        this.elements.startQuizBtn.innerHTML = '<span class="btn-text">Start Quiz 🚀</span>';
        this.elements.startQuizBtn.disabled = false;
    }

    private startQuiz(): void {
        this.elements.landingContainer.style.display = 'none';
        this.elements.quizContainer.style.display = 'block';
        
        this.resetQuizState();
        this.displayCurrentQuestion();
        this.updateQuestionCounter();
    }

    private resetQuizState(): void {
        this.state = {
            currentQuestionIndex: 0,
            score: 0,
            selectedAnswers: [],
            isQuizCompleted: false
        };
    }

    private displayCurrentQuestion(): void {
        const currentQuestion = this.quizData.questions[this.state.currentQuestionIndex];
        if (!currentQuestion) return;

        this.elements.questionText.textContent = currentQuestion.question;
        this.elements.answersContainer.innerHTML = '';
        this.state.selectedAnswers = [];

        Object.entries(currentQuestion.answers).forEach(([key, value]) => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-option';
            answerElement.textContent = `${key} ${value}`;
            answerElement.dataset.answer = key;
            answerElement.addEventListener('click', () => this.selectAnswer(key, answerElement));
            this.elements.answersContainer.appendChild(answerElement);
        });
        this.elements.nextBtn.disabled = true;
        this.updateButtonVisibility();
    }

    private selectAnswer(key: string, answerElement: HTMLDivElement): void {
        if (this.state.selectedAnswers.includes(key)) {
            this.state.selectedAnswers = this.state.selectedAnswers.filter(answer => answer !== key);
            answerElement.classList.remove('selected');
        } else {
            this.state.selectedAnswers.push(key);
            answerElement.classList.add('selected');
        }

        this.elements.nextBtn.disabled = this.state.selectedAnswers.length === 0;
    }

    private nextQuestion(): void {
        if (this.isProcessingQuestion) return;
        
        this.isProcessingQuestion = true;
        this.elements.nextBtn.disabled = true;
        this.elements.finishBtn.disabled = true;
        
        this.checkAnswers();
        
        setTimeout(() => {
            this.state.currentQuestionIndex++;

            if (this.state.currentQuestionIndex < this.quizData.questions.length) {
                this.displayCurrentQuestion();
                this.updateQuestionCounter();
            } else {
                this.finishQuiz();
            }
            
            this.isProcessingQuestion = false;
        }, 1500);
    }

    private checkAnswers(): void {
        const currentQuestion = this.quizData.questions[this.state.currentQuestionIndex];
        const correctAnswers = currentQuestion.correct;

        let isCorrect = this.state.selectedAnswers.length === correctAnswers.length &&
            this.state.selectedAnswers.every(answer => correctAnswers.includes(answer));
        if (isCorrect) {
            this.state.score++;
        }

        const answerElements = this.elements.answersContainer.querySelectorAll('.answer-option');
        answerElements.forEach(element => {
            const answer = (element as HTMLElement).dataset.answer;
            if (correctAnswers.includes(answer!)) {
                element.classList.add('correct');
            } else if(this.state.selectedAnswers.includes(answer!)) {
                element.classList.add('incorrect');
            }
        });

        this.updateQuestionCounter();
    }

    private updateQuestionCounter(): void {
        this.elements.questionCounter.textContent = 
            `Question ${this.state.currentQuestionIndex + 1} of ${this.quizData.questions.length}`;
        this.elements.scoreDisplay.textContent = `Score: ${this.state.score}`;
    }

    private updateButtonVisibility(): void {
        const isLastQuestion = this.state.currentQuestionIndex === this.quizData.questions.length - 1;
        this.elements.nextBtn.style.display = isLastQuestion ? 'none' : 'inline-block';
        this.elements.finishBtn.style.display = isLastQuestion ? 'inline-block' : 'none';
        
        this.elements.nextBtn.disabled = true;
        this.elements.finishBtn.disabled = false;
    }

    private finishQuiz(): void {
        if (this.isProcessingQuestion) return;
        
        if (this.elements.finishBtn.style.display !== 'none') {
            this.isProcessingQuestion = true;
            this.elements.finishBtn.disabled = true;
            this.checkAnswers();
        }

        this.state.isQuizCompleted = true;
        const percentage = Math.round((this.state.score / this.quizData.questions.length) * 100);

        this.elements.finalScore.textContent = 
            `You scored ${this.state.score} out of ${this.quizData.questions.length} (${percentage}%)`;

        setTimeout(() => {
            this.elements.quizContainer.style.display = 'none';
            this.elements.resultsContainer.style.display = 'flex';
            this.isProcessingQuestion = false;
        }, this.elements.finishBtn.style.display !== 'none' ? 1500 : 0);
    }

    private restartQuiz(): void {
        this.elements.resultsContainer.style.display = 'none';
        this.elements.quizContainer.style.display = 'none';
        this.elements.landingContainer.style.display = 'flex';

        this.resetQuizState();

        this.elements.answersContainer.innerHTML = '';
        this.elements.questionText.textContent = 'Loading question...';
        
        this.elements.nextBtn.disabled = true;
        this.elements.nextBtn.style.display = 'inline-block';
        this.elements.finishBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing QuizApp...');
    new QuizApp();
});