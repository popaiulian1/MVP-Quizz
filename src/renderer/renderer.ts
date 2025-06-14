// Remove imports and use global electron object
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

    private elements = {
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
                this.displayCurrentQuestion();
                this.updateQuestionCounter();
            } else {
                console.error('No questions in data:', this.quizData);
                this.elements.questionText.textContent = 'No questions available. Please check your questions.json file.';
            }
        } catch (error) {
            console.error('Error loading quiz data:', error);
            this.elements.questionText.textContent = 'Error loading quiz data.';
        }
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
        this.checkAnswers();
        this.state.currentQuestionIndex++;

        if(this.state.currentQuestionIndex < this.quizData.questions.length) {
            setTimeout(() => {
                this.displayCurrentQuestion();
                this.updateQuestionCounter();
            }, 1500);
        } else {
            setTimeout(() => {
                this.finishQuiz();
            }, 1500);
        }
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
    }

    private finishQuiz(): void {
        this.state.isQuizCompleted = true;
        const percentage = Math.round((this.state.score / this.quizData.questions.length) * 100);

        this.elements.finalScore.textContent = 
        `You scored ${this.state.score} out of ${this.quizData.questions.length} (${percentage}%)`;

        this.elements.quizContainer.style.display = 'none';
        this.elements.resultsContainer.style.display = 'block';
    }

    private restartQuiz(): void {
        this.state = {
            currentQuestionIndex: 0,
            score: 0,
            selectedAnswers: [],
            isQuizCompleted: false
        };

        this.elements.quizContainer.style.display = 'block';
        this.elements.resultsContainer.style.display = 'none';

        this.displayCurrentQuestion();
        this.updateQuestionCounter();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing QuizApp...');
    new QuizApp();
});