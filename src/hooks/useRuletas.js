import { useState, useEffect } from 'react';
import { defaultRuleta } from '../data/defaultRuleta';

const STORAGE_KEY = 'ruletas_db';

const getInitialData = () => {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) {
    const initialData = [defaultRuleta];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
  }
  return JSON.parse(storedData);
};

export function useRuletas() {
  const [ruletas, setRuletas] = useState(getInitialData);

  const saveRuletas = (newRuletas) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRuletas));
    setRuletas(newRuletas);
  };

  const getRuletas = () => ruletas;

  const getRuletaById = (id) => ruletas.find(r => r.id === id);

  const addRuleta = (newRuleta) => {
    const newRuletas = [...ruletas, newRuleta];
    saveRuletas(newRuletas);
  };

  const deleteRuleta = (id) => {
    const newRuletas = ruletas.filter(r => r.id !== id);
    saveRuletas(newRuletas);
  };

  const saveRanking = (id, playerName, score, timeSeconds) => {
    const newRuletas = ruletas.map(r => {
      if (r.id === id) {
        const newRanking = [...(r.ranking || []), { playerName, score, timeSeconds }];
        // Sort by score descending, then by time ascending
        newRanking.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeSeconds - b.timeSeconds;
        });
        return { ...r, ranking: newRanking };
      }
      return r;
    });
    saveRuletas(newRuletas);
  };

  return {
    ruletas,
    getRuletas,
    getRuletaById,
    addRuleta,
    deleteRuleta,
    saveRanking
  };
}
