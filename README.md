# MVP-Quizz
This is a quiz application built with Typescript, CSS, HTML. This project is designed to provied you, the user, a customizable quiz experience.
Used Electron to build it into a portable `.exe` file.

## Features
- **Dynamic Quiz Engine:** Easily add, edit, or remove questions through the `questions.json` file.
- **TypeScript Powered:** Strongly-typed logic for robust, maintainable code.
- **Data storage:** Simple `.json` file to store the questions.

## Screenshots
![Main menu](https://github.com/popaiulian1/MVP-Quizz/blob/main/assets/start-menu.JPG)  
![Quiz menu](https://github.com/popaiulian1/MVP-Quizz/blob/main/assets/quiz-menu.JPG)  
![Result menu](https://github.com/popaiulian1/MVP-Quizz/blob/main/assets/result-menu.JPG)  

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14+ recommended)
- [npm](https://npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repo:**
```bash
git clone https://github/popaiulian1/MVP-Quizz.git
cd MVP-Quizz
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build dist files:**
```bash
npm run build-all
```

4. **Build the `.exe` file using:**
```bash
npm run dist
```

5. **Test your knowledge**

## Project Structure
```plaintext
|
├── src/
│   ├── main/
|   |     └── main.ts      # App entry point
│   ├── renderer/
|   |     ├── index.html   # HTML layout
|   |     ├── renderer.ts  # Application logic
|   |     └── styles.css   # CSS stylesheets
│   └──  types/
|         └── types.ts            
├── assets/                # Static assets
├── data/
|    └── questions.json    # .json with the questions
├── package.json
├── README.md
└── ...
```

## Usage
- Update questions in the `data/questions.json` file.
- You can customize the look by editing `src/renderer/styles.css` file.
- Follow the steps in the [installation guide](#installation)

## Author
- [popaiulian1](https://github.com/popaiulian1)


