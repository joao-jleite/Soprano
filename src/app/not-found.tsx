'use client';
import { useEffect } from 'react';

// Qualquer rota sem locale cai aqui — redireciona para /pt
export default function RootNotFound() {
  useEffect(() => {
    window.location.replace('/pt');
  }, []);
  return null;
}
