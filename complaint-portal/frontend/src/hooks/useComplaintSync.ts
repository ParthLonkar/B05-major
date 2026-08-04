import { useEffect, useState } from 'react';

const COMPLAINTS_CHANGED_EVENT = 'complaints:changed';

export const notifyComplaintsChanged = () => {
  window.dispatchEvent(new Event(COMPLAINTS_CHANGED_EVENT));
};

export const useComplaintSync = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleChange = () => setVersion((current) => current + 1);

    window.addEventListener(COMPLAINTS_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener(COMPLAINTS_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return version;
};