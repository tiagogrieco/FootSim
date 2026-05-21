import type { StaffMember, StaffRole } from "../types/staff";

export function getStaffBonus(staff: StaffMember[], role: StaffRole): number {
  const member = staff.find(s => s.role === role && s.hired);
  if (!member) return 0;
  const sat = member.satisfaction !== undefined ? member.satisfaction : 75;
  return (member.quality * (sat / 100)) / 100;
}

export function getRecoveryBonus(staff: StaffMember[]): number {
  const fitness = getStaffBonus(staff, "fitnessCoach");
  const physio = getStaffBonus(staff, "physio");
  return fitness * 0.3 + physio * 0.2; // up to +50% recovery
}

export function getGrowthBonus(staff: StaffMember[]): number {
  const head = getStaffBonus(staff, "headCoach");
  return head * 0.25; // up to +25% growth
}

export function getInjuryReduction(staff: StaffMember[]): number {
  const fitness = getStaffBonus(staff, "fitnessCoach");
  const physio = getStaffBonus(staff, "physio");
  return Math.min(0.5, fitness * 0.2 + physio * 0.15); // up to -35% injury chance
}

export function getHealingBonus(staff: StaffMember[]): number {
  const physio = getStaffBonus(staff, "physio");
  return physio * 0.4; // up to -40% healing time
}

export function getScoutBonus(staff: StaffMember[]): number {
  return getStaffBonus(staff, "scout");
}
