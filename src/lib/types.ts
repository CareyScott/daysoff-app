export type Role = "admin" | "member";
export type AbsenceKind = "vacation" | "sick";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  must_change_password: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Absence {
  id: string;
  user_id: string;
  kind: AbsenceKind;
  /** YYYY-MM-DD */
  start_date: string;
  /** YYYY-MM-DD */
  end_date: string;
  business_days: number;
}

export interface YearSummary {
  year: number;
  allowance: number;
  vacation_taken: number;
  sick_taken: number;
  remaining: number;
}

export interface MeResponse {
  user: User;
  summary: YearSummary;
}

export interface OverviewUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  allowance: number;
  vacation_taken: number;
  sick_taken: number;
  remaining: number;
}

export interface OverviewResponse {
  users: OverviewUser[];
  absences: Absence[];
}

export interface Allowance {
  year: number;
  days: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  allowances: Allowance[];
}
