import {type ChangeEvent} from 'react'
import {set, unset, type StringInputProps} from 'sanity'

const hexColorPattern = /^#[0-9a-fA-F]{6}$/

const swatches = [
  '#0f172a',
  '#1e293b',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#16a34a',
  '#f1f5f9',
  '#ffffff',
]

export function ColorInput(props: StringInputProps) {
  const {elementProps, onChange, value = ''} = props
  const pickerValue = hexColorPattern.test(value) ? value : '#000000'

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value.trim()
    onChange(nextValue ? set(nextValue) : unset())
  }

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(set(event.currentTarget.value))
  }

  const selectSwatch = (color: string) => {
    onChange(set(color))
  }

  return (
    <div style={{display: 'grid', gap: 10}}>
      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
        <input
          aria-label={`${props.schemaType.title || props.schemaType.name} picker`}
          type="color"
          value={pickerValue}
          onChange={handleColorChange}
          style={{
            width: 44,
            height: 40,
            padding: 2,
            border: '1px solid #cad1dc',
            borderRadius: 6,
            background: '#fff',
            cursor: 'pointer',
          }}
        />
        <input
          {...elementProps}
          type="text"
          value={value}
          onChange={handleTextChange}
          placeholder="#2563eb"
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            padding: '0 12px',
            border: '1px solid #cad1dc',
            borderRadius: 6,
            font: 'inherit',
          }}
        />
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use ${color}`}
            title={color}
            onClick={() => selectSwatch(color)}
            style={{
              width: 24,
              height: 24,
              border: color.toLowerCase() === value.toLowerCase() ? '2px solid #111827' : '1px solid #cad1dc',
              borderRadius: 4,
              background: color,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  )
}
