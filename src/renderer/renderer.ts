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

interface Category {
    name: string;
    questions: QuizQuestion[];
    count: number;
}

class QuizApp {
    private categories: Category[] = [];
    private allCategoriesData: any = {}; // Store all category data
    private currentCategoryIndex: number = 0;
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
        categoryInfo: document.getElementById('category-info')!,
        prevCategoryBtn: document.getElementById('prev-category-btn')! as HTMLButtonElement,
        nextCategoryBtn: document.getElementById('next-category-btn')! as HTMLButtonElement,
        
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
        restartBtn: document.getElementById('restart-btn')! as HTMLButtonElement,
        quizHeader: document.querySelector('#quiz-header h1') as HTMLHeadingElement
    };

    constructor() {
        this.initializeEventListeners();
        this.loadCategories();
    }

    private initializeEventListeners(): void {
        this.elements.startQuizBtn.addEventListener('click', () => this.startQuiz());
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.elements.finishBtn.addEventListener('click', () => this.finishQuiz());
        this.elements.restartBtn.addEventListener('click', () => this.restartQuiz());
        
        // Category navigation
        this.elements.prevCategoryBtn.addEventListener('click', () => this.previousCategory());
        this.elements.nextCategoryBtn.addEventListener('click', () => this.nextCategory());
    }

    private async loadCategories(): Promise<void> {
        try {
            console.log('Loading categories...');
            const data = await ipcRenderer.invoke('load-quiz-data');
            console.log('Received data:', data);
            
            // Store all data but don't load questions yet
            this.allCategoriesData = data;
            
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                this.categories = Object.keys(data).map(categoryName => {
                    const categoryData = data[categoryName];
                    let questionCount = 0;
                    
                    if (categoryData.questions && Array.isArray(categoryData.questions)) {
                        questionCount = categoryData.questions.length;
                    } else if (categoryData.question && Array.isArray(categoryData.question)) {
                        questionCount = categoryData.question.length;
                    }
                    
                    return {
                        name: categoryName,
                        questions: [], // Don't load questions yet
                        count: questionCount
                    };
                }).filter(category => category.count > 0);
            } else if (data && data.questions && Array.isArray(data.questions)) {
                this.categories = [{
                    name: "General",
                    questions: [],
                    count: data.questions.length
                }];
            } else {
                throw new Error('Invalid data format');
            }

            if (this.categories.length > 0) {
                console.log('Categories loaded:', this.categories.length);
                console.log('Categories:', this.categories.map(c => `${c.name}: ${c.count} questions`));
                
                // Make sure landing container is visible
                this.elements.landingContainer.style.display = 'flex';
                
                this.updateCategoryDisplay();
                this.updateNavigationButtons();
            } else {
                throw new Error('No categories found');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.elements.categoryInfo.textContent = 'Error loading categories';
            this.elements.startQuizBtn.innerHTML = '<span class="btn-text">Error loading quiz</span>';
            this.elements.startQuizBtn.disabled = true;
            
            // Still show the landing container even on error
            this.elements.landingContainer.style.display = 'flex';
        }
    }

    private updateCategoryDisplay(): void {
        if (this.categories.length > 0) {
            const currentCategory = this.categories[this.currentCategoryIndex];
            this.elements.categoryInfo.textContent = `${currentCategory.name}: ${currentCategory.count} Questions`;
            
            this.elements.startQuizBtn.innerHTML = '<span class="btn-text">Start Quiz 🚀</span>';
            this.elements.startQuizBtn.disabled = false;
        }
    }

    private updateNavigationButtons(): void {
        this.elements.prevCategoryBtn.disabled = this.currentCategoryIndex === 0;
        this.elements.nextCategoryBtn.disabled = this.currentCategoryIndex === this.categories.length - 1;
    }

    private previousCategory(): void {
        if (this.currentCategoryIndex > 0) {
            this.currentCategoryIndex--;
            this.updateCategoryDisplay();
            this.updateNavigationButtons();
        }
    }

    private nextCategory(): void {
        if (this.currentCategoryIndex < this.categories.length - 1) {
            this.currentCategoryIndex++;
            this.updateCategoryDisplay();
            this.updateNavigationButtons();
        }
    }

    private startQuiz(): void {
        const currentCategory = this.categories[this.currentCategoryIndex];
        if (!currentCategory) return;

        // Now load only the questions for the selected category
        this.loadQuestionsForCategory(currentCategory.name);

        if (this.elements.quizHeader) {
            this.elements.quizHeader.textContent = `${currentCategory.name} Quiz`;
        }

        this.elements.landingContainer.style.display = 'none';
        this.elements.quizContainer.style.display = 'block';
        
        this.resetQuizState();
        this.displayCurrentQuestion();
        this.updateQuestionCounter();
    }

    private loadQuestionsForCategory(categoryName: string): void {
        const categoryData = this.allCategoriesData[categoryName];
        let questions = [];
        
        if (categoryData) {
            if (categoryData.questions && Array.isArray(categoryData.questions)) {
                questions = categoryData.questions;
            } else if (categoryData.question && Array.isArray(categoryData.question)) {
                questions = categoryData.question;
            }
        }
        
        this.quizData.questions = [...questions];
        this.shuffleQuestions();
        
        console.log(`Loaded ${questions.length} questions for category: ${categoryName}`);
    }

    private shuffleQuestions(): void {
        for (let i = this.quizData.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.quizData.questions[i], this.quizData.questions[j]] = 
            [this.quizData.questions[j], this.quizData.questions[i]];
        }
        console.log('Questions shuffled');
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
        this.elements.finishBtn.disabled = this.state.selectedAnswers.length === 0;
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});