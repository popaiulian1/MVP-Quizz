export interface QuizQuestion {
    question: string;
    answers: Record<string, string>;
    correct: string[];
}

export interface QuizData {
    questions: QuizQuestion[];
}

export interface QuizState {
    currentQuestionIndex: number;
    score: number;
    selectedAnswers: string[];
    isQuizCompleted: boolean;
}