import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('No Native Emoji in UI Notification/Toast strings', () => {
  const emojiRegex = new RegExp('[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]', 'u');

  it('ensures useGameStore notify calls contain no native emojis', () => {
    const filePath = path.resolve(__dirname, '../src/lib/game/useGameStore.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const violations: { line: number; text: string }[] = [];
    lines.forEach((line, idx) => {
      if (line.includes('notify(') && emojiRegex.test(line)) {
        violations.push({ line: idx + 1, text: line.trim() });
      }
    });

    expect(violations).toEqual([]);
  });

  it('ensures faunaDialog in translations has no native emojis', () => {
    const filePath = path.resolve(__dirname, '../src/lib/i18n/translations.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let insideFaunaDialog = false;
    const violations: { line: number; text: string }[] = [];

    lines.forEach((line, idx) => {
      if (line.includes('faunaDialog: {')) insideFaunaDialog = true;
      if (insideFaunaDialog) {
        if (line.includes('},')) insideFaunaDialog = false;
        if (emojiRegex.test(line)) {
          violations.push({ line: idx + 1, text: line.trim() });
        }
      }
    });

    expect(violations).toEqual([]);
  });

  it('ensures reclamation.ts notify/messages contain no native emojis', () => {
    const filePath = path.resolve(__dirname, '../src/lib/game/reclamation.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const violations: { line: number; text: string }[] = [];
    lines.forEach((line, idx) => {
      if ((line.includes('message:') || line.includes('notify(')) && emojiRegex.test(line)) {
        violations.push({ line: idx + 1, text: line.trim() });
      }
    });

    expect(violations).toEqual([]);
  });
});
