import { useCallback, useEffect, useState } from 'react';
import { taskApi } from '@shared/services/api';

/**
 * Hook to manage task progression data.
 * Calls GET /api/tasks/:id/progression.
 * Automatically refetches on any 409 error according to the API contract.
 *
 * @param {string} taskId
 * @param {boolean} enabled - Whether to fetch (true only for workflow tasks)
 */
export default function useTaskProgression(taskId, enabled = true) {
  const [progression, setProgression] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchProgression = useCallback(async () => {
    if (!taskId || !enabled) return;
    setLoading(true);
    setError('');
    try {
      const response = await taskApi.getProgression(taskId);
      const data = response.data?.progression || response.data;
      setProgression(data);
      return data;
    } catch (err) {
      const message = err.userMessage || err.response?.data?.message || 'Unable to load task progression.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskId, enabled]);

  useEffect(() => {
    fetchProgression();
  }, [fetchProgression]);

  /**
   * Calls POST /api/tasks/:id/progression/verify-learning to verify requirements
   * and unlock the exam. Refetches progression on completion or on 409.
   */
  const verifyLearning = useCallback(async () => {
    if (!taskId) return null;
    setVerifying(true);
    setError('');
    try {
      const response = await taskApi.verifyLearning(taskId);
      if (response.data?.progression) {
        setProgression(response.data.progression);
      } else {
        await fetchProgression();
      }
      return response.data;
    } catch (err) {
      // Contract rule: on ANY 409, call GET /progression and re-render from server
      if (err.response?.status === 409) {
        await fetchProgression();
      }
      const message = err.userMessage || err.response?.data?.message || 'Unable to verify learning requirements.';
      setError(message);
      throw err;
    } finally {
      setVerifying(false);
    }
  }, [taskId, fetchProgression]);

  return {
    progression,
    loading,
    error,
    verifying,
    setError,
    refetch: fetchProgression,
    verifyLearning,
    setProgression,
  };
}
