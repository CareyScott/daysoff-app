export type Role = "admin" | "member";
export type AbsenceKind = "vacation" | "sick";
export type AbsenceStatus = "pending" | "approved" | "denied";
export type DayPart = "full" | "am" | "pm";

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
  /** Can be fractional (half days count 0.5). */
  business_days: number;
  status: AbsenceStatus;
  day_part: DayPart;
  note: string | null;
  /** Admin's reason when the request was denied. */
  decision_reason: string | null;
}

export interface YearSummary {
  year: number;
  allowance: number;
  vacation_taken: number;
  vacation_pending: number;
  sick_taken: number;
  /** allowance - taken - pending; can be fractional. */
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
  vacation_pending: number;
  sick_taken: number;
  remaining: number;
}

export interface CompanyDay {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  start_date: string;
  /** YYYY-MM-DD */
  end_date: string;
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
