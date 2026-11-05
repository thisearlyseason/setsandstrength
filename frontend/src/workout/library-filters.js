export const matchesSelections=(values,selections)=>Object.entries(selections).every(([key,choices])=>!choices.length||choices.includes(values[key]))
