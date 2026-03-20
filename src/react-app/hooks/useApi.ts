import { useState } from 'react';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async <T,>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao processar requisição');
        return null;
      }

      return data;
    } catch (err) {
      setError('Erro de conexão');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { call, loading, error, setError };
}
