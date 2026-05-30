import React from 'react';

export default function Card({ title, value, unit, children }: any) {
  return (
    <div style={styles.card}>
      <h3>{title}</h3>

      {value !== undefined && (
        <div style={styles.value}>
          {value} {unit}
        </div>
      )}

      {children}
    </div>
  );
}

const styles: any = {
  card: {
    background: 'white',
    padding: 18,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
};
