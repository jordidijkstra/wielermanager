import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getAutoFillLogs = async () => {
  try {
    const logsDoc = await getDoc(doc(db, 'system_logs', 'autoFillScheduled'));
    
    if (logsDoc.exists()) {
      return logsDoc.data();
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching auto-fill logs:', error);
    throw error;
  }
};
