import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
const AhoCorasick = require('ahocorasick');

export interface WordEntry {
  word: string;
  category: string;
  source: string;
}

export class SensitiveWordLoader {
  private vocabularyPath: string;
  private ac: any = null;
  private wordEntries: WordEntry[] = [];

  constructor(vocabularyPath: string = './Sensitive-lexicon/Vocabulary') {
    this.vocabularyPath = vocabularyPath;
  }

  loadAllWords(): WordEntry[] {
    const words: WordEntry[] = [];

    try {
      const files = readdirSync(this.vocabularyPath);
      const txtFiles = files.filter(file => file.endsWith('.txt'));

      console.log(`Loading ${txtFiles.length} vocabulary files...`);

      for (const file of txtFiles) {
        const filePath = join(this.vocabularyPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const category = file.replace('.txt', '');

        const fileWords = content
          .split('\n')
          .map(word => word.trim())
          .filter(word => word.length > 0 && word.length < 50)
          .map(word => ({
            word,
            category,
            source: file
          }));

        words.push(...fileWords);
      }

      const uniqueWordsMap = new Map<string, WordEntry>();
      words.forEach(entry => {
        if (!uniqueWordsMap.has(entry.word)) {
          uniqueWordsMap.set(entry.word, entry);
        }
      });

      const uniqueWords = Array.from(uniqueWordsMap.values());
      console.log(`Loaded ${words.length} total words, ${uniqueWords.length} unique words`);

      return uniqueWords;
    } catch (error) {
      console.error('Error loading words:', error);
      return [];
    }
  }

  initialize(): boolean {
    try {
      console.time('Loading sensitive words');
      this.wordEntries = this.loadAllWords();

      if (this.wordEntries.length === 0) {
        console.error('No words loaded');
        return false;
      }

      console.time('Building AC automaton');
      const words = this.wordEntries.map(entry => entry.word);
      this.ac = new AhoCorasick(words);
      console.timeEnd('Building AC automaton');
      console.timeEnd('Loading sensitive words');

      console.log(`AC automaton initialized with ${words.length} words`);
      return true;
    } catch (error) {
      console.error('Failed to initialize AC automaton:', error);
      return false;
    }
  }

  detect(text: string): Array<{
    word: string;
    position: [number, number];
    category: string;
    source: string;
  }> {
    if (!this.ac) {
      throw new Error('AC automaton not initialized. Call initialize() first.');
    }

    try {
      const results = this.ac.search(text);

      return results.map((result: any) => {
        const [endPosition, matchedWords] = result;
        const word = matchedWords[0];
        const startPosition = endPosition - word.length + 1;

        const wordEntry = this.wordEntries.find(entry => entry.word === word);

        return {
          word,
          position: [startPosition, endPosition + 1] as [number, number],
          category: wordEntry?.category || 'unknown',
          source: wordEntry?.source || 'unknown'
        };
      });
    } catch (error) {
      console.error('Error detecting sensitive words:', error);
      return [];
    }
  }

  getStats() {
    const categoryStats = this.wordEntries.reduce((stats, entry) => {
      stats[entry.category] = (stats[entry.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    return {
      totalWords: this.wordEntries.length,
      categories: Object.keys(categoryStats).length,
      categoryBreakdown: categoryStats,
      isInitialized: !!this.ac
    };
  }

  isInitialized(): boolean {
    return !!this.ac;
  }
}