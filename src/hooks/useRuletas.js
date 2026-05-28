import { useState, useEffect } from 'react';
import { defaultRuleta } from '../data/defaultRuleta';
import { API_BASE_URL } from '../config';

export function useRuletas() {
  const [ruletas, setRuletas] = useState([defaultRuleta]);
  const [loading, setLoading] = useState(true);

  const fetchRuletas = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ruletas`);
      const data = await res.json();
      
      const defaultRankingRes = await fetch(`${API_BASE_URL}/api/ruletas/default-ranking`);
      const defaultRankingData = await defaultRankingRes.json();
      
      const updatedDefault = { ...defaultRuleta, ranking: defaultRankingData.ranking };
      setRuletas([updatedDefault, ...data.ruletas]);
    } catch (e) {
      console.error('Error fetching ruletas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuletas();
  }, []);

  const getRuletas = () => ruletas;
  const getRuletaById = (id) => ruletas.find(r => r.id === id);

  const addRuleta = async (newRuleta, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ruletas/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleta: newRuleta, password })
      });
      if (!response.ok) throw new Error("Error saving ruleta");
      await fetchRuletas();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteRuleta = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/ruletas/${id}`, { method: 'DELETE' });
      await fetchRuletas();
    } catch (e) {
      console.error('Error deleting ruleta:', e);
    }
  };

  const saveRanking = async (id, playerName, score, timeSeconds) => {
    try {
      await fetch(`${API_BASE_URL}/api/ruletas/${id}/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, score, timeSeconds })
      });
      await fetchRuletas();
    } catch (e) {
      console.error('Error saving ranking:', e);
    }
  };

  return {
    ruletas,
    loading,
    getRuletas,
    getRuletaById,
    addRuleta,
    deleteRuleta,
    saveRanking
  };
}
