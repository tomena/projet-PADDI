import React from 'react';

export default function KpiCard({ title, value, unit, color }: any) {
  return (
    <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}>
      <div style={styles.title}>{title}</div>

      <div style={styles.valueRow}>
        <div style={styles.value}>{value}</div>
        <div style={styles.unit}>{unit}</div>
      </div>
    </div>
  );
}

const styles: any = {
  card: {
    background: 'white',
    padding: 18,
    borderRadius: 12,
    boxShadow: '0 8px 22px rgba(0,0,0,0.08)',
    transition: '0.2s',
  },

  title: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },

  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },

  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  unit: {
    fontSize: 13,
    color: '#94a3b8',
  },
};
