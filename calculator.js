'use strict';

function createCalculator() {
  let entry = '0', stored = null, operator = null, replace = false, history = '';
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  function calculate() {
    const right = Number(entry);
    if (operator === '/' && right === 0) throw new Error('No se puede dividir entre cero');
    const result = ({ '+': () => stored + right, '-': () => stored - right,
      '*': () => stored * right, '/': () => stored / right })[operator]();
    if (!Number.isFinite(result)) throw new Error('Resultado fuera de rango');
    entry = String(Number(result.toPrecision(12)));
  }
  return {
    input(action, value) {
      try {
        if (action === 'clear') { entry = '0'; stored = null; operator = null; replace = false; history = ''; }
        if (action === 'digit') {
          if (replace) { entry = '0'; replace = false; }
          if (entry.replace(/[-.]/g, '').length < 12) entry = entry === '0' ? value : entry + value;
        }
        if (action === 'decimal') {
          if (replace) { entry = '0'; replace = false; }
          if (!entry.includes('.')) entry += '.';
        }
        if (action === 'sign' && Number(entry) !== 0) entry = entry.startsWith('-') ? entry.slice(1) : '-' + entry;
        if (action === 'percent') entry = String(Number((Number(entry) / 100).toPrecision(12)));
        if (action === 'backspace' && !replace) entry = entry.slice(0, -1) || '0';
        if (entry === '-') entry = '0';
        if (action === 'operator') {
          if (operator && !replace) calculate();
          stored = Number(entry); operator = value; replace = true;
          history = entry.replace('.', ',') + ' ' + symbols[value];
        }
        if (action === 'equals' && operator) {
          history = stored.toString().replace('.', ',') + ' ' + symbols[operator] + ' ' + entry.replace('.', ',') + ' =';
          calculate(); operator = null; stored = null; replace = true;
        }
      } catch (error) {
        history = error.message; entry = '0'; stored = null; operator = null; replace = true;
      }
      return { display: entry.replace('.', ','), history };
    }
  };
}

if (typeof document !== 'undefined') {
  const calculator = createCalculator();
  function input(action, value) {
    const state = calculator.input(action, value);
    document.querySelector('#display').textContent = state.display;
    document.querySelector('#history').textContent = state.history || '\u00a0';
  }
  document.querySelector('.keys').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.digit !== undefined) input('digit', button.dataset.digit);
    else if (button.dataset.operator) input('operator', button.dataset.operator);
    else input(button.dataset.action);
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let action, value;
    if (/^[0-9]$/.test(event.key)) { action = 'digit'; value = event.key; }
    else if (['+', '-', '*', '/'].includes(event.key)) { action = 'operator'; value = event.key; }
    else action = ({ Enter: 'equals', '=': 'equals', Escape: 'clear', Delete: 'clear', Backspace: 'backspace', '.': 'decimal', ',': 'decimal', '%': 'percent' })[event.key];
    if (action) { event.preventDefault(); input(action, value); }
  });
}
if (typeof module !== 'undefined') module.exports = { createCalculator };
