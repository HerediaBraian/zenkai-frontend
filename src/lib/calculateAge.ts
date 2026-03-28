/** Calcula la edad en años a partir de una fecha de nacimiento ISO (YYYY-MM-DD). */
export function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate + "T00:00:00");
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
  export default calculateAge;