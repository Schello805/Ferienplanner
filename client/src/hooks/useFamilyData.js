import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { clearStoredAuthToken, requestJson, toApiError } from '../lib/api';

export const useFamilyData = ({
  authReady,
  currentUser,
  currentCalendar,
  refreshAuthStatus,
  setApiOnline,
  setAuthNotice,
  setCurrentCalendar,
}) => {
  const [children, setChildren] = useState([]);
  const [childFreeDays, setChildFreeDays] = useState([]);

  const loadFamilyData = useCallback(async () => {
    try {
      const childrenData = await requestJson('/api/children', {}, 'Kinderdaten konnten nicht geladen werden');
      const freeDaysData = await requestJson('/api/child-free-days', {}, 'Freie Tage konnten nicht geladen werden');
      setApiOnline(true);
      setAuthNotice(null);
      setChildren(childrenData);
      setChildFreeDays(freeDaysData);
    } catch (error) {
      const apiError = toApiError(error, 'Kinderdaten konnten nicht geladen werden');
      console.error('Failed to load family data', apiError);
      if (apiError.isUnauthorized) {
        clearStoredAuthToken();
        setCurrentCalendar(null);
        setChildren([]);
        setChildFreeDays([]);
        await refreshAuthStatus();
        return;
      }
      setApiOnline(false);
      toast.error(apiError.message);
    }
  }, [refreshAuthStatus, setApiOnline, setAuthNotice, setCurrentCalendar]);

  useEffect(() => {
    if (!authReady || !currentUser || !currentCalendar) return;

    const timeoutId = window.setTimeout(() => {
      void loadFamilyData();
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authReady, currentUser, currentCalendar, loadFamilyData]);

  return {
    children,
    setChildren,
    childFreeDays,
    setChildFreeDays,
    loadFamilyData,
  };
};
