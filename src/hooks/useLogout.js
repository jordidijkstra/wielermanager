import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

export const useLogout = () => {
  return () => signOut(auth);
};