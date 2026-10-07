import { useCallback, useEffect, useRef, useState } from 'react';
import { taskApi } from '@shared/services/api';
import { mapProgressionError, ERROR_ACTIONS } from '../utils/progressionErrorMapper';

/**
 * Hook to manage task progression data.
 * Calls GET /api/tasks/:id/progression.
 * Automatically refetches on any 409 error according to the API contract.
 * Automatically polls GET /progression every 2 seconds (max 10 tries) when certification is 'generating'.
 *
 * Authoritative reference: server/docs/task-progression-api.md
 *
 * @param {string} taskId
 * @param {boolean} enabled - Whether to fetch (true only for workflow tasks)
 */
export default function useTaskProgression(taskId, enabled = true) {
  const [progression, setProgression] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [retryingCert, setRetryingCert] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const pollCountRef = useRef(0);

  const fetchProgression = useCallback(async () => {
    if (!taskId || !enabled) return null;
    setLoading(true);
    setError('');
    try {
      const response = await taskApi.getProgression(taskId);
      const data = response.data?.progression || response.data;
      setProgression(data);
      return data;
    } catch (err) {
      const mapped = mapProgressionError(err);
      setError(mapped.friendlyMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskId, enabled]);

  useEffect(() => {
    fetchProgression();
  }, [fetchProgression]);

  // Polling when certification stage is 'generating' (max 10 tries, every 2s)
  useEffect(() => {
    const certState = progression?.stages?.certification?.state;
    if (certState !== 'generating' || !taskId) {
      pollCountRef.current = 0;
      setPollTimedOut(false);
      return;
    }

    const interval = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 10) {
        clearInterval(interval);
        setPollTimedOut(true);
        return;
      }

      try {
        const response = await taskApi.getProgression(taskId);
        const data = response.data?.progression || response.data;
        setProgression(data);
        if (data?.stages?.certification?.state !== 'generating') {
          clearInterval(interval);
          setPollTimedOut(false);
        }
      } catch {
        // Continue polling until max 10 tries
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [progression?.stages?.certification?.state, taskId]);

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
      }
      await fetchProgression();
      return response.data;
    } catch (err) {
      const mapped = mapProgressionError(err);
      // Contract rule: on ANY 409 (except ACTIVE_FOCUS_SESSION_EXISTS), call GET /progression
      if (mapped.action === ERROR_ACTIONS.REFETCH_PROGRESSION || err.response?.status === 409) {
        await fetchProgression();
      }
      setError(mapped.friendlyMessage);
      throw err;
    } finally {
      setVerifying(false);
    }
  }, [taskId, fetchProgression]);

  /**
   * Calls POST /api/tasks/:id/certificate/retry to retry failed certificate issuance or resume linking.
   */
  const retryCertificate = useCallback(async () => {
    if (!taskId) return null;
    setRetryingCert(true);
    setError('');
    pollCountRef.current = 0;
    setPollTimedOut(false);
    try {
      const response = await taskApi.retryCertificate(taskId);
      if (response.data?.progression) {
        setProgression(response.data.progression);
      } else {
        await fetchProgression();
      }
      return response.data;
    } catch (err) {
      const mapped = mapProgressionError(err);
      if (mapped.action === ERROR_ACTIONS.REFETCH_PROGRESSION || err.response?.status === 409) {
        await fetchProgression();
      }
      setError(mapped.friendlyMessage);
      throw err;
    } finally {
      setRetryingCert(false);
    }
  }, [taskId, fetchProgression]);

  return {
    progression,
    loading,
    error,
    verifying,
    retryingCert,
    pollTimedOut,
    setError,
    refetch: fetchProgression,
    verifyLearning,
    retryCertificate,
    setProgression,
  };
}
