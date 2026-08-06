import { Fragment } from 'react'

interface CorrelationHeatmapProps {
  columns: string[]
  matrix: number[][]
}

function colorForValue(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value))
  if (clamped >= 0) {
    const intensity = Math.round(clamped * 200 + 55)
    return `rgb(${255 - intensity}, ${255 - intensity * 0.4}, 255)`
  }
  const intensity = Math.round(Math.abs(clamped) * 200 + 55)
  return `rgb(255, ${255 - intensity * 0.5}, ${255 - intensity * 0.3})`
}

export function CorrelationHeatmap({ columns, matrix }: CorrelationHeatmapProps) {
  const displayCols = columns.filter((c) =>
    ['Age', 'BMI', 'ALT', 'AST', 'Bilirubin', 'Albumin', 'Platelets', 'Sleep_Hours', 'Alk_Phosphatase'].includes(c)
  )
  const indices = displayCols.map((c) => columns.indexOf(c))

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div
          className="grid gap-px bg-slate-200 rounded-xl overflow-hidden"
          style={{ gridTemplateColumns: `120px repeat(${displayCols.length}, minmax(48px, 1fr))` }}
        >
          <div className="bg-slate-100" />
          {displayCols.map((col) => (
            <div key={col} className="bg-slate-100 px-1 py-2 text-center text-[10px] font-semibold text-slate-600 truncate">
              {col}
            </div>
          ))}
          {displayCols.map((rowCol, ri) => {
            const rowIdx = indices[ri]
            return (
              <Fragment key={rowCol}>
                <div className="bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-600 flex items-center">
                  {rowCol}
                </div>
                {indices.map((colIdx, ci) => {
                  const val = matrix[rowIdx]?.[colIdx] ?? 0
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className="flex items-center justify-center text-[10px] font-medium text-slate-700 aspect-square"
                      style={{ backgroundColor: colorForValue(val) }}
                      title={`${rowCol} × ${displayCols[ci]}: ${val.toFixed(2)}`}
                    >
                      {Math.abs(val) > 0.3 ? val.toFixed(1) : ''}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
