export type StaffRole = "headCoach" | "fitnessCoach" | "gkCoach" | "scout" | "physio";

export interface StaffMember {
  id: number;
  name: string;
  role: StaffRole;
  quality: number; // 1-100
  wage: number;
  hired: boolean;
  satisfaction?: number;
}

export const STAFF_EFFECTS: Record<StaffRole, { label: string; desc: string; icon: string }> = {
  headCoach: { label: "Treinador", desc: "+desenvolvimento de CA", icon: "📋" },
  fitnessCoach: { label: "Preparador Físico", desc: "+recuperação fitness, -lesões", icon: "🏋️" },
  gkCoach: { label: "Treinador de Goleiros", desc: "GKs desenvolvem +rápido", icon: "🧤" },
  scout: { label: "Olheiro", desc: "+jogadores no mercado", icon: "🔭" },
  physio: { label: "Fisioterapeuta", desc: "-duração de lesões", icon: "🏥" },
};

export function generateStaffPool(): StaffMember[] {
  const firstNames = ["Carlos", "Roberto", "Mauro", "Paulo", "Ricardo", "Fernando", "Jorge", "Marcelo", "Alexandre", "Bruno", "Diego", "Eduardo", "Felipe", "Gabriel", "Henrique"];
  const lastNames = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Carvalho", "Almeida", "Ribeiro", "Martins", "Barbosa", "Gomes", "Ferreira", "Dias"];
  const roles: StaffRole[] = ["headCoach", "fitnessCoach", "gkCoach", "scout", "physio"];

  return roles.map((role, i) => ({
    id: 1000 + i,
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    role,
    quality: Math.floor(Math.random() * 40) + 50, // 50-90
    wage: (Math.floor(Math.random() * 20) + 10) * 1000, // 10k-30k
    hired: false,
    satisfaction: 75,
  }));
}

export function getStaffBonus(staff: StaffMember[], role: StaffRole): number {
  const member = staff.find(s => s.role === role && s.hired);
  if (!member) return 0;
  const sat = member.satisfaction !== undefined ? member.satisfaction : 75;
  return (member.quality * (sat / 100)) / 100;
}
