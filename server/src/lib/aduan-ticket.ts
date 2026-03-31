export const generateAduanTicketNumber = (year: number, sequence: number) => {
  return `ADU${year.toString().slice(2)}${String(sequence).padStart(6, '0')}`
}
