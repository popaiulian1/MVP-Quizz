import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { QuizData } from '../types/quiz';

let mainWindow: BrowserWindow | null;

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1800,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            allowRunningInsecureContent: true
        },
        show: false,
        icon: path.join(__dirname, '../../assets/icon.ico') // Optional: remove if no icon
    });
    
    mainWindow.once('ready-to-show', () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });

    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading HTML from:', indexPath);
    
    mainWindow.loadFile(indexPath);
    
    // Only open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('load-quiz-data', async (): Promise<QuizData> => {
    try {
        const dataPath = path.join(__dirname, '../../data/questions.json');
        console.log('Looking for quiz data at:', dataPath);
        console.log('Current directory:', __dirname);
        
        if (!fs.existsSync(dataPath)) {
            console.error('Quiz data file not found at:', dataPath);
            // Try alternative path
            const altPath = path.join(process.cwd(), 'data/questions.json');
            console.log('Trying alternative path:', altPath);
            if (fs.existsSync(altPath)) {
                const data = fs.readFileSync(altPath, 'utf-8');
                const parsedData = JSON.parse(data);
                console.log('Loaded quiz data from alternative path:', parsedData);
                return parsedData;
            }
            return { questions: [] };
        }
        
        const data = fs.readFileSync(dataPath, 'utf-8');
        const parsedData = JSON.parse(data);
        console.log('Loaded quiz data:', parsedData);
        return parsedData;
    } catch (error) {
        console.error('Error loading quiz data:', error);
        return { questions: [] };
    }
});