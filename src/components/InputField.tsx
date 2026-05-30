import React from 'react';

export default function InputField({ label, value, onChange }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={styles.input}
      />
    </div>
  );
}

const styles: any = {
  input: {
    width: '100%',
    padding: 8,
    marginTop: 5,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
};
